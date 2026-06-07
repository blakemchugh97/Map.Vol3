/* ============================================================
   config.js — constants, tunables, and global state
   No logic beyond data definitions.
   ============================================================ */

/* ---------- NICC cost model ---------- */
export const NICC = {
  crewSize:   20,    // persons
  speed:      50,    // mph (straight-line air miles assumption)
  rotation:   14,    // days
  hoursPerDay: 8,    // hours
  earthRadiusMiles: 3958.8,
  mobBufferHours: 3, // prep/mobilization added to travel time
};

/* ---------- PL thinning model ---------- */
export const PL_CONFIG = {
  none: { keepFraction: 1.00, label: 'All competitors included' },
  PL2:  { keepFraction: 0.90, label: '~90% of field available' },
  PL3:  { keepFraction: 0.70, label: '~70% of field available' },
  PL4:  { keepFraction: 0.43, label: '~43% of field available' },
  PL5:  { keepFraction: 0.18, label: '~18% of field available' },
};

/* ---------- PL fine-tune slider ----------
   The PL preset sets the NOMINAL keepFraction (the fraction of the competitor
   field that survives thinning). This slider ADDS filtering intensity on top of
   the preset — it does not replace it. Left-anchored:
     slider 0   = nominal (the preset's keepFraction, no added filtering)  ← default, left edge
     slider 100 = heaviest filtering (keep = base * heavyFloorFactor)
   Tune `heavyFloorFactor` to taste: at the heavy extreme the effective keep is
   `base * heavyFloorFactor` (0.40 => remove up to 60% more of the field). */
export const PL_SLIDER = {
  min: 0, max: 100, default: 0, step: 1,
  heavyFloorFactor: 0.40,
};

/* ---------- Hypothetical DDL tool ----------
   A user-placed "what-if" crew. Once dropped it is injected into the live crew
   set and behaves like any real competitor in every analysis. */
export const HYPO_CONFIG = {
  id:          'HYPO',   // single, reserved crew id for the hypothetical DDL
  defaultRate: 61.00,    // $/hr starting rate (≈ field median); easy to tune
};

/* ---------- Rate tier breakpoints (global rank, ascending) ---------- */
export const TIERS = {
  green:  { max: 100, label: 'Cheapest 100', css: 'green'  },
  yellow: { max: 210, label: 'Mid-tier',     css: 'yellow' },
  orange: { max: 388, label: 'Expensive',    css: 'orange' },
  red:    { max: Infinity, label: 'Most expensive', css: 'red' },
};
export const TIER_COLORS = { green: '#2dd47f', yellow: '#eab308', orange: '#f97316', red: '#f05252' };

/* ---------- Rate range (filter bounds) ---------- */
export const RATE_BOUNDS = { min: 51, max: 68 };

/* ---------- Zone simulation ---------- */
export const ZONE_SIM = {
  defaultRadius: 200,
  minRadius: 50,
  maxRadius: 800,
  points: 100,
  threatThreshold: 0.30, // crew must beat selected in >=30% of points to be a "threat"
  maxThreats: 8,
  sampleDotsOnMap: 20,
};

/* ---------- Moat overlay ---------- */
// Absolute, symmetric, interpretable color ladder (ported from vol9):
//   margin >= strongAdvantage      -> full green  (meaningful cost advantage)
//   |margin| <= yellowBand         -> pure yellow (near parity / marginal)
//   margin <= strongExposed        -> full red    (exposed)
// A yellow deadband around $0 stops tiny margins from rendering deep green/red.
export const MOAT_CONFIG = {
  cellDegrees:     0.4,   // ~27mi cells
  maxRadius:       350,   // competitive disc reach from the crew DDP
  fillOpacity:     0.52,
  // Rank-band thresholds for the band-based moat score
  bandTop:         10,    // "useful band" top-N (comfortably competitive)
  bandOuter:       20,    // outer band boundary (marginal zone)
  // Legacy dollar field kept so moatReadout() doesn't break if called externally
  strongAdvantage: 2500,
  normScale:       12000,
};

/* ---------- Rate desert overlay ---------- */
// Metric per cell: average RATE of the cheapest `topN` crews still available
// after PL thinning, sub-sampled across the cell and masked to US land.
// Tighter low/high band ($58-$64) gives contrast around the ~$61 median.
export const DESERT_CONFIG = {
  cellDegrees:    1.0,    // ~70mi cells (coarser, but sub-sampled)
  samplesPerCell: 6,      // sampled incident points per cell, then averaged
  topN:           15,     // avg rate of cheapest N survivors
  lowRate:        58,     // <= this: cheap field dominates (teal)
  highRate:       64,     // >= this: strong rate desert (orange)
  fillOpacity:    0.55,
  bounds: { minLat: 24.5, maxLat: 49.5, minLng: -125, maxLng: -66.5 },
};

/* ---------- Map ---------- */
export const MAP_CONFIG = {
  center: [42.5, -113.0],   // western US
  zoom: 5,
  minZoom: 3,
  maxZoom: 14,
  conus: { minLat: 24, maxLat: 50, minLng: -125, maxLng: -65 },
  tiles: {
    dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  },
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  defaultClusterRadius: 0,
};

/* ---------- Wildfire layer (ArcGIS live incidents) ----------
   NIFC "Current Incidents" point service, loaded on demand through the
   esri-leaflet plugin. A standalone, informational toggle — independent of the
   exclusive moat/desert/zones overlays and never feeds any crew analysis. */
export const WILDFIRE_CONFIG = {
  url: 'https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USA_Wildfires_v1/FeatureServer/0',
  markerSize: 12,  // px; rendered as a compact hazard-triangle divIcon (see .wildfire-marker)
};

/* ---------- Last-24h incident source (WFIGS) ----------
   Wildland Fire Interagency Geospatial Services "Incident Locations" reported in
   the last 24 hours. This is the SECOND data source merged into the wildfire
   layer: it loads alongside USA_Wildfires_v1 under the single 🔥 toggle, shares
   the same filter, and renders every feature with the "New (Past 24-hour)" icon. */
export const ACTIVE_INCIDENTS_CONFIG = {
  url: 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations_Last24h/FeatureServer/0',
};

/* ---------- Zone overlay styling ---------- */
export const ZONE_STYLE = {
  default: { fillColor: '#1e3a5f', fillOpacity: 0.15, color: '#3b82f6', weight: 1.5, opacity: 0.7 },
  hover:   { fillOpacity: 0.30, weight: 2 },
  active:  { fillColor: '#3b82f6', fillOpacity: 0.25, color: '#f59e0b', weight: 2, opacity: 1 },
  empty:   { fillColor: '#2a3347', fillOpacity: 0.10, color: '#2a3347', weight: 1, opacity: 0.6, dashArray: '4 4' },
};

/* ---------- Global application state ---------- */
export const STATE = {
  mode:         'browse',     // 'browse' | 'incident' | 'hypo_placing'
  selectedCrew: null,
  incidentPin:  null,         // { lat, lng }
  hypoCrew:     null,         // injected hypothetical crew object (or null)
  activeOverlay: null,        // 'moat' | 'desert' | 'zones' | null
  plKey:        'none',
  plSlider:     0,            // 0..100 added filter intensity within the PL preset (0 = nominal)
  timeFilter:   null,         // hours or null
  incidentRadius: 0,          // miles, visual circle only
  rateFilter:   { min: 51, max: 68 },
  searchQuery:  '',
  zoneFilter:   null,         // disp_unit_id or null
  theme:        'dark',
  sidebarOpen:  true,
  clusterRadius: 0,
  showAllIncident: false,     // incident list top-50 vs all
  wildfireOn:   false,        // merged wildfire layer toggle (current incidents + last-24h)
};

/* Loaded data (populated at startup by ui.js) */
export const DATA = {
  crews: [],
  byId: {},          // id -> crew
  ddpGroups: {},     // "lat,lng" -> [crews]
  zones: null,       // geojson, lazy-loaded
};

/* Derived: assign a tier css name from rank */
export function tierForRank(rank) {
  if (rank <= TIERS.green.max)  return 'green';
  if (rank <= TIERS.yellow.max) return 'yellow';
  if (rank <= TIERS.orange.max) return 'orange';
  return 'red';
}

/* ---------- PL slider → effective filtering ----------
   Maps a preset's nominal keepFraction + the intensity slider (0..100) to the
   effective keepFraction actually used by every filtering path. Single source
   of truth so incident, radius, moat, and rate-desert all thin consistently.
   Left-anchored: the slider only ADDS filtering on top of the preset.
     slider 0   -> base (nominal, no change)
     slider 100 -> base * heavyFloorFactor (heaviest)
   Linear in between (more slider = heavier = keep less). */
export function applyPlSliderToFiltering(baseKeepFraction, sliderValue = STATE.plSlider) {
  const s = Math.max(0, Math.min(100, sliderValue)) / 100; // 0..1
  const floor = baseKeepFraction * PL_SLIDER.heavyFloorFactor;
  return baseKeepFraction + (floor - baseKeepFraction) * s;
}

/* Effective keepFraction for a PL key, given the current slider state. */
export function effectiveKeepFraction(plKey, sliderValue = STATE.plSlider) {
  const base = (PL_CONFIG[plKey] || PL_CONFIG.none).keepFraction;
  return applyPlSliderToFiltering(base, sliderValue);
}
