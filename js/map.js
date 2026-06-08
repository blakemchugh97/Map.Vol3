/* ============================================================
   map.js — Leaflet map, markers, clustering, all overlays.
   Exposes MapView; emits user interactions via handlers passed to init.
   ============================================================ */

import {
  MAP_CONFIG, ZONE_STYLE, MOAT_CONFIG, DESERT_CONFIG, PL_CONFIG, STATE,
  WILDFIRE_CONFIG, ACTIVE_INCIDENTS_CONFIG, WATCHES_CONFIG, effectiveKeepFraction,
} from './config.js';
import {
  haversine, computeRankAtPoint, bandScore, computeRateDesertHoverStats, isUSLand, runChunked,
  moatLatticePoints, moatScoreCell, aggregateCoverageCells, coverageCellKey,
} from './dispatch.js';

let map, tileLayer, handlers = {};
let clusterGroup;
let markersByKey = {};      // ddpKey -> { marker, crews, key }
let crewKeyById = {};       // crew.id -> ddpKey
let selectedMarkerKey = null;

let incidentMarker, incidentCircle, hypoMarker, radiusCircle;
let zoneLayer = null, zonesByKey = {}, activeZoneKey = null;
let overlayCells = null;     // L.layerGroup for moat/desert
let sampleDots = null;       // L.layerGroup for zone-sim dots
let overlayJob = null;       // active chunked job (cancel handle)
let coverageHighlight = null, coverageHighlightRenderer = null; // hovered-crew footprint outline

const moatCache = {};        // `${crewId}|${plKey}` -> cells
const desertCache = {};      // plKey -> cells
const coverageCache = {};    // `${crewId}|${plKey}|${plSlider}` -> footprint cells (company coverage)

/* ---------- helpers ---------- */
const ddpKey = (c) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function rgb(r, g, b) { return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`; }
function lerp(a, b, t) { return a + (b - a) * t; }
const money = (n) => '$' + Math.round(n).toLocaleString();

/* ============================================================
   Init
   ============================================================ */
export function initMap(h) {
  handlers = h || {};
  map = L.map('map', {
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    zoomControl: false,
    attributionControl: true,
    preferCanvas: true,
  });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.attributionControl.setPosition('bottomright');

  tileLayer = L.tileLayer(MAP_CONFIG.tiles.dark, {
    attribution: MAP_CONFIG.tileAttribution, subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);

  map.on('click', (e) => {
    if (handlers.onMapClick) handlers.onMapClick(e.latlng.lat, e.latlng.lng);
  });

  overlayCells = L.layerGroup().addTo(map);
  sampleDots = L.layerGroup().addTo(map);
  // Dedicated pane above the overlay canvas for the coverage hover-highlight, so a
  // single crew's footprint draws cleanly on top of the blended cells.
  const hlPane = map.createPane('coverageHighlight');
  hlPane.style.zIndex = 450;
  hlPane.style.pointerEvents = 'none';
  coverageHighlightRenderer = L.svg({ pane: 'coverageHighlight' });
  coverageHighlight = L.layerGroup().addTo(map);
  return map;
}

export function getMap() { return map; }

export function setTheme(theme) {
  if (!tileLayer) return;
  tileLayer.setUrl(theme === 'light' ? MAP_CONFIG.tiles.light : MAP_CONFIG.tiles.dark);
}

/* ============================================================
   Crew markers + clustering
   ============================================================ */
function makeIcon(group, selected) {
  const cheapest = group.reduce((a, b) => (a.rank <= b.rank ? a : b));
  const sel = selected ? ' selected' : '';
  // No numeric count badge — shared DDPs are revealed via the click panel,
  // keeping the map marker clean. Slightly smaller than before (was 16px).
  const size = 12;
  return L.divIcon({
    className: '',
    html: `<div class="crew-marker ${cheapest.color}${sel}" style="width:${size}px;height:${size}px"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function buildMarkers(crews, ddpGroups, clusterRadius) {
  markersByKey = {};
  crewKeyById = {};

  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: clusterRadius,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    chunkedLoading: true,
    iconCreateFunction(cluster) {
      const count = cluster.getChildCount();
      const size = count < 10 ? 30 : count < 50 ? 38 : 46;
      return L.divIcon({
        html: `<div style="width:${size}px;height:${size}px;display:grid;place-items:center;
                 background:var(--accent-dim);border:2px solid var(--accent);border-radius:50%;
                 color:var(--accent-hi);font-weight:700;font-size:12px;">${count}</div>`,
        className: '', iconSize: [size, size],
      });
    },
  });

  for (const key in ddpGroups) {
    const group = ddpGroups[key];
    const c0 = group[0];
    const marker = L.marker([c0.lat, c0.lng], { icon: makeIcon(group, false) });
    marker.on('click', () => {
      if (handlers.onMarkerClick) handlers.onMarkerClick(group, key);
    });
    markersByKey[key] = { marker, crews: group, key };
    group.forEach(c => { crewKeyById[c.id] = key; });
    clusterGroup.addLayer(marker);
  }
  map.addLayer(clusterGroup);
}

/* Filter visible markers: visibleIds = Set of crew ids that pass filters.
   A marker shows if any of its crews is visible. */
export function applyFilter(visibleIds) {
  if (!clusterGroup) return;
  clusterGroup.clearLayers();
  const toAdd = [];
  for (const key in markersByKey) {
    const rec = markersByKey[key];
    const visCrews = rec.crews.filter(c => visibleIds.has(c.id));
    if (visCrews.length === 0) continue;
    rec.marker.setIcon(makeIcon(visCrews, key === selectedMarkerKey));
    rec._visCrews = visCrews;
    toAdd.push(rec.marker);
  }
  clusterGroup.addLayers(toAdd);
}

export function setClusterRadius(px, visibleIds) {
  if (!clusterGroup) return;
  map.removeLayer(clusterGroup);
  // markercluster radius is fixed at creation; rebuild the group.
  const groups = {};
  for (const key in markersByKey) groups[key] = markersByKey[key].crews;
  buildMarkers(null, groups, px);
  if (visibleIds) applyFilter(visibleIds);
  if (selectedMarkerKey) highlightCrewKey(selectedMarkerKey);
}

export function highlightCrew(crew) {
  if (!crew) return clearHighlight();
  highlightCrewKey(crewKeyById[crew.id]);
}
function highlightCrewKey(key) {
  if (selectedMarkerKey && markersByKey[selectedMarkerKey]) {
    const prev = markersByKey[selectedMarkerKey];
    prev.marker.setIcon(makeIcon(prev._visCrews || prev.crews, false));
  }
  selectedMarkerKey = key;
  const rec = markersByKey[key];
  if (rec) rec.marker.setIcon(makeIcon(rec._visCrews || rec.crews, true));
}
export function clearHighlight() {
  if (selectedMarkerKey && markersByKey[selectedMarkerKey]) {
    const rec = markersByKey[selectedMarkerKey];
    rec.marker.setIcon(makeIcon(rec._visCrews || rec.crews, false));
  }
  selectedMarkerKey = null;
}

export function flyToCrew(crew) {
  if (!crew) return;
  map.flyTo([crew.lat, crew.lng], Math.max(map.getZoom(), 8), { duration: 0.6 });
}
export function panTo(lat, lng) { map.panTo([lat, lng]); }

/* ============================================================
   Incident pin + radius
   ============================================================ */
export function setIncidentPin(lat, lng) {
  if (incidentMarker) map.removeLayer(incidentMarker);
  const icon = L.divIcon({ className: '', html: '<div class="incident-marker"></div>', iconSize: [20, 20], iconAnchor: [10, 18] });
  incidentMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
}
export function clearIncidentPin() {
  if (incidentMarker) { map.removeLayer(incidentMarker); incidentMarker = null; }
  if (incidentCircle) { map.removeLayer(incidentCircle); incidentCircle = null; }
}
export function setIncidentRadius(lat, lng, miles) {
  if (incidentCircle) { map.removeLayer(incidentCircle); incidentCircle = null; }
  if (!miles || miles <= 0) return;
  incidentCircle = L.circle([lat, lng], {
    radius: miles * 1609.34, color: '#f59e0b', weight: 1.5, opacity: 0.7,
    fillColor: '#f59e0b', fillOpacity: 0.06,
  }).addTo(map);
}

/* ============================================================
   Competitive-radius circle (zone analysis)
   ============================================================ */
// Distinct violet dashed disc (ported from vol9) centered on the analyzed crew.
// Kept separate from the amber incidentCircle so the two never conflict.
export function setRadiusCircle(lat, lng, miles) {
  if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
  if (!miles || miles <= 0) return;
  radiusCircle = L.circle([lat, lng], {
    radius: miles * 1609.34,
    color: '#a78bfa', weight: 2, opacity: 0.9, dashArray: '6,4',
    fillColor: '#a78bfa', fillOpacity: 0.06, interactive: false,
  }).addTo(map);
}
export function clearRadiusCircle() {
  if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
}

/* ============================================================
   Hypothetical DDL crew marker
   Distinct violet "H" pin for the user-placed what-if crew. Clickable so it can
   be selected and analyzed like any other crew (routes to onHypoMarkerClick).
   ============================================================ */
export function setHypoPin(lat, lng) {
  if (hypoMarker) map.removeLayer(hypoMarker);
  const icon = L.divIcon({ className: '', html: '<div class="hypo-marker">H</div>', iconSize: [22, 22], iconAnchor: [11, 11] });
  hypoMarker = L.marker([lat, lng], { icon, zIndexOffset: 1100 }).addTo(map);
  hypoMarker.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    if (handlers.onHypoMarkerClick) handlers.onHypoMarkerClick();
  });
}
export function clearHypoPin() {
  if (hypoMarker) { map.removeLayer(hypoMarker); hypoMarker = null; }
}

/* ============================================================
   Crosshair cursor
   ============================================================ */
export function setCrosshair(on) {
  const wrap = document.querySelector('.map-wrap');
  if (wrap) wrap.classList.toggle('crosshair', !!on);
}

/* ============================================================
   Zone overlay (geojson)
   ============================================================ */
// Render the zone overlay. `keyOf(props)` groups features (DispUnitID in dispatch
// mode, GACCAbbreviation in GACC mode) and `statsFor(key)` returns popup stats for
// a key. Several features can share a key (a GACC dissolves many dispatch zones):
// they share one style, hover/active highlight as a unit, and click reports the key.
export function showZones(geojson, { keyOf, statsFor }) {
  if (zoneLayer) return;
  zonesByKey = {};
  activeZoneKey = null;
  zoneLayer = L.geoJSON(geojson, {
    style(feature) {
      const stats = statsFor(keyOf(feature.properties));
      return stats ? { ...ZONE_STYLE.default } : { ...ZONE_STYLE.empty };
    },
    onEachFeature(feature, layer) {
      const key = keyOf(feature.properties);
      (zonesByKey[key] ||= []).push(layer);
      const stats = statsFor(key);
      const restStyle = () => (stats ? ZONE_STYLE.default : ZONE_STYLE.empty);
      layer.on('mouseover', () => { if (key !== activeZoneKey) setKeyStyle(key, ZONE_STYLE.hover); });
      layer.on('mouseout',  () => { if (key !== activeZoneKey) setKeyStyle(key, restStyle()); });
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (handlers.onZoneClick) handlers.onZoneClick(feature.properties, stats, layer, key);
      });
    },
  }).addTo(map);
  zoneLayer.bringToBack();
}
function setKeyStyle(key, style) {
  (zonesByKey[key] || []).forEach(l => l.setStyle(style));
}
export function hideZones() {
  if (zoneLayer) { map.removeLayer(zoneLayer); zoneLayer = null; activeZoneKey = null; zonesByKey = {}; }
}
export function setActiveZone(key) {
  if (activeZoneKey) setKeyStyle(activeZoneKey, ZONE_STYLE.default);
  if (zonesByKey[key]) { setKeyStyle(key, ZONE_STYLE.active); activeZoneKey = key; }
}
export function bindZonePopup(layer, html) { layer.bindPopup(html, { className: 'zone-popup', maxWidth: 280 }).openPopup(); }

/* ============================================================
   Moat overlay
   ============================================================ */
// Five-stop gradient: deep-red → orange → amber → lime → emerald.
// score: 0..1 from bandScore() — 1 = comfortably in top-10, 0 = outside top-20+.
function bandMoatColor(score) {
  const s = clamp(score, 0, 1);
  const stops = [
    [220,  38,  38],  // 0.00  deep red   — outside useful band
    [249, 115,  22],  // 0.25  orange      — just outside top-20
    [234, 179,   8],  // 0.50  amber       — at top-20 boundary
    [132, 204,  22],  // 0.75  lime        — inside top-10, competitive
    [ 16, 185, 129],  // 1.00  emerald     — comfortably in top-10
  ];
  const t = s * (stops.length - 1);
  const i = Math.min(Math.floor(t), stops.length - 2);
  const u = t - i;
  const [r1, g1, b1] = stops[i], [r2, g2, b2] = stops[i + 1];
  return { color: rgb(lerp(r1, r2, u), lerp(g1, g2, u), lerp(b1, b2, u)), opacity: MOAT_CONFIG.fillOpacity };
}
function bandBucket(rank) {
  if (rank <= 5)  return 'top-5 — strong';
  if (rank <= 10) return 'top-10 — competitive';
  if (rank <= 20) return 'top-20 — marginal';
  if (rank <= 35) return 'rank 21–35 — fading';
  return 'rank 35+ — outside useful band';
}

// Frame the crew's competitive disc so the moat fills the view (a continental
// view would show a tiny green core lost in red).
export function focusMoat(crew) {
  if (!crew || !map) return;
  const pad = 1.08, r = MOAT_CONFIG.maxRadius;
  const dLat = (r / 69) * pad;
  const dLng = (r / (69 * Math.cos(crew.lat * Math.PI / 180))) * pad;
  map.fitBounds([[crew.lat - dLat, crew.lng - dLng], [crew.lat + dLat, crew.lng + dLng]], { animate: true });
}

export function showMoat(selectedCrew, allCrews, plKey, { onProgress, onDone } = {}) {
  cancelOverlayJob();
  clearOverlayCells();
  focusMoat(selectedCrew);
  // Cache key includes the fine-tune slider so changing it never serves stale cells.
  const cacheKey = `${selectedCrew.id}|${plKey}|${STATE.plSlider}`;
  if (moatCache[cacheKey]) { drawCells(moatCache[cacheKey]); onDone && onDone(); return; }

  const keepFraction = effectiveKeepFraction(plKey);
  const step = MOAT_CONFIG.cellDegrees;
  const r = MOAT_CONFIG.maxRadius;
  const degLat = r / 69.0;
  const degLng = r / (69.0 * Math.cos(selectedCrew.lat * Math.PI / 180));
  const plLabel = (PL_CONFIG[plKey] || PL_CONFIG.none).label;
  const cells = [];
  for (let lat = selectedCrew.lat - degLat; lat <= selectedCrew.lat + degLat; lat += step) {
    for (let lng = selectedCrew.lng - degLng; lng <= selectedCrew.lng + degLng; lng += step) {
      if (haversine(selectedCrew.lat, selectedCrew.lng, lat, lng) > r) continue;
      cells.push([lat, lng]);
    }
  }
  const computed = [];
  overlayJob = runChunked(cells, ([lat, lng]) => {
    const ro = computeRankAtPoint(selectedCrew, lat, lng, allCrews, keepFraction);
    const { color, opacity } = bandMoatColor(bandScore(ro.rank));
    const tip =
      `<b>${selectedCrew.id}</b> · rank <b>#${ro.rank}</b> of ${ro.fieldSize} · ${plLabel}<br>` +
      `<span style="opacity:.9">${bandBucket(ro.rank)}</span><br>` +
      `${selectedCrew.id} cost: ${money(ro.myCost)}<br>` +
      (ro.bestComp
        ? `Cheapest competitor: <b>${ro.bestComp.id}</b> @ $${(+ro.bestComp.rate).toFixed(2)}/hr · ${money(ro.bestCompCost)}`
        : `No competitors at this PL`);
    const rect = drawRect(lat, lng, step, color, opacity, tip);
    computed.push({ lat, lng, step, color, opacity, tip });
    if (rect) overlayCells.addLayer(rect);
  }, {
    chunk: 40,
    onProgress,
    onDone() { moatCache[cacheKey] = computed; onDone && onDone(); },
  });
}

/* ============================================================
   Company coverage overlay (company-wide moat)
   Runs the normal single-crew moat for each selected crew (rank vs the full field
   → band score), then UNIONS them: every cell takes the best (max) band score
   across the crews, colored with the same red→emerald moat gradient. The result is
   one "company-wide moat" with corridors of green wherever at least one crew is
   competitive. Per-crew moats are cached (keyed crew|pl|slider) so toggling crews
   re-unions instantly and only newly-needed crews compute.
   ============================================================ */
const coverageKey = (crewId, plKey) => `${crewId}|${plKey}|${STATE.plSlider}`;
// Coverage union uses a larger reach than the single-crew moat (so the map extends
// until advantage fades) at the same cell size, with cells clipped to US land.
const coverageCfg = { cellDegrees: MOAT_CONFIG.cellDegrees, maxRadius: MOAT_CONFIG.coverageRadius };

// Fit the map to the selected crews' DDPs (padded). Fallback for when no cells were
// drawn (no crews) — the multi-crew analog of focusMoat().
function focusCoverage(crews) {
  if (!crews.length || !map) return;
  const lats = crews.map((c) => c.lat), lngs = crews.map((c) => c.lng);
  const pad = 0.6;
  map.fitBounds(
    [[Math.min(...lats) - pad, Math.min(...lngs) - pad], [Math.max(...lats) + pad, Math.max(...lngs) + pad]],
    { animate: true, padding: [20, 20] },
  );
}

// Hover readout for a unioned cell: which selected crews are competitive here
// (top-20), best first, plus how many crews reach this cell at all.
function coverageTip(agg) {
  const comp = agg.crews.filter((c) => c.rank <= MOAT_CONFIG.bandOuter).sort((a, b) => a.rank - b.rank);
  if (!comp.length) {
    const n = agg.crews.length;
    return `No selected crew is competitive here<br><span style="opacity:.7">${n} crew${n === 1 ? '' : 's'} in range, all ranked &gt;20</span>`;
  }
  const head = `<b>${comp.length}</b> of ${agg.crews.length} selected crew${agg.crews.length === 1 ? '' : 's'} competitive here`;
  const lines = comp.slice(0, 8).map((c) => `<b>${c.id}</b> · #${c.rank} · ${bandBucket(c.rank)}`).join('<br>');
  const more = comp.length > 8 ? `<br><span style="opacity:.7">+${comp.length - 8} more…</span>` : '';
  return `${head}<br>${lines}${more}`;
}

// Union the cached per-crew moats and draw one gradient layer (best band score per
// cell). Returns the drawn cells' lat/lng bounds (or null if none) to frame them.
function drawCoverage(selectedCrews, plKey) {
  clearOverlayCells();
  clearCoverageHighlight();
  const perCrew = selectedCrews.map((c) => ({ crew: c, cells: coverageCache[coverageKey(c.id, plKey)] || [] }));
  const byCell = aggregateCoverageCells(perCrew);
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity, n = 0;
  for (const agg of byCell.values()) {
    const { color, opacity } = bandMoatColor(agg.best); // same gradient as the single-crew moat
    const rect = drawRect(agg.lat, agg.lng, MOAT_CONFIG.cellDegrees, color, opacity, coverageTip(agg));
    if (rect) overlayCells.addLayer(rect);
    minLat = Math.min(minLat, agg.lat); maxLat = Math.max(maxLat, agg.lat);
    minLng = Math.min(minLng, agg.lng); maxLng = Math.max(maxLng, agg.lng); n++;
  }
  if (!n) return null;
  const h = MOAT_CONFIG.cellDegrees / 2; // include the cell extent (centers → edges)
  return [[minLat - h, minLng - h], [maxLat + h, maxLng + h]];
}

/* ---- Hover highlight: light up where ONE crew is competitive (its own moat's
   top-20 area) on a pane above the unioned cells, so you can attribute a corridor
   to a specific crew. ---- */
export function highlightCoverageCrew(crewId, plKey) {
  clearCoverageHighlight();
  const cells = coverageCache[coverageKey(crewId, plKey)];
  if (!cells || !cells.length || !map) return;
  const step = MOAT_CONFIG.cellDegrees;
  for (const c of cells) {
    if (c.rank > MOAT_CONFIG.bandOuter) continue; // only where THIS crew is competitive (top-20)
    L.rectangle(
      [[c.lat - step / 2, c.lng - step / 2], [c.lat + step / 2, c.lng + step / 2]],
      { renderer: coverageHighlightRenderer, stroke: false,
        fillColor: '#ffffff', fillOpacity: c.rank <= MOAT_CONFIG.bandTop ? 0.5 : 0.25, interactive: false },
    ).addTo(coverageHighlight);
  }
}
export function clearCoverageHighlight() { if (coverageHighlight) coverageHighlight.clearLayers(); }

export function showCoverage(selectedCrews, allCrews, plKey, { onProgress, onDone } = {}) {
  cancelOverlayJob();
  clearOverlayCells();
  if (!selectedCrews.length) { onDone && onDone({ crews: 0, cells: 0 }); return; }
  const keepFraction = effectiveKeepFraction(plKey);

  // Only crews without a cached footprint (for this pl|slider) need computing.
  const need = selectedCrews.filter((c) => !coverageCache[coverageKey(c.id, plKey)]);
  const acc = new Map();
  need.forEach((c) => acc.set(c.id, []));
  const work = [];
  for (const crew of need)
    for (const [lat, lng] of moatLatticePoints(crew, coverageCfg, { landMask: true })) work.push({ crew, lat, lng });

  const finish = () => {
    need.forEach((c) => { coverageCache[coverageKey(c.id, plKey)] = acc.get(c.id); });
    const bounds = drawCoverage(selectedCrews, plKey);
    // Frame the actual footprint (full competitive reach); if it's empty, at least
    // frame the selected crews so the user sees where coverage is missing.
    if (bounds && map) map.fitBounds(bounds, { animate: true, padding: [30, 30] });
    else focusCoverage(selectedCrews);
    onDone && onDone({ crews: selectedCrews.length, cells: overlayCells.getLayers().length });
  };

  if (!work.length) { finish(); return; }
  overlayJob = runChunked(work, ({ crew, lat, lng }) => {
    const { rank, score } = moatScoreCell(crew, lat, lng, allCrews, keepFraction);
    acc.get(crew.id).push({ key: coverageCellKey(lat, lng), lat, lng, rank, score });
  }, { chunk: 150, onProgress, onDone: finish });
}

/* ============================================================
   Rate desert overlay
   ============================================================ */
// teal (cheap field) -> amber -> deep orange (rate desert), across lowRate..highRate.
function desertColor(rate) {
  const { lowRate, highRate } = DESERT_CONFIG;
  const t = clamp((rate - lowRate) / (highRate - lowRate), 0, 1);
  if (t < 0.5) { const u = t / 0.5; return rgb(lerp(20, 245, u), lerp(184, 158, u), lerp(166, 11, u)); }
  const u = (t - 0.5) / 0.5; return rgb(lerp(245, 234, u), lerp(158, 88, u), lerp(11, 12, u));
}

// Sub-sample points inside a cell (roughly-square sub-grid), then average.
function sampleCellPoints(latS, lngW, d, n) {
  const s = Math.max(1, Math.round(Math.sqrt(n)));
  const pts = [];
  for (let r = 0; r < s && pts.length < n; r++)
    for (let c = 0; c < s && pts.length < n; c++)
      pts.push([latS + (r + 0.5) / s * d, lngW + (c + 0.5) / s * d]);
  return pts;
}

export function showDesert(allCrews, plKey, { onProgress, onDone } = {}) {
  cancelOverlayJob();
  clearOverlayCells();
  const cacheKey = `${plKey}|${STATE.plSlider}`;
  if (desertCache[cacheKey]) { drawCells(desertCache[cacheKey]); onDone && onDone(); return; }

  const keepFraction = effectiveKeepFraction(plKey);
  const d = DESERT_CONFIG.cellDegrees;
  const b = DESERT_CONFIG.bounds;
  const N = DESERT_CONFIG.samplesPerCell;
  // Build land-masked cell list first (cheap), then score in chunks.
  const cells = [];
  for (let lat = b.minLat; lat < b.maxLat - 1e-9; lat += d) {
    for (let lng = b.minLng; lng < b.maxLng - 1e-9; lng += d) {
      const cLat = lat + d / 2, cLng = lng + d / 2;
      if (!isUSLand(cLat, cLng)) continue; // skip ocean / non-US
      cells.push({ latS: lat, lngW: lng, cLat, cLng });
    }
  }
  const computed = [];
  overlayJob = runChunked(cells, (cell) => {
    const pts = sampleCellPoints(cell.latS, cell.lngW, d, N).filter(([la, ln]) => isUSLand(la, ln));
    const use = pts.length ? pts : [[cell.cLat, cell.cLng]];
    const stats = computeRateDesertHoverStats(use, allCrews, keepFraction);
    if (!stats) return; // no survivors anywhere in the cell — skip gracefully
    const avg = stats.avg;
    const color = desertColor(avg);
    const klass = avg >= DESERT_CONFIG.highRate ? 'strong rate desert'
      : avg <= DESERT_CONFIG.lowRate ? 'cheap field dominates' : 'mixed';
    // Hover shows the avg, lowest, and highest rate among the surviving top-N.
    const tip = `Surviving top-${DESERT_CONFIG.topN} rate<br>` +
      `avg <b>$${stats.avg.toFixed(2)}</b> · low <b>$${stats.min.toFixed(2)}</b> · high <b>$${stats.max.toFixed(2)}</b><br>` +
      `<span style="opacity:.8">(${klass})</span> · ${cell.cLat.toFixed(1)}°, ${Math.abs(cell.cLng).toFixed(1)}°W`;
    const rect = drawRect(cell.cLat, cell.cLng, d, color, DESERT_CONFIG.fillOpacity, tip);
    computed.push({ lat: cell.cLat, lng: cell.cLng, step: d, color, opacity: DESERT_CONFIG.fillOpacity, tip });
    if (rect) overlayCells.addLayer(rect);
  }, {
    chunk: 40,
    onProgress,
    onDone() { desertCache[cacheKey] = computed; onDone && onDone(); },
  });
}

/* ---------- overlay cell helpers ---------- */
function drawRect(lat, lng, step, color, opacity, tip) {
  const bounds = [[lat - step / 2, lng - step / 2], [lat + step / 2, lng + step / 2]];
  const rect = L.rectangle(bounds, { stroke: false, fillColor: color, fillOpacity: opacity, interactive: !!tip });
  if (tip) rect.bindTooltip(tip, { sticky: true, className: 'cell-tip' });
  return rect;
}
function drawCells(cells) {
  for (const c of cells) {
    const step = c.step || MOAT_CONFIG.cellDegrees;
    const rect = drawRect(c.lat, c.lng, step, c.color, c.opacity, c.tip);
    overlayCells.addLayer(rect);
  }
}
export function clearOverlayCells() { if (overlayCells) overlayCells.clearLayers(); }
export function cancelOverlayJob() { if (overlayJob) { overlayJob.cancel(); overlayJob = null; } }
/* Drop cached moat/desert cells — call whenever the crew field changes (e.g.
   a hypothetical DDL is placed, re-rated, or removed) so overlays recompute. */
export function invalidateOverlayCaches() {
  for (const k in moatCache) delete moatCache[k];
  for (const k in desertCache) delete desertCache[k];
  for (const k in coverageCache) delete coverageCache[k];
}

/* ============================================================
   Zone-sim sample dots
   ============================================================ */
export function showSampleDots(points) {
  clearSampleDots();
  for (const [lat, lng] of points) {
    L.circleMarker([lat, lng], {
      radius: 2, color: '#8b5cf6', weight: 1, opacity: 0.8,
      fillColor: '#8b5cf6', fillOpacity: 0.35, interactive: false,
    }).addTo(sampleDots);
  }
}
export function clearSampleDots() { if (sampleDots) sampleDots.clearLayers(); }

/* ============================================================
   Wildfire layer (live ArcGIS incidents via esri-leaflet)
   Lazily built on first show, then added/removed on toggle. Independent of the
   analytic overlays, so it can coexist with moat / desert / zones.
   ============================================================ */
// The wildfire toggle drives TWO data sources rendered as one unified layer:
//   • primary — USA_Wildfires_v1 "current incidents" (sized fire icons by acreage)
//   • last24  — WFIGS incidents reported in the last 24h (all share the "new start" icon)
// Both obey one shared filter (a per-source WHERE, since their field names differ)
// and toggle together.
let wildfireLayer = null;
let last24Layer = null;
let wildfireWanted = false; // desired on/off, in case toggle flips during async symbol load
let wildfireWhere = '1=1';  // current filter for the primary source
let last24Where = '1=1';    // current filter for the last-24h source

// Resolve a source key ('primary' | 'last24') to its FeatureServer URL.
function fireSourceUrl(source) {
  return source === 'last24' ? ACTIVE_INCIDENTS_CONFIG.url : WILDFIRE_CONFIG.url;
}

// Server-side filter for the merged wildfire layer. esri-leaflet's setWhere()
// re-fetches and re-renders only matching features. Each source gets its own
// WHERE (different acreage field, no FireDiscoveryAge on the last-24h feed).
// Stored even while the layer is off so it's applied on the next build.
export function setWildfireWhere(primaryWhere, last24WhereArg) {
  wildfireWhere = primaryWhere || '1=1';
  last24Where = last24WhereArg != null ? last24WhereArg : wildfireWhere;
  if (wildfireLayer && wildfireLayer.setWhere) wildfireLayer.setWhere(wildfireWhere);
  if (last24Layer && last24Layer.setWhere) last24Layer.setWhere(last24Where);
}

// The two feeds key incidents by IrwinID but in different formats — primary is
// lowercase, no braces ("cf3d…"); WFIGS is uppercase, braced ("{A037…}"). Strip
// braces + lowercase so the same incident matches across both.
const normIrwin = (v) => (v == null ? '' : String(v).replace(/[{}]/g, '').toLowerCase());

// IrwinIDs matching a filter on a given source — used for the deduped count
// (the union across both feeds). Resolves to { ids: normalized[], loose: number }
// where `loose` counts features lacking a usable id (can't be deduped). Null on
// failure.
export function queryWildfireIds(where, source = 'primary') {
  const url = `${fireSourceUrl(source)}/query?where=${encodeURIComponent(where || '1=1')}`
    + '&outFields=IrwinID&returnGeometry=false&f=json';
  return fetch(url)
    .then((r) => r.json())
    .then((d) => {
      if (!d || !Array.isArray(d.features)) return null;
      const ids = [];
      let loose = 0;
      for (const f of d.features) {
        const n = normIrwin(f.attributes && f.attributes.IrwinID);
        if (n) ids.push(n); else loose++;
      }
      return { ids, loose };
    })
    .catch(() => null);
}

// Distinct values for a string field (e.g. POOState, GACC) on a given source —
// used once at startup to populate the State / GACC pickers. Resolves to string[].
// NOTE: these services only honor returnDistinctValues when returnGeometry=false;
// without it the query returns one row per feature (i.e. no dedupe).
export function queryWildfireDistinct(field, source = 'primary') {
  const url = `${fireSourceUrl(source)}/query?where=1%3D1&outFields=${encodeURIComponent(field)}`
    + `&returnGeometry=false&returnDistinctValues=true&orderByFields=${encodeURIComponent(field)}&f=json`;
  return fetch(url)
    .then((r) => r.json())
    .then((d) => (d && Array.isArray(d.features)
      ? d.features.map((f) => f.attributes[field]).filter((v) => v != null && String(v).trim() !== '')
      : []))
    .catch(() => []);
}

// Official ESRI fire icons: fetched once from the layer's drawingInfo renderer
// and cached at module level (the prompt's per-feature fetch is explicitly
// avoided). Resolves to a { label -> { dataUri, px } } map, or null if the def
// can't be loaded — in which case we fall back to the triangle divIcon below.
let fireSymbolPromise = null;

function loadFireSymbols() {
  if (fireSymbolPromise) return fireSymbolPromise;
  fireSymbolPromise = fetch(`${WILDFIRE_CONFIG.url}?f=pjson`)
    .then((r) => r.json())
    .then((def) => {
      const infos = def && def.drawingInfo && def.drawingInfo.renderer
        ? def.drawingInfo.renderer.uniqueValueInfos : null;
      if (!def || !def.drawingInfo) {
        console.warn('[wildfire] layer def missing drawingInfo — using triangle markers');
        return null;
      }
      if (!infos) return null;
      const out = {};
      for (const info of infos) {
        const sym = info.symbol;
        if (!sym || !sym.imageData) continue;
        // width is in points; ×1.333 → CSS px (matches the renderer's display size).
        out[info.value] = {
          dataUri: `data:${sym.contentType};base64,${sym.imageData}`,
          px: Math.round((sym.width || 13.5) * 1.333),
        };
      }
      return Object.keys(out).length ? out : null;
    })
    .catch((err) => {
      console.warn('[wildfire] failed to load symbol icons — using triangle markers', err);
      // Don't cache a transient failure: clear the promise so a later toggle can
      // retry the fetch instead of being stuck on the triangle fallback forever.
      fireSymbolPromise = null;
      return null;
    });
  return fireSymbolPromise;
}

// Mirrors the renderer's Arcade expression: classify a feature to a symbol label.
function getFireSymbolLabel(p) {
  const acres = p.DailyAcres;
  const age = p.FireDiscoveryAge;
  const type = p.IncidentTypeCategory;
  if (type === 'RX') return 'Prescribed Fire';
  if (type === 'CX') return 'Incident Complex';
  if (age === 0) return 'New (Past 24-hour)';
  if (acres == null || isNaN(acres)) return '0-999'; // null acres → smallest tier
  if (acres < 1000) return '0-999';
  if (acres < 10000) return '1,000-9,999';
  if (acres < 50000) return '10,000-49,999';
  if (acres < 300000) return '50,000-299,999';
  return '300,000 or more';
}

// Build an L.icon for a specific symbol label, falling back to the smallest tier.
function fireIconForLabel(symbols, label) {
  const sym = symbols[label] || symbols['0-999'];
  const px = sym.px;
  return L.icon({
    iconUrl: sym.dataUri,
    iconSize: [px, px],
    iconAnchor: [px / 2, px / 2],
    popupAnchor: [0, -(px / 2)],
  });
}

// Primary source: classify each feature to its acreage/type-based symbol.
function getFireIcon(symbols, p) {
  return fireIconForLabel(symbols, getFireSymbolLabel(p));
}

// Fallback hazard-triangle divIcon, used if the symbol fetch fails.
function wildfireTriangleIcon() {
  const s = WILDFIRE_CONFIG.markerSize;
  return L.divIcon({
    className: '', html: '<div class="wildfire-marker"></div>',
    iconSize: [s, s], iconAnchor: [s / 2, s / 2],
  });
}

function addWildfireLayers() {
  if (wildfireLayer) wildfireLayer.addTo(map);
  if (last24Layer) last24Layer.addTo(map);
}

// Route a fire feature click into ui.js (non-visual incident ranking) while
// keeping the feature's own popup. Mirrors the zone/hypo click-router pattern:
// stop propagation so the underlying map-click handler doesn't also fire.
function bindFireClick(feature, layer) {
  layer.on('click', (e) => {
    L.DomEvent.stopPropagation(e);
    if (!handlers.onFireClick) return;
    const ll = (layer.getLatLng && layer.getLatLng()) || e.latlng;
    handlers.onFireClick(feature.properties || {}, ll.lat, ll.lng, layer);
  });
}

/* ---- Cross-source dedup ----
   The same brand-new fire can appear in BOTH feeds. We keep the primary marker
   (richer acreage data) and hide the last-24h duplicate. Done client-side so it
   tracks the live filter + viewport: a fire only counts as a duplicate while its
   primary counterpart is actually loaded. */
const primaryIrwinIds = new Set();

function refreshPrimaryIrwinIds() {
  primaryIrwinIds.clear();
  if (!wildfireLayer || !wildfireLayer.eachFeature) return;
  wildfireLayer.eachFeature((l) => {
    const id = normIrwin(l.feature && l.feature.properties && l.feature.properties.IrwinID);
    if (id) primaryIrwinIds.add(id);
  });
}

function reconcileDedup() {
  if (!last24Layer || !last24Layer.eachFeature) return;
  last24Layer.eachFeature((l) => {
    const id = normIrwin(l.feature && l.feature.properties && l.feature.properties.IrwinID);
    const dup = !!id && primaryIrwinIds.has(id);
    if (l.setOpacity) l.setOpacity(dup ? 0 : 1);
    // A hidden duplicate must not steal clicks from the primary marker beneath it.
    if (l._icon) l._icon.style.pointerEvents = dup ? 'none' : '';
  });
}

// Both layers stream features in (viewport/filter changes), so coalesce the
// rebuild into one pass per animation frame-ish window.
let dedupTimer = null;
function scheduleDedup() {
  clearTimeout(dedupTimer);
  dedupTimer = setTimeout(() => { refreshPrimaryIrwinIds(); reconcileDedup(); }, 120);
}

export function toggleWildfire(on) {
  if (!map) return;
  wildfireWanted = on;
  if (!on) {
    if (wildfireLayer) map.removeLayer(wildfireLayer);
    if (last24Layer) map.removeLayer(last24Layer);
    return;
  }
  if (wildfireLayer && last24Layer) { addWildfireLayers(); return; }
  // First show: load the official icons, then build both source layers. They're
  // built once; subsequent toggles reuse them via the guard above.
  loadFireSymbols().then((symbols) => {
    if (!wildfireLayer) {
      wildfireLayer = L.esri.featureLayer({
        url: WILDFIRE_CONFIG.url,
        where: wildfireWhere, // honor any filter set while the layer was off
        pointToLayer: (geojson, latlng) => L.marker(latlng, {
          icon: symbols ? getFireIcon(symbols, geojson.properties || {}) : wildfireTriangleIcon(),
          keyboard: false,
        }),
        onEachFeature: (feature, layer) => {
          layer.bindPopup(wildfirePopup(feature.properties), { className: 'wildfire-popup' });
          bindFireClick(feature, layer);
        },
      });
      // Primary set changes (stream-in / filter / pan) → re-evaluate duplicates.
      wildfireLayer.on('load createfeature removefeature', scheduleDedup);
    }
    if (!last24Layer) {
      last24Layer = L.esri.featureLayer({
        url: ACTIVE_INCIDENTS_CONFIG.url,
        where: last24Where,
        // Merged style: every last-24h incident shares the "New (Past 24-hour)" icon.
        pointToLayer: (_geojson, latlng) => L.marker(latlng, {
          icon: symbols ? fireIconForLabel(symbols, 'New (Past 24-hour)') : wildfireTriangleIcon(),
          keyboard: false,
        }),
        onEachFeature: (feature, layer) => {
          layer.bindPopup(activeIncidentPopup(feature.properties), { className: 'wildfire-popup' });
          bindFireClick(feature, layer);
        },
      });
      // New last-24h features arrive un-hidden; reconcile to hide any duplicates.
      last24Layer.on('load createfeature removefeature', scheduleDedup);
    }
    if (wildfireWanted) addWildfireLayers(); // toggled back off mid-load? leave detached.
  });
}

// External feed → escape values before injecting into popup HTML.
function wildfirePopup(p) {
  p = p || {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const name = p.IncidentName ? esc(p.IncidentName) : 'Wildfire incident';
  const state = p.POOState ? esc(String(p.POOState).replace(/^US-/, '')) : '';
  const acres = p.DailyAcres ?? p.CalculatedAcres;
  const acreStr = (acres != null && !isNaN(acres) && acres > 0) ? `${Math.round(acres).toLocaleString()} acres` : 'size n/a';
  const contained = (p.PercentContained != null && !isNaN(p.PercentContained)) ? ` · ${Math.round(p.PercentContained)}% contained` : '';
  const cause = p.FireCause ? `<br><span style="opacity:.75">Cause: ${esc(p.FireCause)}</span>` : '';
  return `<b>${name}</b>${state ? ` · ${state}` : ''}<br>${acreStr}${contained}${cause}`;
}

/* ============================================================
   Last-24h source popup (WFIGS) — used by the merged wildfire layer above.
   ============================================================ */
// External feed → escape values before injecting into popup HTML.
function activeIncidentPopup(p) {
  p = p || {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const name = p.IncidentName ? esc(p.IncidentName) : 'Active incident';
  const state = p.POOState ? esc(String(p.POOState).replace(/^US-/, '')) : '';
  const acres = p.IncidentSize ?? p.DiscoveryAcres;
  // Many last-24h entries are brand-new sub-acre discoveries — show "<1 acre"
  // rather than rounding them down to a misleading "0 acres".
  const acreStr = (acres == null || isNaN(acres) || acres <= 0) ? 'size n/a'
    : acres < 1 ? '<1 acre'
    : `${Math.round(acres).toLocaleString()} acres`;
  const contained = (p.PercentContained != null && !isNaN(p.PercentContained)) ? ` · ${Math.round(p.PercentContained)}% contained` : '';
  const cause = p.FireCause ? `<br><span style="opacity:.75">Cause: ${esc(p.FireCause)}</span>` : '';
  const reported = fmtReported(p.FireDiscoveryDateTime);
  return `<b>${name}</b>${state ? ` · ${state}` : ''}<br>${acreStr}${contained}${reported}${cause}`;
}

// Epoch ms → short "reported" timestamp; blank if missing/unparseable.
function fmtReported(ms) {
  if (ms == null || isNaN(ms)) return '';
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  const when = d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return `<br><span style="opacity:.75">Reported: ${when}</span>`;
}

/* ============================================================
   NWS Watches & Warnings overlay (live ArcGIS polygons via esri-leaflet)
   Lazily built on first show, then added/removed on toggle. Like the wildfire
   layer it's independent of the analytic overlays, so it can coexist with
   moat / desert / zones and never feeds any crew analysis.
   ============================================================ */
let watchesLayer = null;
let watchesWanted = false; // desired on/off (kept for symmetry with the toggle)
let watchesWhere  = '1=1'; // active alert-type filter (server-side WHERE on Event)

// Polygon style keyed on the layer's CAP `Severity` field.
function watchesStyle(feature) {
  const sev = feature && feature.properties && feature.properties.Severity;
  const color = WATCHES_CONFIG.severityColors[sev] || WATCHES_CONFIG.severityColors.Unknown;
  return { color, weight: 1, opacity: 0.9, fillColor: color, fillOpacity: WATCHES_CONFIG.fillOpacity };
}

// External feed → escape values before injecting into popup HTML.
function watchesPopup(p) {
  p = p || {};
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const event = p.Event ? esc(p.Event) : 'Weather alert';
  const sev = p.Severity ? esc(p.Severity) : '';
  const affected = p.Affected ? `<br><span style="opacity:.75">${esc(p.Affected)}</span>` : '';
  const expiry = fmtWatchExpiry(p.HrsUntilExpiration, p.End_);
  return `<b>${event}</b>${sev ? ` · ${sev}` : ''}${expiry}${affected}`;
}

// Friendly expiry line from HrsUntilExpiration (preferred) or the End_ date.
function fmtWatchExpiry(hrs, endMs) {
  if (hrs != null && !isNaN(hrs)) {
    if (hrs <= 0)  return '<br><span style="opacity:.75">Expiring now</span>';
    if (hrs < 24)  return `<br><span style="opacity:.75">Expires in ~${hrs}h</span>`;
    return `<br><span style="opacity:.75">Expires in ~${Math.round(hrs / 24)}d</span>`;
  }
  if (endMs != null && !isNaN(endMs)) {
    const d = new Date(endMs);
    if (!isNaN(d.getTime())) {
      const when = d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      return `<br><span style="opacity:.75">Until ${when}</span>`;
    }
  }
  return '';
}

export function toggleWatches(on) {
  if (!map) return;
  watchesWanted = on;
  if (!on) {
    if (watchesLayer) map.removeLayer(watchesLayer);
    return;
  }
  if (watchesLayer) { watchesLayer.addTo(map).bringToBack(); return; }
  // First show: build the polygon layer once; subsequent toggles reuse it.
  watchesLayer = L.esri.featureLayer({
    url: WATCHES_CONFIG.url,
    where: watchesWhere, // honor any alert-type filter set while the layer was off
    style: watchesStyle,
    onEachFeature: (feature, layer) => {
      layer.bindPopup(watchesPopup(feature.properties), { className: 'watches-popup', maxWidth: 280 });
      // Show the alert on click; don't let it bubble into a map-click (incident drop).
      layer.on('click', (e) => L.DomEvent.stopPropagation(e));
    },
  });
  if (watchesWanted) watchesLayer.addTo(map).bringToBack();
}

// Server-side alert-type filter for the watches layer. Stored even while the
// layer is hidden so it's applied on next (re)build; esri-leaflet's setWhere()
// re-fetches only matching polygons, so filtering hides them from the map.
export function setWatchesWhere(where) {
  watchesWhere = where || '1=1';
  if (watchesLayer && watchesLayer.setWhere) watchesLayer.setWhere(watchesWhere);
}

/* ============================================================
   Invalidate size (after sidebar toggle)
   ============================================================ */
export function invalidate() { if (map) setTimeout(() => map.invalidateSize(), 230); }
