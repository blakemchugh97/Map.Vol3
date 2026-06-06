/* ============================================================
   map.js — Leaflet map, markers, clustering, all overlays.
   Exposes MapView; emits user interactions via handlers passed to init.
   ============================================================ */

import {
  MAP_CONFIG, ZONE_STYLE, MOAT_CONFIG, DESERT_CONFIG, PL_CONFIG,
} from './config.js';
import {
  haversine, computeRankAtPoint, bandScore, computeDesertCell, isUSLand, runChunked,
} from './dispatch.js';

let map, tileLayer, handlers = {};
let clusterGroup;
let markersByKey = {};      // ddpKey -> { marker, crews, key }
let crewKeyById = {};       // crew.id -> ddpKey
let selectedMarkerKey = null;

let incidentMarker, incidentCircle, hypoMarker, radiusCircle;
let zoneLayer = null, zoneByUnit = {}, activeZoneLayer = null;
let overlayCells = null;     // L.layerGroup for moat/desert
let sampleDots = null;       // L.layerGroup for zone-sim dots
let overlayJob = null;       // active chunked job (cancel handle)

const moatCache = {};        // `${crewId}|${plKey}` -> cells
const desertCache = {};      // plKey -> cells

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
   Hypothetical DDP pin
   ============================================================ */
export function setHypoPin(lat, lng) {
  if (hypoMarker) map.removeLayer(hypoMarker);
  const icon = L.divIcon({ className: '', html: '<div class="hypo-marker"></div>', iconSize: [20, 20], iconAnchor: [10, 18] });
  hypoMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
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
export function showZones(geojson, computeStats) {
  if (zoneLayer) return;
  zoneByUnit = {};
  zoneLayer = L.geoJSON(geojson, {
    style(feature) {
      const stats = computeStats(feature.properties.DispUnitID);
      return stats ? { ...ZONE_STYLE.default } : { ...ZONE_STYLE.empty };
    },
    onEachFeature(feature, layer) {
      const id = feature.properties.DispUnitID;
      zoneByUnit[id] = layer;
      const stats = computeStats(id);
      layer.on('mouseover', () => { if (layer !== activeZoneLayer) layer.setStyle(ZONE_STYLE.hover); });
      layer.on('mouseout',  () => { if (layer !== activeZoneLayer) layer.setStyle(stats ? ZONE_STYLE.default : ZONE_STYLE.empty); });
      layer.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (handlers.onZoneClick) handlers.onZoneClick(feature.properties, stats, layer);
      });
    },
  }).addTo(map);
  zoneLayer.bringToBack();
}
export function hideZones() {
  if (zoneLayer) { map.removeLayer(zoneLayer); zoneLayer = null; activeZoneLayer = null; zoneByUnit = {}; }
}
export function setActiveZone(unitId) {
  if (activeZoneLayer) activeZoneLayer.setStyle(ZONE_STYLE.default);
  const layer = zoneByUnit[unitId];
  if (layer) { layer.setStyle(ZONE_STYLE.active); activeZoneLayer = layer; }
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
  const cacheKey = `${selectedCrew.id}|${plKey}`;
  if (moatCache[cacheKey]) { drawCells(moatCache[cacheKey]); onDone && onDone(); return; }

  const keepFraction = PL_CONFIG[plKey].keepFraction;
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
  if (desertCache[plKey]) { drawCells(desertCache[plKey]); onDone && onDone(); return; }

  const keepFraction = PL_CONFIG[plKey].keepFraction;
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
    const scores = use.map(([la, ln]) => computeDesertCell(la, ln, allCrews, keepFraction)).filter(s => s != null);
    if (!scores.length) return;
    const avg = scores.reduce((a, x) => a + x, 0) / scores.length;
    const color = desertColor(avg);
    const klass = avg >= DESERT_CONFIG.highRate ? 'strong rate desert'
      : avg <= DESERT_CONFIG.lowRate ? 'cheap field dominates' : 'mixed';
    const tip = `Surviving top-${DESERT_CONFIG.topN} avg rate: <b>$${avg.toFixed(2)}/hr</b><br>` +
      `<span style="opacity:.8">(${klass})</span> · ${cell.cLat.toFixed(1)}°, ${Math.abs(cell.cLng).toFixed(1)}°W`;
    const rect = drawRect(cell.cLat, cell.cLng, d, color, DESERT_CONFIG.fillOpacity, tip);
    computed.push({ lat: cell.cLat, lng: cell.cLng, step: d, color, opacity: DESERT_CONFIG.fillOpacity, tip });
    if (rect) overlayCells.addLayer(rect);
  }, {
    chunk: 40,
    onProgress,
    onDone() { desertCache[plKey] = computed; onDone && onDone(); },
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
   Invalidate size (after sidebar toggle)
   ============================================================ */
export function invalidate() { if (map) setTimeout(() => map.invalidateSize(), 230); }
