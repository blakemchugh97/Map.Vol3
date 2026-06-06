/* ============================================================
   ui.js — entry point. Sidebar, panels, filters, modes,
   glossary, theme. Wires DOM <-> map.js <-> dispatch.js.
   ============================================================ */

import {
  STATE, DATA, PL_CONFIG, RATE_BOUNDS, ZONE_SIM, MOAT_CONFIG, DESERT_CONFIG,
} from './config.js';
import {
  haversine, niccCost, costToPoint, rankIncident, runZoneSimulation,
  rateSensitivity, breakevenRate, makeRateVariant, zoneStats, generateGridPoints,
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
let lastZoneResult = null;
let zoneRadius = ZONE_SIM.defaultRadius;
let testRate = null;
let zonesGeojsonFailed = false;

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
  });
  MapView.buildMarkers(DATA.crews, DATA.ddpGroups, STATE.clusterRadius);

  buildGlossary();
  wireControls();
  wireKeyboard();
  applyFiltersAndRender();

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
  const visIds = new Set(vis.map(c => c.id));
  MapView.applyFilter(visIds);
  renderList(vis);
  renderStatChips(vis);
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
  for (const c of vis) counts[c.color]++;
  for (const tier of ['green', 'yellow', 'orange', 'red']) {
    $(`chip-${tier}`).textContent = counts[tier].toLocaleString();
  }
  // mirror into floating mini-chips
  const mini = $('mini-chips');
  mini.innerHTML = ['green', 'yellow', 'orange', 'red'].map(t =>
    `<button class="chip chip-${t}" data-tier="${t}"><span class="chip-dot"></span><span class="chip-n">${counts[t].toLocaleString()}</span></button>`
  ).join('');
  mini.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => toggleTierFilter(c.dataset.tier)));
}

/* clicking a stat chip filters list to that tier's rate window (quick filter) */
let activeTier = null;
function toggleTierFilter(tier) {
  // tiers map to rank bands; translate to a rate window using current data
  const band = { green: [1, 100], yellow: [101, 210], orange: [211, 388], red: [389, Infinity] }[tier];
  if (activeTier === tier) {
    activeTier = null;
    STATE.rateFilter = { min: RATE_BOUNDS.min, max: RATE_BOUNDS.max };
  } else {
    activeTier = tier;
    const inBand = DATA.crews.filter(c => c.rank >= band[0] && c.rank <= band[1]);
    STATE.rateFilter = {
      min: Math.min(...inBand.map(c => c.rate)),
      max: Math.max(...inBand.map(c => c.rate)),
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
    $('rate-readout').textContent = `$${lo.toFixed(0)} – $${hi.toFixed(0)}`;
    applyFiltersAndRender();
  };
  rmin.addEventListener('input', onRate);
  rmax.addEventListener('input', onRate);

  // cluster radius
  const cr = $('cluster-radius');
  cr.addEventListener('input', () => {
    STATE.clusterRadius = parseInt(cr.value, 10);
    $('cluster-readout').textContent = STATE.clusterRadius + 'px';
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

  // sidebar toggle
  $('sidebar-toggle').addEventListener('click', toggleSidebar);

  // action buttons
  $('btn-incident').addEventListener('click', toggleIncidentMode);
  $('btn-zones').addEventListener('click', toggleZones);
  $('btn-moat').addEventListener('click', toggleMoat);
  $('btn-desert').addEventListener('click', toggleDesert);
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
  $('rate-readout').textContent = `$${STATE.rateFilter.min.toFixed(0)} – $${STATE.rateFilter.max.toFixed(0)}`;
}

/* ============================================================
   PL
   ============================================================ */
function setPL(plKey) {
  STATE.plKey = plKey;
  document.querySelectorAll('.pl-btn').forEach(b => b.classList.toggle('active', b.dataset.pl === plKey));
  $('pl-desc').textContent = PL_CONFIG[plKey].label;
  // recompute anything live
  if (STATE.incidentPin) renderIncident();
  if (STATE.selectedCrew && !$('detail-panel').hidden) renderDetail(STATE.selectedCrew);
  if (STATE.activeOverlay === 'moat' && STATE.selectedCrew) startMoat();
  if (STATE.activeOverlay === 'desert') startDesert();
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

      <!-- Hypothetical DDP -->
      <div class="section">
        <div class="section-title"><span><span class="accent">⚲</span> Hypothetical DDP</span></div>
        <div class="btn-row">
          <button id="hypo-place" class="btn full">${STATE.hypoPin ? 'Re-drop test pin' : 'Click map to drop test pin'}</button>
          ${STATE.hypoPin ? `<button id="hypo-clear" class="btn">Clear</button>` : ''}
        </div>
        <div id="hypo-results" class="hint" style="margin-top:8px">${STATE.hypoPin ? 'Run simulation to compare hypothetical vs. real DDP.' : 'Test a different home base location for this crew.'}</div>
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
  zr.addEventListener('input', () => { zoneRadius = parseInt(zr.value, 10); $('zr-readout').textContent = zoneRadius + ' mi'; });
  $('run-zone').addEventListener('click', () => runZoneAnalysis(crew));
  panel.querySelectorAll('.nudge[data-nudge]').forEach(b =>
    b.addEventListener('click', () => nudgeRate(crew, parseFloat(b.dataset.nudge))));
  $('rate-reset').addEventListener('click', () => { testRate = null; $('rate-test').value = crew.rate.toFixed(2); $('rate-results').innerHTML = 'Reset to current rate.'; });
  $('rate-test').addEventListener('change', () => { testRate = parseFloat($('rate-test').value); runRateAnalysis(crew); });
  $('hypo-place').addEventListener('click', () => enterHypoMode());
  if ($('hypo-clear')) $('hypo-clear').addEventListener('click', clearHypo);
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
  document.querySelectorAll('.crew-item.selected').forEach(n => n.classList.remove('selected'));
  if (STATE.activeOverlay === 'moat') { STATE.activeOverlay = null; MapView.clearOverlayCells(); MapView.cancelOverlayJob(); updateOverlayButtons(); }
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
  // sample dots on map (subset)
  const dots = result.points.slice(0, ZONE_SIM.sampleDotsOnMap);
  MapView.showSampleDots(dots);
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
      <div class="result-cell"><div class="rc-val">${r.win_pct}%</div><div class="rc-label">Win (#1)</div></div>
      <div class="result-cell"><div class="rc-val">${r.top5_pct}%</div><div class="rc-label">Top-5</div></div>
      <div class="result-cell"><div class="rc-val">${r.top10_pct}%</div><div class="rc-label">Top-10</div></div>
      <div class="result-cell"><div class="rc-val">${r.avg_rank}</div><div class="rc-label">Avg rank</div></div>
      <div class="result-cell"><div class="rc-val">${r.total_pts}</div><div class="rc-label">Pts used</div></div>
      <div class="result-cell"><div class="rc-val">${PL_CONFIG[STATE.plKey].keepFraction < 1 ? STATE.plKey.toUpperCase() : '—'}</div><div class="rc-label">PL</div></div>
    </div>
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
   Hypothetical DDP placement
   ============================================================ */
function enterHypoMode() {
  STATE.mode = 'hypo_placing';
  MapView.setCrosshair(true);
  $('hypo-place').textContent = 'Click map to place pin…';
}
function placeHypo(lat, lng) {
  STATE.hypoPin = { lat, lng };
  STATE.mode = 'browse';
  MapView.setCrosshair(false);
  MapView.setHypoPin(lat, lng);
  if (STATE.selectedCrew) {
    renderDetail(STATE.selectedCrew);
    runHypoAnalysis(STATE.selectedCrew);
  }
}
function clearHypo() {
  STATE.hypoPin = null;
  MapView.clearHypoPin();
  if (STATE.selectedCrew) renderDetail(STATE.selectedCrew);
}
function runHypoAnalysis(crew) {
  if (!STATE.hypoPin) return;
  const real = runZoneSimulation(crew, zoneRadius, DATA.crews, STATE.plKey);
  const hypoCrew = { ...crew, lat: STATE.hypoPin.lat, lng: STATE.hypoPin.lng,
    ddl: `Hypothetical (${STATE.hypoPin.lat.toFixed(3)}, ${STATE.hypoPin.lng.toFixed(3)})` };
  const hypo = runZoneSimulation(hypoCrew, zoneRadius,
    DATA.crews.map(c => c.id === crew.id ? hypoCrew : c), STATE.plKey);
  const box = $('hypo-results');
  if (!box) return;
  box.innerHTML = `
    <table class="dtable" style="margin-top:4px">
      <thead><tr><th></th><th class="num">Win</th><th class="num">Top-10</th><th class="num">Avg rank</th></tr></thead>
      <tbody>
        <tr><td>Real DDP</td><td class="num">${real.win_pct}%</td><td class="num">${real.top10_pct}%</td><td class="num">${real.avg_rank}</td></tr>
        <tr class="me"><td>Hypo DDP</td><td class="num">${hypo.win_pct}%</td><td class="num">${hypo.top10_pct}%</td><td class="num">${hypo.avg_rank}</td></tr>
      </tbody>
    </table>
    <div class="hint" style="margin-top:6px">Δ top-10: <b>${(parseFloat(hypo.top10_pct) - parseFloat(real.top10_pct)).toFixed(1)}%</b> · simulated at ${zoneRadius}mi.</div>`;
}

/* ============================================================
   Moat / Desert overlays
   ============================================================ */
function updateOverlayButtons() {
  $('btn-zones').classList.toggle('active', STATE.activeOverlay === 'zones');
  $('btn-moat').classList.toggle('active', STATE.activeOverlay === 'moat');
  $('btn-desert').classList.toggle('active', STATE.activeOverlay === 'desert');
}

function clearActiveOverlay() {
  if (STATE.activeOverlay === 'zones') MapView.hideZones();
  else { MapView.clearOverlayCells(); MapView.cancelOverlayJob(); }
  STATE.activeOverlay = null;
  $('legend-overlay').hidden = true;
  updateOverlayButtons();
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
  $('legend-overlay').hidden = false;
  $('legend-overlay').innerHTML = `
    <div class="legend-title">Moat margin · $ vs best competitor</div>
    <div class="legend-grad" style="background:linear-gradient(90deg,rgb(239,68,68),rgb(234,179,8),rgb(34,197,94))"></div>
    <div class="legend-grad-labels"><span>−$${MOAT_CONFIG.strongAdvantage.toLocaleString()} exposed</span><span>parity</span><span>+$${MOAT_CONFIG.strongAdvantage.toLocaleString()} moat</span></div>
    <div class="hint" style="margin-top:5px">Hover any cell for the exact margin &amp; top competitor.</div>`;
}

function toggleDesert() {
  if (STATE.activeOverlay === 'desert') { clearActiveOverlay(); return; }
  if (STATE.activeOverlay) clearActiveOverlay();
  STATE.activeOverlay = 'desert';
  updateOverlayButtons();
  startDesert();
}
function startDesert() {
  if (PL_CONFIG[STATE.plKey].keepFraction >= 1.0) {
    showToastLegend('Rate desert is most meaningful at PL3+ when cheap crews are already deployed.');
  }
  showProgress('Computing rate desert…');
  MapView.showDesert(DATA.crews, STATE.plKey, {
    onProgress: (d, t) => setProgress(`Computing rate desert… ${Math.round(d / t * 100)}%`),
    onDone: () => { hideProgress(); showDesertLegend(); },
  });
}
function showDesertLegend() {
  $('legend-overlay').hidden = false;
  $('legend-overlay').innerHTML = `
    <div class="legend-title">Avg rate of cheapest ${DESERT_CONFIG.topN} available</div>
    <div class="legend-grad" style="background:linear-gradient(90deg,#14b8a6,#f59e0b,#ea580c)"></div>
    <div class="legend-grad-labels"><span>$${DESERT_CONFIG.lowRate} cheap field</span><span>$${DESERT_CONFIG.highRate}+ desert</span></div>
    <div class="hint" style="margin-top:5px">Hover any cell for the exact surviving rate.</div>
    ${PL_CONFIG[STATE.plKey].keepFraction >= 1.0 ? '<div class="hint" style="margin-top:5px">Raise PL to PL3+ to reveal structure.</div>' : ''}`;
}
function showToastLegend(msg) {
  $('legend-overlay').hidden = false;
  $('legend-overlay').innerHTML = `<div class="hint">${esc(msg)}</div>`;
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
  STATE.mode = 'incident';
  MapView.setCrosshair(false);
  MapView.setIncidentPin(lat, lng);
  if (STATE.incidentRadius > 0) MapView.setIncidentRadius(lat, lng, STATE.incidentRadius);
  $('ic-coords').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  $('app').classList.add('incident-active');
  renderIncident();
}

function renderIncident() {
  if (!STATE.incidentPin) return;
  const { lat, lng } = STATE.incidentPin;
  const rows = rankIncident(DATA.crews, lat, lng, STATE.plKey, STATE.timeFilter);
  lastIncidentRows = rows;
  const panel = $('incident-panel');
  const shown = STATE.showAllIncident ? rows : rows.slice(0, 50);

  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <div class="panel-title" style="color:var(--gold)">◎ Incident ranking</div>
        <div class="panel-sub">${rows.length} crews available · ${PL_CONFIG[STATE.plKey].label}${STATE.timeFilter ? ` · ≤${STATE.timeFilter}h mob` : ''}</div>
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
  STATE.mode = 'browse';
  lastIncidentRows = [];
  MapView.clearIncidentPin();
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
  if (STATE.mode === 'hypo_placing') return placeHypo(lat, lng);
}

function handleMarkerClick(group, key) {
  if (STATE.mode === 'incident') return dropIncident(group[0].lat, group[0].lng);
  if (STATE.mode === 'hypo_placing') return placeHypo(group[0].lat, group[0].lng);
  if (group.length === 1) return selectCrew(group[0]);
  renderDdpPanel(group);
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
      if (STATE.mode === 'hypo_placing') { STATE.mode = 'browse'; MapView.setCrosshair(false); return; }
      if (STATE.incidentPin || STATE.mode === 'incident') return clearIncident();
      if (!$('detail-panel').hidden) return closeDetail();
      if (!$('ddp-panel').hidden) return closePanel('ddp-panel');
      return;
    }
    if (typing) {
      if (e.key === 'Enter' && tag === 'input' && e.target.id === 'search') e.target.blur();
      return;
    }
    switch (e.key.toLowerCase()) {
      case 'i': e.preventDefault(); toggleIncidentMode(); break;
      case '/': e.preventDefault(); $('search').focus(); break;
      case 'z': toggleZones(); break;
      case 'm': if (STATE.selectedCrew) toggleMoat(); break;
      case 'd': toggleDesert(); break;
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
    ['Incident mode', 'Drop a pin anywhere; every available crew is ranked by NICC cost to that point. Time filter removes crews whose mobilization (travel + 3h buffer) exceeds the limit.'],
    ['Competitive radius', 'Simulates ~100 incidents inside a radius around a crew\'s DDP and measures how often it ranks #1, top-5, and top-10. PL thins the <i>competing</i> field; the analyzed crew is always available (it is the hypothesis being tested), so it never thins itself out of its own analysis.'],
    ['Threats', 'Crews that out-rank the selected crew in ≥30% of sampled incidents — your direct competitors in that radius.'],
    ['Rate sensitivity', 'Substitutes a hypothetical rate, re-runs the simulation, and shows the change in win rate, rank, and base cost. Breakeven is the rate at which you tie your top threat.'],
    ['Moat overlay', 'A grid (~350mi) around the selected crew. Each cell shows the dollar margin vs. the best competitor: green = strong advantage, red = exposed.'],
    ['Rate desert', 'A CONUS grid showing the average rate of the cheapest available crews after PL thinning. Teal = cheap field; orange = "desert" where only expensive crews remain.'],
    ['Shared DDP', 'Multiple crews dispatched from one address. The map pin shows a count badge; click it to pick a specific crew.'],
  ];
  $('glossary-body').innerHTML = terms.map(([t, d]) =>
    `<div class="gloss-term"><h3>${t}</h3><p>${d}</p></div>`).join('') +
    `<div class="gloss-term"><h3>Keyboard</h3><p><code>I</code> incident · <code>/</code> search · <code>Z</code> zones · <code>M</code> moat · <code>D</code> desert · <code>T</code> theme · <code>Esc</code> cancel</p></div>`;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
