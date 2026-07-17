/* ============================================================
   ui.js — entry point. Sidebar, panels, filters, modes,
   glossary, theme. Wires DOM <-> map.js <-> dispatch.js.
   ============================================================ */

import {
  STATE, DATA, YEARS, PL_CONFIG, PL_SLIDER, HYPO_CONFIG, RATE_BOUNDS, ZONE_SIM,
  MOAT_CONFIG, DESERT_CONFIG, TIERS, WATCHES_CONFIG, effectiveKeepFraction, tierForRank,
  setKeepFractionOverride,
} from './config.js';
import {
  rankIncident, runZoneSimulation, rateSensitivity, breakevenRate,
  makeRateVariant, baseCostFor, zoneStats, gaccStats, selectCoverageCrews,
  auditMoatPoint, pointInGeometry, runChunked,
} from './dispatch.js';
import {
  composeScenarioField, evalPlacement, rateGrid, headroomFromRows,
  premiumViability, candidateSites, nearestSites, crewCompetitiveCells,
  redundancyFold,
} from './planner.js';
import { buildCompare } from './compare.js';
import * as MapView from './map.js';
import * as ImsrLive from './imsr_live.js';  // IMSR-LIVE (removable)

/* ---------- tiny DOM helpers ---------- */
const $  = (id) => document.getElementById(id);
const el = (sel, root = document) => root.querySelector(sel);
const fmtMoney  = (n) => '$' + Math.round(n).toLocaleString();
const fmtRate   = (n) => '$' + Number(n).toFixed(2);
const fmtMiles  = (n) => Math.round(n).toLocaleString() + ' mi';
const fmtHours  = (h) => h < 1 ? Math.round(h * 60) + 'm' : h.toFixed(1) + 'h';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rgbCss = (a) => `rgb(${a[0]},${a[1]},${a[2]})`; // [r,g,b] → css (two-company swatches)

/* ---------- module state ---------- */
let lastIncidentRows = [];
let incidentFireMeta = null; // { name, id } when the active incident came from a fire click, else null
let lastZoneResult = null;
let zoneRadius = ZONE_SIM.defaultRadius;
let testRate = null;
let zonesGeojsonFailed = false;
// crew.id -> GACC abbreviation, by TRUE point-in-polygon membership against the
// dispatch-zone geometry (built once on first Zones load). Drives GACC stats and
// region list-filtering, so both match where each crew's dot actually sits — unlike
// the old disp_unit_id lookup, which misfiled ~17% of crews near region edges.
let crewGacc = null;
// Pending rate for the hypothetical DDL (the value shown before a pin is placed,
// and retained between placements). Initialized in init() from HYPO_CONFIG.
let hypoDraftRate = HYPO_CONFIG.defaultRate;

// While an incident is active, the map shows only the top-N crews for that
// incident; all other dots are hidden until the incident is cleared.
const INCIDENT_TOP_N = 30;
let incidentTopIds = null; // Set<crewId> when an incident is active, else null

// Sample dots are a debugging aid only — hidden in normal use to keep the map
// clean. Enable by loading the app with ?debugDots in the URL.
const DEBUG_DOTS = new URLSearchParams(location.search).has('debugDots');

// Company coverage view state. Supports one OR two companies: Company A is the
// primary slot, Company B is optional. When both are set, the overlay switches from
// the single red→emerald gradient to the four-case two-company coloring (see
// startCoverage / showCoverageLegend). `coverageSelectedIds` is the single source of
// truth for which crews are in the analysis and spans BOTH companies' crews.
let coverageCompanyA = null;         // primary company name or null
let coverageCompanyB = null;         // optional second company name or null
let coverageSelectedIds = new Set(); // crew ids included, across both companies
let coverageTimer = null;            // debounce handle for startCoverage()
// When a hypothetical DDL exists, optionally layer it onto the selected crews as one
// more analyzed crew in the moat union. Guarded by STATE.hypoCrew, so it has no
// effect (and the control is hidden) when no hypo is placed.
let coverageIncludeHypo = false;
// Which company the hypo counts for in two-company mode: 'A' or 'B'. Ignored in
// single-company mode (the gradient doesn't distinguish companies). Defaults to A.
let coverageHypoGroup = 'A';
// Map-dot visibility while the coverage overlay is active. false = show all crew
// dots (current behavior); true = show only the crews in the company analysis.
let coverageShowOnlyAnalyzed = false;

// The selected companies, A first, with blanks dropped.
function coverageCompanies() { return [coverageCompanyA, coverageCompanyB].filter(Boolean); }
// Two-company mode is active only when BOTH slots are filled (with distinct names).
function coverageIsDuo() { return !!(coverageCompanyA && coverageCompanyB); }
// Every crew belonging to the selected companies (A's crews then B's), cheapest
// first within each — the candidate pool the tier chips and checklists act on.
function coverageAllCompanyCrews() { return coverageCompanies().flatMap(companyCrews); }
// Which company a crew id belongs to in the current view: 'A', 'B', or null. The
// hypo follows its assigned group; real crews follow their company field.
function coverageGroupOf(id) {
  if (STATE.hypoCrew && id === STATE.hypoCrew.id) return coverageHypoGroup;
  const c = DATA.byId[id];
  if (!c) return null;
  if (c.company === coverageCompanyA) return 'A';
  if (c.company === coverageCompanyB) return 'B';
  return null;
}

// Crew ids currently in the coverage analysis: the selected crews (both companies),
// plus the hypothetical DDL when it exists and is toggled on.
function coverageAnalyzedIds() {
  const ids = new Set(coverageSelectedIds);
  if (coverageIncludeHypo && STATE.hypoCrew) ids.add(STATE.hypoCrew.id);
  return ids;
}

// Draw / update the violet competitive-radius circle for the selected crew.
function showRadiusCircle() {
  if (!STATE.selectedCrew) return;
  MapView.setRadiusCircle(STATE.selectedCrew.lat, STATE.selectedCrew.lng, zoneRadius);
}

// Compare mode (Phase 4): read-only FY2025-vs-FY2026 diff, computed ONCE from the
// two frozen canonicals and cached. Never feeds the engine or mutates active state.
let compareData = null;
let compareMode = false;
let compareSort = 'rate_delta';    // crew diff table sort key
let compareTab = 'crews';          // crews | flux | companies | zones
function getCompare() {
  return (compareData ||= buildCompare(DATA.crewsByYear[2025], DATA.crewsByYear[2026]));
}
// DispUnitID -> hucc_code (stable 1:1) + zone median-rate deltas, for the compare
// zone choropleth (colors the dispatch-zone overlay by FY25→FY26 median-rate shift).
let _unitToHucc = null, _zoneDeltaByCode = null;
function unitToHucc() {
  if (_unitToHucc) return _unitToHucc;
  _unitToHucc = new Map();
  for (const y of [2026, 2025]) for (const c of DATA.crewsByYear[y]) if (!_unitToHucc.has(c.disp_unit_id)) _unitToHucc.set(c.disp_unit_id, c.hucc_code);
  return _unitToHucc;
}
function compareZoneFill(unitId) {
  if (!_zoneDeltaByCode) _zoneDeltaByCode = new Map(getCompare().zoneRollup.map(z => [z.hucc_code, z.median_rate_delta]));
  const code = unitToHucc().get(unitId);
  const d = code != null ? _zoneDeltaByCode.get(code) : null;
  if (d == null) return { fillColor: '#64748b', fillOpacity: 0.10, color: '#64748b', weight: 1 };
  const neutral = [148, 163, 184], green = [45, 212, 127], red = [240, 82, 82];
  const t = Math.max(-1, Math.min(1, d / 3));   // zone medians move less than single crews; clamp ±$3
  const to = t < 0 ? green : red, k = Math.abs(t);
  const rgb = neutral.map((n, i) => Math.round(n + (to[i] - n) * k));
  return { fillColor: `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`, fillOpacity: 0.55, color: '#fff', weight: 1 };
}

/* ============================================================
   Bootstrap
   ============================================================ */
init();

async function init() {
  $('error-retry').addEventListener('click', () => location.reload());
  try {
    // Load BOTH contract years up front into SEPARATE frozen canonicals; they are
    // never merged into one competitive field. FY2026 is the default active year.
    const loaded = await Promise.all(Object.entries(YEARS).map(async ([y, cfg]) => {
      const res = await fetch(cfg.file);
      if (!res.ok) throw new Error(`${cfg.file}: HTTP ${res.status}`);
      return [Number(y), await res.json()];
    }));
    for (const [y, crews] of loaded) loadYear(y, crews);
    selectYear(STATE.year, { resetFilter: true });   // activate FY2026 (default)
  } catch (err) {
    return showError('Failed to load crew data', `Crew data could not be fetched (${err.message}). Serve over HTTP (e.g. python3 -m http.server) and retry.`);
  }

  window.__compare = getCompare;   // debug hook: inspect the cross-year diff in console
  MapView.initMap({
    onMapClick: handleMapClick,
    onMarkerClick: handleMarkerClick,
    onZoneClick: handleZoneClick,
    onHypoMarkerClick: handleHypoMarkerClick,
    onFireClick: handleFireClick,
  });
  // Sync the basemap to the current theme at boot so the two never diverge (dark
  // theme must show the dark vector basemap immediately, no toggle required).
  MapView.setTheme(STATE.theme);
  MapView.buildMarkers(DATA.crews, DATA.ddpGroups, STATE.clusterRadius);

  buildGlossary();
  wireControls();
  wireKeyboard();
  wireFireFilters();
  wireWatchFilter();
  await initImsrLive();   // IMSR-LIVE (removable): no-op unless IMSR_LIVE.enabled
  updateRateFill();
  updateClusterFill();
  updatePlSliderReadout();
  ffUpdateAcresReadout();
  applyFiltersAndRender();
  // Populate the wildfire filter facets (distinct states/GACCs + total count) in
  // the background — non-blocking, so a slow/failed ArcGIS call never holds the app.
  populateFireFacets();

  $('splash').hidden = true;
  $('app').hidden = false;
  MapView.invalidate();
}

function showError(title, msg) {
  $('splash').hidden = true;
  $('error-title').textContent = title;
  $('error-message').textContent = msg;
  $('error-screen').hidden = false;
}

/* Build ONE year's FROZEN canonical dataset (+ frozen derived lookups + rate
   bounds). Called once per year at startup. The frozen crews/objects turn any
   accidental cross-year mutation into a throw rather than silently wrong numbers. */
function loadYear(year, rawCrews) {
  const crews = rawCrews.slice().sort((a, b) => a.rank - b.rank);
  const byId = {};
  const ddpGroups = {};
  for (const c of crews) {
    // Marker/tier color is the ABSOLUTE-$ tier (tierForRank), the same scale for
    // both years — NOT the JSON's intra-year rank color. Set before freezing.
    c.color = tierForRank(c.rate);
    byId[c.id] = c;
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
    (ddpGroups[key] ||= []).push(c);
    Object.freeze(c);
  }
  // keep each ddp group sorted by rank so the cheapest drives the marker color
  for (const k in ddpGroups) { ddpGroups[k].sort((a, b) => a.rank - b.rank); Object.freeze(ddpGroups[k]); }
  const rates = crews.map(c => c.rate);
  DATA.crewsByYear[year]      = Object.freeze(crews);
  DATA.byIdByYear[year]       = Object.freeze(byId);
  DATA.ddpGroupsByYear[year]  = Object.freeze(ddpGroups);
  DATA.rateBoundsByYear[year] = { min: Math.floor(Math.min(...rates)), max: Math.ceil(Math.max(...rates)) };
}

/* Make `year` the ACTIVE field. Swaps the working views (mutable copies of the
   frozen canonicals so the hypo tool can inject), repoints RATE_BOUNDS, resets the
   year-specific GACC lookup, and syncs the slider + toggle chrome. Does NOT rebuild
   markers / re-render — init() and switchYear() own that. */
function selectYear(year, { resetFilter = false } = {}) {
  const oldBounds = { min: RATE_BOUNDS.min, max: RATE_BOUNDS.max };
  STATE.year = year;
  // fresh mutable working copies (frozen crew objects are shared; arrays/maps new)
  DATA.crews = DATA.crewsByYear[year].slice();
  DATA.byId = { ...DATA.byIdByYear[year] };
  DATA.ddpGroups = {};
  const src = DATA.ddpGroupsByYear[year];
  for (const k in src) DATA.ddpGroups[k] = src[k].slice();
  crewGacc = null;   // year-specific GACC membership rebuilds lazily on next Zones use

  // rate slider follows the active year; unfiltered stays unfiltered, otherwise the
  // current selection is clamped into the new range (never let the map go empty).
  const b = DATA.rateBoundsByYear[year];
  RATE_BOUNDS.min = b.min; RATE_BOUNDS.max = b.max;
  const rf = STATE.rateFilter;
  const wasFull = resetFilter || (rf.min <= oldBounds.min && rf.max >= oldBounds.max);
  STATE.rateFilter = wasFull
    ? { min: b.min, max: b.max }
    : { min: Math.min(Math.max(rf.min, b.min), b.max), max: Math.max(Math.min(rf.max, b.max), b.min) };
  applyYearBoundsToSlider();

  document.querySelectorAll('#year-bar .yr-btn').forEach(btn =>
    btn.classList.toggle('active', Number(btn.dataset.year) === year));
  const sub = $('brand-sub');
  if (sub) sub.textContent = `${YEARS[year].label} · ${DATA.crewsByYear[year].length} crews`;

  // Debug hook for the moat/incident consistency audit (rebound to the active field):
  // select a crew, then run __moatAudit(lat, lng) in the console. e.g. __moatAudit(41.2, -114.0)
  window.__moatAudit = (lat, lng) =>
    auditMoatPoint(STATE.selectedCrew, lat, lng, DATA.crews, STATE.plKey, STATE.timeFilter);
}

/* Push the active year's rate bounds + current selection into the slider DOM. */
function applyYearBoundsToSlider() {
  const rmin = $('rate-min'), rmax = $('rate-max');
  if (rmin && rmax) {
    rmin.min = rmax.min = RATE_BOUNDS.min;
    rmin.max = rmax.max = RATE_BOUNDS.max;
    rmin.value = STATE.rateFilter.min;
    rmax.value = STATE.rateFilter.max;
  }
  if ($('rate-lo')) $('rate-lo').textContent = `$${STATE.rateFilter.min.toFixed(0)}`;
  if ($('rate-hi')) $('rate-hi').textContent = `$${STATE.rateFilter.max.toFixed(0)}`;
  updateRateFill();
}

/* Year toggle. Preserve incident context (pin, PL, time, radius, theme, search) so
   the user can flip years on the SAME incident; drop year-specific selection/analysis
   (selected crew, zone/gacc filter, overlays, coverage, hypo, tier chip). */
function switchYear(year) {
  if (year === STATE.year || !DATA.crewsByYear[year]) return;
  removeHypotheticalCrewFromAnalysis();
  if (STATE.activeOverlay) clearActiveOverlay();
  resetCoverageSelection();
  if (STATE.selectedCrew || !$('detail-panel').hidden) closeDetail();
  STATE.zoneFilter = null;
  STATE.gaccFilter = null;
  activeTier = null;
  document.querySelectorAll('.stat-chips .chip').forEach(ch => ch.classList.remove('muted'));

  selectYear(year);

  MapView.buildMarkers(DATA.crews, DATA.ddpGroups, STATE.clusterRadius);
  if (STATE.incidentPin) renderIncident();   // re-rank the SAME incident on the new year's field
  applyFiltersAndRender();
}

function toggleYear() { switchYear(STATE.year === 2026 ? 2025 : 2026); }

/* Clear the company-coverage selection (crew ids reference the old year's field). */
function resetCoverageSelection() {
  coverageCompanyA = null; coverageCompanyB = null;
  coverageSelectedIds = new Set();
  coverageIncludeHypo = false; coverageHypoGroup = 'A'; coverageShowOnlyAnalyzed = false;
}

/* ============================================================
   Compare mode (Phase 4) — READ-ONLY FY2025 vs FY2026.
   Renders the cross-year diff (compare.js) into a tabbed panel. Never
   mutates active-year state and never feeds the dispatch engine.
   ============================================================ */
let compareSortDir = 1;   // 1 asc / -1 desc, paired with compareSort

function toggleCompare() { compareMode ? exitCompareMode() : enterCompareMode(); }

function enterCompareMode() {
  compareMode = true;
  STATE.compareYear = 2025;            // record only — never drives the engine
  $('btn-compare').classList.add('active');
  renderComparePanel();
  $('compare-panel').hidden = false;
  MapView.showCompareLayer(getCompare());   // read-only delta layer (held/entered/exited)
  refreshZonesForCompare();
}
function exitCompareMode() {
  compareMode = false;
  STATE.compareYear = null;
  $('btn-compare').classList.remove('active');
  closePanel('compare-panel');
  MapView.hideCompareLayer();
  refreshZonesForCompare();
  applyFiltersAndRender();             // restore the normal active-year dots + filter state
}
// Re-tint an already-open dispatch-zone overlay when compare mode flips (the zone
// choropleth colors by FY25→FY26 median-rate delta only while compare mode is on).
function refreshZonesForCompare() {
  if (STATE.activeOverlay === 'zones' && STATE.zoneMode === 'dispatch') { MapView.hideZones(); renderZones(); }
}
function setCompareTab(t) { compareTab = t; renderComparePanel(); }
function setCompareSort(k) {
  if (compareSort === k) compareSortDir *= -1; else { compareSort = k; compareSortDir = 1; }
  renderComparePanel();
}

// delta formatters: NEGATIVE = cheaper / better rank = "good" (green).
const _dCls = (n) => (n < 0 ? 'cmp-good' : n > 0 ? 'cmp-bad' : 'cmp-flat');
const dNum = (n, dp = 2, suf = '') => (n == null ? '—' : `<span class="${_dCls(n)}">${n > 0 ? '+' : ''}${Number(n).toFixed(dp)}${suf}</span>`);
const dInt = (n) => (n == null ? '—' : `<span class="${_dCls(n)}">${n > 0 ? '+' : ''}${n}</span>`);
const sInt = (n) => (n == null ? '—' : (n > 0 ? '+' : '') + n);
const _tdot = (c) => `<span class="tdot" style="background:var(--${c})"></span>`;

function renderComparePanel() {
  const c = getCompare();
  const body = compareTab === 'flux' ? cmpFluxHtml(c)
    : compareTab === 'companies' ? cmpCompaniesHtml(c)
    : compareTab === 'zones' ? cmpZonesHtml(c)
    : cmpCrewsHtml(c);
  const tab = (id, label) => `<button class="cmp-tab${compareTab === id ? ' active' : ''}" data-ctab="${id}">${label}</button>`;
  const panel = $('compare-panel');
  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="panel-title">⇄ FY2025 → FY2026 compare</div>
        <div class="panel-sub">Read-only · joined by crew ID · field grew ${c.counts.from} → ${c.counts.to}</div>
      </div>
      <div class="panel-head-btns">
        <button class="panel-min" data-min title="Minimize">–</button>
        <button class="panel-close" data-pc="compare-panel" title="Close (Esc)">×</button>
      </div>
    </div>
    <div class="cmp-tabs">
      ${tab('crews', `Crews · ${c.counts.held}`)}
      ${tab('flux', `Entered ${c.counts.entered} / Exited ${c.counts.exited}`)}
      ${tab('companies', `Companies · ${c.companyRollup.length}`)}
      ${tab('zones', `Zones · ${c.zoneRollup.length}`)}
    </div>
    <div class="cmp-legend">Map delta layer:
      <span class="cmp-sw sw-green"></span> cheaper
      <span class="cmp-sw sw-red"></span> pricier
      <span class="cmp-sw sw-ring"></span> entered
      <span class="cmp-sw sw-ghost"></span> exited</div>
    <div class="panel-body cmp-body">${body}</div>`;
  panel.querySelectorAll('.cmp-tab').forEach(b => b.addEventListener('click', () => setCompareTab(b.dataset.ctab)));
  panel.querySelectorAll('[data-sort]').forEach(h => h.addEventListener('click', () => setCompareSort(h.dataset.sort)));
  el('[data-pc]', panel).addEventListener('click', exitCompareMode);
  wireMinimize(panel);
}

function cmpCrewsHtml(c) {
  const rows = [...c.held].sort((a, b) => ((a[compareSort] ?? 0) - (b[compareSort] ?? 0)) * compareSortDir);
  const sh = (key, label) => `<th class="num sortable${compareSort === key ? ' sorted' : ''}" data-sort="${key}">${label}${compareSort === key ? (compareSortDir > 0 ? ' ▲' : ' ▼') : ''}</th>`;
  const body = rows.map(r => {
    const coChanged = r.company_from !== r.company_to;
    const company = coChanged
      ? `<span title="'25: ${esc(r.company_from)}&#10;'26: ${esc(r.company_to)}">${esc(r.company_to)} <span class="cmp-alias" title="name changed since FY2025">✎</span></span>`
      : `<span title="${esc(r.company_to)}">${esc(r.company_to)}</span>`;
    const zone = r.zone_moved
      ? `<span class="cmp-moved" title="${esc(r.zone_name_from)} → ${esc(r.zone_name_to)}">${r.zone_from}→${r.zone_to}</span>`
      : `${r.zone_to} ${esc(r.zone_name_to)}`;
    const ddp = r.ddp_moved ? `<span class="cmp-moved" title="${esc(r.ddp_from)}&#10;→ ${esc(r.ddp_to)}">${r.miles_moved} mi</span>` : '—';
    return `<tr>
      <td>${esc(r.id)}</td>
      <td class="t-company">${company}</td>
      <td class="num">${r.rate_from.toFixed(2)}→${r.rate_to.toFixed(2)}</td>
      ${'<td class="num">' + dNum(r.rate_delta) + '</td>'}
      <td class="num">${dNum(r.rate_pct_delta, 1, '%')}</td>
      <td class="num">${r.rank_from}→${r.rank_to}</td>
      <td class="num">${dInt(r.rank_delta)}</td>
      <td class="nowrap">${_tdot(r.color_from)}→${_tdot(r.color_to)}</td>
      <td>${zone}</td>
      <td class="num">${ddp}</td>
    </tr>`;
  }).join('');
  return `
    <div class="cmp-note"><b>Rate Δ is the primary signal.</b> Rank Δ also reflects the field growing ${c.counts.from}→${c.counts.to}, not price alone. Green = cheaper / improved rank.</div>
    <div class="cmp-table-wrap">
      <table class="dtable cmp-table">
        <thead><tr>
          <th>ID</th><th>Company (FY2026)</th><th class="num">Rate '25→'26</th>
          ${sh('rate_delta', 'Δ$')}${sh('rate_pct_delta', 'Δ%')}
          <th class="num">Rank '25→'26</th>${sh('rank_delta', 'ΔRank')}
          <th>Tier</th><th>Zone</th>${sh('miles_moved', 'DDP move')}
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function cmpFluxHtml(c) {
  const list = (arr) => arr.slice().sort((a, b) => a.rate - b.rate).map(x =>
    `<tr><td>${esc(x.id)}</td><td class="t-company" title="${esc(x.company)}">${esc(x.company)}</td><td class="num">$${x.rate.toFixed(2)}</td><td>${esc(x.hucc)}</td></tr>`).join('');
  const tbl = (arr) => `<table class="dtable cmp-table"><thead><tr><th>ID</th><th>Company</th><th class="num">Rate</th><th>Zone</th></tr></thead><tbody>${list(arr)}</tbody></table>`;
  return `
    <div class="cmp-note">Crews present in only one year — joined by ID. These are disjoint sets.</div>
    <div class="cmp-flux">
      <div class="cmp-flux-col">
        <div class="cmp-flux-head cmp-enter">▲ Entered — FY2026 only · ${c.entered.length}</div>
        <div class="cmp-table-wrap short">${tbl(c.entered)}</div>
      </div>
      <div class="cmp-flux-col">
        <div class="cmp-flux-head cmp-exit">▼ Exited — FY2025 only · ${c.exited.length}</div>
        <div class="cmp-table-wrap short">${tbl(c.exited)}</div>
      </div>
    </div>`;
}

function cmpCompaniesHtml(c) {
  const body = c.companyRollup.map(r => `<tr>
    <td class="t-company" title="${esc(r.company)}">${esc(r.company)}</td>
    <td class="num">${r.count_from} → ${r.count_to}</td>
    <td class="num">${sInt(r.count_delta)}</td>
    <td class="num">${r.held} / ${r.entered} / ${r.exited}</td>
    <td class="num">${dNum(r.median_rate_delta)}</td>
  </tr>`).join('');
  return `
    <div class="cmp-note">Companies unified across years by the <b>ID-derived alias</b> (majority FY2026 name for a company's FY2025 crews) — never fuzzy name matching.</div>
    <div class="cmp-table-wrap">
      <table class="dtable cmp-table">
        <thead><tr><th>Company (FY2026 alias)</th><th class="num">Crews '25→'26</th><th class="num">Δ</th><th class="num">Held/Ent/Exit</th><th class="num">Median rate Δ</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

function cmpZonesHtml(c) {
  const money = (n) => (n == null ? '—' : '$' + n.toFixed(2));
  const body = c.zoneRollup.map(r => `<tr>
    <td>${r.hucc_code} ${esc(r.hucc_name || '')}</td>
    <td class="num">${r.count_from} → ${r.count_to}</td>
    <td class="num">${sInt(r.count_delta)}</td>
    <td class="num">${money(r.median_rate_from)} → ${money(r.median_rate_to)}</td>
    <td class="num">${dNum(r.median_rate_delta)}</td>
  </tr>`).join('');
  return `
    <div class="cmp-note">Aggregated by <b>hucc_code</b>. "Median rate Δ" is the change in each zone's median crew rate (FY2026 − FY2025).</div>
    <div class="cmp-table-wrap">
      <table class="dtable cmp-table">
        <thead><tr><th>Zone (hucc_code)</th><th class="num">Crews '25→'26</th><th class="num">Δ</th><th class="num">Median rate '25→'26</th><th class="num">Δ median</th></tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>`;
}

/* ============================================================
   Filtering pipeline
   ============================================================ */
function visibleCrews() {
  const q = STATE.searchQuery.trim().toLowerCase();
  const { min, max } = STATE.rateFilter;
  return DATA.crews.filter(c => {
    if (c.rate < min || c.rate > max) return false;
    if (STATE.zoneFilter && c.disp_unit_id !== STATE.zoneFilter) return false;
    if (STATE.gaccFilter && (!crewGacc || crewGacc[c.id] !== STATE.gaccFilter)) return false;
    if (q) {
      const hay = (c.id + ' ' + c.company + ' ' + c.hucc).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function applyFiltersAndRender() {
  const vis = visibleCrews();
  // When an incident is active, the map is restricted to that incident's top-N
  // crews; the sidebar list/chips still reflect the normal filters.
  let mapIds = incidentTopIds || new Set(vis.map(c => c.id));
  // Company coverage "Show only analyzed crews": hide dots not in the analysis.
  if (STATE.activeOverlay === 'coverage' && coverageShowOnlyAnalyzed) {
    const analyzed = coverageAnalyzedIds();
    mapIds = new Set([...mapIds].filter(id => analyzed.has(id)));
  }
  MapView.applyFilter(mapIds);
  renderList(vis);
  renderStatChips(vis);
}

/* Refresh map dots after a coverage selection change — only needed when the
   "Show only analyzed crews" mode is active (otherwise dot visibility is fixed). */
function refreshCoverageDots() {
  if (STATE.activeOverlay === 'coverage' && coverageShowOnlyAnalyzed) applyFiltersAndRender();
}

/* ============================================================
   Crew list
   ============================================================ */
function renderList(vis) {
  const listEl = $('crew-list');
  $('crew-count').textContent = `${vis.length.toLocaleString()} crew${vis.length === 1 ? '' : 's'}`;
  if (vis.length === 0) {
    listEl.innerHTML = `<div class="list-empty">No crews match these filters.</div>`;
    return;
  }
  const CAP = 300;
  const shown = vis.slice(0, CAP);
  const rows = shown.map(c => {
    const groupN = DATA.ddpGroups[`${c.lat.toFixed(4)},${c.lng.toFixed(4)}`].length;
    const ddp = groupN > 1 ? `<span class="crew-ddp-badge" title="${groupN} crews share this DDP">⌂${groupN}</span>` : '';
    const sel = STATE.selectedCrew && STATE.selectedCrew.id === c.id ? ' selected' : '';
    return `<div class="crew-item${sel}" role="listitem" data-id="${c.id}">
      <span class="crew-rank">#${c.rank}</span>
      <span class="crew-dot" style="background:var(--${c.color})"></span>
      <span class="crew-main">
        <span class="crew-id-row"><span class="crew-id">${esc(c.id)}</span> ${ddp}</span>
        <span class="crew-company" title="${esc(c.company)}">${esc(c.company)}</span>
        <span class="crew-zone">${esc(c.hucc)}</span>
      </span>
      <span class="rate-badge ${c.color}">${fmtRate(c.rate)}</span>
    </div>`;
  }).join('');
  const more = vis.length > CAP
    ? `<div class="list-more">Showing top ${CAP} of ${vis.length.toLocaleString()} — refine search to see the rest</div>`
    : '';
  listEl.innerHTML = rows + more;

  listEl.querySelectorAll('.crew-item').forEach(node => {
    node.addEventListener('click', () => selectCrew(DATA.byId[node.dataset.id], { fly: true }));
  });
}

function renderStatChips(vis) {
  const counts = { green: 0, yellow: 0, orange: 0, red: 0 };
  const ratesByTier = { green: [], yellow: [], orange: [], red: [] };
  for (const c of vis) {
    counts[c.color]++;
    ratesByTier[c.color].push(c.rate);
  }
  for (const tier of ['green', 'yellow', 'orange', 'red']) {
    $(`chip-${tier}`).textContent = counts[tier].toLocaleString();
    const rangeEl = $(`chip-range-${tier}`);
    if (rangeEl) rangeEl.textContent = counts[tier] ? TIERS[tier].range : '';
  }
  // mirror into floating mini-chips
  const mini = $('mini-chips');
  mini.innerHTML = ['green', 'yellow', 'orange', 'red'].map(t => {
    const range = counts[t] ? `<span class="chip-range">${TIERS[t].range}</span>` : '';
    return `<button class="chip chip-${t}" data-tier="${t}"><span class="chip-dot"></span><span class="chip-body"><span class="chip-n">${counts[t].toLocaleString()}</span>${range}</span></button>`;
  }).join('');
  mini.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => toggleTierFilter(c.dataset.tier)));
}

/* clicking a stat chip filters list to that tier's rate window (quick filter) */
let activeTier = null;
function toggleTierFilter(tier) {
  if (activeTier === tier) {
    activeTier = null;
    STATE.rateFilter = { min: RATE_BOUNDS.min, max: RATE_BOUNDS.max };
  } else {
    const inTier = DATA.crews.filter(c => c.color === tier);
    if (!inTier.length) return; // empty tier: Math.min/max(...[]) would poison the rate filter with ±Infinity
    activeTier = tier;
    STATE.rateFilter = {
      min: Math.min(...inTier.map(c => c.rate)),
      max: Math.max(...inTier.map(c => c.rate)),
    };
  }
  syncRateSliders();
  document.querySelectorAll('.stat-chips .chip').forEach(ch =>
    ch.classList.toggle('muted', activeTier && ch.dataset.tier !== activeTier));
  applyFiltersAndRender();
}

/* ============================================================
   Controls wiring
   ============================================================ */
function wireControls() {
  // search
  const search = $('search');
  search.addEventListener('input', () => {
    STATE.searchQuery = search.value;
    $('search-clear').hidden = !search.value;
    applyFiltersAndRender();
  });
  $('search-clear').addEventListener('click', () => {
    search.value = ''; STATE.searchQuery = ''; $('search-clear').hidden = true;
    applyFiltersAndRender(); search.focus();
  });

  // rate dual slider
  const rmin = $('rate-min'), rmax = $('rate-max');
  const onRate = () => {
    let lo = parseFloat(rmin.value), hi = parseFloat(rmax.value);
    if (lo > hi) { [lo, hi] = [hi, lo]; }
    STATE.rateFilter = { min: lo, max: hi };
    activeTier = null;
    document.querySelectorAll('.stat-chips .chip').forEach(ch => ch.classList.remove('muted'));
    $('rate-lo').textContent = `$${lo.toFixed(0)}`;
    $('rate-hi').textContent = `$${hi.toFixed(0)}`;
    updateRateFill();
    applyFiltersAndRender();
  };
  rmin.addEventListener('input', onRate);
  rmax.addEventListener('input', onRate);

  // cluster radius
  const cr = $('cluster-radius');
  cr.addEventListener('input', () => {
    STATE.clusterRadius = parseInt(cr.value, 10);
    $('cluster-readout').textContent = STATE.clusterRadius + 'px';
    updateClusterFill();
  });
  cr.addEventListener('change', () => {
    const visIds = new Set(visibleCrews().map(c => c.id));
    MapView.setClusterRadius(STATE.clusterRadius, visIds);
  });

  // stat chips
  document.querySelectorAll('.stat-chips .chip').forEach(c =>
    c.addEventListener('click', () => toggleTierFilter(c.dataset.tier)));

  // PL bar (scoped to #pl-bar so the year toggle's segmented buttons aren't caught)
  document.querySelectorAll('#pl-bar .pl-btn').forEach(btn => {
    btn.addEventListener('click', () => setPL(btn.dataset.pl));
  });

  // Year toggle (FY2025 / FY2026) — segmented control under the PL bar
  document.querySelectorAll('#year-bar .yr-btn').forEach(btn => {
    btn.addEventListener('click', () => switchYear(Number(btn.dataset.year)));
  });

  // PL fine-tune slider: live readout on drag (cheap), recompute on release
  // (expensive overlays) — mirrors the rate / cluster sliders.
  const pls = $('pl-slider');
  pls.addEventListener('input', () => { STATE.plSlider = parseInt(pls.value, 10); updatePlSliderReadout(); });
  pls.addEventListener('change', () => setPlSlider(parseInt(pls.value, 10)));

  // sidebar toggle
  $('sidebar-toggle').addEventListener('click', toggleSidebar);

  // action buttons
  $('btn-incident').addEventListener('click', toggleIncidentMode);
  $('btn-planner').addEventListener('click', togglePlanner);
  $('btn-hypo').addEventListener('click', toggleHypoTool);
  $('btn-zones').addEventListener('click', toggleZones);
  document.querySelectorAll('#zone-mode .seg-btn').forEach(b =>
    b.addEventListener('click', () => setZoneMode(b.dataset.zmode)));
  $('btn-moat').addEventListener('click', toggleMoat);
  $('btn-coverage').addEventListener('click', toggleCoverage);
  $('btn-desert').addEventListener('click', toggleDesert);
  $('btn-compare').addEventListener('click', toggleCompare);
  $('btn-wildfire').addEventListener('click', toggleWildfire);
  $('btn-watches').addEventListener('click', toggleWatches);
  $('btn-theme').addEventListener('click', toggleTheme);
  $('btn-help').addEventListener('click', () => openModal('glossary'));

  // incident controls
  $('ic-clear').addEventListener('click', clearIncident);
  document.querySelectorAll('#time-filter .seg-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#time-filter .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      STATE.timeFilter = b.dataset.hr ? parseFloat(b.dataset.hr) : null;
      if (STATE.incidentPin) renderIncident();
    });
  });
  const ir = $('incident-radius');
  ir.addEventListener('input', () => {
    STATE.incidentRadius = parseInt(ir.value, 10);
    $('incident-radius-readout').textContent = STATE.incidentRadius >= 2000 ? 'whole map'
      : STATE.incidentRadius === 0 ? 'off' : STATE.incidentRadius + ' mi';
    if (STATE.incidentPin) MapView.setIncidentRadius(STATE.incidentPin.lat, STATE.incidentPin.lng, STATE.incidentRadius);
  });

  // modal close
  document.querySelectorAll('[data-close]').forEach(b =>
    b.addEventListener('click', () => closeModal(b.dataset.close)));
}

function syncRateSliders() {
  $('rate-min').value = STATE.rateFilter.min;
  $('rate-max').value = STATE.rateFilter.max;
  $('rate-lo').textContent = `$${STATE.rateFilter.min.toFixed(0)}`;
  $('rate-hi').textContent = `$${STATE.rateFilter.max.toFixed(0)}`;
  updateRateFill();
}

/* Paint the gradient "selected range" between the two rate thumbs. */
function updateRateFill() {
  const span = RATE_BOUNDS.max - RATE_BOUNDS.min || 1;
  let lo = parseFloat($('rate-min').value), hi = parseFloat($('rate-max').value);
  if (lo > hi) [lo, hi] = [hi, lo];
  const ds = el('.dual-slider');
  if (!ds) return;
  ds.style.setProperty('--lo', ((lo - RATE_BOUNDS.min) / span * 100) + '%');
  ds.style.setProperty('--ro', ((hi - RATE_BOUNDS.min) / span * 100) + '%');
}

/* Paint the gradient fill on the single cluster-radius slider. */
function updateClusterFill() {
  const cr = $('cluster-radius');
  if (!cr) return;
  const pct = (cr.value - cr.min) / ((cr.max - cr.min) || 1) * 100;
  cr.style.setProperty('--fill', pct + '%');
}

/* ============================================================
   PL
   ============================================================ */
function setPL(plKey) {
  STATE.plKey = plKey;
  document.querySelectorAll('#pl-bar .pl-btn').forEach(b => b.classList.toggle('active', b.dataset.pl === plKey));
  $('pl-desc').textContent = PL_CONFIG[plKey].label;
  updatePlSliderReadout();
  recomputeAnalyses();
}

/* Fine-tune slider committed (on release): apply the new intensity everywhere. */
function setPlSlider(value) {
  STATE.plSlider = value;
  updatePlSliderReadout();
  recomputeAnalyses();
}

/* Paint the slider fill + show the effective "% of field kept" and whether the
   current setting is lighter / nominal / heavier than the preset. */
function updatePlSliderReadout() {
  const slider = $('pl-slider');
  if (slider) {
    const pct = (slider.value - slider.min) / ((slider.max - slider.min) || 1) * 100;
    slider.style.setProperty('--fill', pct + '%');
  }
  const out = $('pl-slider-readout');
  if (out) {
    const keep = effectiveKeepFraction(STATE.plKey);
    const word = STATE.plSlider <= PL_SLIDER.min ? 'nominal' : 'heavier';
    out.textContent = `${Math.round(keep * 100)}% kept · ${word}`;
  }
}

/* Re-run only the on-screen ANALYSES (incident table, open detail panel, and
   any active overlay). Used when the PL preset / fine-tune slider changes:
   crew-set membership is unchanged, so the sidebar list and markers are left
   alone, and overlay caches are keyed by `plKey|plSlider` so they miss naturally
   for the new setting (no manual invalidation needed). */
function recomputeAnalyses() {
  if (STATE.incidentPin) renderIncident();
  if (STATE.selectedCrew && !$('detail-panel').hidden) renderDetail(STATE.selectedCrew);
  if (STATE.activeOverlay === 'moat' && STATE.selectedCrew) startMoat();
  if (STATE.activeOverlay === 'desert') startDesert();
  if (STATE.activeOverlay === 'coverage') startCoverage();
}

/* ============================================================
   IMSR-LIVE (removable): first live IMSR integration wiring.
   Inert unless ImsrLive.IMSR_LIVE.enabled AND imsr-live.json loaded. The default
   thinning mode stays 'pl' (existing behavior, untouched). Remove this section +
   the `// IMSR-LIVE` hooks elsewhere (imports, init, renderZones, handleFireClick,
   renderIncident) plus js/imsr_live.js + imsr-live.json to fully revert.
   ============================================================ */
let imsrThinningMode = 'pl';   // 'pl' (default = current behavior) | 'sitrep' (experimental)

async function initImsrLive() {
  if (!ImsrLive.IMSR_LIVE.enabled) return;   // master switch OFF → app unchanged
  await ImsrLive.loadImsrLive();             // fails safe; helpers stay inert on failure
  if (!ImsrLive.isReady()) return;
  injectThinningToggle();
}

// Small "Thinning" segmented control appended to the PL bar (mirrors #zone-mode).
function injectThinningToggle() {
  const bar = $('pl-bar');
  if (!bar || $('imsr-thin-mode')) return;
  const box = document.createElement('div');
  box.id = 'imsr-thin-mode';
  box.className = 'imsr-thin-mode';
  box.innerHTML = `
    <span class="imsr-thin-label">Thinning</span>
    <div class="seg imsr-thin-seg">
      <button class="seg-btn active" data-tmode="pl">PL</button>
      <button class="seg-btn" data-tmode="sitrep" title="Experimental: derive thinning from IMSR national crew totals (review-only)">Sit-rep (exp.)</button>
    </div>
    <span id="imsr-thin-readout" class="imsr-thin-readout"></span>`;
  bar.appendChild(box);
  box.querySelectorAll('.seg-btn').forEach(b =>
    b.addEventListener('click', () => setThinningMode(b.dataset.tmode)));
  updateThinningUI();
}

function setThinningMode(mode) {
  if (mode === imsrThinningMode) return;
  imsrThinningMode = mode;
  // Install / clear the keep-fraction override. config.js ignores a null/invalid
  // return, so a missing/invalid sit-rep value fails safe back to PL behavior.
  if (mode === 'sitrep') setKeepFractionOverride(() => ImsrLive.sitrepKeepFraction());
  else setKeepFractionOverride(null);
  updateThinningUI();
  updatePlSliderReadout();             // readout reflects the now-active keep-fraction
  MapView.invalidateOverlayCaches();   // keep-fraction changed though plKey/plSlider didn't
  recomputeAnalyses();                 // same refresh path a PL change uses
}

function updateThinningUI() {
  const box = $('imsr-thin-mode');
  if (!box) return;
  box.querySelectorAll('.seg-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tmode === imsrThinningMode));
  const out = $('imsr-thin-readout');
  if (out) out.textContent = imsrThinningMode === 'sitrep' ? ImsrLive.sitrepReadout() : '';
  const bar = $('pl-bar');
  if (bar) bar.classList.toggle('imsr-sitrep-active', imsrThinningMode === 'sitrep');
}

/* Full recompute after the crew FIELD changes (hypothetical DDL add/re-rate/
   remove): overlay caches share the same plKey|plSlider key but now describe a
   different field, so they must be dropped; the sidebar list / markers refresh
   to add or remove the hypo; then the analyses re-run. */
function recomputeForFieldChange() {
  MapView.invalidateOverlayCaches();
  if (!STATE.incidentPin) applyFiltersAndRender(); // refresh list/markers (hypo in/out)
  // Coverage panel shows an "Include hypothetical DDL" control that only exists
  // while a hypo is placed; rebuild it so the row appears/updates/disappears in
  // step with the hypo. recomputeAnalyses() below handles the footprint recompute.
  if (STATE.activeOverlay === 'coverage') renderCoveragePanel();
  // The Planning workspace reads STATE.hypoCrew as a subject; keep it in step when the
  // hypo is placed / re-rated / removed (only re-renders if the workspace is open).
  refreshPlannerIfOpen();
  recomputeAnalyses();
}

/* ============================================================
   Sidebar / theme
   ============================================================ */
function toggleSidebar() {
  STATE.sidebarOpen = !STATE.sidebarOpen;
  const app = $('app');
  app.classList.toggle('sidebar-collapsed', !STATE.sidebarOpen);
  $('sidebar-toggle').textContent = STATE.sidebarOpen ? '◀' : '▶';
  $('sidebar-toggle').title = STATE.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar';
  $('mini-chips').hidden = STATE.sidebarOpen;
  MapView.invalidate();
}

function toggleTheme() {
  STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', STATE.theme);
  $('btn-theme').textContent = STATE.theme === 'dark' ? '☾' : '☀';
  MapView.setTheme(STATE.theme);
}

/* ============================================================
   Crew selection / detail panel
   ============================================================ */
function selectCrew(crew, { fly = false } = {}) {
  if (!crew) return;
  STATE.selectedCrew = crew;
  testRate = null;
  $('btn-moat').disabled = false;
  // Drop any radius circle / dots from a previously analyzed crew.
  MapView.clearRadiusCircle();
  MapView.clearSampleDots();
  MapView.highlightCrew(crew);
  if (fly) MapView.flyToCrew(crew);
  closePanel('ddp-panel');
  // The incident ranking AND the moat are computed with the selected crew as the
  // Model-D subject (it is exempt from PL thinning; competitors are thinned around
  // it). So when the selection changes, BOTH must be recomputed for the new subject —
  // otherwise the detail badge / incident table / moat still describe the PREVIOUS
  // crew's hypothesis. This only drifts once PL thinning is active: at PL none nobody
  // is thinned, so the exempt subject is irrelevant and every crew's rank is the same
  // regardless of who is selected. (A locally-cheap crew is rank #1 on its own moat
  // but gets thinned out of a table ranked around a DIFFERENT subject — the exact
  // "moat says #1, incident says thinned out" contradiction seen at PL3/PL5.)
  if (STATE.incidentPin) renderIncident();          // re-rank with the new subject → fresh lastIncidentRows
  if (STATE.activeOverlay === 'moat') startMoat();  // redraw the moat for the newly selected crew
  renderDetail(crew);                               // reads the now-current lastIncidentRows
  // refresh list selection state
  document.querySelectorAll('.crew-item').forEach(n =>
    n.classList.toggle('selected', n.dataset.id === crew.id));
  refreshPlannerIfOpen(); // the newly-selected real crew is now an available subject
}

function renderDetail(crew) {
  const panel = $('detail-panel');
  const groupKey = `${crew.lat.toFixed(4)},${crew.lng.toFixed(4)}`;
  const group = DATA.ddpGroups[groupKey];
  const shareNote = group.length > 1
    ? `<div class="hint">⌂ Shares this DDP with ${group.length - 1} other crew${group.length > 2 ? 's' : ''}.</div>` : '';

  // incident rank badge
  let incidentBadge = '';
  if (STATE.incidentPin && lastIncidentRows.length) {
    const row = lastIncidentRows.find(r => r.crew.id === crew.id);
    // The selected crew is the Model-D subject, so PL thinning never removes it; the
    // only reason it can be absent is the time filter putting the incident out of reach.
    incidentBadge = row
      ? `<div class="rank-badge-lg" title="Rank at the active incident">◎ Rank #${row.rank} at incident · ${fmtMoney(row.cost)}</div>`
      : `<div class="note-flag">${STATE.timeFilter ? `Beyond the ${STATE.timeFilter}h mobilization window` : 'Not in the available field'} for the active incident.</div>`;
  }

  const noteFlag = crew.notes
    ? `<div class="note-flag">⚑ ${esc(crew.notes)}</div>` : '';

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="panel-title">${esc(crew.id)} · ${fmtRate(crew.rate)}/hr <span class="yr-tag">${YEARS[STATE.year].label}</span></div>
        <div class="panel-sub">${esc(crew.company)}</div>
      </div>
      <div class="panel-head-btns">
        <button class="panel-min" data-min title="Minimize">–</button>
        <button class="panel-close" data-pc="detail-panel" title="Close (Esc)">×</button>
      </div>
    </div>
    <div class="panel-body">
      ${incidentBadge}
      ${noteFlag}
      <div class="kv-grid">
        <div class="kv"><span class="kv-label">Global rank · ${YEARS[STATE.year].label}</span><span class="kv-val big">#${crew.rank}</span></div>
        <div class="kv"><span class="kv-label">Rate tier</span><span class="kv-val"><span class="tdot" style="background:var(--${crew.color})"></span>${capitalize(crew.color)}</span></div>
        <div class="kv"><span class="kv-label">Base cost</span><span class="kv-val">${fmtMoney(crew.base_cost)}</span></div>
        <div class="kv"><span class="kv-label">Dispatch zone</span><span class="kv-val" style="font-size:var(--text-base)">${esc(crew.hucc)}</span></div>
      </div>
      <div class="kv"><span class="kv-label">DDL</span><span class="kv-val" style="font-size:var(--text-sm);font-weight:500">${esc(crew.ddl)}</span></div>
      ${shareNote}

      <!-- Zone analysis -->
      <div class="section">
        <div class="section-title"><span><span class="accent">◈</span> Competitive radius</span>
          <span class="filter-readout" id="zr-readout">${zoneRadius} mi</span></div>
        <input id="zone-radius" class="range" type="range" min="${ZONE_SIM.minRadius}" max="${ZONE_SIM.maxRadius}" step="25" value="${zoneRadius}" />
        <div class="btn-row" style="margin-top:9px">
          <button id="run-zone" class="btn btn-primary full">Run simulation (~100 pts)</button>
        </div>
        <div id="zone-results"></div>
      </div>

      <!-- Rate sensitivity -->
      <div class="section">
        <div class="section-title"><span><span class="accent">$</span> Rate sensitivity</span></div>
        <div class="nudge-row">
          <button class="btn nudge" data-nudge="-0.5">−50¢</button>
          <button class="btn nudge" data-nudge="-0.1">−10¢</button>
          <input id="rate-test" class="input" type="number" step="0.01" value="${(testRate ?? crew.rate).toFixed(2)}" />
          <button class="btn nudge" data-nudge="0.1">+10¢</button>
          <button class="btn nudge" data-nudge="0.5">+50¢</button>
          <button class="btn nudge" id="rate-reset" title="Reset to current rate">↺</button>
        </div>
        <div id="rate-results" class="hint" style="margin-top:8px">Adjust rate, then run the simulation above to see the impact.</div>
      </div>

      <!-- Moat -->
      <div class="section">
        <div class="section-title"><span><span class="accent">▦</span> Moat overlay</span></div>
        <button id="detail-moat" class="btn full ${STATE.activeOverlay === 'moat' ? 'active' : ''}">${STATE.activeOverlay === 'moat' ? 'Hide moat map' : 'Show competitive moat (350mi)'}</button>
      </div>

      <!-- Planning workspace -->
      <div class="section">
        <div class="section-title"><span><span class="accent">⌘</span> Planning workspace</span></div>
        <button id="detail-planner" class="btn full">Analyze this crew in Planner</button>
        <div class="hint" style="margin-top:5px">Rate optimizer, candidate finder &amp; redundancy — for this real crew.</div>
      </div>
    </div>`;

  panel.hidden = false;
  wireMinimize(panel);

  // wire detail interactions
  el('[data-pc]', panel).addEventListener('click', () => closeDetail());
  const zr = $('zone-radius');
  zr.addEventListener('input', () => {
    zoneRadius = parseInt(zr.value, 10);
    $('zr-readout').textContent = zoneRadius + ' mi';
    showRadiusCircle(); // live-update the visible radius circle
  });
  $('run-zone').addEventListener('click', () => runZoneAnalysis(crew));
  panel.querySelectorAll('.nudge[data-nudge]').forEach(b =>
    b.addEventListener('click', () => nudgeRate(crew, parseFloat(b.dataset.nudge))));
  $('rate-reset').addEventListener('click', () => { testRate = null; $('rate-test').value = crew.rate.toFixed(2); $('rate-results').innerHTML = 'Reset to current rate.'; });
  $('rate-test').addEventListener('change', () => { testRate = parseFloat($('rate-test').value); runRateAnalysis(crew); });
  $('detail-moat').addEventListener('click', toggleMoat);
  $('detail-planner').addEventListener('click', () => openPlanner('real'));

  // re-render persisted results if present
  if (lastZoneResult && lastZoneResult.crewId === crew.id) renderZoneResults(lastZoneResult);
}

function closeDetail() {
  closePanel('detail-panel');
  STATE.selectedCrew = null;
  testRate = null;
  lastZoneResult = null;
  MapView.clearHighlight();
  MapView.clearSampleDots();
  MapView.clearRadiusCircle();
  document.querySelectorAll('.crew-item.selected').forEach(n => n.classList.remove('selected'));
  if (STATE.activeOverlay === 'moat') { STATE.activeOverlay = null; MapView.clearOverlayCells(); MapView.cancelOverlayJob(); updateOverlayButtons(); $('legend').hidden = true; }
  $('btn-moat').disabled = true;
  refreshPlannerIfOpen(); // the real-crew subject is no longer selected
}

/* ============================================================
   Zone analysis
   ============================================================ */
function runZoneAnalysis(crew) {
  const sourceCrew = testRate != null ? makeRateVariant(crew, testRate) : crew;
  const pool = testRate != null ? DATA.crews.map(c => c.id === crew.id ? sourceCrew : c) : DATA.crews;
  const result = runZoneSimulation(sourceCrew, zoneRadius, pool, STATE.plKey);
  result.crewId = crew.id;
  lastZoneResult = result;
  renderZoneResults(result);
  // Visible radius boundary for the analysis (separate from the incident circle).
  showRadiusCircle();
  // Sample dots are debug-only; hidden in normal use.
  if (DEBUG_DOTS) MapView.showSampleDots(result.points.slice(0, ZONE_SIM.sampleDotsOnMap));
  else MapView.clearSampleDots();
}

function renderZoneResults(r) {
  const box = $('zone-results');
  if (!box) return;

  // Defensive guard: under Model D the analyzed crew is always present, so this
  // only triggers if no grid points were generated for the radius.
  if (r.total_pts === 0) {
    box.innerHTML = `<div class="hint" style="margin-top:11px">No sample points generated for this radius.</div>`;
    return;
  }

  const threats = r.threat_list.length
    ? `<div class="section-title" style="margin-top:11px"><span>Threats (beat you ≥30%)</span></div>
       <table class="dtable"><thead><tr><th>Crew</th><th>Company</th><th class="num">Rate</th><th class="num">Beat%</th></tr></thead>
       <tbody>${r.threat_list.map(t => `
         <tr class="clickable" data-id="${t.id}">
           <td><span class="tdot" style="background:var(--${t.crew.color})"></span>${esc(t.id)}</td>
           <td class="t-company" title="${esc(t.crew.company)}">${esc(t.crew.company)}</td>
           <td class="num">${fmtRate(t.crew.rate)}</td>
           <td class="num">${t.beat_pct}%</td>
         </tr>`).join('')}</tbody></table>`
    : `<div class="hint" style="margin-top:9px">No crew beats you in ≥30% of sampled incidents — strong position.</div>`;

  box.innerHTML = `
    <div class="result-grid" style="margin-top:11px">
      <div class="result-cell"><div class="rc-val">${r.top10_pct}%</div><div class="rc-label">Top-10</div></div>
      <div class="result-cell"><div class="rc-val">${r.top20_pct}%</div><div class="rc-label">Top-20</div></div>
      <div class="result-cell"><div class="rc-val">${r.avg_rank}</div><div class="rc-label">Avg rank</div></div>
      <div class="result-cell"><div class="rc-val">${r.median_rank}</div><div class="rc-label">Median rank</div></div>
      <div class="result-cell"><div class="rc-val">${r.total_pts}</div><div class="rc-label">Pts sampled</div></div>
      <div class="result-cell"><div class="rc-val">${PL_CONFIG[STATE.plKey].keepFraction < 1 ? STATE.plKey.toUpperCase() : '—'}</div><div class="rc-label">PL</div></div>
    </div>
    <div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">
      <span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600;background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.5)">1–5: ${r.band1_5}</span>
      <span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600;background:rgba(132,204,22,.18);border:1px solid rgba(132,204,22,.5)">6–10: ${r.band6_10}</span>
      <span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600;background:rgba(234,179,8,.18);border:1px solid rgba(234,179,8,.5)">11–20: ${r.band11_20}</span>
      <span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:600;background:rgba(249,115,22,.18);border:1px solid rgba(249,115,22,.5)">21+: ${r.band21plus}</span>
    </div>
    <div class="hint" style="margin-top:5px;font-size:var(--text-xs)">#1 win rate: ${r.win_pct}% · top-5: ${r.top5_pct}% — diagnostic</div>
    ${threats}`;

  box.querySelectorAll('tr.clickable').forEach(tr =>
    tr.addEventListener('click', () => selectCrew(DATA.byId[tr.dataset.id], { fly: true })));
}

/* ============================================================
   Rate sensitivity
   ============================================================ */
function nudgeRate(crew, delta) {
  const cur = testRate != null ? testRate : crew.rate;
  testRate = Math.round((cur + delta) * 100) / 100;
  $('rate-test').value = testRate.toFixed(2);
  runRateAnalysis(crew);
}

function runRateAnalysis(crew) {
  if (testRate == null || isNaN(testRate)) return;
  const r = rateSensitivity(crew, testRate, zoneRadius, DATA.crews, STATE.plKey);
  const diff = testRate - crew.rate;
  const sign = (n) => (parseFloat(n) > 0 ? '+' : '');
  const cls = (n, invert = false) => {
    const v = parseFloat(n) * (invert ? -1 : 1);
    return v > 0 ? 'pos' : v < 0 ? 'neg' : '';
  };

  // breakeven vs top threat
  const topThreat = r.base.threat_list[0]?.crew;
  const be = topThreat ? breakevenRate(crew, topThreat, crew.lat, crew.lng) : null;

  $('rate-results').innerHTML = `
    <div class="result-grid">
      <div class="result-cell"><div class="rc-val ${diff > 0 ? 'neg' : diff < 0 ? 'pos' : ''}">${sign(diff)}${fmtRate(testRate).slice(1)}</div><div class="rc-label">Test rate (${sign(diff)}${diff.toFixed(2)})</div></div>
      <div class="result-cell"><div class="rc-val">#${r.new_gl_rank}</div><div class="rc-label">New global rank</div></div>
      <div class="result-cell"><div class="rc-val ${diff > 0 ? 'neg' : diff < 0 ? 'pos' : ''}">${sign(r.delta_base)}${fmtMoney(r.delta_base).slice(0)}</div><div class="rc-label">Δ base cost</div></div>
      <div class="result-cell"><div class="rc-val ${cls(r.delta_top10)}">${sign(r.delta_top10)}${r.delta_top10}%</div><div class="rc-label">Δ top-10</div></div>
      <div class="result-cell"><div class="rc-val ${cls(r.delta_rank, true)}">${sign(r.delta_rank)}${r.delta_rank}</div><div class="rc-label">Δ avg rank</div></div>
      <div class="result-cell"><div class="rc-val">${be ? fmtRate(be) : '—'}</div><div class="rc-label">Breakeven</div></div>
    </div>
    ${be ? `<div class="hint" style="margin-top:7px">Breakeven vs top threat <b>${esc(topThreat.id)}</b> (${fmtRate(topThreat.rate)}) at zone center: charge ≤ <b>${fmtRate(be)}</b> to tie.</div>` : ''}`;
}

/* ============================================================
   Standalone hypothetical DDL tool
   A user-placed "what-if" crew. Once dropped it is injected into DATA.crews and
   therefore participates — as a normal competitor — in every analysis that runs
   over the crew set: incident ranking, competitive radius, moat, and rate desert.
   The rank/color fields are display-only; all NICC math keys off base_cost / rate
   / lat / lng, so the hypo is exact in the analysis without re-ranking real crews.
   ============================================================ */

/* Global rate-rank position among REAL crews (for display only; does not mutate
   any real crew's rank). */
function globalRankForRate(rate) {
  let n = 1;
  for (const c of DATA.crews) { if (!c.hypo && c.rate < rate) n++; }
  return n;
}

/* Build a full crew object — same shape as a real crew — for the hypo DDL. */
function createHypotheticalCrew(lat, lng, rate) {
  const r = Math.round(Number(rate) * 100) / 100;
  const rank = globalRankForRate(r);
  return {
    id: HYPO_CONFIG.id,
    company: 'Hypothetical DDL',
    hucc_code: '', hucc_name: 'Hypothetical', hucc: 'Hypothetical placement',
    disp_unit_id: null,
    ddl: `Hypothetical @ ${lat.toFixed(3)}, ${lng.toFixed(3)}`,
    rate: r,
    base_cost: baseCostFor(r),
    lat, lng,
    geo_quality: 'hypothetical', notes: '',
    rank, color: tierForRank(r),   // tier from RATE (like real crews), not rank
    hypo: true,
  };
}

/* Inject the hypo crew into the live data structures (single instance). */
function addHypotheticalCrewToAnalysis(crew) {
  removeHypotheticalCrewFromAnalysis();
  DATA.crews.push(crew);
  DATA.crews.sort((a, b) => a.rank - b.rank);
  DATA.byId[crew.id] = crew;
  const key = `${crew.lat.toFixed(4)},${crew.lng.toFixed(4)}`;
  (DATA.ddpGroups[key] ||= []).push(crew);
  STATE.hypoCrew = crew;
}

/* Remove the hypo crew from the live data structures. */
function removeHypotheticalCrewFromAnalysis() {
  const existing = STATE.hypoCrew || DATA.byId[HYPO_CONFIG.id];
  if (!existing) return;
  DATA.crews = DATA.crews.filter(c => c.id !== HYPO_CONFIG.id);
  delete DATA.byId[HYPO_CONFIG.id];
  const key = `${existing.lat.toFixed(4)},${existing.lng.toFixed(4)}`;
  if (DATA.ddpGroups[key]) {
    DATA.ddpGroups[key] = DATA.ddpGroups[key].filter(c => c.id !== HYPO_CONFIG.id);
    if (DATA.ddpGroups[key].length === 0) delete DATA.ddpGroups[key];
  }
  STATE.hypoCrew = null;
}

/* Open / close the tool panel. */
function toggleHypoTool() {
  const panel = $('hypo-panel');
  if (!panel.hidden && STATE.mode !== 'hypo_placing') {
    closeHypoTool();
    return;
  }
  $('btn-hypo').classList.add('active');
  renderHypotheticalDDLTool();
}
function closeHypoTool() {
  if (STATE.mode === 'hypo_placing') { STATE.mode = 'browse'; MapView.setCrosshair(false); }
  closePanel('hypo-panel');
  $('btn-hypo').classList.remove('active');
}

/* Render the tool panel (placement, rate, and — once placed — standing). */
function renderHypotheticalDDLTool() {
  const panel = $('hypo-panel');
  const h = STATE.hypoCrew;
  const placing = STATE.mode === 'hypo_placing';
  const rateVal = (h ? h.rate : hypoDraftRate).toFixed(2);
  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="panel-title" style="color:var(--violet)">⚲ Hypothetical DDL</div>
        <div class="panel-sub">${h ? esc(h.ddl) : 'Place a what-if crew on the map'}</div>
      </div>
      <div class="panel-head-btns">
        <button class="panel-min" data-min title="Minimize">–</button>
        <button class="panel-close" data-pc="hypo-panel" title="Close">×</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="hint">A fully-simulated competitor. Once placed it’s ranked by exact NICC cost and counted in incident, competitive-radius, moat &amp; rate-desert analysis — just like a real crew.</div>

      <div class="section" style="border-top:none;padding-top:0">
        <div class="section-title"><span><span class="accent">⚑</span> Placement</span></div>
        <button id="hypo-place" class="btn full ${placing ? 'active' : ''}">${placing ? 'Click map to drop pin…' : h ? 'Re-place pin' : 'Click map to place DDL'}</button>
        ${h ? `<div class="hint" style="margin-top:6px">Location: ${h.lat.toFixed(3)}, ${h.lng.toFixed(3)}</div>` : ''}
      </div>

      <div class="section">
        <div class="section-title"><span><span class="accent">$</span> Rate ($/hr)</span></div>
        <div class="nudge-row">
          <button class="btn nudge" data-hnudge="-0.5">−50¢</button>
          <button class="btn nudge" data-hnudge="-0.1">−10¢</button>
          <input id="hypo-rate" class="input" type="number" step="0.01" min="1" value="${rateVal}" />
          <button class="btn nudge" data-hnudge="0.1">+10¢</button>
          <button class="btn nudge" data-hnudge="0.5">+50¢</button>
        </div>
      </div>

      ${h ? `
      <div class="section">
        <div class="section-title"><span><span class="accent">◈</span> Standing in the field</span></div>
        <div class="result-grid">
          <div class="result-cell"><div class="rc-val">#${h.rank}</div><div class="rc-label">Rate rank</div></div>
          <div class="result-cell"><div class="rc-val"><span class="tdot" style="background:var(--${h.color})"></span>${capitalize(h.color)}</div><div class="rc-label">Tier</div></div>
          <div class="result-cell"><div class="rc-val">${fmtMoney(h.base_cost)}</div><div class="rc-label">Base cost</div></div>
        </div>
        <div class="hint" style="margin-top:6px">Live in incident, competitive-radius, moat &amp; coverage analysis. Adjust the rate or re-place the pin above; everything recomputes instantly.</div>
        <div class="btn-row" style="margin-top:9px">
          <button id="hypo-remove" class="btn full">Remove hypothetical DDL</button>
        </div>`
      : `<div class="hint">Set a rate, then place the pin. Default $${HYPO_CONFIG.defaultRate.toFixed(2)} ≈ field median.</div>`}
      ${h ? `
      <div class="section">
        <button id="hypo-open-planner" class="btn full"><span class="accent">⌘</span>&nbsp; Open in Planning workspace</button>
        <div class="hint" style="margin-top:5px">Rate optimizer, candidate finder &amp; redundancy now live in the Planner (press <b>P</b>).</div>
      </div>` : ''}
    </div>`;
  panel.hidden = false;
  wireMinimize(panel);

  el('[data-pc]', panel).addEventListener('click', closeHypoTool);
  $('hypo-place').addEventListener('click', enterHypoPlacement);
  const rateInput = $('hypo-rate');
  rateInput.addEventListener('change', () => commitHypoRate(parseFloat(rateInput.value)));
  panel.querySelectorAll('.nudge[data-hnudge]').forEach(b =>
    b.addEventListener('click', () => commitHypoRate((parseFloat(rateInput.value) || hypoDraftRate) + parseFloat(b.dataset.hnudge))));
  if ($('hypo-remove')) $('hypo-remove').addEventListener('click', removeHypoCrew);
  if ($('hypo-open-planner')) $('hypo-open-planner').addEventListener('click', () => openPlanner('hypo'));
}

/* Arm placement mode — next map / marker click drops the hypo DDL. */
function enterHypoPlacement() {
  STATE.mode = 'hypo_placing';
  MapView.setCrosshair(true);
  renderHypotheticalDDLTool();
}

/* Drop the hypo DDL at a point with the current draft rate, inject, and refresh. */
function placeHypoCrew(lat, lng) {
  STATE.mode = 'browse';
  MapView.setCrosshair(false);
  const crew = createHypotheticalCrew(lat, lng, hypoDraftRate);
  addHypotheticalCrewToAnalysis(crew);
  MapView.setHypoPin(lat, lng);
  renderHypotheticalDDLTool();
  recomputeForFieldChange();
}

/* Apply a new rate to the (placed) hypo DDL, keeping its location. */
function commitHypoRate(rate) {
  if (isNaN(rate) || rate <= 0) return;
  hypoDraftRate = Math.round(rate * 100) / 100;
  if (STATE.hypoCrew) {
    const { lat, lng } = STATE.hypoCrew;
    const wasSelected = STATE.selectedCrew && STATE.selectedCrew.id === HYPO_CONFIG.id;
    const crew = createHypotheticalCrew(lat, lng, hypoDraftRate);
    addHypotheticalCrewToAnalysis(crew); // replaces the existing instance
    if (wasSelected) STATE.selectedCrew = crew;
    renderHypotheticalDDLTool();
    recomputeForFieldChange();
  } else {
    renderHypotheticalDDLTool(); // just update the draft value shown
  }
}

/* Remove the hypo DDL entirely and restore the real field. Tears down the whole
   hypo workflow: close the detail panel if the hypo was selected, close the hypo
   panel itself, and clear the pin — nothing stale is left on screen. The coverage
   panel re-renders via recomputeForFieldChange() and reverts to its "Add
   hypothetical crew" entry point. */
function removeHypoCrew() {
  const wasSelected = STATE.selectedCrew && STATE.selectedCrew.id === HYPO_CONFIG.id;
  coverageIncludeHypo = false; // drop it from any active coverage analysis
  removeHypotheticalCrewFromAnalysis();
  MapView.clearHypoPin();
  if (wasSelected) closeDetail();
  closeHypoTool();
  recomputeForFieldChange();
}

/* Clicking the hypo map marker: drop incident here / re-place / open its panel.
   The hypo panel is the crew's home, so a normal click reopens it rather than
   bouncing into the generic crew-detail/analysis panel. */
function handleHypoMarkerClick() {
  const h = STATE.hypoCrew;
  if (!h) return;
  if (STATE.mode === 'incident') return dropIncident(h.lat, h.lng);
  if (STATE.mode === 'hypo_placing') return placeHypoCrew(h.lat, h.lng);
  $('btn-hypo').classList.add('active');
  renderHypotheticalDDLTool();
}

/* ============================================================
   Part 1 planning tools — shared scenario state + three output panels
   (rate optimizer, candidate DDL finder, redundancy). All ranking flows
   through the unmodified engine via planner.js composition helpers; this
   block owns only UI state, panel rendering, and chunked run driving.
   Nothing here executes unless its tool is opened and Run is clicked, so
   existing outputs are untouched while these tools are inactive.
   ============================================================ */

/* -- Shared planning state (module lets, mirroring the coverage-state pattern) -- */
let hypoScenario = 'probe';     // 'probe' | 'add' | 'replace' (approved scenario semantics)
let hypoReplaceIds = new Set(); // explicit replacement scope for 'replace'
let plannerBand = 'top10';      // competitiveness band: top5 | top10 | top20 (NO top-30)
let plannerThreshold = 50;      // X% — share of sampled points that must sit in the band
let plannerRateGrid = { min: 56, max: 66, step: 1 }; // user-visible, user-editable
let plannerRadius = ZONE_SIM.defaultRadius;          // sample radius (same bounds as zone sim)
let plannerMaxCandidates = 40;  // finder bound: nearest-K candidate sites
let finderSort = 'headroom';    // 'headroom' | 'volume' | 'desert'
let plannerJob = null;          // active chunked run (cancel handle)
let optimizerRun = null;        // last optimizer result snapshot
let finderRun = null;           // last finder result snapshot
let redundRun = null;           // last redundancy result snapshot
let auditRun = null;            // last company-audit result snapshot
// Workspace UI state (the planner now lives in its own dedicated panel).
let plannerOpen = false;        // Planning workspace panel open
let plannerTool = 'optimizer';  // 'optimizer' | 'finder' | 'redund'
let plannerSubjectKind = 'hypo';// preferred subject: 'real' | 'hypo' (resolver falls back)
let redundMode = 'placement';   // 'placement' (subject vs company) | 'audit' (company internal)
let finderSelectedKey = null;   // finder row/marker linkage

const PLANNER_BANDS = [['top5', 'Top-5'], ['top10', 'Top-10'], ['top20', 'Top-20']];
// Scenario metadata: label, full sentence, and a badge color (reused by the pill).
const SCENARIO_META = {
  probe:   { label: 'Probe',   color: '#38bdf8', full: 'New company (probe) — scored vs the unmodified market' },
  add:     { label: 'Add',     color: '#10b981', full: 'Add to company (injection) — company field exempt from thinning' },
  replace: { label: 'Replace', color: '#f59e0b', full: 'Replace crews (injection) — replaced crews removed from the field' },
};
// Tool applicability (deliverable C) — shown in the UI so routing is explicit.
const TOOL_INFO = {
  optimizer: { icon: '⚙', name: 'Rate optimizer', applies: 'Real crew or hypothetical (single subject)' },
  finder:    { icon: '⌖', name: 'Candidate finder', applies: 'Real crew or hypothetical, as a rate template' },
  redund:    { icon: '⧉', name: 'Redundancy', applies: 'Real crew or hypothetical vs a company — or a whole-company audit' },
};
// Candidate categories (deliverable D) — a categorical read from TWO already-shown
// components (rate headroom position + low-rate band share). NOT a composite score.
const CAT = {
  premium:  { label: 'Premium',  color: '#a78bfa' },
  balanced: { label: 'Balanced', color: '#14b8a6' },
  volume:   { label: 'Volume',   color: '#f59e0b' },
  none:     { label: '—',        color: '#94a3b8' },
};
const plannerNum = (id, val, step, min, max, w = 62) =>
  `<input id="${id}" class="input" type="number" step="${step}" min="${min}" max="${max}" value="${val}" style="width:${w}px">`;

function cancelPlannerJob() { if (plannerJob) { plannerJob.cancel(); plannerJob = null; hideProgress(); } }

/* Real market = the live crew set minus any injected hypo (non-destructive). */
function plannerRealCrews() { return DATA.crews.filter(c => !c.hypo); }

/* Company scope (approved): the Coverage panel's selected-crew set. */
function plannerScopeCrews() {
  return [...coverageSelectedIds].map(id => DATA.byId[id]).filter(c => c && !c.hypo);
}

/* Compose the scenario field spec from current UI state (planner.js does the
   composition; the engine does all ranking). */
function buildPlannerSpec() {
  return composeScenarioField({
    scenario: hypoScenario,
    realCrews: plannerRealCrews(),
    scopeCrews: plannerScopeCrews(),
    replaceIds: hypoReplaceIds,
    plKey: STATE.plKey,
  });
}

/* Human-readable context line for a run snapshot (inputs are always shown). */
function plannerContextHtml(spec, extra = '') {
  const removed = spec.removed && spec.removed.length
    ? ` · replaced: ${spec.removed.map(c => esc(c.id)).join(', ')}` : '';
  return `<div class="hint">${esc(SCENARIO_META[spec.scenario].full)} · PL ${esc(spec.plKey)} ·
    field ${spec.field.length} crews${spec.mates.length ? ` (${spec.mates.length} company crews exempt)` : ''}${removed}
    · ${ZONE_SIM.points} pts/site · radius ${plannerRadius} mi${extra}</div>`;
}

/* The reason a scenario can't run yet (scope problems are surfaced, never guessed). */
function plannerBlockedHtml(spec) {
  if (spec.reason === 'no-scope') return `
    <div class="hint">This scenario needs a company scope — the crews selected in the
    <b>Company coverage</b> panel. None are selected.</div>
    <button id="planner-open-cov" class="btn full" style="margin-top:7px">Open Coverage panel</button>`;
  if (spec.reason === 'no-replace') return `
    <div class="hint">Replace scenario: mark at least one company crew as replaced
    (checklist in the Hypo DDL panel), so old crews are not silently left active.</div>`;
  return `<div class="hint">Scenario not ready.</div>`;
}
function wirePlannerBlocked(panel) {
  const b = el('#planner-open-cov', panel);
  if (b) b.addEventListener('click', () => { if (STATE.activeOverlay !== 'coverage') toggleCoverage(); });
}

/* ============================================================
   Planning workspace — one dedicated panel (subject picker · scenario ·
   tool switcher · inputs · results · map linkage). Everything below is UI +
   run driving; every rank/cost/share comes from the unmodified engine via
   planner.js. Nothing runs unless the workspace is open and a Run is clicked.
   ============================================================ */

/* ---- Subject model (deliverable B): a real selected crew and/or the hypo. */
function plannerSubjectOptions() {
  const opts = [];
  if (STATE.selectedCrew && !STATE.selectedCrew.hypo) opts.push({ kind: 'real', crew: STATE.selectedCrew });
  if (STATE.hypoCrew) opts.push({ kind: 'hypo', crew: STATE.hypoCrew });
  return opts;
}
function plannerSubject() {
  const opts = plannerSubjectOptions();
  if (!opts.length) return null;
  return opts.find(o => o.kind === plannerSubjectKind) || opts[0];
}

/* Colored scenario pill, reused wherever the mode must read at a glance. */
function scenarioPill() {
  const m = SCENARIO_META[hypoScenario];
  return `<span style="display:inline-block;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700;color:#0b1120;background:${m.color}">${m.label}</span>`;
}

/* ---- Workspace open/close ---- */
function openPlanner(preferKind) {
  if (preferKind && plannerSubjectOptions().some(o => o.kind === preferKind)) plannerSubjectKind = preferKind;
  plannerOpen = true;
  $('btn-planner').classList.add('active');
  renderPlannerPanel();
}
function togglePlanner() {
  if (plannerOpen && !$('planner-panel').hidden) { closePlanner(); return; }
  openPlanner();
}
function closePlanner() {
  plannerOpen = false;
  cancelPlannerJob();
  MapView.clearPlannerSites();
  $('btn-planner').classList.remove('active');
  closePanel('planner-panel');
}
// Re-render if the workspace is open (called when the subject field changes:
// hypo placed/removed, crew selected/deselected). Never touches other tools.
function refreshPlannerIfOpen() { if (plannerOpen && !$('planner-panel').hidden) renderPlannerPanel(); }

/* ---- Panel assembly ---- */
function renderPlannerPanel() {
  const panel = $('planner-panel');
  const subj = plannerSubject();
  const info = TOOL_INFO[plannerTool];
  const subLabel = subj ? (subj.kind === 'hypo' ? 'hypothetical' : subj.crew.id) : 'no subject';
  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="panel-title"><span class="accent">⌘</span> Planning workspace</div>
        <div class="panel-sub">${info.icon} ${info.name} · ${esc(subLabel)}</div>
      </div>
      <div class="panel-head-btns">
        <button class="panel-min" data-min title="Minimize">–</button>
        <button class="panel-close" data-pc="planner-panel" title="Close (P / Esc)">×</button>
      </div>
    </div>
    <div class="panel-body">
      ${subjectSectionHtml(subj)}
      <div class="seg" id="pl-tools" style="margin-top:2px">
        <button class="seg-btn${plannerTool === 'optimizer' ? ' active' : ''}" data-tool="optimizer">⚙ Optimizer</button>
        <button class="seg-btn${plannerTool === 'finder' ? ' active' : ''}" data-tool="finder">⌖ Finder</button>
        <button class="seg-btn${plannerTool === 'redund' ? ' active' : ''}" data-tool="redund">⧉ Redundancy</button>
      </div>
      <div class="hint" style="margin-top:5px">${info.icon} <b>${info.name}</b> · applies to: ${info.applies}.</div>
      ${toolBodyHtml(subj)}
    </div>`;
  panel.hidden = false;
  wireMinimize(panel);
  wirePlannerWorkspace(panel);
  drawFinderSites();
}

function subjectSectionHtml(subj) {
  const opts = plannerSubjectOptions();
  if (!opts.length) return `
    <div class="section" style="border-top:none;padding-top:0">
      <div class="section-title"><span><span class="accent">◎</span> Subject</span></div>
      <div class="hint">Pick a starting subject: select a real crew on the map, or place a hypothetical DDL.</div>
      <button id="pl-new-hypo" class="btn full" style="margin-top:7px"><span style="color:var(--violet)">⚲</span>&nbsp; Place a hypothetical DDL</button>
    </div>`;
  const seg = opts.map(o => `<button class="seg-btn${subj && subj.kind === o.kind ? ' active' : ''}" data-subj="${o.kind}">${o.kind === 'hypo' ? 'Hypothetical' : esc(o.crew.id)}</button>`).join('');
  const c = subj.crew;
  const where = subj.kind === 'hypo' ? (c.hucc_name || 'placement') : c.hucc;
  return `
    <div class="section" style="border-top:none;padding-top:0">
      <div class="section-title"><span><span class="accent">◎</span> Subject</span>
        <span class="filter-readout">${subj.kind === 'hypo' ? 'hypothetical' : 'real crew'}</span></div>
      <div class="seg" id="pl-subject">${seg}</div>
      <div class="hint" style="margin-top:6px"><b>${esc(c.id)}</b> · ${fmtRate(c.rate)}/hr · ${esc(where)}<br>${esc(c.ddl)}</div>
    </div>`;
}

/* Scenario chooser + company scope + replacement checklist (shared by every tool
   that composes a market field). */
function scenarioSectionHtml() {
  const scope = plannerScopeCrews();
  const scopeBlock = hypoScenario === 'probe' ? '' : `
    <div class="hint" style="margin-top:6px">Company scope: <b>${scope.length}</b> crew${scope.length === 1 ? '' : 's'}
      from the Coverage selection${scope.length ? '' : ' — <b>none selected</b>'}. <a href="#" id="pl-open-cov">Open Coverage…</a></div>
    ${hypoScenario === 'replace' && scope.length ? `
    <div class="cov-crewlist" style="margin-top:6px;max-height:120px">
      ${scope.map(c => `<label class="cov-crew"><input type="checkbox" data-replace="${esc(c.id)}"${hypoReplaceIds.has(c.id) ? ' checked' : ''}>
        <span class="tdot" style="background:var(--${c.color})"></span><span class="cov-crew-id">${esc(c.id)}</span>
        <span class="hint">replace</span><span class="rate-badge ${c.color}">${fmtRate(c.rate)}</span></label>`).join('')}
    </div>
    <div class="hint" style="margin-top:4px">${hypoReplaceIds.size} marked replaced — removed from the field, never silently active.</div>` : ''}`;
  return `
    <div class="section">
      <div class="section-title"><span><span class="accent">⌘</span> Scenario</span>${scenarioPill()}</div>
      <div class="seg" id="pl-scenario">
        <button class="seg-btn${hypoScenario === 'probe' ? ' active' : ''}" data-scn="probe" title="New company entering — probe vs the unmodified market">New co.</button>
        <button class="seg-btn${hypoScenario === 'add' ? ' active' : ''}" data-scn="add" title="Existing company adding crews">Add</button>
        <button class="seg-btn${hypoScenario === 'replace' ? ' active' : ''}" data-scn="replace" title="Existing company replacing crews">Replace</button>
      </div>
      <div class="hint" style="margin-top:5px">${SCENARIO_META[hypoScenario].full}.</div>
      ${scopeBlock}
    </div>`;
}

/* Band + threshold + rate grid + radius (optimizer & finder). */
function inputsSectionHtml() {
  return `
    <div class="section">
      <div class="section-title"><span>Competitiveness target</span></div>
      <div class="ic-row ic-filters">
        <span class="ic-label">Band</span>
        <div class="seg seg-sm" id="pl-band">${PLANNER_BANDS.map(([k, l]) => `<button class="seg-btn${plannerBand === k ? ' active' : ''}" data-band="${k}">${l}</button>`).join('')}</div>
        <span class="ic-label" title="Share of sampled points that must land in the band">≥</span>${plannerNum('pl-threshold', plannerThreshold, 5, 0, 100, 52)}<span class="hint">%</span>
      </div>
      <div class="ic-row ic-filters"><span class="ic-label">Rate grid</span>${plannerNum('pl-gmin', plannerRateGrid.min, 0.25, 40, 90)} – ${plannerNum('pl-gmax', plannerRateGrid.max, 0.25, 40, 90)} step ${plannerNum('pl-gstep', plannerRateGrid.step, 0.05, 0.05, 10, 52)}</div>
      <div class="ic-row ic-filters"><span class="ic-label">Radius</span>${plannerNum('pl-radius', plannerRadius, 25, ZONE_SIM.minRadius, ZONE_SIM.maxRadius)}<span class="hint">mi · ${ZONE_SIM.points} pts</span></div>
    </div>`;
}

/* Dispatch to the active tool's body. */
function toolBodyHtml(subj) {
  if (plannerTool === 'optimizer') return optimizerBodyHtml(subj);
  if (plannerTool === 'finder') return finderBodyHtml(subj);
  return redundBodyHtml(subj);
}

/* ============ Rate optimizer — subject's rate swept at ITS location. ============ */
function optimizerBodyHtml(subj) {
  if (!subj) return '<div class="section"><div class="hint">Choose a subject above.</div></div>';
  const spec = buildPlannerSpec();
  const { rates, truncated } = rateGrid(plannerRateGrid);
  let run;
  if (!spec.ok) run = plannerBlockedHtml(spec);
  else {
    const evals = rates.length * ZONE_SIM.points * spec.field.length;
    run = `${plannerContextHtml(spec)}
      <div class="hint" style="margin-top:5px">Sweep <b>${esc(subj.crew.id)}</b>'s rate at its location · $${plannerRateGrid.min}–$${plannerRateGrid.max}/$${plannerRateGrid.step}
        → ${rates.length} rates${truncated ? ' <b>(truncated)</b>' : ''} · ≈ ${evals.toLocaleString()} exact engine evaluations</div>
      <button id="pl-run-opt" class="btn btn-primary full" style="margin-top:8px" ${rates.length ? '' : 'disabled'}>Run rate sweep</button>`;
  }
  const results = optimizerRun && optimizerRun.subjectId === subj.crew.id ? renderOptimizerResults(optimizerRun) : '';
  return scenarioSectionHtml() + inputsSectionHtml() + `<div class="section">${run}<div id="pl-opt-results">${results}</div></div>`;
}

function runOptimizer() {
  const subj = plannerSubject();
  if (!subj) return;
  const spec = buildPlannerSpec();
  if (!spec.ok) { renderPlannerPanel(); return; }
  const { rates, truncated } = rateGrid(plannerRateGrid);
  if (!rates.length) return;
  cancelPlannerJob();
  const h = subj.crew;
  const snapshot = {
    subjectId: h.id, subjectLabel: h.id,
    grid: { ...plannerRateGrid, rates: rates.slice(), truncated },
    band: plannerBand, threshold: plannerThreshold, radius: plannerRadius,
    spec, at: { lat: h.lat, lng: h.lng, ddl: h.ddl }, rows: [], t0: performance.now(),
  };
  showProgress('Rate sweep…');
  plannerJob = runChunked(rates, (rate) => {
    snapshot.rows.push(evalPlacement(h, h.lat, h.lng, rate, spec, plannerRadius));
  }, {
    chunk: 1,
    onProgress: (d, t) => setProgress(`Rate sweep… ${d}/${t}`),
    onDone: () => {
      plannerJob = null; hideProgress();
      snapshot.rows.sort((a, b) => a.rate - b.rate);
      snapshot.head = headroomFromRows(snapshot.rows, snapshot.band, snapshot.threshold);
      snapshot.elapsed = performance.now() - snapshot.t0;
      optimizerRun = snapshot;
      renderPlannerPanel();
    },
  });
}

function renderOptimizerResults(r) {
  const bandLabel = PLANNER_BANDS.find(([k]) => k === r.band)[1];
  const pct = (v) => v.toFixed(0) + '%';
  const rows = r.rows.map(row => {
    const ok = row.share[r.band] >= r.threshold;
    const isHead = r.head.headroom != null && row.rate === r.head.headroom;
    return `<tr${isHead ? ' style="font-weight:700;background:rgba(167,139,250,.12)"' : ''}>
      <td>${fmtRate(row.rate)}${isHead ? ' ◂' : ''}</td>
      <td class="num">${pct(row.share.top5)}</td><td class="num">${pct(row.share.top10)}</td>
      <td class="num">${pct(row.share.top20)}</td><td class="num">${row.avg_rank.toFixed(1)}</td>
      <td class="num">${ok ? '✓' : '—'}</td></tr>`;
  }).join('');
  return `
    <div class="result-grid" style="margin-top:9px">
      <div class="result-cell"><div class="rc-val">${r.head.headroom != null ? fmtRate(r.head.headroom) : '—'}</div><div class="rc-label">Rate headroom</div></div>
      <div class="result-cell"><div class="rc-val">${r.head.headroomRow ? pct(r.head.headroomRow.share[r.band]) : '—'}</div><div class="rc-label">${bandLabel} @ headroom</div></div>
      <div class="result-cell"><div class="rc-val">${(r.elapsed / 1000).toFixed(1)}s</div><div class="rc-label">Compute</div></div>
    </div>
    ${r.head.nonMonotonic ? `<div class="hint" style="margin-top:5px">⚠ Non-monotonic: qualification is not contiguous over the grid — qualifying rates: ${r.head.qualifyingRates.map(x => '$' + x).join(', ')}.</div>` : ''}
    <div class="hint" style="margin-top:5px">Headroom = highest tested rate with ${bandLabel} share ≥ ${r.threshold}%.
      Grid $${r.grid.min}–$${r.grid.max} step $${r.grid.step} (${r.grid.rates.length} rates${r.grid.truncated ? ', truncated' : ''}), ${ZONE_SIM.points} pts, ${r.radius} mi, PL ${esc(r.spec.plKey)}.</div>
    <table class="dtable" style="margin-top:7px"><thead><tr>
      <th>Rate</th><th class="num">Top-5</th><th class="num">Top-10</th><th class="num">Top-20</th><th class="num">Avg rk</th><th class="num">≥${r.threshold}%</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

/* ============ Candidate finder — nearest-K real DDP sites × rate grid. ============ */
function finderBodyHtml(subj) {
  if (!subj) return '<div class="section"><div class="hint">Choose a subject above (its rate is the template carried to each candidate site).</div></div>';
  const spec = buildPlannerSpec();
  const { rates, truncated } = rateGrid(plannerRateGrid);
  let run;
  if (!spec.ok) run = plannerBlockedHtml(spec);
  else {
    const totalSites = candidateSites(plannerRealCrews()).length;
    const k = Math.min(plannerMaxCandidates, totalSites);
    const sims = k * rates.length;
    const evals = sims * ZONE_SIM.points * spec.field.length;
    run = `${plannerContextHtml(spec)}
      <div class="ic-row ic-filters" style="margin-top:6px"><span class="ic-label">Candidates</span>
        <input id="pl-finder-max" class="input" type="number" step="5" min="5" max="${totalSites}" value="${plannerMaxCandidates}" style="width:62px">
        <span class="hint">nearest of ${totalSites} real DDP sites to ${esc(subj.crew.id)}</span></div>
      <div class="hint" style="margin-top:5px">Cost: ${k} sites × ${rates.length} rates${truncated ? ' (grid truncated)' : ''}
        = ${sims} sims × ${ZONE_SIM.points} pts × ${spec.field.length} crews ≈ ${evals.toLocaleString()} exact engine evaluations —
        never approximated; shrink candidates/rates to go faster.</div>
      <button id="pl-run-finder" class="btn btn-primary full" style="margin-top:8px" ${rates.length ? '' : 'disabled'}>Run candidate search</button>`;
  }
  const results = finderRun && finderRun.subjectId === subj.crew.id ? renderFinderResults(finderRun) : '';
  return scenarioSectionHtml() + inputsSectionHtml() + `<div class="section">${run}<div id="pl-finder-results">${results}</div></div>`;
}

function runFinder() {
  const subj = plannerSubject();
  if (!subj) return;
  const spec = buildPlannerSpec();
  if (!spec.ok) { renderPlannerPanel(); return; }
  const { rates, truncated } = rateGrid(plannerRateGrid);
  if (!rates.length) return;
  cancelPlannerJob();
  const h = subj.crew;
  const real = plannerRealCrews();
  const sites = nearestSites(candidateSites(real), h.lat, h.lng, plannerMaxCandidates);
  const items = [];
  for (const site of sites) for (const rate of rates) items.push({ site, rate });
  const bySite = new Map(sites.map(s => [s.key, []]));
  const snapshot = {
    subjectId: h.id, grid: { ...plannerRateGrid, rates: rates.slice(), truncated },
    band: plannerBand, threshold: plannerThreshold, radius: plannerRadius,
    spec, anchor: { lat: h.lat, lng: h.lng, ddl: h.ddl }, t0: performance.now(),
  };
  finderSelectedKey = null;
  showProgress('Candidate search…');
  plannerJob = runChunked(items, ({ site, rate }) => {
    bySite.get(site.key).push(evalPlacement(h, site.lat, site.lng, rate, spec, plannerRadius));
  }, {
    chunk: 1,
    onProgress: (d, t) => setProgress(`Candidate search… ${Math.round(d / t * 100)}%`),
    onDone: () => {
      plannerJob = null; hideProgress();
      snapshot.results = sites.map(site => {
        const rows = bySite.get(site.key).sort((a, b) => a.rate - b.rate);
        return {
          site, rows,
          head: headroomFromRows(rows, snapshot.band, snapshot.threshold),
          lowShare: rows[0].share[snapshot.band],
          desert: premiumViability(site.lat, site.lng, real, snapshot.spec.plKey),
        };
      });
      snapshot.elapsed = performance.now() - snapshot.t0;
      finderRun = snapshot;
      renderPlannerPanel();
    },
  });
}

/* Categorical read (deliverable D) from two ALREADY-DISPLAYED components — the
   rate-headroom position on the grid and the low-rate band share. Transparent
   cutoffs, not a blended score. */
function candidateCategory(x, grid) {
  if (x.head.headroom == null) return { key: 'none', ...CAT.none };
  const span = Math.max(grid.step, grid.max - grid.min);
  const h = (x.head.headroom - grid.min) / span; // 0..1 how far up the grid it still holds the band
  const v = x.lowShare / 100;                     // band share at the cheapest grid rate
  if (h >= 0.66) return { key: 'premium', ...CAT.premium };
  if (h < 0.33 && v >= 0.66) return { key: 'volume', ...CAT.volume };
  return { key: 'balanced', ...CAT.balanced };
}

function renderFinderResults(r) {
  const bandLabel = PLANNER_BANDS.find(([k]) => k === r.band)[1];
  const withCat = r.results.map(x => ({ x, cat: candidateCategory(x, r.grid) }));
  const sorted = withCat.slice().sort((a, b) => {
    if (finderSort === 'volume') return b.x.lowShare - a.x.lowShare;
    if (finderSort === 'desert') return (b.x.desert ? b.x.desert.avg : -1) - (a.x.desert ? a.x.desert.avg : -1);
    return (b.x.head.headroom ?? -1) - (a.x.head.headroom ?? -1);
  });
  const sortBtn = (key, label, title) =>
    `<button class="btn btn-sm finder-sort${finderSort === key ? ' active' : ''}" data-fsort="${key}" title="${title}">${label}</button>`;
  const rows = sorted.map(({ x, cat }) => {
    const sel = finderSelectedKey === x.site.key;
    return `<tr class="clickable${sel ? ' me' : ''}" data-fkey="${esc(x.site.key)}">
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${cat.color};margin-right:5px" title="${cat.label}"></span>${esc(x.site.label)}<span class="hint"> ·${x.site.crews.length}⌂</span></td>
      <td class="num">${Math.round(x.site.dist)}</td>
      <td class="num">${x.head.headroom != null ? fmtRate(x.head.headroom) : '—'}</td>
      <td class="num">${x.lowShare.toFixed(0)}%</td>
      <td class="num">${x.desert ? fmtRate(x.desert.avg) : '—'}</td>
      <td>${x.head.nonMonotonic ? '<span title="Non-monotonic; qualifying rates ' + x.head.qualifyingRates.map(q => '$' + q).join(', ') + '">⚠</span>' : ''}</td>
    </tr>`;
  }).join('');
  const legend = ['premium', 'volume', 'balanced', 'none'].map(k =>
    `<span style="margin-right:9px"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${CAT[k].color};margin-right:3px"></span>${CAT[k].label}</span>`).join('');
  return `
    <div class="hint" style="margin-top:9px">Dots ${legend}— <b>Premium</b>: still holds ${bandLabel} high up the grid (headroom in the top third).
      <b>Volume</b>: only strong when cheap. <b>Balanced</b>: in between. Map dots share these colors; click a row or dot to link them.</div>
    <div class="hint" style="margin-top:4px">Headroom = highest rate on grid $${r.grid.min}–$${r.grid.max}/$${r.grid.step} (${r.grid.rates.length} rates${r.grid.truncated ? ', truncated' : ''}) with ${bandLabel} share ≥ ${r.threshold}%.
      Vol = ${bandLabel} share at $${r.grid.min}. Desert = existing Rate Desert avg here (read-only). ${(r.elapsed / 1000).toFixed(1)}s.</div>
    <div class="btn-row" style="margin-top:6px">
      ${sortBtn('headroom', 'Premium', 'Sort by rate headroom')}
      ${sortBtn('volume', 'Volume', 'Sort by low-rate band share')}
      ${sortBtn('desert', 'Desert', 'Sort by Rate Desert avg')}
    </div>
    <table class="dtable" style="margin-top:6px"><thead><tr>
      <th>Site</th><th class="num">mi</th><th class="num">Headroom</th><th class="num">Vol</th><th class="num">Desert</th><th></th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

/* ---- Finder ↔ map linkage (deliverable D): candidate markers colored by
   category; clicking a marker or a row selects the site in both places. ---- */
function drawFinderSites() {
  if (!plannerOpen || plannerTool !== 'finder' || !finderRun || !finderRun.results) { MapView.clearPlannerSites(); return; }
  MapView.showPlannerSites(finderRun.results.map(x => {
    const cat = candidateCategory(x, finderRun.grid);
    return {
      lat: x.site.lat, lng: x.site.lng, color: cat.color, selected: finderSelectedKey === x.site.key,
      label: `${esc(x.site.label)} · ${cat.label}${x.head.headroom != null ? ` · ≤${fmtRate(x.head.headroom)}` : ' · not competitive'}`,
      onClick: () => selectFinderSite(x.site.key),
    };
  }));
}
function selectFinderSite(key) {
  finderSelectedKey = key;
  const x = finderRun && finderRun.results.find(r => r.site.key === key);
  if (x) MapView.panTo(x.site.lat, x.site.lng);
  renderPlannerPanel();
}

/* ============ Redundancy — subject vs company, OR whole-company audit. ============ */
function redundBodyHtml(subj) {
  const scope = plannerScopeCrews();
  const modeSeg = `
    <div class="seg" id="pl-redund-mode" style="margin-top:2px">
      <button class="seg-btn${redundMode === 'placement' ? ' active' : ''}" data-rmode="placement">Placement vs company</button>
      <button class="seg-btn${redundMode === 'audit' ? ' active' : ''}" data-rmode="audit">Company audit</button>
    </div>`;

  if (redundMode === 'audit') {
    let run;
    if (scope.length < 2) run = `<div class="hint">Company audit needs a company scope of at least 2 crews.
      <a href="#" id="pl-open-cov">Open Coverage…</a> to select some.</div>`;
    else {
      const evals = scope.length * '≈'.length;
      run = `<div class="hint">Audit the ${scope.length} selected company crews: each crew's footprint vs the rest, so you can see
        which existing crews overlap. Field = the company selection exempt (add-style) at PL ${esc(STATE.plKey)}.</div>
        <button id="pl-run-audit" class="btn btn-primary full" style="margin-top:8px">Run company audit</button>`;
    }
    const results = auditRun ? renderAuditResults(auditRun) : '';
    return `<div class="section">${modeSeg}</div><div class="section">${run}<div id="pl-audit-results">${results}</div></div>`;
  }

  // placement mode
  if (!subj) return `<div class="section">${modeSeg}</div><div class="section"><div class="hint">Choose a subject above, or switch to Company audit.</div></div>`;
  if (hypoScenario === 'probe') return `<div class="section">${modeSeg}</div>` + scenarioSectionHtml() + `<div class="section">
    <div class="hint">Redundancy is a company-portfolio question — there is no existing company footprint in <b>probe</b> mode.
    Switch the scenario to <b>Add</b> or <b>Replace</b> to compare against a company.</div></div>`;
  const spec = buildPlannerSpec();
  let run;
  if (!spec.ok) run = plannerBlockedHtml(spec);
  else {
    const mates = spec.mates.filter(c => c.id !== subj.crew.id);
    const nCells = Math.round(Math.PI * (MOAT_CONFIG.coverageRadius / 69 / MOAT_CONFIG.cellDegrees) ** 2);
    run = `${plannerContextHtml(spec, ` · footprints at ${MOAT_CONFIG.coverageRadius} mi (coverage lattice)`)}
      <div class="hint" style="margin-top:5px">Compare <b>${esc(subj.crew.id)}</b> against ${mates.length} company crew${mates.length === 1 ? '' : 's'}
        (excluding the subject itself) · ${1 + mates.length} footprints × ~${nCells.toLocaleString()} land cells × ${spec.field.length} crews — exact engine, chunked.</div>
      <button id="pl-run-redund" class="btn btn-primary full" style="margin-top:8px" ${mates.length ? '' : 'disabled'}>Run redundancy check</button>
      ${mates.length ? '' : '<div class="hint" style="margin-top:5px">No company crews to compare against (scope has only the subject).</div>'}`;
  }
  const results = redundRun && redundRun.subjectId === subj.crew.id ? renderRedundResults(redundRun) : '';
  return `<div class="section">${modeSeg}</div>` + scenarioSectionHtml() + `<div class="section">${run}<div id="pl-redund-results">${results}</div></div>`;
}

function runRedundancy() {
  const subj = plannerSubject();
  if (!subj || hypoScenario === 'probe') return;
  const spec = buildPlannerSpec();
  if (!spec.ok) { renderPlannerPanel(); return; }
  const mates = spec.mates.filter(c => c.id !== subj.crew.id);
  if (!mates.length) return;
  cancelPlannerJob();
  const h = subj.crew;
  const work = [h, ...mates];
  const cellsByCrew = new Map();
  const snapshot = { subjectId: h.id, subjectLabel: h.id, spec, mates, at: { lat: h.lat, lng: h.lng, ddl: h.ddl }, t0: performance.now() };
  showProgress('Redundancy…');
  plannerJob = runChunked(work, (crew) => {
    cellsByCrew.set(crew.id, crewCompetitiveCells(crew, spec.field));
  }, {
    chunk: 1,
    onProgress: (d, t) => setProgress(`Redundancy… ${d}/${t} footprints`),
    onDone: () => {
      plannerJob = null; hideProgress();
      snapshot.fold = redundancyFold(cellsByCrew.get(h.id), mates.map(c => cellsByCrew.get(c.id)));
      snapshot.elapsed = performance.now() - snapshot.t0;
      redundRun = snapshot;
      renderPlannerPanel();
    },
  });
}

/* Company audit (deliverable B/3, company-as-subject): every selected company
   crew's footprint vs the rest, reusing the exact same coverage cell math +
   redundancyFold. Footprints computed once, then folded N ways. */
function runCompanyAudit() {
  const scope = plannerScopeCrews();
  if (scope.length < 2) return;
  cancelPlannerJob();
  const spec = composeScenarioField({
    scenario: 'add', realCrews: plannerRealCrews(), scopeCrews: scope, replaceIds: new Set(), plKey: STATE.plKey,
  });
  const cellsByCrew = new Map();
  const snapshot = { spec, scope, plKey: STATE.plKey, t0: performance.now() };
  showProgress('Company audit…');
  plannerJob = runChunked(scope, (crew) => {
    cellsByCrew.set(crew.id, crewCompetitiveCells(crew, spec.field));
  }, {
    chunk: 1,
    onProgress: (d, t) => setProgress(`Company audit… ${d}/${t} footprints`),
    onDone: () => {
      plannerJob = null; hideProgress();
      snapshot.rows = scope.map(crew => ({
        crew,
        fold: redundancyFold(cellsByCrew.get(crew.id), scope.filter(o => o.id !== crew.id).map(o => cellsByCrew.get(o.id))),
      })).sort((a, b) => a.fold.pctNew - b.fold.pctNew); // most redundant (least unique) first
      snapshot.elapsed = performance.now() - snapshot.t0;
      auditRun = snapshot;
      renderPlannerPanel();
    },
  });
}

/* Horizontal new-reach vs overlap bar — one strong visual encoding. */
function reachBar(newReach, overlap) {
  const tot = (newReach + overlap) || 1;
  return `<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin-top:7px;border:1px solid var(--border)">
      <div style="width:${newReach / tot * 100}%;background:#10b981" title="New reach: ${newReach}"></div>
      <div style="width:${overlap / tot * 100}%;background:#f59e0b" title="Overlap: ${overlap}"></div>
    </div>`;
}

function renderRedundResults(r) {
  const f = r.fold;
  const label = f.pctNew >= 60 ? 'mostly new reach'
    : f.pctNew >= 25 ? 'mixed — some reinforcement, some overlap'
    : 'high overlap / cannibalization risk';
  return `
    ${reachBar(f.newReach, f.overlap)}
    <div class="hint" style="margin-top:3px;display:flex;justify-content:space-between">
      <span><span style="color:#10b981">■</span> New reach ${f.newReach}</span>
      <span>Overlap ${f.overlap} <span style="color:#f59e0b">■</span></span></div>
    <div class="result-grid" style="margin-top:9px">
      <div class="result-cell"><div class="rc-val">${f.hypoCompetitiveCells}</div><div class="rc-label">${esc(r.subjectLabel)} top-${f.band} cells</div></div>
      <div class="result-cell"><div class="rc-val">${f.pctNew.toFixed(0)}%</div><div class="rc-label">% new reach</div></div>
      <div class="result-cell"><div class="rc-val">${f.improves}</div><div class="rc-label">Improves best rank</div></div>
      <div class="result-cell"><div class="rc-val">${f.companyCompetitiveCells}</div><div class="rc-label">Company cells (rest)</div></div>
    </div>
    <div class="hint" style="margin-top:6px"><b>${label}</b> — cutoffs: ≥60% new = mostly new reach; 25–60% = mixed; &lt;25% = high overlap.
      Cells are the coverage lattice (~${Math.round(MOAT_CONFIG.cellDegrees * 69)} mi), “competitive” = rank ≤ ${f.band}.
      Compared against the ${r.spec.scenario === 'replace' ? 'replacement-aware' : 'existing'} company selection
      (${r.mates.length} crew${r.mates.length === 1 ? '' : 's'}, excluding the subject${r.spec.removed.length ? `; replaced: ${r.spec.removed.map(c => esc(c.id)).join(', ')}` : ''}),
      ranked over the same scenario field at PL ${esc(r.spec.plKey)}. ${(r.elapsed / 1000).toFixed(1)}s.</div>`;
}

function renderAuditResults(r) {
  const rows = r.rows.map(({ crew, fold }) => `
    <tr class="clickable" data-flat="${crew.lat}" data-flng="${crew.lng}">
      <td><span class="tdot" style="background:var(--${crew.color})"></span>${esc(crew.id)}</td>
      <td class="num">${fmtRate(crew.rate)}</td>
      <td class="num">${fold.hypoCompetitiveCells}</td>
      <td class="num">${fold.newReach}</td>
      <td class="num">${fold.pctNew.toFixed(0)}%</td>
      <td style="min-width:70px">${reachBar(fold.newReach, fold.overlap)}</td>
    </tr>`).join('');
  return `
    <div class="hint" style="margin-top:9px">Each row = one company crew's footprint vs the other ${r.scope.length - 1}.
      Lowest <b>% unique</b> first = the most redundant crews within this selection. “Competitive” = rank ≤ ${MOAT_CONFIG.bandOuter},
      ranked over the company-exempt field at PL ${esc(r.plKey)}. ${(r.elapsed / 1000).toFixed(1)}s.</div>
    <table class="dtable" style="margin-top:6px"><thead><tr>
      <th>Crew</th><th class="num">Rate</th><th class="num">Cells</th><th class="num">Unique</th><th class="num">% uniq</th><th>reach</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
}

/* ---- Central wiring for the whole workspace (re-run after each render). ---- */
function wirePlannerWorkspace(panel) {
  el('[data-pc]', panel).addEventListener('click', () => closePlanner());
  const openCov = el('#pl-open-cov', panel);
  if (openCov) openCov.addEventListener('click', (e) => { e.preventDefault(); if (STATE.activeOverlay !== 'coverage') toggleCoverage(); });
  const newHypo = el('#pl-new-hypo', panel);
  if (newHypo) newHypo.addEventListener('click', () => { $('btn-hypo').classList.add('active'); renderHypotheticalDDLTool(); enterHypoPlacement(); });
  const blockedCov = el('#planner-open-cov', panel);
  if (blockedCov) blockedCov.addEventListener('click', () => { if (STATE.activeOverlay !== 'coverage') toggleCoverage(); });

  panel.querySelectorAll('#pl-subject .seg-btn').forEach(b =>
    b.addEventListener('click', () => { plannerSubjectKind = b.dataset.subj; renderPlannerPanel(); }));
  panel.querySelectorAll('#pl-tools .seg-btn').forEach(b =>
    b.addEventListener('click', () => { plannerTool = b.dataset.tool; renderPlannerPanel(); }));
  panel.querySelectorAll('#pl-scenario .seg-btn').forEach(b =>
    b.addEventListener('click', () => { hypoScenario = b.dataset.scn; renderPlannerPanel(); }));
  panel.querySelectorAll('#pl-band .seg-btn').forEach(b =>
    b.addEventListener('click', () => { plannerBand = b.dataset.band; renderPlannerPanel(); }));
  panel.querySelectorAll('#pl-redund-mode .seg-btn').forEach(b =>
    b.addEventListener('click', () => { redundMode = b.dataset.rmode; renderPlannerPanel(); }));
  panel.querySelectorAll('input[data-replace]').forEach(cb =>
    cb.addEventListener('change', () => { if (cb.checked) hypoReplaceIds.add(cb.dataset.replace); else hypoReplaceIds.delete(cb.dataset.replace); renderPlannerPanel(); }));

  const numCommit = (id, fn) => {
    const inp = el('#' + id, panel);
    if (inp) inp.addEventListener('change', () => { const v = parseFloat(inp.value); if (!isNaN(v)) fn(v); renderPlannerPanel(); });
  };
  numCommit('pl-threshold', v => { plannerThreshold = Math.max(0, Math.min(100, v)); });
  numCommit('pl-gmin', v => { plannerRateGrid.min = v; });
  numCommit('pl-gmax', v => { plannerRateGrid.max = v; });
  numCommit('pl-gstep', v => { if (v > 0) plannerRateGrid.step = v; });
  numCommit('pl-radius', v => { plannerRadius = Math.max(ZONE_SIM.minRadius, Math.min(ZONE_SIM.maxRadius, v)); });
  const maxInp = el('#pl-finder-max', panel);
  if (maxInp) maxInp.addEventListener('change', () => { const v = parseInt(maxInp.value, 10); if (!isNaN(v) && v > 0) plannerMaxCandidates = v; renderPlannerPanel(); });

  const runBtn = (id, fn) => { const b = el('#' + id, panel); if (b) b.addEventListener('click', fn); };
  runBtn('pl-run-opt', runOptimizer);
  runBtn('pl-run-finder', runFinder);
  runBtn('pl-run-redund', runRedundancy);
  runBtn('pl-run-audit', runCompanyAudit);

  panel.querySelectorAll('.finder-sort').forEach(b =>
    b.addEventListener('click', () => { finderSort = b.dataset.fsort; renderPlannerPanel(); }));
  panel.querySelectorAll('tr.clickable[data-fkey]').forEach(tr =>
    tr.addEventListener('click', () => selectFinderSite(tr.dataset.fkey)));
  panel.querySelectorAll('tr.clickable[data-flat]').forEach(tr =>
    tr.addEventListener('click', () => MapView.panTo(parseFloat(tr.dataset.flat), parseFloat(tr.dataset.flng))));
}

/* ============================================================
   Moat / Desert overlays
   ============================================================ */
function updateOverlayButtons() {
  $('btn-zones').classList.toggle('active', STATE.activeOverlay === 'zones');
  $('btn-moat').classList.toggle('active', STATE.activeOverlay === 'moat');
  $('btn-coverage').classList.toggle('active', STATE.activeOverlay === 'coverage');
  $('btn-desert').classList.toggle('active', STATE.activeOverlay === 'desert');
}

function clearActiveOverlay() {
  const was = STATE.activeOverlay;
  if (was === 'zones') { MapView.hideZones(); $('zone-mode').hidden = true; }
  else { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); }
  if (was === 'coverage') { clearTimeout(coverageTimer); MapView.clearCoverageHighlight(); closePanel('coverage-panel'); }
  hideProgress(); // a cancelled job's onDone never fires, so clear the chip here
  STATE.activeOverlay = null;
  $('legend').hidden = true;
  updateOverlayButtons();
  // IMSR-LIVE (removable): the PL legend is only valid while the GACC zones view is
  // on. toggleZones hides it when zones are toggled OFF directly, but switching to
  // another overlay (moat/desert/coverage) tears zones down HERE — refresh the
  // legend too or it lingers over the new overlay. No-op when IMSR is inert.
  updateImsrPlLegend();
  // Keep the detail panel's moat button in sync: switching AWAY from the moat to
  // another overlay (desert/zones/coverage) clears the moat here, so the button
  // must drop its "Hide moat map" active state — otherwise it lies about state and
  // a click would re-show the moat under the wrong label.
  refreshDetailButtons();
  // Coverage closed: restore normal crew-dot visibility (overlay is now null,
  // so applyFiltersAndRender no longer applies the "only analyzed" filter).
  if (was === 'coverage') applyFiltersAndRender();
}

function toggleMoat() {
  if (!STATE.selectedCrew) return;
  if (STATE.activeOverlay === 'moat') { clearActiveOverlay(); refreshDetailButtons(); return; }
  if (STATE.activeOverlay) clearActiveOverlay();
  STATE.activeOverlay = 'moat';
  updateOverlayButtons();
  refreshDetailButtons();
  startMoat();
}
function startMoat() {
  showProgress('Computing moat…');
  MapView.showMoat(STATE.selectedCrew, DATA.crews, STATE.plKey, {
    onProgress: (d, t) => setProgress(`Computing moat… ${t ? Math.round(d / t * 100) : 100}%`),
    onDone: () => { hideProgress(); showMoatLegend(); },
  });
}
function showMoatLegend() {
  $('legend').hidden = false;
  $('legend').innerHTML = `
    <div class="legend-title">Competitive reach · rank-band fade</div>
    <div class="legend-grad" style="background:linear-gradient(90deg,rgb(220,38,38),rgb(249,115,22),rgb(234,179,8),rgb(132,204,22),rgb(16,185,129))"></div>
    <div class="legend-grad-labels"><span>rank 40+</span><span>top-20 edge</span><span>top-10 ✓</span></div>
    <div class="hint" style="margin-top:5px">Hover any cell to see exact rank, band, and cheapest competitor.</div>`;
}

function toggleDesert() {
  if (STATE.activeOverlay === 'desert') { clearActiveOverlay(); return; }
  if (STATE.activeOverlay) clearActiveOverlay();
  STATE.activeOverlay = 'desert';
  updateOverlayButtons();
  startDesert();
}
function startDesert() {
  if (effectiveKeepFraction(STATE.plKey) >= 1.0) {
    showToastLegend('Rate desert is most meaningful at PL3+ (or a heavier filter) when cheap crews are already deployed.');
  }
  showProgress('Computing rate desert…');
  MapView.showDesert(DATA.crews, STATE.plKey, {
    onProgress: (d, t) => setProgress(`Computing rate desert… ${t ? Math.round(d / t * 100) : 100}%`),
    onDone: () => { hideProgress(); showDesertLegend(); },
  });
}
function showDesertLegend() {
  $('legend').hidden = false;
  $('legend').innerHTML = `
    <div class="legend-title">Avg rate of cheapest ${DESERT_CONFIG.topN} available</div>
    <div class="legend-grad" style="background:linear-gradient(90deg,#14b8a6,#f59e0b,#ea580c)"></div>
    <div class="legend-grad-labels"><span>$${DESERT_CONFIG.lowRate} cheap field</span><span>$${DESERT_CONFIG.highRate}+ desert</span></div>
    <div class="hint" style="margin-top:5px">Hover any cell for avg, lowest &amp; highest surviving rate.</div>
    ${effectiveKeepFraction(STATE.plKey) >= 1.0 ? '<div class="hint" style="margin-top:5px">Raise PL to PL3+ (or push the filter heavier) to reveal structure.</div>' : ''}`;
}
function showToastLegend(msg) {
  $('legend').hidden = false;
  $('legend').innerHTML = `<div class="hint">${esc(msg)}</div>`;
}

/* ============================================================
   Company coverage overlay (multi-crew moat)
   An exclusive overlay (like moat/desert/zones) that maps the combined competitive
   footprint of one vendor company's crews. Selection is scoped to a single company;
   within it, crews are included by price tier (reusing tierForRank) and/or one-by-one.
   It does not require a selected crew. Compute lives in MapView.showCoverage; this
   block owns the panel UI, selection state, and debounced recompute.
   ============================================================ */
const COVERAGE_TIERS = ['green', 'yellow', 'orange', 'red'];

// Real vendor companies (excludes the hypothetical DDL), with crew counts, A→Z.
function companyList() {
  const m = new Map();
  for (const c of DATA.crews) { if (c.hypo) continue; m.set(c.company, (m.get(c.company) || 0) + 1); }
  return [...m.entries()].map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
// A company's crews, cheapest first (so the checklist reads green→red).
function companyCrews(company) {
  return DATA.crews.filter(c => c.company === company).sort((a, b) => a.rate - b.rate);
}

function toggleCoverage() {
  if (STATE.activeOverlay === 'coverage') { clearActiveOverlay(); return; }
  if (STATE.activeOverlay) clearActiveOverlay();
  STATE.activeOverlay = 'coverage';
  updateOverlayButtons();
  renderCoveragePanel();
  refreshCoverageDots(); // apply "only analyzed" dot filter if it was left on
  if (coverageCompanies().length) startCoverage(); // restore last companies' footprint
}

function renderCoveragePanel() {
  const panel = $('coverage-panel');
  const companies = companyList();
  const A = coverageCompanyA, B = coverageCompanyB;
  const active = coverageCompanies();
  const duo = coverageIsDuo();
  const pool = coverageAllCompanyCrews();
  const tierCounts = { green: 0, yellow: 0, orange: 0, red: 0 };
  for (const c of pool) tierCounts[tierForRank(c.rate)]++;
  const selN = pool.filter(c => coverageSelectedIds.has(c.id)).length;
  const subtitle = active.length
    ? `${active.map(esc).join(' vs ')} · ${selN}/${pool.length} crews`
    : 'Pick a company to map its coverage';

  // <option>s for a slot, hiding the name already chosen in the OTHER slot so the
  // same company can't be picked twice.
  const optionsFor = (selected, exclude) => companies
    .filter(c => c.name !== exclude)
    .map(c => `<option value="${esc(c.name)}"${c.name === selected ? ' selected' : ''}>${esc(c.name)} (${c.count})</option>`)
    .join('');

  // One company's crew checklist, with a colored sub-header in two-company mode so
  // each list is attributable to its company / advantage color.
  const crewSection = (company, group) => {
    const swatch = group
      ? `<span class="cov-legend-swatch" style="background:${rgbCss(MOAT_CONFIG.duoColors[group])}"></span>`
      : '';
    const head = duo ? `<div class="cov-sub-head">${swatch}${esc(company)}</div>` : '';
    return `${head}<div class="cov-crewlist${duo ? ' cov-crewlist-duo' : ''}">
      ${companyCrews(company).map(coverageCrewRow).join('') || '<div class="hint">No crews for this company.</div>'}
    </div>`;
  };

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="panel-title"><span class="accent">⧉</span> Company coverage</div>
        <div class="panel-sub">${subtitle}</div>
      </div>
      <div class="panel-head-btns">
        <button class="panel-min" data-min title="Minimize">–</button>
        <button class="panel-close" data-pc="coverage-panel" title="Close (Esc)">×</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="section" style="border-top:none;padding-top:0">
        <div class="section-title"><span><span class="accent">▦</span> Companies</span></div>
        <select id="cov-company-a" class="input cov-select">
          <option value="">— Company A —</option>
          ${optionsFor(A, B)}
        </select>
        <select id="cov-company-b" class="input cov-select" style="margin-top:6px">
          <option value="">— Company B (optional) —</option>
          ${optionsFor(B, A)}
        </select>
        ${duo ? `<div class="cov-duo-key">
          <span><span class="cov-legend-swatch" style="background:${rgbCss(MOAT_CONFIG.duoColors.a)}"></span>${esc(A)} only</span>
          <span><span class="cov-legend-swatch" style="background:${rgbCss(MOAT_CONFIG.duoColors.b)}"></span>${esc(B)} only</span>
        </div>` : ''}
      </div>
      <div class="section">
        ${STATE.hypoCrew ? `
        <label class="cov-crew" style="cursor:pointer">
          <input type="checkbox" id="cov-hypo"${coverageIncludeHypo ? ' checked' : ''}>
          <span class="tdot" style="background:var(--violet)"></span>
          <span class="cov-crew-id" style="color:var(--violet)">Include hypothetical DDL</span>
          <span class="rate-badge ${STATE.hypoCrew.color}">${fmtRate(STATE.hypoCrew.rate)}</span>
        </label>
        ${duo && coverageIncludeHypo ? `
        <div class="cov-hypo-group">
          <span class="cov-mini-label">Counts as</span>
          <button class="btn btn-sm cov-hgrp${coverageHypoGroup === 'A' ? ' active' : ''}" data-hgrp="A">A · ${esc(A)}</button>
          <button class="btn btn-sm cov-hgrp${coverageHypoGroup === 'B' ? ' active' : ''}" data-hgrp="B">B · ${esc(B)}</button>
        </div>` : ''}
        <button id="cov-hypo-edit" class="btn btn-sm" style="margin-top:6px">Edit hypothetical…</button>`
        : `
        <button id="cov-add-hypo" class="btn full"><span style="color:var(--violet)">⚲</span>&nbsp; Add hypothetical crew</button>
        <div class="hint" style="margin-top:6px">Drops a what-if competitor — your next map click places it. Default $${HYPO_CONFIG.defaultRate.toFixed(2)}/hr.</div>`}
      </div>
      ${active.length ? `
      <div class="section">
        <div class="section-title"><span><span class="accent">$</span> Price tiers${duo ? ' · both companies' : ''}</span>
          <button id="cov-all" class="btn btn-sm">${pool.length && selN === pool.length ? 'Clear all' : 'Select all'}</button></div>
        <div class="cov-tiers">
          ${COVERAGE_TIERS.map(t => coverageTierChip(t, tierCounts[t], pool)).join('')}
        </div>
        ${duo ? '<div class="hint" style="margin-top:6px">Tiers select the matching price band from <b>both</b> companies.</div>' : ''}
      </div>
      <div class="section">
        <div class="section-title"><span>Crews</span><span class="filter-readout" id="cov-selected">${selN} selected</span></div>
        ${active.map((co, i) => crewSection(co, duo ? (i === 0 ? 'a' : 'b') : null)).join('')}
      </div>
      <div class="section">
        <div class="section-title"><span>Map dots</span></div>
        <div class="cov-vismode">
          <button class="btn btn-sm cov-vis${!coverageShowOnlyAnalyzed ? ' active' : ''}" data-vis="all">Show all crews</button>
          <button class="btn btn-sm cov-vis${coverageShowOnlyAnalyzed ? ' active' : ''}" data-vis="analyzed">Show only analyzed crews</button>
        </div>
      </div>
      <div class="section">
        <button id="cov-open-planner" class="btn full"${selN >= 2 ? '' : ' disabled'}><span class="accent">⌘</span>&nbsp; Company overlap audit in Planner</button>
        <div class="hint" style="margin-top:5px">${selN >= 2 ? 'Uses this selection as the company scope.' : 'Select at least 2 crews to run an overlap audit.'}</div>
      </div>` : '<div class="hint" style="margin-top:4px">Then include crews by price tier or individually. Add a Company B to color where only one company is competitive.</div>'}
    </div>`;
  panel.hidden = false;
  wireMinimize(panel);

  el('[data-pc]', panel).addEventListener('click', () => clearActiveOverlay());
  $('cov-company-a').addEventListener('change', e => onCoverageCompany('A', e.target.value));
  $('cov-company-b').addEventListener('change', e => onCoverageCompany('B', e.target.value));
  if ($('cov-open-planner')) $('cov-open-planner').addEventListener('click', () => { plannerTool = 'redund'; redundMode = 'audit'; openPlanner(); });
  if ($('cov-hypo')) $('cov-hypo').addEventListener('change', e => {
    coverageIncludeHypo = e.target.checked;
    renderCoveragePanel(); // show/hide the A/B group toggle
    refreshCoverageDots();
    scheduleCoverage();
  });
  // Pick which company the hypo counts for in two-company mode.
  panel.querySelectorAll('.cov-hgrp').forEach(b => b.addEventListener('click', () => {
    coverageHypoGroup = b.dataset.hgrp;
    renderCoveragePanel();
    scheduleCoverage();
  }));
  // Start a hypo crew without leaving coverage: arm map placement immediately and
  // pre-include it so it lands inside the analysis the moment the pin drops.
  if ($('cov-add-hypo')) $('cov-add-hypo').addEventListener('click', () => {
    coverageIncludeHypo = true;
    $('btn-hypo').classList.add('active');
    enterHypoPlacement();
  });
  // Open the hypo panel to edit rate / re-place — those controls live only there.
  if ($('cov-hypo-edit')) $('cov-hypo-edit').addEventListener('click', () => {
    $('btn-hypo').classList.add('active');
    renderHypotheticalDDLTool();
  });
  if (active.length) {
    $('cov-all').addEventListener('click', toggleCoverageAll);
    panel.querySelectorAll('.cov-vis').forEach(b =>
      b.addEventListener('click', () => setCoverageVisMode(b.dataset.vis === 'analyzed')));
    panel.querySelectorAll('.cov-tier').forEach(ch =>
      ch.addEventListener('click', () => toggleCoverageTier(ch.dataset.tier)));
    // Crew rows only — the hypo label also carries .cov-crew but has no data-id.
    panel.querySelectorAll('.cov-crew[data-id]').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) coverageSelectedIds.add(id); else coverageSelectedIds.delete(id);
        refreshCoverageHeader();
        refreshCoverageDots();
        scheduleCoverage();
      });
      // Hover a row to light up just that crew's footprint (only if it's drawn).
      row.addEventListener('mouseenter', () => {
        if (STATE.activeOverlay === 'coverage' && coverageSelectedIds.has(id)) MapView.highlightCoverageCrew(id, STATE.plKey);
      });
      row.addEventListener('mouseleave', () => MapView.clearCoverageHighlight());
    });
  }
}

function coverageTierChip(tier, count, crews) {
  const inTier = crews.filter(c => tierForRank(c.rate) === tier);
  const allOn = inTier.length > 0 && inTier.every(c => coverageSelectedIds.has(c.id));
  const someOn = inTier.some(c => coverageSelectedIds.has(c.id));
  const state = allOn ? 'on' : someOn ? 'some' : 'off';
  return `<button class="cov-tier chip chip-${tier}" data-tier="${tier}" data-state="${state}"${count === 0 ? ' disabled' : ''}>
    <span class="chip-dot"></span>
    <span class="chip-body"><span class="chip-n">${count}</span><span class="chip-range">${TIERS[tier].range}</span></span>
  </button>`;
}

function coverageCrewRow(c) {
  return `<label class="cov-crew" data-id="${esc(c.id)}">
    <input type="checkbox"${coverageSelectedIds.has(c.id) ? ' checked' : ''}>
    <span class="tdot" style="background:var(--${c.color})"></span>
    <span class="cov-crew-id">${esc(c.id)}</span>
    <span class="rate-badge ${c.color}">${fmtRate(c.rate)}</span>
  </label>`;
}

/* Pick a company into slot 'A' or 'B'. Picking the name already in the other slot is
   ignored (deduped by the dropdowns). Newly added companies default to ALL crews
   selected; selections for a company that's still active are preserved. */
function onCoverageCompany(slot, name) {
  name = name || null;
  if (slot === 'A') {
    coverageCompanyA = name;
    if (coverageCompanyB === name) coverageCompanyB = null; // no self-vs-self
  } else {
    coverageCompanyB = name;
    if (coverageCompanyA === name) coverageCompanyA = null;
  }
  syncCoverageSelectionDefault();
  renderCoveragePanel();
  refreshCoverageDots();
  startOrClearCoverage();
}

/* Reconcile the selection set after the company slots change: drop crews whose
   company is no longer selected, and auto-select ALL crews of any newly added
   company (one with no current selection) so adding a company behaves like before. */
function syncCoverageSelectionDefault() {
  const active = new Set(coverageCompanies());
  coverageSelectedIds = new Set([...coverageSelectedIds].filter(id => {
    const c = DATA.byId[id];
    return c && active.has(c.company);
  }));
  for (const co of coverageCompanies()) {
    const crews = companyCrews(co);
    if (crews.length && !crews.some(c => coverageSelectedIds.has(c.id)))
      for (const c of crews) coverageSelectedIds.add(c.id);
  }
}

/* Recompute if anything is selected, otherwise tear the overlay down. */
function startOrClearCoverage() {
  if (coverageCompanies().length || (coverageIncludeHypo && STATE.hypoCrew)) startCoverage();
  // A cancelled job's onDone never fires, so hide the progress chip here too —
  // otherwise clearing the company mid-compute leaves "Computing coverage…" stuck.
  else { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); hideProgress(); $('legend').hidden = true; }
}

/* Select-all / clear-all across BOTH selected companies. */
function toggleCoverageAll() {
  const crews = coverageAllCompanyCrews();
  const allOn = crews.length && crews.every(c => coverageSelectedIds.has(c.id));
  coverageSelectedIds = new Set(allOn ? [] : crews.map(c => c.id));
  renderCoveragePanel();
  refreshCoverageDots();
  scheduleCoverage();
}

/* "Select by price range" — a shared multi-tier toggle: clicking a tier toggles that
   price band's membership across BOTH selected companies at once (add the band's
   crews if any are missing, remove them if the whole band is already in). This is
   what aligns the selection across vendors — "compare the same pricing band across
   both." Built on the shared selectCoverageCrews() primitive (the tier→crews mapping
   we unit-test), applied per active company and unioned. */
function toggleCoverageTier(tier) {
  const tierIds = coverageCompanies()
    .flatMap(co => selectCoverageCrews(DATA.crews, { company: co, tiers: [tier] }))
    .map(c => c.id);
  if (!tierIds.length) return;
  const allOn = tierIds.every(id => coverageSelectedIds.has(id));
  if (allOn) tierIds.forEach(id => coverageSelectedIds.delete(id));
  else tierIds.forEach(id => coverageSelectedIds.add(id));
  renderCoveragePanel();
  refreshCoverageDots();
  scheduleCoverage();
}

/* Toggle which crew dots are visible on the map while coverage is active:
   all crews, or only the crews in the current company analysis. */
function setCoverageVisMode(onlyAnalyzed) {
  if (coverageShowOnlyAnalyzed === onlyAnalyzed) return;
  coverageShowOnlyAnalyzed = onlyAnalyzed;
  renderCoveragePanel();
  applyFiltersAndRender();
}

/* Light header update on per-crew toggles (avoids rebuilding the scrolled list).
   Counts span both selected companies (the shared crew pool). */
function refreshCoverageHeader() {
  const panel = $('coverage-panel');
  const active = coverageCompanies();
  if (!active.length) return;
  const pool = coverageAllCompanyCrews();
  const selN = pool.filter(c => coverageSelectedIds.has(c.id)).length;
  const sub = el('.panel-sub', panel);
  if (sub) sub.textContent = `${active.join(' vs ')} · ${selN}/${pool.length} crews`;
  if ($('cov-selected')) $('cov-selected').textContent = `${selN} selected`;
  if ($('cov-all')) $('cov-all').textContent = pool.length && selN === pool.length ? 'Clear all' : 'Select all';
  panel.querySelectorAll('.cov-tier').forEach(ch => {
    const inTier = pool.filter(c => tierForRank(c.rate) === ch.dataset.tier);
    const allOn = inTier.length > 0 && inTier.every(c => coverageSelectedIds.has(c.id));
    const someOn = inTier.some(c => coverageSelectedIds.has(c.id));
    ch.dataset.state = allOn ? 'on' : someOn ? 'some' : 'off';
  });
}

function scheduleCoverage() {
  clearTimeout(coverageTimer);
  coverageTimer = setTimeout(startCoverage, 250);
}

function startCoverage() {
  const companies = coverageCompanies();
  const hypo = (coverageIncludeHypo && STATE.hypoCrew) ? STATE.hypoCrew : null;
  if (STATE.activeOverlay !== 'coverage') return;
  // Nothing left to analyze (e.g. the hypo — the only analyzed crew — was just
  // removed): clear any previously drawn footprint + legend instead of returning
  // over them, mirroring the empty-selection branch below.
  if (!companies.length && !hypo) { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); hideProgress(); $('legend').hidden = true; return; }
  const crews = coverageAllCompanyCrews().filter(c => coverageSelectedIds.has(c.id));
  if (hypo) crews.push(hypo); // one more analyzed crew in the moat union
  if (!crews.length) { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); hideProgress(); $('legend').hidden = true; return; }
  const duo = coverageIsDuo();
  showProgress('Computing coverage…');
  MapView.showCoverage(crews, DATA.crews, STATE.plKey, {
    onProgress: (d, t) => setProgress(`Computing coverage… ${t ? Math.round(d / t * 100) : 100}%`),
    onDone: () => { hideProgress(); showCoverageLegend(crews.length, duo); },
    // Two-company coloring context — ignored by map.js when duo is false.
    groupOf: coverageGroupOf,
    duo,
    labels: { A: coverageCompanyA, B: coverageCompanyB },
  });
}

function showCoverageLegend(crewCount, duo) {
  $('legend').hidden = false;
  // Two-company: the same red→emerald rank-band moat, with one-sided cells tinted
  // toward a company hue (strength-blended via the SAME top-20 → top-10 qualifier).
  if (duo) {
    const dc = MOAT_CONFIG.duoColors;
    // A soft→strong tint ramp for each company hue, mirroring the duoTint levels:
    // a faded (mostly-gradient) end → the full company hue.
    const ramp = (hue) => `linear-gradient(90deg,rgb(234,179,8),${rgbCss(hue)})`;
    $('legend').innerHTML = `
      <div class="legend-title">Two-company moat · ${crewCount} crew${crewCount === 1 ? '' : 's'}</div>
      <div class="legend-grad" style="background:linear-gradient(90deg,rgb(220,38,38),rgb(249,115,22),rgb(234,179,8),rgb(132,204,22),rgb(16,185,129))"></div>
      <div class="legend-grad-labels"><span>no advantage</span><span>top-20</span><span>top-10 ✓</span></div>
      <div class="hint" style="margin-top:5px">Both / neither competitive use the moat gradient above. One-sided cells tint it toward a company:</div>
      <div class="legend-row" style="margin-top:4px"><span class="cov-legend-swatch" style="background:${ramp(dc.a)}"></span>${esc(coverageCompanyA)} only · soft → strong</div>
      <div class="legend-row"><span class="cov-legend-swatch" style="background:${ramp(dc.b)}"></span>${esc(coverageCompanyB)} only · soft → strong</div>
      <div class="hint" style="margin-top:5px">Full hue only where one company is top-10 and the other has no top-20 presence; weaker edges soften toward the gradient. Hover a crew row to light up its own moat.</div>`;
    return;
  }
  // Single company: the same red→emerald gradient as the single-crew moat.
  $('legend').innerHTML = `
    <div class="legend-title">Company moat · best of ${crewCount} crew${crewCount === 1 ? '' : 's'}</div>
    <div class="legend-grad" style="background:linear-gradient(90deg,rgb(220,38,38),rgb(249,115,22),rgb(234,179,8),rgb(132,204,22),rgb(16,185,129))"></div>
    <div class="legend-grad-labels"><span>no advantage</span><span>top-20</span><span>top-10 ✓</span></div>
    <div class="hint" style="margin-top:5px">Each cell = the best-ranked selected crew there (the single-crew moat, unioned). Green corridors = at least one crew is competitive; red/empty = a gap.</div>
    <div class="hint" style="margin-top:3px">Hover a crew row to light up its own moat.</div>`;
}

/* Merged wildfire layer — a standalone informational toggle showing both the
   USA_Wildfires current-incidents feed and the WFIGS last-24h feed together
   (one filter, one icon style). Deliberately NOT part of the exclusive
   moat/desert/zones set (no clearActiveOverlay), so it can sit alongside any. */
function toggleWildfire() {
  STATE.wildfireOn = !STATE.wildfireOn;
  MapView.toggleWildfire(STATE.wildfireOn);
  $('btn-wildfire').classList.toggle('active', STATE.wildfireOn);
}

/* NWS watches & warnings — another standalone informational toggle (loaded on
   demand). Like the wildfire layer it sits outside the exclusive moat/desert/
   zones set, so it can overlay any of them and never touches crew analysis. */
function toggleWatches() {
  STATE.watchesOn = !STATE.watchesOn;
  MapView.toggleWatches(STATE.watchesOn);
  $('btn-watches').classList.toggle('active', STATE.watchesOn);
  // Reveal the alert-type filter while alerts are on; the selected category is
  // kept in STATE.watchesCategory, so toggling off and back on preserves it.
  $('watch-filter').hidden = !STATE.watchesOn;
}

/* ---- Weather-alert type filter (Red Flag / Wind / …) ----
   A category maps to a server-side WHERE on the CAP `Event` field, pushed to the
   watches layer via MapView.setWatchesWhere(). Categories come from
   WATCHES_CONFIG.categories so new groups need no code here. */

// Build a WHERE that case-insensitively matches the category's event substrings.
function buildWatchWhere(catKey) {
  const cat = WATCHES_CONFIG.categories.find((c) => c.key === catKey);
  if (!cat || !cat.match || !cat.match.length) return '1=1';
  const q = (s) => s.replace(/'/g, "''");
  return '(' + cat.match.map((m) => `UPPER(Event) LIKE UPPER('%${q(m)}%')`).join(' OR ') + ')';
}

// Push the active category to the layer and reflect it on the segmented control.
function applyWatchFilter() {
  MapView.setWatchesWhere(buildWatchWhere(STATE.watchesCategory));
  document.querySelectorAll('#wa-cats .seg-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.cat === STATE.watchesCategory));
}

function wireWatchFilter() {
  const seg = $('wa-cats');
  seg.innerHTML = WATCHES_CONFIG.categories.map((c) =>
    `<button class="seg-btn${c.key === STATE.watchesCategory ? ' active' : ''}" data-cat="${esc(c.key)}">${esc(c.label)}</button>`).join('');
  seg.querySelectorAll('.seg-btn').forEach((b) =>
    b.addEventListener('click', () => { STATE.watchesCategory = b.dataset.cat; applyWatchFilter(); }));
  applyWatchFilter(); // seed the layer's WHERE before its first show
}

/* ============================================================
   Wildfire filter drawer
   Server-side ArcGIS filtering for the live wildfire layer. Every control writes
   to `fireFilters`, rebuilds a WHERE clause, and pushes it to the layer via
   MapView.setWildfireWhere() (esri-leaflet re-fetches only matching features).
   Independent of the wildfire on/off toggle: the WHERE is stored and applied
   whenever the layer is (re)built, and the "showing X of Y" readout queries the
   service directly so it works even while the layer is hidden.
   ============================================================ */
const FIRE_TYPES  = ['WF', 'RX', 'CX'];
const FIRE_CAUSES = ['Human', 'Lightning', 'Undetermined'];
const fireFilterDefaults = () => ({
  nameSearch:  '',
  minAcres:    20,
  types:       { WF: true, RX: false, CX: true },
  causes:      { Human: true, Lightning: true, Undetermined: true },
  containment: 'all',   // 'all' | 'active' | 'contained'
  newOnly:     true,
  states:      [],      // empty = all (no condition)
  gaccs:       [],      // empty = all (no condition)
});
let fireFilters    = fireFilterDefaults();
let fireTotalCount = null;             // total incidents (where=1=1), fetched once
let ffNameTimer    = null;             // debounce handle for the name search
let ffCountSeq     = 0;                // guards against out-of-order count responses

// SQL single-quote escaping for string literals (e.g. "O'Brien Fire").
const ffQuote = (v) => `'${String(v).replace(/'/g, "''")}'`;

// The two data sources differ only in a couple of fields, so the same filter
// state emits two WHERE dialects:
//   primary (USA_Wildfires): acreage = DailyAcres, has FireDiscoveryAge
//   last24  (WFIGS):         acreage = IncidentSize, no FireDiscoveryAge — the
//                            whole feed is <24h, so "new fires only" adds nothing.
function buildFireWhere(f, opts = {}) {
  const acresField = opts.acresField || 'DailyAcres';
  const hasAge = opts.hasAge !== false; // default true (primary source)
  const c = [];
  // 1. Acreage floor — keep NULL-acreage incidents visible.
  if (f.minAcres > 0) c.push(`(${acresField} >= ${f.minAcres} OR ${acresField} IS NULL)`);
  // 2. Incident type — omit when all on; none on → show nothing.
  const types = FIRE_TYPES.filter((t) => f.types[t]);
  if (types.length === 0) return '1=0';
  if (types.length < FIRE_TYPES.length) c.push(`IncidentTypeCategory IN (${types.map(ffQuote).join(', ')})`);
  // 3. New fires only (no-op on the last-24h source, which is entirely new).
  if (f.newOnly && hasAge) c.push('FireDiscoveryAge = 0');
  // 4. Containment status.
  if (f.containment === 'active')    c.push('PercentContained < 100');
  if (f.containment === 'contained') c.push('PercentContained = 100');
  // 5/6. State / GACC multiselects.
  if (f.states.length) c.push(`POOState IN (${f.states.map(ffQuote).join(', ')})`);
  if (f.gaccs.length)  c.push(`GACC IN (${f.gaccs.map(ffQuote).join(', ')})`);
  // 7. Fire cause — omit when all on; none on → show nothing.
  const causes = FIRE_CAUSES.filter((x) => f.causes[x]);
  if (causes.length === 0) return '1=0';
  if (causes.length < FIRE_CAUSES.length) c.push(`FireCause IN (${causes.map(ffQuote).join(', ')})`);
  // 8. Name search (case-insensitive contains).
  if (f.nameSearch.trim()) c.push(`UPPER(IncidentName) LIKE UPPER('%${f.nameSearch.trim().replace(/'/g, "''")}%')`);
  return c.length ? c.join(' AND ') : '1=1';
}

// Count of filters differing from the default — drives the launcher badge.
function ffActiveCount(f) {
  const d = fireFilterDefaults();
  let n = 0;
  if (f.nameSearch.trim()) n++;
  if (f.minAcres !== d.minAcres) n++;
  if (FIRE_TYPES.some((t) => f.types[t] !== d.types[t])) n++;
  if (!FIRE_CAUSES.every((x) => f.causes[x])) n++;
  if (f.containment !== 'all') n++;
  if (f.newOnly !== d.newOnly) n++;
  if (f.states.length) n++;
  if (f.gaccs.length) n++;
  return n;
}

// Push the current filter state to both sources + refresh badge and count.
function applyFireFilters() {
  const wherePrimary = buildFireWhere(fireFilters, { acresField: 'DailyAcres', hasAge: true });
  const whereLast24  = buildFireWhere(fireFilters, { acresField: 'IncidentSize', hasAge: false });
  MapView.setWildfireWhere(wherePrimary, whereLast24);

  const n = ffActiveCount(fireFilters);
  const badge = $('ff-badge');
  badge.textContent = n;
  badge.hidden = n === 0;
  $('btn-fire-filters').classList.toggle('active', n > 0);
  $('ff-reset').hidden = n === 0;

  // Count queries are async and can resolve out of order under rapid changes;
  // tag each with a sequence number and ignore all but the most recent. The
  // readout shows the DEDUPED union across both feeds (matches what's on the
  // map after cross-source dedup), not the raw sum.
  const seq = ++ffCountSeq;
  $('ff-count').textContent = 'Counting…';
  Promise.all([
    MapView.queryWildfireIds(wherePrimary, 'primary'),
    MapView.queryWildfireIds(whereLast24, 'last24'),
  ]).then(([a, b]) => {
    if (seq !== ffCountSeq) return; // superseded by a newer filter change
    if (a == null && b == null) { $('ff-count').textContent = 'Count unavailable'; return; }
    const count = dedupedCount(a, b);
    $('ff-count').innerHTML = fireTotalCount == null
      ? `Showing <b>${count.toLocaleString()}</b> incidents`
      : `Showing <b>${count.toLocaleString()}</b> of ${fireTotalCount.toLocaleString()} incidents`;
  });
}

// Size of the union of two queryWildfireIds() results: distinct IrwinIDs plus
// any id-less features from each feed (those can't be deduped, so they count).
function dedupedCount(...results) {
  const set = new Set();
  let loose = 0;
  for (const r of results) {
    if (!r) continue;
    r.ids.forEach((id) => set.add(id));
    loose += r.loose;
  }
  return set.size + loose;
}

// Slider position (0–100) → acreage on a log scale (1 … 100,000), snapped to a
// readable 1/2/5 × 10ⁿ value. 0 means "show all".
function ffSliderToAcres(pos) {
  if (pos <= 0) return 0;
  const raw  = Math.pow(10, (pos / 100) * Math.log10(100000));
  const mag  = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const snap = norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10;
  return Math.round(snap * mag);
}
function ffUpdateAcresReadout() {
  const slider = $('ff-acres');
  if (!slider) return;
  const pos = parseInt(slider.value, 10);
  slider.style.setProperty('--fill', pos + '%');
  $('ff-acres-readout').textContent = pos <= 0 ? 'show all' : `≥ ${ffSliderToAcres(pos).toLocaleString()} acres`;
}

// Geographic Area Coordination Center codes → readable names (the layer only
// stores the short code in the GACC field).
const GACC_NAMES = {
  AICC: 'Alaska', EACC: 'Eastern', GBCC: 'Great Basin', NRCC: 'Northern Rockies',
  NWCC: 'Northwest', ONCC: 'N. California', OSCC: 'S. California',
  RMCC: 'Rocky Mountain', SACC: 'Southern', SWCC: 'Southwest',
};
// POOState is stored as "US-CA"; show the bare abbreviation but keep the full
// value for the WHERE clause (so POOState IN ('US-CA', …) matches).
const ffStateLabel = (v) => String(v).replace(/^US-/, '');
const ffGaccLabel  = (v) => (GACC_NAMES[v] ? `${GACC_NAMES[v]} (${v})` : v);

// Union distinct string values from both sources, deduped + sorted.
const ffMergeDistinct = (a, b) => [...new Set([...(a || []), ...(b || [])])].sort();

// Fetch distinct states/GACCs + total counts once (across BOTH sources), then
// build the two checklists so the one filter covers everything on the map.
async function populateFireFacets() {
  const [idP, idL, stP, stL, gaP, gaL] = await Promise.all([
    MapView.queryWildfireIds('1=1', 'primary'),
    MapView.queryWildfireIds('1=1', 'last24'),
    MapView.queryWildfireDistinct('POOState', 'primary'),
    MapView.queryWildfireDistinct('POOState', 'last24'),
    MapView.queryWildfireDistinct('GACC', 'primary'),
    MapView.queryWildfireDistinct('GACC', 'last24'),
  ]);
  // Deduped grand total (the "of Y" denominator) — union across both feeds.
  fireTotalCount = (idP || idL) ? dedupedCount(idP, idL) : null;
  renderFacetList('ff-states', ffMergeDistinct(stP, stL), 'state', ffStateLabel);
  renderFacetList('ff-gaccs', ffMergeDistinct(gaP, gaL), 'gacc', ffGaccLabel);
  applyFireFilters(); // seed the count readout now that the total is known
}

function renderFacetList(containerId, values, kind, labelFn) {
  const box = $(containerId);
  if (!values.length) { box.innerHTML = '<span class="ff-loading">none available</span>'; return; }
  box.innerHTML = values.map((v) =>
    `<label class="ff-check"><input type="checkbox" value="${esc(v)}" checked><span>${esc(labelFn ? labelFn(v) : v)}</span></label>`).join('');
  box.querySelectorAll('input').forEach((inp) => inp.addEventListener('change', () => onFacetChange(containerId, kind)));
}

function onFacetChange(containerId, kind) {
  const inputs  = [...$(containerId).querySelectorAll('input')];
  const checked = inputs.filter((i) => i.checked).map((i) => i.value);
  const key     = kind === 'state' ? 'states' : 'gaccs';
  // All checked → no condition ([]). Otherwise the checked subset drives an IN(...).
  fireFilters[key] = checked.length === inputs.length ? [] : checked;
  $(kind === 'state' ? 'ff-states-count' : 'ff-gaccs-count').textContent =
    fireFilters[key].length ? `${fireFilters[key].length} selected` : 'all';
  applyFireFilters();
}

function setFireFiltersOpen(open) {
  $('fire-filters').hidden = !open;
  $('app').classList.toggle('filters-open', open);
}
function toggleFireFilters() { setFireFiltersOpen($('fire-filters').hidden); }

function resetFireFilters() {
  fireFilters = fireFilterDefaults();
  // name
  $('ff-name').value = ''; $('ff-name-clear').hidden = true;
  // new fires toggle
  $('ff-new').checked = fireFilters.newOnly;
  // acres slider — invert ffSliderToAcres: pos = 100 * log10(acres) / log10(100000)
  const acresPos = fireFilters.minAcres > 0
    ? Math.round(100 * Math.log10(fireFilters.minAcres) / Math.log10(100000)) : 0;
  $('ff-acres').value = acresPos; ffUpdateAcresReadout();
  // type + cause checkboxes — sync to defaults
  document.querySelectorAll('.ff-type').forEach((cb) => { cb.checked = !!fireFilters.types[cb.dataset.type]; });
  document.querySelectorAll('.ff-cause').forEach((cb) => { cb.checked = !!fireFilters.causes[cb.dataset.cause]; });
  // containment segmented
  document.querySelectorAll('#ff-containment .seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.cont === 'all'));
  // facet checklists
  ['ff-states', 'ff-gaccs'].forEach((id) => $(id).querySelectorAll('input').forEach((i) => { i.checked = true; }));
  $('ff-states-count').textContent = 'all';
  $('ff-gaccs-count').textContent  = 'all';
  applyFireFilters();
}

function wireFireFilters() {
  $('btn-fire-filters').addEventListener('click', toggleFireFilters);
  $('ff-close').addEventListener('click', () => setFireFiltersOpen(false));
  $('ff-reset').addEventListener('click', resetFireFilters);

  // 1. Name search — debounced ~300ms so a request doesn't fire per keystroke.
  const name = $('ff-name');
  name.addEventListener('input', () => {
    $('ff-name-clear').hidden = !name.value;
    clearTimeout(ffNameTimer);
    ffNameTimer = setTimeout(() => { fireFilters.nameSearch = name.value; applyFireFilters(); }, 300);
  });
  $('ff-name-clear').addEventListener('click', () => {
    name.value = ''; $('ff-name-clear').hidden = true;
    clearTimeout(ffNameTimer);
    fireFilters.nameSearch = ''; applyFireFilters();
  });

  // 2/3. Incident type + fire cause checkboxes.
  document.querySelectorAll('.ff-type').forEach((cb) =>
    cb.addEventListener('change', () => { fireFilters.types[cb.dataset.type] = cb.checked; applyFireFilters(); }));
  document.querySelectorAll('.ff-cause').forEach((cb) =>
    cb.addEventListener('change', () => { fireFilters.causes[cb.dataset.cause] = cb.checked; applyFireFilters(); }));

  // 4. Containment segmented control.
  document.querySelectorAll('#ff-containment .seg-btn').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('#ff-containment .seg-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      fireFilters.containment = b.dataset.cont;
      applyFireFilters();
    }));

  // 5. New fires toggle.
  $('ff-new').addEventListener('change', () => { fireFilters.newOnly = $('ff-new').checked; applyFireFilters(); });

  // 6. Acreage slider — live readout on drag (cheap), commit the query on release.
  const acres = $('ff-acres');
  acres.addEventListener('input', () => {
    ffUpdateAcresReadout();
    fireFilters.minAcres = ffSliderToAcres(parseInt(acres.value, 10));
  });
  acres.addEventListener('change', applyFireFilters);
}

function refreshDetailButtons() {
  if (STATE.selectedCrew && !$('detail-panel').hidden) {
    const b = $('detail-moat');
    if (b) {
      const on = STATE.activeOverlay === 'moat';
      b.classList.toggle('active', on);
      b.textContent = on ? 'Hide moat map' : 'Show competitive moat (350mi)';
    }
  }
}

/* progress chip */
function showProgress(label) { $('op-label').textContent = label; $('overlay-progress').hidden = false; }
function setProgress(label) { $('op-label').textContent = label; }
function hideProgress() { $('overlay-progress').hidden = true; }

/* ============================================================
   Zone overlay
   ============================================================ */
async function toggleZones() {
  if (STATE.activeOverlay === 'zones') { clearActiveOverlay(); updateImsrPlLegend(); return; }  // IMSR-LIVE
  if (STATE.activeOverlay) clearActiveOverlay();
  if (zonesGeojsonFailed) return;
  if (!DATA.zones || !DATA.gaccZones) {
    showProgress('Loading dispatch zones…');
    try {
      // Dispatch zones drive the "Dispatch centers" view + crew membership; the
      // pre-dissolved GACC regions (slivers/seams removed offline) drive the clean
      // "GACC regions" outlines. Fetch both up front (GACC is the default view).
      const [zres, gres] = await Promise.all([
        DATA.zones     ? null : fetch('dispatch_zones.geojson'),
        DATA.gaccZones ? null : fetch('gacc_regions.geojson'),
      ]);
      if (zres) { if (!zres.ok) throw new Error('HTTP ' + zres.status); DATA.zones = await zres.json(); }
      if (gres) { if (!gres.ok) throw new Error('HTTP ' + gres.status); DATA.gaccZones = await gres.json(); }
    } catch (err) {
      hideProgress();
      zonesGeojsonFailed = true;
      $('btn-zones').disabled = true;
      $('btn-zones').title = 'Zone data unavailable';
      return;
    }
    hideProgress();
    // Another overlay (or zones itself, via a double-press) may have been
    // activated while the geojson fetch was awaited. Respect the newer action:
    // bail out and leave the fetched data cached for the next toggle.
    if (STATE.activeOverlay) return;
  }
  buildCrewGacc();
  STATE.activeOverlay = 'zones';
  updateOverlayButtons();
  syncZoneModeControl();
  $('zone-mode').hidden = false;
  renderZones();
}

// Assign every crew to its GACC by true point-in-polygon membership against the
// dispatch-zone geometry (the same geojson the map renders). A crew belongs to the
// first zone whose polygon contains its lat/lng; that zone's GACCAbbreviation wins.
// Border points are deterministic (see pointInGeometry). Built once and cached.
function buildCrewGacc() {
  if (crewGacc) return;
  crewGacc = {};
  // Per-feature bbox so we skip the (expensive) ring test for far-away zones.
  const feats = DATA.zones.features.map((f) => ({ f, bbox: geomBBox(f.geometry) }));
  for (const c of DATA.crews) {
    for (const { f, bbox } of feats) {
      if (c.lng < bbox[0] || c.lng > bbox[2] || c.lat < bbox[1] || c.lat > bbox[3]) continue;
      if (pointInGeometry(c.lng, c.lat, f.geometry)) {
        crewGacc[c.id] = f.properties.GACCAbbreviation || '';
        break;
      }
    }
  }
}
// [minLng, minLat, maxLng, maxLat] of a GeoJSON Polygon/MultiPolygon.
function geomBBox(geom) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const parts = geom.type === 'Polygon' ? [geom.coordinates]
              : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  for (const rings of parts) for (const [x, y] of rings[0]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

// (Re)draw the zone overlay for the current mode. Switching modes calls this
// after hiding the previous layer, so the map updates live.
function renderZones() {
  if (STATE.zoneMode === 'gacc') {
    // Pre-dissolved region features: one clean outline per GACC, no internal seams.
    MapView.showZones(DATA.gaccZones, {
      keyOf: (p) => p.GACCAbbreviation || '',
      statsFor: (gacc) => gaccStats(gacc, DATA.crews, crewGacc),
      // IMSR-LIVE (removable): tint regions by IMSR PL when loaded; null per-region → unchanged.
      styleOf: ImsrLive.isReady() ? (gacc) => ImsrLive.plFillStyle(gacc) : null,
    });
  } else {
    MapView.showZones(DATA.zones, {
      keyOf: (p) => p.DispUnitID,
      statsFor: (unitId) => zoneStats(unitId, DATA.crews),
      // Compare mode: tint each dispatch zone by its FY25→FY26 median-rate delta.
      styleOf: compareMode ? (unitId) => compareZoneFill(unitId) : null,
    });
  }
  updateImsrPlLegend();   // IMSR-LIVE (removable)
}

// IMSR-LIVE (removable): show the PL color legend only while GACC regions are on.
function updateImsrPlLegend() {
  let leg = $('imsr-pl-legend-box');
  const show = ImsrLive.isReady() && STATE.zoneMode === 'gacc' && STATE.activeOverlay === 'zones';
  if (!show) { if (leg) leg.hidden = true; return; }
  if (!leg) {
    leg = document.createElement('div');
    leg.id = 'imsr-pl-legend-box';
    leg.className = 'imsr-pl-legend-box';
    (el('.map-wrap') || document.body).appendChild(leg);
  }
  leg.innerHTML = ImsrLive.plLegendHtml();
  leg.hidden = false;
}

// Apply a new Zones view mode and redraw live. No-op if unchanged.
function setZoneMode(mode) {
  if (mode === STATE.zoneMode) return;
  STATE.zoneMode = mode;
  syncZoneModeControl();
  if (STATE.activeOverlay === 'zones') { MapView.hideZones(); renderZones(); }
}

// Reflect STATE.zoneMode in the segmented control's active button.
function syncZoneModeControl() {
  document.querySelectorAll('#zone-mode .seg-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.zmode === STATE.zoneMode));
}

function handleZoneClick(props, stats, layer, key) {
  MapView.setActiveZone(key);
  if (STATE.zoneMode === 'gacc') {
    // Clicking a GACC region auto-filters the crew list to that region; the popup's
    // action now CLEARS the filter ("Show all crews") instead of applying it.
    if (stats) filterToRegion(key);
    MapView.bindZonePopup(layer, gaccPopupHtml(key, stats));
    if (stats) setTimeout(() => {
      const btn = $(`zp-region-${cssId(key)}`);
      if (btn) btn.addEventListener('click', showAllCrews);
    }, 0);
  } else {
    // Dispatch-center selection is unchanged: opt-in "Filter list to zone" button.
    MapView.bindZonePopup(layer, dispatchPopupHtml(props, stats));
    if (stats) setTimeout(() => {
      const btn = $(`zp-filter-${props.DispUnitID}`);
      if (btn) btn.addEventListener('click', () => filterToZone(props.DispUnitID, props.DispName));
    }, 0);
  }
}

// Dispatch-center popup (unchanged behavior).
function dispatchPopupHtml(props, stats) {
  return stats ? `
    <div class="zone-popup">
      <div class="zp-title">${esc(props.DispName)}</div>
      <div class="zp-sub">${esc(props.DispLocation || '')} · ${esc(props.GACCAbbreviation || '')}</div>
      <div class="zp-stats">
        <b>${stats.crew_count}</b> crews · <b>${stats.company_count}</b> companies<br>
        Avg rate: <b>${fmtRate(stats.avg_rate)}</b> · Range: ${fmtRate(stats.min_rate)}–${fmtRate(stats.max_rate)}<br>
        Cheapest: <b>${esc(stats.cheapest.id)}</b> · ${fmtRate(stats.cheapest.rate)} · ${esc(stats.cheapest.company)}
      </div>
      <div class="zp-actions">
        <button class="btn btn-sm" id="zp-filter-${props.DispUnitID}">Filter list to zone</button>
      </div>
    </div>` : `
    <div class="zone-popup">
      <div class="zp-title">${esc(props.DispName)}</div>
      <div class="zp-sub">${esc(props.DispLocation || '')} · ${esc(props.GACCAbbreviation || '')}</div>
      <div class="zp-stats">No T2C crews based in this zone.</div>
    </div>`;
}

// GACC-level popup: aggregated across all dispatch zones in the region. Avoids
// dispatch-center wording.
function gaccPopupHtml(gacc, stats) {
  const title = esc(gacc || 'GACC');
  // IMSR-LIVE (removable): clearly-labeled review-only PL line; '' when no value.
  const pl = ImsrLive.isReady() ? ImsrLive.gaccPL(gacc) : null;
  const plLine = pl ? `<div class="zp-imsr">IMSR PL <b>${pl}</b> · ${ImsrLive.reportDate() || ''} <span class="zp-imsr-tag">review</span></div>` : '';
  return stats ? `
    <div class="zone-popup">
      <div class="zp-title">${title} region</div>
      <div class="zp-sub">Geographic Area Coordination Center</div>
      ${plLine}
      <div class="zp-stats">
        <b>${stats.crew_count}</b> crews · <b>${stats.company_count}</b> companies<br>
        Avg rate: <b>${fmtRate(stats.avg_rate)}</b> · Range: ${fmtRate(stats.min_rate)}–${fmtRate(stats.max_rate)}<br>
        Cheapest: <b>${esc(stats.cheapest.id)}</b> · ${fmtRate(stats.cheapest.rate)} · ${esc(stats.cheapest.company)}
      </div>
      <div class="zp-note">Crew list filtered to this region.</div>
      <div class="zp-actions">
        <button class="btn btn-sm" id="zp-region-${cssId(gacc)}">Show all crews</button>
      </div>
    </div>` : `
    <div class="zone-popup">
      <div class="zp-title">${title} region</div>
      <div class="zp-sub">Geographic Area Coordination Center</div>
      ${plLine}
      <div class="zp-stats">No T2C crews based in this region.</div>
    </div>`;
}

// Sanitize a key for use in an element id (GACC abbreviations are alnum already).
const cssId = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '_');

function filterToZone(unitId, name) {
  STATE.gaccFilter = null;
  STATE.zoneFilter = unitId;
  renderActiveFilters(name);
  applyFiltersAndRender();
  if (!STATE.sidebarOpen) toggleSidebar();
}
function filterToRegion(gacc) {
  STATE.zoneFilter = null;
  STATE.gaccFilter = gacc;
  renderActiveFilters();
  applyFiltersAndRender();
  if (!STATE.sidebarOpen) toggleSidebar();
}
// Clear any region/zone list filter and restore the full crew list. Wired to the
// GACC popup's "Show all crews" action (clicking a region now auto-applies the filter).
function showAllCrews() {
  STATE.gaccFilter = null;
  STATE.zoneFilter = null;
  renderActiveFilters();
  applyFiltersAndRender();
  if (!STATE.sidebarOpen) toggleSidebar();
}
function renderActiveFilters(zoneName) {
  const wrap = $('active-filters');
  if (!STATE.zoneFilter && !STATE.gaccFilter) { wrap.hidden = true; wrap.innerHTML = ''; return; }
  wrap.hidden = false;
  const label = STATE.gaccFilter
    ? `Region: ${esc(STATE.gaccFilter)}`
    : `Zone: ${esc(zoneName || STATE.zoneFilter)}`;
  wrap.innerHTML = `<span class="filter-chip">${label} <button id="clear-zone-filter" title="Clear">×</button></span>`;
  $('clear-zone-filter').addEventListener('click', () => {
    STATE.zoneFilter = null; STATE.gaccFilter = null; renderActiveFilters(); applyFiltersAndRender();
  });
}

/* ============================================================
   Incident mode
   ============================================================ */
function toggleIncidentMode() {
  if (STATE.mode === 'incident' || STATE.incidentPin) { clearIncident(); return; }
  STATE.mode = 'incident';
  MapView.setCrosshair(true);
  $('incident-controls').hidden = false;
  $('ic-coords').textContent = 'click map to drop pin';
  $('btn-incident').classList.add('active');
  $('btn-incident').textContent = '◎ Incident active';
}

function dropIncident(lat, lng) {
  STATE.incidentPin = { lat, lng };
  STATE.incidentSource = 'manual';
  incidentFireMeta = null;
  STATE.mode = 'incident';
  MapView.setCrosshair(false);
  MapView.setIncidentPin(lat, lng);
  if (STATE.incidentRadius > 0) MapView.setIncidentRadius(lat, lng, STATE.incidentRadius);
  $('ic-coords').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  $('app').classList.add('incident-active');
  renderIncident();
}

/* Open the incident ranking panel for a REAL fire's location. Mirrors
   dropIncident()'s state + panel flow, but marks the source as 'fire' and draws
   NO incident pin or radius circle — the only visible result is the panel. Stays
   in 'browse' mode so it doesn't arm map-click placement. */
function openIncidentFromFire(lat, lng, fireMeta = null) {
  STATE.incidentPin = { lat, lng };
  STATE.incidentSource = 'fire';
  incidentFireMeta = fireMeta;
  MapView.setCrosshair(false);
  $('incident-controls').hidden = false;
  $('ic-coords').textContent = fireMeta && fireMeta.name
    ? `${fireMeta.name} · ${lat.toFixed(4)}, ${lng.toFixed(4)}`
    : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  $('btn-incident').classList.add('active');
  $('btn-incident').textContent = '◎ Incident active';
  $('app').classList.add('incident-active');
  renderIncident();
}

function renderIncident() {
  if (!STATE.incidentPin) return;
  const { lat, lng } = STATE.incidentPin;
  // Pass the selected crew so the incident table uses the SAME Model-D field as the
  // moat overlay (subject always available). Without this, a crew that is locally
  // cheapest near its own DDP thins ITSELF out of the table even though the moat
  // shows it rank #1 there — the moat/incident contradiction this view must avoid.
  const rows = rankIncident(DATA.crews, lat, lng, STATE.plKey, STATE.timeFilter, STATE.selectedCrew);
  lastIncidentRows = rows;
  // Restrict the map to this incident's top-N crews (recomputed on every
  // re-render, so PL / time-filter changes keep the visible set in sync).
  incidentTopIds = new Set(rows.slice(0, INCIDENT_TOP_N).map(r => r.crew.id));
  MapView.applyFilter(incidentTopIds);
  const panel = $('incident-panel');
  const shown = STATE.showAllIncident ? rows : rows.slice(0, 50);
  // IMSR-LIVE (removable): debug-only enrichment, ONLY for an EXACT-tier matched
  // fire on the current day; '' (nothing shown) for manual pins, weak/ambiguous,
  // or unmatched. Never alters the ranking above.
  const imsrDebug = (STATE.incidentSource === 'fire' && incidentFireMeta && incidentFireMeta.props)
    ? ImsrLive.incidentDebugHtml(incidentFireMeta.props) : '';

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="panel-title" style="color:var(--gold)">◎ Incident ranking</div>
        <div class="panel-sub">${STATE.incidentSource === 'fire' && incidentFireMeta && incidentFireMeta.name ? `🔥 ${esc(incidentFireMeta.name)} · ` : ''}${rows.length} crews available · ${PL_CONFIG[STATE.plKey].label}${STATE.timeFilter ? ` · ≤${STATE.timeFilter}h mob` : ''}</div>
      </div>
      <div class="panel-head-btns">
        <button class="panel-min" data-min title="Minimize">–</button>
        <button class="panel-close" data-pc="incident-panel" title="Clear (Esc)">×</button>
      </div>
    </div>
    <div class="panel-body" style="padding-top:8px">
      ${imsrDebug}
      <div class="btn-row" style="justify-content:space-between;align-items:center">
        <span class="hint">${STATE.showAllIncident ? `All ${rows.length}` : `Top ${Math.min(50, rows.length)}`} by NICC cost${STATE.timeFilter ? ' · # = full-field rank (unreachable hidden)' : ''}</span>
        <button id="toggle-all-incident" class="btn btn-sm">${STATE.showAllIncident ? 'Show top 50' : 'Show all crews'}</button>
      </div>
      <div class="incident-table-wrap">
      <table class="dtable">
        <thead><tr><th>#</th><th>Crew</th><th class="num">Dist</th><th>Company</th><th class="num">NICC</th></tr></thead>
        <tbody>
          ${shown.map(r => `
            <tr class="clickable ${STATE.selectedCrew && STATE.selectedCrew.id === r.crew.id ? 'me' : ''}" data-id="${r.crew.id}">
              <td>${r.rank}</td>
              <td><span class="tdot" style="background:var(--${r.crew.color})"></span>${esc(r.crew.id)}</td>
              <td class="num">${fmtMiles(r.dist)}<br><span class="hint">${fmtHours(r.mobHours)}</span></td>
              <td class="t-company" title="${esc(r.crew.company)}">${esc(r.crew.company)}</td>
              <td class="num">${fmtMoney(r.cost)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>
    </div>`;
  panel.hidden = false;
  wireMinimize(panel);

  el('[data-pc]', panel).addEventListener('click', clearIncident);
  $('toggle-all-incident').addEventListener('click', () => { STATE.showAllIncident = !STATE.showAllIncident; renderIncident(); });
  panel.querySelectorAll('tr.clickable').forEach(tr =>
    tr.addEventListener('click', () => selectCrew(DATA.byId[tr.dataset.id], { fly: true })));

  // refresh detail badge if a crew is open
  if (STATE.selectedCrew && !$('detail-panel').hidden) renderDetail(STATE.selectedCrew);
}

function clearIncident() {
  STATE.incidentPin = null;
  STATE.incidentSource = null;
  incidentFireMeta = null;
  STATE.mode = 'browse';
  lastIncidentRows = [];
  incidentTopIds = null;          // lift the top-N restriction
  applyFiltersAndRender();        // restore the full set of map dots
  MapView.clearIncidentPin();     // defensive: no-op for fire-click incidents (no pin/circle)
  MapView.setCrosshair(false);
  $('incident-controls').hidden = true;
  $('btn-incident').classList.remove('active');
  $('btn-incident').textContent = '⊕ Drop Incident';
  $('app').classList.remove('incident-active');
  closePanel('incident-panel');
  if (STATE.selectedCrew && !$('detail-panel').hidden) renderDetail(STATE.selectedCrew);
}

/* ============================================================
   Map click router + marker / DDP handling
   ============================================================ */
function handleMapClick(lat, lng) {
  if (STATE.mode === 'incident') return dropIncident(lat, lng);
  if (STATE.mode === 'hypo_placing') return placeHypoCrew(lat, lng);
}

function handleMarkerClick(group, key) {
  if (STATE.mode === 'incident') return dropIncident(group[0].lat, group[0].lng);
  if (STATE.mode === 'hypo_placing') return placeHypoCrew(group[0].lat, group[0].lng);
  if (group.length === 1) return selectCrew(group[0]);
  renderDdpPanel(group);
}

/* Clicking a REAL wildfire feature ranks crews against that fire's location with
   no incident pin/radius. Routed here from map.js's onFireClick. */
function handleFireClick(props, lat, lng) {
  const p = props || {};
  const name = p.IncidentName || p.FireName || null;
  const id = p.IrwinID || p.OBJECTID || null;
  // IMSR-LIVE (removable): keep the raw feature so renderIncident can look up an
  // EXACT IMSR match by UniqueFireIdentifier (debug-only enrichment).
  openIncidentFromFire(lat, lng, { name, id, props: p });
}

function renderDdpPanel(group) {
  const panel = $('ddp-panel');
  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="panel-title">${group.length} crews · shared DDP</div>
        <div class="panel-sub">${esc(group[0].ddl)}</div>
      </div>
      <div class="panel-head-btns">
        <button class="panel-min" data-min title="Minimize">–</button>
        <button class="panel-close" data-pc="ddp-panel" title="Close">×</button>
      </div>
    </div>
    <div class="panel-body">
      <table class="dtable">
        <thead><tr><th>Crew</th><th class="num">Rate</th><th class="num">Rank</th><th></th></tr></thead>
        <tbody>
          ${group.map(c => `
            <tr>
              <td><span class="tdot" style="background:var(--${c.color})"></span>${esc(c.id)}<br><span class="hint">${esc(c.company)}</span></td>
              <td class="num">${fmtRate(c.rate)}</td>
              <td class="num">#${c.rank}</td>
              <td><button class="btn btn-sm" data-id="${c.id}">View</button></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  panel.hidden = false;
  wireMinimize(panel);
  el('[data-pc]', panel).addEventListener('click', () => closePanel('ddp-panel'));
  panel.querySelectorAll('button[data-id]').forEach(b =>
    b.addEventListener('click', () => { closePanel('ddp-panel'); selectCrew(DATA.byId[b.dataset.id], { fly: true }); }));
}

/* ============================================================
   Panel minimize (dock CSS handles stacking; no overlap possible)
   ============================================================ */
// Minimize/expand a floating panel (collapses to just its header).
function wireMinimize(panel) {
  const btn = panel.querySelector('[data-min]');
  if (!btn) return;
  const sync = () => {
    const min = panel.classList.contains('minimized');
    btn.textContent = min ? '▢' : '–';
    btn.title = min ? 'Expand' : 'Minimize';
  };
  // A re-rendered panel keeps its `minimized` class but gets a fresh button with
  // the default "–" label; sync so the label always matches the actual state.
  sync();
  btn.addEventListener('click', () => { panel.classList.toggle('minimized'); sync(); });
}

function closePanel(id) { $(id).hidden = true; }

/* ============================================================
   Keyboard
   ============================================================ */
function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea';
    if (e.key === 'Escape') {
      if (!$('glossary').hidden) return closeModal('glossary');
      if (!$('fire-filters').hidden) return setFireFiltersOpen(false);
      if (STATE.mode === 'hypo_placing') { STATE.mode = 'browse'; MapView.setCrosshair(false); renderHypotheticalDDLTool(); return; }
      if (STATE.incidentPin || STATE.mode === 'incident') return clearIncident();
      if (plannerOpen && !$('planner-panel').hidden) return closePlanner();
      if (compareMode && !$('compare-panel').hidden) return exitCompareMode();
      if (!$('detail-panel').hidden) return closeDetail();
      if (!$('hypo-panel').hidden) return closeHypoTool();
      if (!$('ddp-panel').hidden) return closePanel('ddp-panel');
      if (STATE.activeOverlay === 'coverage') return clearActiveOverlay();
      return;
    }
    if (typing) {
      if (e.key === 'Enter' && tag === 'input' && e.target.id === 'search') e.target.blur();
      return;
    }
    switch (e.key.toLowerCase()) {
      case 'i': e.preventDefault(); toggleIncidentMode(); break;
      case 'h': e.preventDefault(); toggleHypoTool(); break;
      case 'p': e.preventDefault(); togglePlanner(); break;
      case '/': e.preventDefault(); $('search').focus(); break;
      case 'z': toggleZones(); break;
      case 'm': if (STATE.selectedCrew) toggleMoat(); break;
      case 'c': toggleCoverage(); break;
      case 'd': toggleDesert(); break;
      case 'y': e.preventDefault(); toggleYear(); break;
      case 'x': e.preventDefault(); toggleCompare(); break;
      case 'w': toggleWildfire(); break;
      case 'a': toggleWatches(); break;
      case 'f': toggleFireFilters(); break;
      case 't': toggleTheme(); break;
    }
  });
}

/* ============================================================
   Modal / glossary
   ============================================================ */
function openModal(id) { $(id).hidden = false; }
function closeModal(id) { $(id).hidden = true; }

function buildGlossary() {
  // Small builders so the long content below stays readable. Descriptions are
  // injected as HTML (the existing pattern), so inline <code>/<b> are intentional.
  const term    = (t, d) => `<div class="gloss-term"><h3>${t}</h3><p>${d}</p></div>`;
  const sub     = (s)    => `<div class="gloss-sub">${s}</div>`;
  const section = (t, n) => `<div class="gloss-section"><h2>${t}</h2>${n ? `<p>${n}</p>` : ''}</div>`;

  const html = [
    `<p class="gloss-intro">This map ranks all <b>802</b> Type&nbsp;2 (T2C) hand crews on the 2025/26 IROC contract by their NICC dispatch cost, and lets you stress-test where each crew, company, or hypothetical placement is competitive. Everything keys off two facts per crew: its hourly <b>rate</b> and its home location (<b>DDP</b>). Colors and rankings describe <b>price competitiveness, not crew quality</b>. The <b>Glossary</b> defines every term and control; the <b>Methodology</b> explains how the numbers are produced and how to read them.</p>`,

    /* ===================== GLOSSARY ===================== */
    section('Glossary'),

    sub('Crews, cost &amp; pricing'),
    term('NICC dispatch cost', 'The ranking metric. <code>base_cost + (rate × 20 ÷ 50) × distance × 2</code>. <code>base_cost</code> is the fixed labor cost; the second term is round-trip travel for a 20-person crew at 50&nbsp;mph over the straight-line (great-circle) air-mile distance. Lower cost = more competitive at that point. A pricier-but-closer crew can beat a cheaper-but-distant one.'),
    term('Base cost', '<code>rate × 20 people × 14 days × 8 hrs</code> — the fixed labor cost of a dispatch, before travel. Stored per crew; depends only on rate.'),
    term('Rate &amp; rate tier', 'A crew’s hourly rate ($/hr) sets its color by <b>fixed dollar breakpoints</b> (not by rank, count, or quality): <b>green</b> under $59.50, <b>yellow</b> $59.50–$61, <b>orange</b> $61–$63, <b>red</b> $63+. The sidebar stat chips count crews per tier; clicking a chip filters the list to that tier’s rate window.'),
    term('Global rank', 'Each crew’s fixed position <b>1–802</b> when the whole field is sorted by rate ascending (rank&nbsp;1 = cheapest). Shown as “Global rank” in the detail panel and as <code>#N</code> in the crew list. Distinct from a crew’s <i>situational</i> rank at a specific point (see Moat / Incident).'),
    term('DDP / DDL', 'Designated Dispatch Point — the crew’s home lat/lng, the origin for every distance calculation. DDL is the human-readable dispatch location/address text shown in the detail panel.'),
    term('Shared DDP', 'Multiple crews based at the same coordinates. The map shows one marker (colored by the cheapest crew there); click it to open a list and pick a specific crew.'),

    sub('Availability model'),
    term('Preparedness Level (PL)', 'A national readiness setting that simulates competing fires drawing the cheapest crews away. Higher PL keeps a smaller fraction of the field available: <b>None</b>&nbsp;=&nbsp;100%, <b>PL2</b>≈90%, <b>PL3</b>≈70%, <b>PL4</b>≈43%, <b>PL5</b>≈18%. Thinning removes the <b>lowest-rate</b> crews first (“the cheapest are already committed”), which opens the competitive field for higher-rate crews near a fire.'),
    term('Filter intensity', 'A slider beneath the PL presets. The preset sets the nominal kept fraction; the slider only <b>adds</b> filtering on top — left edge is nominal (no change), and dragging right keeps less of the field (down to 40% of the preset’s fraction at the far right). It feeds the same thinning every analysis uses; the readout shows the effective “% kept · nominal/heavier.”'),
    term('Competitive field (Model D)', 'The single shared answer to “who is available to fight a fire at this point,” used by the moat, the incident table, and the competitive-radius sim so they can never disagree. Competitors are thinned globally by rate; the <b>selected crew</b> (the hypothesis) is always kept available. With no crew selected, the whole field is thinned literally.'),

    sub('Selected-crew analyses (detail panel)'),
    term('Competitive radius', 'Simulates ~100 incidents on an even (sunflower) grid inside a radius (50–800&nbsp;mi, default 200) around the selected crew’s DDP. Reports <b>top-10%</b> and <b>top-20%</b> (share of points where the crew lands in that band), average and median rank, and an exclusive rank-band breakdown (1–5 / 6–10 / 11–20 / 21+). #1 win rate and top-5 are diagnostics — the goal is to hold the top-10/top-20 band, not to be cheapest everywhere.'),
    term('Threats', 'Crews that out-rank the selected crew in ≥30% of the sampled points (up to 8 shown) — its real local competitors. Click one to analyze it.'),
    term('Rate sensitivity', 'Substitutes a hypothetical rate for the selected crew, re-runs the radius sim, and shows the change in top-10%, average rank, new global rank, and Δ base cost.'),
    term('Breakeven', 'The rate at which the selected crew ties its #1 threat at the radius center (solved exactly, since NICC cost is linear in rate). Charge at or below it to tie.'),

    sub('Incident'),
    term('Incident ranking', 'Drop a pin anywhere (or click a wildfire) and every available crew is ranked by NICC cost to that point — the <b>same</b> ranking the moat shows. The “Max mob time” filter (6/12/24h) only <b>hides</b> crews whose mobilization (travel + a flat 3h buffer) exceeds the limit; it never changes anyone’s rank, so visible rows keep their true full-field cost rank (numbers may skip). While active, the map narrows to the incident’s top 30 crews.'),

    sub('Map overlays (one analytic overlay at a time)'),
    term('Moat overlay', 'A land-masked grid (~27&nbsp;mi cells, 350&nbsp;mi reach) around the selected crew. Each cell is colored by the crew’s rank in the competitive field there on a five-stop fade: <b>emerald</b> = comfortably top-10, <b>lime</b> = top-10, <b>amber</b> = top-20 edge, <b>orange</b> = just outside, <b>red</b> = rank&nbsp;40+ (outside the useful band). Hover any cell for exact rank, band, and the cheapest competitor.'),
    term('Company coverage', 'A company-wide moat: the single-crew moat is run for each selected crew (ranked against the full field, 700&nbsp;mi reach, clipped to US land) and unioned. Pick <b>Company&nbsp;A</b>; a price-tier chip isolates a band, or check crews individually. Each cell is colored by the <b>best-ranked</b> selected crew there using the same red→emerald gradient, so green corridors mark where at least one crew is competitive. Add a <b>Company&nbsp;B</b> for two-company mode: cells where only one company is competitive tint toward that company’s hue (A = sky blue, B = magenta), strongest where that company is top-10 and the other has no top-20 presence; cells where both or neither compete keep the plain gradient. Options: include the hypothetical DDL (assign it to A or B), and show all dots vs only analyzed crews. Hover a crew row to light up its own footprint.'),
    term('Rate desert', 'A CONUS grid (~70&nbsp;mi cells) showing the average rate of the cheapest <b>15</b> crews still available after PL thinning at each location. <b>Teal</b> = cheap field; <b>orange</b> = “desert” where only expensive crews remain. Most meaningful at PL3+ (or a heavier filter); at PL&nbsp;None there is nothing to thin. Hover a cell for avg / lowest / highest surviving rate. (Uses point-local thinning — see Methodology.)'),
    term('Zones', 'Outlines crew markets, with two views (segmented control, top-right). <b>GACC regions</b> (default) draws one clean outline per Geographic Area Coordination Center (10 regions); clicking a region <b>auto-filters</b> the crew list to it (popup “Show all crews” clears it). <b>Dispatch centers</b> draws all 133 NIFC dispatch boundaries; clicking one shows its stats with an opt-in “Filter list to zone.” Both popups show crew count, company count, avg/min/max rate, and the cheapest crew.'),

    sub('Informational layers (independent toggles · never affect ranking)'),
    term('Wildfires', 'Live fire points loaded on demand via 🔥, merging two ArcGIS feeds into one styled, filterable layer: NIFC <code>USA_Wildfires</code> current incidents (icon sized by acreage) plus WFIGS incidents reported in the last 24h (shown with the “new start” icon, deduped against the current feed by IrwinID). Click a point for name, size, containment, and cause; clicking a fire also opens an Incident ranking at that location.'),
    term('Wildfire filters (⛯)', 'A drawer that narrows <b>both</b> fire feeds server-side at once: name, incident type (Wildfire / Prescribed / Complex), cause, containment, “new fires only,” minimum size (log slider), and state / GACC checklists. The footer shows the deduped “showing&nbsp;X of&nbsp;Y,” and it works even while the fire layer is hidden.'),
    term('Alerts (⚠)', 'NWS active watches / warnings / advisories polygons, colored by CAP severity (Extreme→deep red, Severe→orange, Moderate→amber, Minor→sky, Unknown→slate). An alert-type filter (All / Red&nbsp;Flag / Wind) appears while it is on. Purely informational.'),
    term('Transportation overlay', 'A fixed, subtle interstate-roads reference (Esri Transportation), always on, drawn above the basemap and beneath the analytics/markers. Not toggleable; opacity fixed at 0.25.'),
    term('Basemap / theme', 'Light (default) uses an Esri World&nbsp;Topo raster basemap; dark uses an Esri “World Navigation (Dark)” vector basemap. Toggle with the ☀/☾ button or <code>T</code>.'),

    sub('Hypothetical placement'),
    term('Hypothetical DDL', 'A standalone what-if crew. Open ⚲&nbsp;Hypo&nbsp;DDL, set a rate (default $60 ≈ field median), and drop it anywhere. It becomes a real crew object — exact NICC cost, a global rate rank, its own tier color — and is fully included in incident, competitive-radius, moat, coverage, and rate-desert analysis. Select it to analyze it like any real crew; <b>Remove</b> restores the real field. Re-rating or re-placing recomputes everything instantly.'),

    sub('Experimental / review-only (IMSR live data)'),
    term('IMSR live data', 'An optional, clearly-labeled integration of the daily NIFC Incident Management Situation Report (IMSR), behind a master switch (currently <b>enabled for review</b>). It is <b>unverified review data</b> and <b>never</b> changes ranking, NICC math, or crew membership. It supplies three additive surfaces below, each of which fails safe to “nothing shown.”'),
    term('IMSR PL tint', 'In the GACC-regions zone view, each region is shaded by its IMSR preparedness level (PL1 blue … PL5 red) with a small legend; a “Nd old” flag appears if the report is stale (older than 1 day). GACC popups add a review-tagged “IMSR PL” line.'),
    term('Sit-rep thinning (experimental)', 'A “Thinning” toggle (<b>PL</b> | <b>Sit-rep</b>) on the PL bar. Sit-rep derives the keep-fraction from IMSR national crew totals instead of the PL preset. It is an <b>untuned heuristic</b>, review-only, and fails safe back to PL behavior if the value is missing or invalid.'),
    term('IMSR incident debug', 'When you click a wildfire that <b>exactly</b> matches an IMSR incident for the current day, the incident panel shows a small review-only block (IMSR crews / engines / personnel), labeled “not app truth.” It never affects the ranking.'),

    sub('Reference'),
    term('Keyboard', '<code>I</code> incident · <code>H</code> hypo DDL · <code>/</code> search · <code>Z</code> zones · <code>M</code> moat · <code>C</code> coverage · <code>D</code> desert · <code>W</code> wildfires · <code>A</code> alerts · <code>F</code> fire filters · <code>T</code> theme · <code>Esc</code> cancel/close.'),

    /* ===================== METHODOLOGY ===================== */
    section('Methodology', 'How the numbers are produced, and how to read the map.'),

    term('What the map answers', 'For a given fire location and national readiness level: which crews are the cheapest to dispatch there, and where does each crew or company hold a durable cost advantage. Two crew facts drive everything — the hourly <b>rate</b> (which fixes the labor cost and the rate ranking) and the home <b>DDP</b> (which fixes travel distance).'),
    term('The cost model', 'A crew’s cost at a point is its fixed <code>base_cost</code> (rate × 20 × 14 × 8) plus round-trip travel <code>(rate × 20 ÷ 50) × distance × 2</code>, where distance is straight-line haversine air miles. So cost rises with both rate and distance: a crew’s standing is local. <b>Global rank</b> is the pure rate ordering (1–802); a crew’s <b>situational rank</b> at a point is the NICC-cost ordering of the available field there.'),
    term('Availability — two thinning models', 'PL thinning has two forms. <b>Global</b> thinning (by each crew’s own rate) drops the cheapest (1−keep) of the field regardless of location and powers <b>every ranking view</b>; because the survivors are point-independent, ranking them by cost-to-point is not circular. <b>Point-local</b> thinning (by cost to the specific point) is used <b>only</b> by the rate desert, as a per-location market-structure lens. Point-local thinning is deliberately <b>not</b> used for ranking — it would delete exactly the crews that beat a subject there and false-rank an expensive crew #1. One function computes the effective keep-fraction (preset × intensity slider), so all views thin identically.'),
    term('Model D — one shared field', 'The selected crew is treated as the hypothesis (“if I dispatch THIS crew here”) and is exempt from thinning; competitors are thinned around it. The moat, the dropped-incident table, and the competitive-radius sim all consume this one field, so a crew’s <b>moat rank at a point equals its incident rank there</b>. Without it, a locally-cheap crew would thin itself out of a table ranked around a different subject — the “moat says #1, incident says gone” contradiction this design avoids. With no crew selected, the whole field is thinned literally.'),
    term('Reading the moat &amp; coverage', 'A rank→strength curve anchors rank&nbsp;1 = 1.0, rank&nbsp;10 = 0.70, rank&nbsp;20 = 0.35, fading to 0 by rank&nbsp;40; the five-stop color and the hover wording both track these cutoffs. “Competitive” means top-20 (the useful band); “strong” means top-10. The single-crew moat reaches 350&nbsp;mi and is land-masked. Coverage reuses the identical per-crew math, reaches 700&nbsp;mi, clips to US land, and unions by best (max) strength. Two-company coloring only re-tints one-sided cells; both/neither cells stay on the plain gradient, so coverage reads as the moat first.'),
    term('Reading the rate desert', 'Per cell, ~6 sub-points are sampled, the field is thinned point-locally at each, the cheapest 15 survivors’ rates are averaged, and those are averaged across the sub-points. Color runs teal→orange across roughly $58–$64 (contrast around the ~$61 median). Higher PL removes more cheap crews, so deserts widen.'),
    term('Scenario tools', 'Competitive radius samples ~100 points on a sunflower grid, buckets ranks into exclusive bands, flags threats (beat you ≥30% of points), and solves breakeven exactly. Rate sensitivity re-runs the radius sim at a test rate; its “new global rank” excludes the subject’s own current self so a raise isn’t counted against the new rate. The hypothetical DDL is injected as a real crew so it competes everywhere — its rank/color fields are display-only; all math keys off its rate and location.'),
    term('Interpreting colors &amp; ranks', 'Colors and ranks are about price competitiveness, not quality, contract status, or guaranteed availability. Being #1 is a diagnostic; the operational goal is the top-10/top-20 band. Skipped numbers in the incident table are expected (unreachable crews are hidden, not renumbered). Sweep PL up and down to see how a more committed field reshapes each crew’s advantage.'),
    term('Layers of logic — what’s trusted vs not', '<b>Production (drives ranking):</b> NICC cost, global/situational rank, PL thinning, the Model-D field, and the moat / coverage / desert / zones / incident / competitive-radius / rate-sensitivity / hypothetical-DDL tools. <b>Informational only (never affects ranking):</b> wildfires, weather alerts, the transportation overlay, and the basemap. <b>Review-only / experimental / additive (IMSR):</b> the PL tint, sit-rep thinning, and incident debug block — unverified, removable, and fail-safe; the master switch is currently on for review. <b>Debug-only:</b> the console helper <code>__moatAudit(lat,lng)</code> cross-checks moat vs incident rank, and on-map sample dots appear only with <code>?debugDots</code> in the URL.'),
    term('Limitations &amp; caveats', 'Distances are straight-line air miles, not road miles or drive time; travel cost and mobilization time are a 50&nbsp;mph approximation plus a flat 3h buffer. PL keep-fractions are modeling assumptions, not live availability, and the intensity slider is a what-if (the only data-driven option, sit-rep, is unverified). The US land mask is a simplified outline (the Great Lakes count as land), so desert/coverage cells can clip slightly. Tier colors are fixed dollar bands and encode none of quality, contract status, or real availability. GACC membership is computed by point-in-polygon against the dispatch-zone geometry (more accurate than the raw <code>disp_unit_id</code>, which misfiled ~17% of edge crews). IMSR surfaces reflect the report’s source date; if older than a day they are flagged stale, and every IMSR accessor fails safe to “nothing shown.”'),
  ];

  $('glossary-body').innerHTML = html.join('');
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
