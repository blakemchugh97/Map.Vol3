/* ============================================================
   ui.js — entry point. Sidebar, panels, filters, modes,
   glossary, theme. Wires DOM <-> map.js <-> dispatch.js.
   ============================================================ */

import {
  STATE, DATA, PL_CONFIG, PL_SLIDER, HYPO_CONFIG, RATE_BOUNDS, ZONE_SIM,
  MOAT_CONFIG, DESERT_CONFIG, TIERS, WATCHES_CONFIG, effectiveKeepFraction, tierForRank,
  setKeepFractionOverride,
} from './config.js';
import {
  rankIncident, runZoneSimulation, rateSensitivity, breakevenRate,
  makeRateVariant, baseCostFor, zoneStats, gaccStats, selectCoverageCrews,
  auditMoatPoint, pointInGeometry,
} from './dispatch.js';
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

/* ============================================================
   Bootstrap
   ============================================================ */
init();

async function init() {
  $('error-retry').addEventListener('click', () => location.reload());
  try {
    const res = await fetch('crews.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const crews = await res.json();
    loadData(crews);
  } catch (err) {
    return showError('Failed to load crew data', `crews.json could not be fetched (${err.message}). Serve over HTTP (e.g. python3 -m http.server) and retry.`);
  }

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

function loadData(crews) {
  DATA.crews = crews.slice().sort((a, b) => a.rank - b.rank);
  DATA.byId = {};
  DATA.ddpGroups = {};
  for (const c of DATA.crews) {
    c.color = tierForRank(c.rate);
    DATA.byId[c.id] = c;
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
    (DATA.ddpGroups[key] ||= []).push(c);
  }
  // keep each ddp group sorted by rank so cheapest drives the marker color
  for (const k in DATA.ddpGroups) DATA.ddpGroups[k].sort((a, b) => a.rank - b.rank);

  // Debug hook for the moat/incident consistency audit: select a crew, then in the
  // console run __moatAudit(lat, lng) to compare the moat rank/band, the legacy
  // dollar margin, and the incident-table rank at one point (consistent:true means
  // moatRank === incidentRank). e.g. __moatAudit(41.2, -114.0)
  window.__moatAudit = (lat, lng) =>
    auditMoatPoint(STATE.selectedCrew, lat, lng, DATA.crews, STATE.plKey, STATE.timeFilter);
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
    activeTier = tier;
    const inTier = DATA.crews.filter(c => c.color === tier);
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

  // PL bar
  document.querySelectorAll('.pl-btn').forEach(btn => {
    btn.addEventListener('click', () => setPL(btn.dataset.pl));
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
  $('btn-hypo').addEventListener('click', toggleHypoTool);
  $('btn-zones').addEventListener('click', toggleZones);
  document.querySelectorAll('#zone-mode .seg-btn').forEach(b =>
    b.addEventListener('click', () => setZoneMode(b.dataset.zmode)));
  $('btn-moat').addEventListener('click', toggleMoat);
  $('btn-coverage').addEventListener('click', toggleCoverage);
  $('btn-desert').addEventListener('click', toggleDesert);
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
  document.querySelectorAll('.pl-btn').forEach(b => b.classList.toggle('active', b.dataset.pl === plKey));
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
        <div class="panel-title">${esc(crew.id)} · ${fmtRate(crew.rate)}/hr</div>
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
        <div class="kv"><span class="kv-label">Global rank</span><span class="kv-val big">#${crew.rank}</span></div>
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
    onProgress: (d, t) => setProgress(`Computing moat… ${Math.round(d / t * 100)}%`),
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
    onProgress: (d, t) => setProgress(`Computing rate desert… ${Math.round(d / t * 100)}%`),
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
      </div>` : '<div class="hint" style="margin-top:4px">Then include crews by price tier or individually. Add a Company B to color where only one company is competitive.</div>'}
    </div>`;
  panel.hidden = false;
  wireMinimize(panel);

  el('[data-pc]', panel).addEventListener('click', () => clearActiveOverlay());
  $('cov-company-a').addEventListener('change', e => onCoverageCompany('A', e.target.value));
  $('cov-company-b').addEventListener('change', e => onCoverageCompany('B', e.target.value));
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
  else { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); $('legend').hidden = true; }
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
  if (STATE.activeOverlay !== 'coverage' || (!companies.length && !hypo)) return;
  const crews = coverageAllCompanyCrews().filter(c => coverageSelectedIds.has(c.id));
  if (hypo) crews.push(hypo); // one more analyzed crew in the moat union
  if (!crews.length) { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); hideProgress(); $('legend').hidden = true; return; }
  const duo = coverageIsDuo();
  showProgress('Computing coverage…');
  MapView.showCoverage(crews, DATA.crews, STATE.plKey, {
    onProgress: (d, t) => setProgress(`Computing coverage… ${Math.round(d / t * 100)}%`),
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
  btn.addEventListener('click', () => {
    const min = panel.classList.toggle('minimized');
    btn.textContent = min ? '▢' : '–';
    btn.title = min ? 'Expand' : 'Minimize';
  });
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
      case '/': e.preventDefault(); $('search').focus(); break;
      case 'z': toggleZones(); break;
      case 'm': if (STATE.selectedCrew) toggleMoat(); break;
      case 'c': toggleCoverage(); break;
      case 'd': toggleDesert(); break;
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
  const terms = [
    ['NICC Dispatch Cost', 'The ranking metric. <code>base_cost + (rate × 20 ÷ 50) × distance × 2</code>. Base cost is the 14-day, 8-hr crew cost; the second term is round-trip travel at 50 mph straight-line.'],
    ['Base cost', '<code>rate × 20 people × 14 days × 8 hrs</code> — the fixed labor cost of a dispatch, before travel.'],
    ['Rate tiers', 'Crews ranked globally by rate (ascending). <b>Green</b> = cheapest 100, <b>Yellow</b> = 101–210, <b>Orange</b> = 211–388, <b>Red</b> = 389+. Color encodes competitive pricing, not quality.'],
    ['Preparedness Level (PL)', 'Simulates competing fires drawing the cheapest crews away. Higher PL keeps a smaller fraction of the field available, opening the competitive field. PL2≈90%, PL3≈70%, PL4≈43%, PL5≈18%.'],
    ['PL filter intensity', 'A slider beneath the PL presets. The preset sets the nominal field-kept fraction; the slider adds filtering intensity on top — the left edge is nominal (no change), and dragging right keeps less of the field (heavier). It feeds the same thinning used by every tool.'],
    ['Incident mode', 'Drop a pin anywhere; every available crew is ranked by NICC cost to that point — the same rank the moat overlay shows. The time filter only hides crews whose mobilization (travel + 3h buffer) exceeds the limit; it does not change anyone\'s rank, so the surviving rows keep their true full-field cost rank (numbers may skip).'],
    ['Competitive radius', 'Simulates ~100 incidents inside a radius around a crew\'s DDP. The main metrics are top-10 and top-20 rate, average rank, median rank, and a rank-band breakdown. Being #1 is shown as a diagnostic — the goal is to stay competitive in the top-10 to top-20 band, not to be the cheapest option everywhere.'],
    ['Threats', 'Crews that out-rank the selected crew in ≥30% of sampled incidents — direct competitors in that radius.'],
    ['Rate sensitivity', 'Substitutes a hypothetical rate, re-runs the simulation, and shows the change in win rate, rank, and base cost. Breakeven is the rate at which you tie your top threat.'],
    ['Moat overlay', 'A grid (~350mi) around the selected crew. Each cell shows where the crew\'s rank falls in the competitive field at that location. Emerald = comfortably top-10; amber = near the top-20 boundary; red = outside the useful band. Hover any cell for the exact rank.'],
    ['Company coverage', 'A company-wide moat: the single-crew moat run for each selected crew (ranked against the full field, exactly as normal) and then unioned. Pick a vendor company, then click a price-tier chip to isolate that band (click again for all crews), or check crews individually. Every cell uses the same red→emerald moat gradient, colored by the BEST-ranked selected crew there — so you get corridors of green wherever at least one crew is competitive (emerald = a crew is top-10, amber = top-20, red = a crew is near but uncompetitive, empty = no crew in range). Hover a crew row to light up its own moat, or a cell to see which crews are competitive there. Higher PL thins competitors and widens the green.'],
    ['Rate desert', 'A CONUS grid showing the average rate of the cheapest available crews after PL thinning. Teal = cheap field; orange = "desert" where only expensive crews remain. Hover a cell for the average, lowest, and highest rate among the surviving top-15.'],
    ['Hypothetical DDL', 'A standalone what-if crew. Open the ⚲ Hypo DDL tool, set a rate, and drop it anywhere. It becomes a normal crew object — exact NICC cost, a global rate rank, and full inclusion in incident, competitive-radius, moat, and rate-desert analysis. Select it to analyze it like any real crew; Remove to restore the real field.'],
    ['Shared DDP', 'Multiple crews dispatched from one address. Click the shared map pin to open a list and pick a specific crew.'],
    ['Wildfire layer', 'Live fire points loaded on demand via the 🔥 button, merging two ArcGIS feeds into one styled, filterable layer: NIFC <code>USA_Wildfires</code> current incidents (icon sized by acreage) plus WFIGS incidents reported in the last 24h (shown with the "new start" icon). The ⛯ Filters panel narrows both feeds at once (size, type, cause, containment, state, GACC, name). Click any point for incident name, size, and containment. Purely informational — it never affects crew ranking or any analysis.'],
  ];
  $('glossary-body').innerHTML = terms.map(([t, d]) =>
    `<div class="gloss-term"><h3>${t}</h3><p>${d}</p></div>`).join('') +
    `<div class="gloss-term"><h3>Keyboard</h3><p><code>I</code> incident · <code>H</code> hypo DDL · <code>/</code> search · <code>Z</code> zones · <code>M</code> moat · <code>C</code> coverage · <code>D</code> desert · <code>W</code> wildfires · <code>F</code> fire filters · <code>T</code> theme · <code>Esc</code> cancel</p></div>`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
