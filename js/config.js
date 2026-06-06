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
  cellDegrees:    0.4,    // ~27mi cells
  maxRadius:      350,    // competitive disc reach from the crew DDP
  strongAdvantage: 2500,
  yellowBand:      1000,  // |margin| <= this reads as pure yellow (parity)
  strongExposed:  -2500,
  fillOpacity:     0.5,
  normScale:       12000, // $ scale to normalize avg advantage to -1..1 in summaries
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
  defaultClusterRadius: 60,
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
  hypoPin:      null,         // { lat, lng }
  activeOverlay: null,        // 'moat' | 'desert' | 'zones' | null
  plKey:        'none',
  timeFilter:   null,         // hours or null
  incidentRadius: 0,          // miles, visual circle only
  rateFilter:   { min: 51, max: 68 },
  searchQuery:  '',
  zoneFilter:   null,         // disp_unit_id or null
  theme:        'dark',
  sidebarOpen:  true,
  clusterRadius: 60,
  showAllIncident: false,     // incident list top-50 vs all
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
