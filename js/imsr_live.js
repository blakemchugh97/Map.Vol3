/* ============================================================
   imsr_live.js — FIRST live IMSR integration (additive, removable).

   The ENTIRE live-IMSR surface lives here behind IMSR_LIVE.enabled (default
   false → the app behaves EXACTLY as before). To remove the feature: delete this
   file + imsr-live.json, and revert the few `// IMSR-LIVE` hooks in
   config.js / map.js / ui.js / css/app.css.

   Data is the CURATED current-day file from tools/imsr_build_live.py: EXACT-tier
   incidents only, plus per-GACC PL and national totals. Every accessor FAILS SAFE
   to null/empty when disabled, unloaded, or missing a value, so callers keep
   existing behavior / show nothing. This is UNVERIFIED review data, NOT core app
   truth, and it never changes ranking, NICC math, or crew membership.
   ============================================================ */

export const IMSR_LIVE = {
  enabled: true,                  // MASTER SWITCH — ON (user-approved); set false to fully revert
  dataUrl: 'imsr-live.json',
  // Per-GACC PL fill colors (kept subtle; distinct from the analytic overlays).
  plColors: { 1: '#3b82f6', 2: '#22c55e', 3: '#eab308', 4: '#f97316', 5: '#ef4444' },
  plFillOpacity: 0.22,
  // Safeguard: data whose source_date is older than this many days is flagged
  // as stale in the legend (the IMSR file is built per-day; see tools/imsr_build_live.py).
  staleAfterDays: 1,
  // EXPERIMENTAL sit-rep thinning heuristic (NOT validated): more crews committed
  // nationally => fewer available => lower keep. referenceCrews/floor are untuned
  // placeholders; the derived value is shown in the UI and is review-only.
  sitrep: { referenceCrews: 1000, floor: 0.20 },
};

let _data = null;

export async function loadImsrLive() {
  if (!IMSR_LIVE.enabled) return false;
  try {
    const res = await fetch(IMSR_LIVE.dataUrl);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    if (!d || typeof d !== 'object') throw new Error('bad shape');
    _data = d;
    return true;
  } catch (err) {
    console.warn('[imsr-live] disabled — could not load data:', err.message);
    _data = null;                 // fail safe: stay inert
    return false;
  }
}

export function isReady() { return !!(IMSR_LIVE.enabled && _data); }
export function reportDate() { return isReady() && _data.meta ? (_data.meta.source_date || null) : null; }
// Whole days between the report's source_date and now (null if unknown).
export function reportAgeDays() {
  const d = reportDate();
  const then = d ? Date.parse(d + 'T00:00:00Z') : NaN;
  return isFinite(then) ? Math.floor((Date.now() - then) / 86400000) : null;
}
export function isStale() {
  const age = reportAgeDays();
  return age != null && age > IMSR_LIVE.staleAfterDays;
}

/* ---------------- (A) GAC preparedness level ---------------- */
export function gaccPL(gacc) {
  if (!isReady() || !gacc) return null;
  const v = _data.gac_pl && _data.gac_pl[gacc];
  return (typeof v === 'number' && v >= 1 && v <= 5) ? v : null;   // fail safe
}
export function plColor(pl) { return IMSR_LIVE.plColors[pl] || null; }
// Leaflet style override for a region key, or null (→ region keeps its normal style).
export function plFillStyle(gacc) {
  const pl = gaccPL(gacc);
  if (!pl) return null;
  return { fillColor: plColor(pl), fillOpacity: IMSR_LIVE.plFillOpacity };
}
export function plLegendHtml() {
  if (!isReady()) return '';
  const items = [1, 2, 3, 4, 5].map(pl =>
    `<span class="imsr-leg-item"><span class="imsr-leg-sw" style="background:${plColor(pl)}"></span>PL${pl}</span>`).join('');
  // Safeguard: make stale data obvious instead of silently showing an old date.
  const age = reportAgeDays();
  const stale = isStale()
    ? ` <span class="imsr-leg-stale" title="IMSR data is ${age} days old — rebuild imsr-live.json for the current day (tools/imsr_build_live.py)">· ${age}d old</span>`
    : '';
  return `<div class="imsr-pl-legend"><span class="imsr-leg-title">IMSR PL · ${reportDate() || ''} (review)${stale}</span>${items}</div>`;
}

/* ---------------- (B) optional sit-rep thinning (experimental) ---------------- */
export function nationalTotals() { return isReady() ? (_data.national_totals || null) : null; }
// Returns a keep-fraction in (0,1], or null (→ caller falls back to PL behavior).
export function sitrepKeepFraction() {
  const t = nationalTotals();
  if (!t) return null;
  const crews = t.crews;
  if (typeof crews !== 'number' || !isFinite(crews) || crews < 0) return null;
  const { referenceCrews, floor } = IMSR_LIVE.sitrep;
  let keep = 1 - (crews / referenceCrews);
  keep = Math.max(floor, Math.min(1, keep));
  return (keep > 0 && keep <= 1) ? keep : null;
}
export function sitrepReadout() {
  const t = nationalTotals(); const k = sitrepKeepFraction();
  if (!t || k == null) return 'sit-rep unavailable → PL';
  return `${Math.round(k * 100)}% kept · ${t.crews} crews nat'l (exp.)`;
}

/* ---------------- (C) debug-only incident enrichment ---------------- */
// EXACT IMSR match for a clicked fire, by UniqueFireIdentifier; EXACT only.
export function exactIncidentForFire(props) {
  if (!isReady() || !props) return null;
  const ufi = props.UniqueFireIdentifier;
  if (!ufi) return null;
  const rec = _data.exact_incidents && _data.exact_incidents[ufi];
  return (rec && rec.tier === 'EXACT') ? rec : null;
}
// Small clearly-labeled debug block for the incident panel, or '' when no EXACT match.
export function incidentDebugHtml(props) {
  const r = exactIncidentForFire(props);
  if (!r) return '';
  const f = (v) => (v == null ? '—' : v);
  return `<div class="imsr-debug">
    <div class="imsr-debug-head">IMSR · debug / review-only <span class="imsr-tier">${r.tier}</span></div>
    <div class="imsr-debug-grid">
      <span>Report date</span><b>${f(r.report_date)}</b>
      <span>IMSR crews</span><b>${f(r.crews)}</b>
      <span>IMSR engines</span><b>${f(r.engines)}</b>
      <span>IMSR personnel</span><b>${f(r.total_personnel)}</b>
    </div>
    <div class="imsr-debug-foot">unverified IMSR values — not app truth; does not change ranking</div>
  </div>`;
}
