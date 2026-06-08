/* ============================================================
   ui.js — entry point. Sidebar, panels, filters, modes,
   glossary, theme. Wires DOM <-> map.js <-> dispatch.js.
   ============================================================ */

import {
  STATE, DATA, PL_CONFIG, PL_SLIDER, HYPO_CONFIG, RATE_BOUNDS, ZONE_SIM,
  MOAT_CONFIG, DESERT_CONFIG, TIERS, effectiveKeepFraction, tierForRank,
} from './config.js';
import {
  rankIncident, runZoneSimulation, rateSensitivity, breakevenRate,
  makeRateVariant, baseCostFor, zoneStats, selectCoverageCrews,
} from './dispatch.js';
import * as MapView from './map.js';

/* ---------- tiny DOM helpers ---------- */
const $  = (id) => document.getElementById(id);
const el = (sel, root = document) => root.querySelector(sel);
const fmtMoney  = (n) => '$' + Math.round(n).toLocaleString();
const fmtRate   = (n) => '$' + Number(n).toFixed(2);
const fmtMiles  = (n) => Math.round(n).toLocaleString() + ' mi';
const fmtHours  = (h) => h < 1 ? Math.round(h * 60) + 'm' : h.toFixed(1) + 'h';
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- module state ---------- */
let lastIncidentRows = [];
let incidentFireMeta = null; // { name, id } when the active incident came from a fire click, else null
let lastZoneResult = null;
let zoneRadius = ZONE_SIM.defaultRadius;
let testRate = null;
let zonesGeojsonFailed = false;
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

// Company coverage view state: the chosen vendor company, the set of its crews
// currently included, and a debounce handle for recompute on selection changes.
let coverageCompany = null;          // company name or null
let coverageSelectedIds = new Set(); // crew ids included within the company
let coverageTimer = null;            // debounce handle for startCoverage()
// Map-dot visibility while the coverage overlay is active. false = show all crew
// dots (current behavior); true = show only the crews in the company analysis.
let coverageShowOnlyAnalyzed = false;

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
  MapView.buildMarkers(DATA.crews, DATA.ddpGroups, STATE.clusterRadius);

  buildGlossary();
  wireControls();
  wireKeyboard();
  wireFireFilters();
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
    mapIds = new Set([...mapIds].filter(id => coverageSelectedIds.has(id)));
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

/* Full recompute after the crew FIELD changes (hypothetical DDL add/re-rate/
   remove): overlay caches share the same plKey|plSlider key but now describe a
   different field, so they must be dropped; the sidebar list / markers refresh
   to add or remove the hypo; then the analyses re-run. */
function recomputeForFieldChange() {
  MapView.invalidateOverlayCaches();
  if (!STATE.incidentPin) applyFiltersAndRender(); // refresh list/markers (hypo in/out)
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
  renderDetail(crew);
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
    incidentBadge = row
      ? `<div class="rank-badge-lg" title="Rank at the active incident">◎ Rank #${row.rank} at incident · ${fmtMoney(row.cost)}</div>`
      : `<div class="note-flag">Thinned out at ${STATE.plKey.toUpperCase()} / time filter for the active incident.</div>`;
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
    rank, color: tierForRank(rank),
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
        <div class="btn-row" style="margin-top:9px">
          <button id="hypo-analyze" class="btn btn-primary full">Select &amp; analyze this crew</button>
        </div>
        <div class="btn-row" style="margin-top:6px">
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
  if ($('hypo-analyze')) $('hypo-analyze').addEventListener('click', () => selectCrew(STATE.hypoCrew, { fly: true }));
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

/* Remove the hypo DDL entirely and restore the real field. */
function removeHypoCrew() {
  const wasSelected = STATE.selectedCrew && STATE.selectedCrew.id === HYPO_CONFIG.id;
  removeHypotheticalCrewFromAnalysis();
  MapView.clearHypoPin();
  if (wasSelected) closeDetail();
  renderHypotheticalDDLTool();
  recomputeForFieldChange();
}

/* Clicking the hypo map marker: drop incident here / re-place / select & analyze. */
function handleHypoMarkerClick() {
  const h = STATE.hypoCrew;
  if (!h) return;
  if (STATE.mode === 'incident') return dropIncident(h.lat, h.lng);
  if (STATE.mode === 'hypo_placing') return placeHypoCrew(h.lat, h.lng);
  selectCrew(h, { fly: false });
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
  if (was === 'zones') MapView.hideZones();
  else { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); }
  if (was === 'coverage') { clearTimeout(coverageTimer); MapView.clearCoverageHighlight(); closePanel('coverage-panel'); }
  hideProgress(); // a cancelled job's onDone never fires, so clear the chip here
  STATE.activeOverlay = null;
  $('legend').hidden = true;
  updateOverlayButtons();
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
    <div class="legend-grad-labels"><span>rank 35+</span><span>top-20 edge</span><span>top-10 ✓</span></div>
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
  if (coverageCompany) startCoverage(); // restore last company's footprint
}

function renderCoveragePanel() {
  const panel = $('coverage-panel');
  const companies = companyList();
  const company = coverageCompany;
  const crews = company ? companyCrews(company) : [];
  const tierCounts = { green: 0, yellow: 0, orange: 0, red: 0 };
  for (const c of crews) tierCounts[tierForRank(c.rate)]++;
  const selN = crews.filter(c => coverageSelectedIds.has(c.id)).length;

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="panel-title"><span class="accent">⧉</span> Company coverage</div>
        <div class="panel-sub">${company ? `${esc(company)} · ${selN}/${crews.length} crews` : 'Pick a company to map its coverage'}</div>
      </div>
      <div class="panel-head-btns">
        <button class="panel-min" data-min title="Minimize">–</button>
        <button class="panel-close" data-pc="coverage-panel" title="Close (Esc)">×</button>
      </div>
    </div>
    <div class="panel-body">
      <div class="section" style="border-top:none;padding-top:0">
        <div class="section-title"><span><span class="accent">▦</span> Company</span></div>
        <select id="cov-company" class="input cov-select">
          <option value="">— Select a company —</option>
          ${companies.map(c => `<option value="${esc(c.name)}"${c.name === company ? ' selected' : ''}>${esc(c.name)} (${c.count})</option>`).join('')}
        </select>
      </div>
      ${company ? `
      <div class="section">
        <div class="section-title"><span><span class="accent">$</span> Price tiers</span>
          <button id="cov-all" class="btn btn-sm">${selN === crews.length ? 'Clear all' : 'Select all'}</button></div>
        <div class="cov-tiers">
          ${COVERAGE_TIERS.map(t => coverageTierChip(t, tierCounts[t], crews)).join('')}
        </div>
      </div>
      <div class="section">
        <div class="section-title"><span>Crews</span><span class="filter-readout" id="cov-selected">${selN} selected</span></div>
        <div class="cov-crewlist">
          ${crews.map(coverageCrewRow).join('') || '<div class="hint">No crews for this company.</div>'}
        </div>
      </div>
      <div class="section">
        <div class="section-title"><span>Map dots</span></div>
        <div class="cov-vismode">
          <button class="btn btn-sm cov-vis${!coverageShowOnlyAnalyzed ? ' active' : ''}" data-vis="all">Show all crews</button>
          <button class="btn btn-sm cov-vis${coverageShowOnlyAnalyzed ? ' active' : ''}" data-vis="analyzed">Show only analyzed crews</button>
        </div>
      </div>` : '<div class="hint" style="margin-top:4px">Then include crews by price tier or individually. Overlap shows redundant coverage; gaps show where competitive advantage is missing.</div>'}
    </div>`;
  panel.hidden = false;
  wireMinimize(panel);

  el('[data-pc]', panel).addEventListener('click', () => clearActiveOverlay());
  $('cov-company').addEventListener('change', e => onCoverageCompany(e.target.value));
  if (company) {
    $('cov-all').addEventListener('click', toggleCoverageAll);
    panel.querySelectorAll('.cov-vis').forEach(b =>
      b.addEventListener('click', () => setCoverageVisMode(b.dataset.vis === 'analyzed')));
    panel.querySelectorAll('.cov-tier').forEach(ch =>
      ch.addEventListener('click', () => toggleCoverageTier(ch.dataset.tier)));
    panel.querySelectorAll('.cov-crew').forEach(row => {
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

/* Picking a company defaults to ALL its crews selected and renders immediately. */
function onCoverageCompany(name) {
  coverageCompany = name || null;
  coverageSelectedIds = new Set(coverageCompany ? companyCrews(coverageCompany).map(c => c.id) : []);
  renderCoveragePanel();
  refreshCoverageDots();
  if (coverageCompany) startCoverage();
  else { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); $('legend').hidden = true; }
}

function toggleCoverageAll() {
  const crews = companyCrews(coverageCompany);
  const allOn = crews.every(c => coverageSelectedIds.has(c.id));
  coverageSelectedIds = new Set(allOn ? [] : crews.map(c => c.id));
  renderCoveragePanel();
  refreshCoverageDots();
  scheduleCoverage();
}

/* "Select by price range" — clicking a tier ISOLATES it (selects only that band's
   crews), mirroring the sidebar stat-chip filter; clicking the already-isolated
   tier returns to all crews. Built on the shared selectCoverageCrews() primitive
   (the tier→crews mapping we unit-test). For arbitrary multi-tier sets, use the
   crew checklist below. */
function toggleCoverageTier(tier) {
  const tierIds = selectCoverageCrews(DATA.crews, { company: coverageCompany, tiers: [tier] }).map(c => c.id);
  if (!tierIds.length) return;
  const allIds = companyCrews(coverageCompany).map(c => c.id);
  const isolated = tierIds.length === coverageSelectedIds.size && tierIds.every(id => coverageSelectedIds.has(id));
  coverageSelectedIds = new Set(isolated ? allIds : tierIds);
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

/* Light header update on per-crew toggles (avoids rebuilding the scrolled list). */
function refreshCoverageHeader() {
  const panel = $('coverage-panel');
  if (!coverageCompany) return;
  const crews = companyCrews(coverageCompany);
  const selN = crews.filter(c => coverageSelectedIds.has(c.id)).length;
  const sub = el('.panel-sub', panel);
  if (sub) sub.textContent = `${coverageCompany} · ${selN}/${crews.length} crews`;
  if ($('cov-selected')) $('cov-selected').textContent = `${selN} selected`;
  if ($('cov-all')) $('cov-all').textContent = selN === crews.length ? 'Clear all' : 'Select all';
  panel.querySelectorAll('.cov-tier').forEach(ch => {
    const inTier = crews.filter(c => tierForRank(c.rate) === ch.dataset.tier);
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
  if (STATE.activeOverlay !== 'coverage' || !coverageCompany) return;
  const crews = companyCrews(coverageCompany).filter(c => coverageSelectedIds.has(c.id));
  if (!crews.length) { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); hideProgress(); $('legend').hidden = true; return; }
  showProgress('Computing coverage…');
  MapView.showCoverage(crews, DATA.crews, STATE.plKey, {
    onProgress: (d, t) => setProgress(`Computing coverage… ${Math.round(d / t * 100)}%`),
    onDone: () => { hideProgress(); showCoverageLegend(crews.length); },
  });
}

function showCoverageLegend(crewCount) {
  $('legend').hidden = false;
  // Same red→emerald gradient as the single-crew moat (each cell = best crew there).
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
  if (STATE.activeOverlay === 'zones') { clearActiveOverlay(); return; }
  if (STATE.activeOverlay) clearActiveOverlay();
  if (zonesGeojsonFailed) return;
  if (!DATA.zones) {
    showProgress('Loading dispatch zones…');
    try {
      const res = await fetch('dispatch_zones.geojson');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      DATA.zones = await res.json();
    } catch (err) {
      hideProgress();
      zonesGeojsonFailed = true;
      $('btn-zones').disabled = true;
      $('btn-zones').title = 'Zone data unavailable';
      return;
    }
    hideProgress();
  }
  STATE.activeOverlay = 'zones';
  updateOverlayButtons();
  MapView.showZones(DATA.zones, (unitId) => zoneStats(unitId, DATA.crews));
}

function handleZoneClick(props, stats, layer) {
  MapView.setActiveZone(props.DispUnitID);
  const html = stats ? `
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
  MapView.bindZonePopup(layer, html);
  if (stats) {
    setTimeout(() => {
      const btn = $(`zp-filter-${props.DispUnitID}`);
      if (btn) btn.addEventListener('click', () => filterToZone(props.DispUnitID, props.DispName));
    }, 0);
  }
}

function filterToZone(unitId, name) {
  STATE.zoneFilter = unitId;
  renderActiveFilters(name);
  applyFiltersAndRender();
  if (!STATE.sidebarOpen) toggleSidebar();
}
function renderActiveFilters(zoneName) {
  const wrap = $('active-filters');
  if (!STATE.zoneFilter) { wrap.hidden = true; wrap.innerHTML = ''; return; }
  wrap.hidden = false;
  wrap.innerHTML = `<span class="filter-chip">Zone: ${esc(zoneName || STATE.zoneFilter)} <button id="clear-zone-filter" title="Clear">×</button></span>`;
  $('clear-zone-filter').addEventListener('click', () => {
    STATE.zoneFilter = null; renderActiveFilters(); applyFiltersAndRender();
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
  const rows = rankIncident(DATA.crews, lat, lng, STATE.plKey, STATE.timeFilter);
  lastIncidentRows = rows;
  // Restrict the map to this incident's top-N crews (recomputed on every
  // re-render, so PL / time-filter changes keep the visible set in sync).
  incidentTopIds = new Set(rows.slice(0, INCIDENT_TOP_N).map(r => r.crew.id));
  MapView.applyFilter(incidentTopIds);
  const panel = $('incident-panel');
  const shown = STATE.showAllIncident ? rows : rows.slice(0, 50);

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
      <div class="btn-row" style="justify-content:space-between;align-items:center">
        <span class="hint">${STATE.showAllIncident ? `All ${rows.length}` : `Top ${Math.min(50, rows.length)}`} by NICC cost</span>
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
  openIncidentFromFire(lat, lng, { name, id });
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
    ['Incident mode', 'Drop a pin anywhere; every available crew is ranked by NICC cost to that point. Time filter removes crews whose mobilization (travel + 3h buffer) exceeds the limit.'],
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
