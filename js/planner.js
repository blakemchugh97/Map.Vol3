/* ============================================================
   planner.js — Part 1 planning tools: scenario field composition
   and result folding. PURE (no DOM, no Leaflet).

   ⚠ NO ranking or cost math lives in this file. Every rank, cost,
   share, and market number comes from the UNMODIFIED engine in
   dispatch.js — computeRankAtPoint / competitiveField / niccCost /
   coverageCompetitiveField / computeDesertCell. This module only
   decides WHICH crews are in the evaluated field (the approved
   scenario semantics) and counts/folds engine outputs into rows.
   If a function here ever starts computing a cost or a rank
   directly, that is the logic drift Part 1 exists to avoid.
   ============================================================ */

import {
  computeRankAtPoint, coverageCompetitiveField, makeRateVariant,
  generateGridPoints, moatLatticePoints, moatScoreCell, coverageCellKey,
  isCoverageCompetitive, computeDesertCell, haversine,
} from './dispatch.js';
import { MOAT_CONFIG, DESERT_CONFIG, effectiveKeepFraction } from './config.js';

/* ---------- Scenario field composition (approved 2026-07-16) ----------
   The engine never changes; only the COMPOSITION of the evaluated crew
   field changes with the scenario:

   • probe  ("new company entering the market"): the hypothetical is scored
     against the UNMODIFIED market. Field = the real crews; PL thinning runs
     inside the engine exactly as for any selected crew (computeRankAtPoint
     exempts + prepends the subject — Model D).
   • add    ("existing company adding crews"): the hypothetical is evaluated
     as part of the company field — the app's own set-exemption concept
     (coverageCompetitiveField): the company-scope crews are exempt from PL
     thinning, externals thin by base cost. Thinning is applied HERE, so all
     per-point ranking runs at keep = 1 (the exact pattern map.js
     showCoverage documents and uses).
   • replace ("existing company replacing crews"): same as add, but the
     crews in `replaceIds` are removed from BOTH the company set and the
     external market — replaced crews are gone, never silently active.

   Company scope (approved): the coverage panel's selected-crew set
   (coverageSelectedIds), passed in as `scopeCrews`. Returns a spec:
   { ok, scenario, field, keep, plKey, mates, removed } — `field`+`keep`
   feed computeRankAtPoint directly. On a scope problem returns
   { ok:false, reason } instead of guessing. */
export function composeScenarioField({ scenario, realCrews, scopeCrews = [], replaceIds = new Set(), plKey }) {
  if (scenario === 'probe') {
    return { ok: true, scenario, field: realCrews, keep: effectiveKeepFraction(plKey),
             plKey, mates: [], removed: [] };
  }
  if (!scopeCrews.length) return { ok: false, reason: 'no-scope' };
  const removed = scenario === 'replace' ? scopeCrews.filter(c => replaceIds.has(c.id)) : [];
  if (scenario === 'replace' && !removed.length) return { ok: false, reason: 'no-replace' };
  const gone = new Set(removed.map(c => c.id));
  const mates = scopeCrews.filter(c => !gone.has(c.id));
  const market = gone.size ? realCrews.filter(c => !gone.has(c.id)) : realCrews;
  // Set-exemption field, thinning applied once here → rank at keep = 1.
  // The hypothetical is NOT baked in: computeRankAtPoint exempts + prepends
  // the subject itself, so the same field serves the hypo's own rank AND the
  // company mates' ranks (the pre-hypo footprint) without recomposition.
  const field = coverageCompetitiveField(mates, market, effectiveKeepFraction(plKey));
  return { ok: true, scenario, field, keep: 1.0, plKey, mates, removed };
}

/* ---------- Band share at sampled points ----------
   Counts how often the subject's EXACT engine rank (computeRankAtPoint —
   the same function the moat and coverage overlays rank with, tie-consistent
   with runZoneSimulation's subject-first ordering) lands in the top-5/10/20
   bands across the sample points. This counting fold is new; the ranks are
   not. Bands are 5/10/20 only — top-30 is explicitly NOT exposed (owner
   instruction, 2026-07-16). */
export function bandShareAtPoints(subject, points, field, keep) {
  let t5 = 0, t10 = 0, t20 = 0, sum = 0;
  const ranks = [];
  for (const [lat, lng] of points) {
    const { rank } = computeRankAtPoint(subject, lat, lng, field, keep);
    ranks.push(rank); sum += rank;
    if (rank <= 5) t5++;
    if (rank <= 10) t10++;
    if (rank <= 20) t20++;
  }
  const n = ranks.length;
  const s = [...ranks].sort((a, b) => a - b);
  return {
    n, top5: t5, top10: t10, top20: t20,
    share: { top5: t5 / n * 100, top10: t10 / n * 100, top20: t20 / n * 100 },
    avg_rank: sum / n,
    median_rank: n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2,
  };
}

/* One placement × one rate through the exact engine: the subject is a rate/
   location variant of the hypo template (makeRateVariant — the engine's own
   what-if helper), sampled on the engine's own sunflower grid. */
export function evalPlacement(hypoTemplate, lat, lng, rate, spec, radiusMiles) {
  const subject = makeRateVariant(hypoTemplate, rate, { lat, lng });
  const points = generateGridPoints(lat, lng, radiusMiles);
  return { rate, ...bandShareAtPoints(subject, points, spec.field, spec.keep) };
}

/* ---------- Rate grid ----------
   User-visible, user-controlled grid. Hard cap keeps a typo from freezing the
   tab; a truncated grid is REPORTED, never silent. */
export const RATE_GRID_CAP = 60;
export function rateGrid({ min, max, step }) {
  const rates = [];
  let truncated = false;
  if (!(step > 0) || !(max >= min)) return { rates, truncated };
  for (let r = min; r <= max + 1e-9; r = Math.round((r + step) * 100) / 100) {
    if (rates.length >= RATE_GRID_CAP) { truncated = true; break; }
    rates.push(Math.round(r * 100) / 100);
  }
  return { rates, truncated };
}

/* ---------- Rate headroom ----------
   Approved semantics: a placement "meets band N" when its appearance-
   frequency share (share of sampled points with rank ≤ N) is ≥ the user's
   threshold X%. Headroom = the HIGHEST tested rate that still qualifies —
   explicitly a function of the reported grid. If qualification is
   non-contiguous over the grid (re-entry at a higher rate), that is
   surfaced, never smoothed. `rows` must be ascending by rate. */
export function headroomFromRows(rows, bandKey, thresholdPct) {
  const qual = rows.map(r => r.share[bandKey] >= thresholdPct);
  let headroom = null, headroomRow = null;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (qual[i]) { headroom = rows[i].rate; headroomRow = rows[i]; break; }
  }
  const firstFail = qual.indexOf(false);
  const lastPass = qual.lastIndexOf(true);
  const nonMonotonic = firstFail !== -1 && lastPass > firstFail;
  return {
    headroom, headroomRow, nonMonotonic,
    qualifyingRates: rows.filter((r, i) => qual[i]).map(r => r.rate),
  };
}

/* ---------- Premium viability (read-only Rate Desert consumer) ----------
   Consumes the EXISTING Rate Desert metric exactly as the overlay computes a
   cell: computeDesertCell → average rate of the cheapest topN survivors after
   the desert's own point-local thinning at the current PL. Nothing is
   re-derived; classification labels reuse DESERT_CONFIG's own thresholds and
   the overlay's own wording. Always evaluated over the REAL market (the
   desert is a market-structure view; scenario composition never alters it). */
export function premiumViability(lat, lng, realCrews, plKey) {
  const avg = computeDesertCell(lat, lng, realCrews, effectiveKeepFraction(plKey));
  if (avg == null) return null;
  const klass = avg >= DESERT_CONFIG.highRate ? 'strong rate desert'
    : avg <= DESERT_CONFIG.lowRate ? 'cheap field dominates' : 'mixed';
  return { avg, klass, topN: DESERT_CONFIG.topN };
}

/* ---------- Candidate DDL pool (approved: unique real crew DDP sites) ----------
   The 398 distinct real dispatch locations already in crews.json — exact
   coordinates of proven places. Never generated grid points, never centroids.
   The 4-decimal key matches DATA.ddpGroups' existing site identity. */
export function candidateSites(realCrews) {
  const seen = new Map();
  for (const c of realCrews) {
    const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
    let s = seen.get(key);
    if (!s) { s = { key, lat: c.lat, lng: c.lng, label: c.hucc_name, ddl: c.ddl, crews: [] }; seen.set(key, s); }
    s.crews.push(c.id);
  }
  return [...seen.values()];
}

/* Nearest K sites to an anchor (engine haversine), for bounding the search. */
export function nearestSites(sites, lat, lng, k) {
  return sites
    .map(s => ({ ...s, dist: haversine(lat, lng, s.lat, s.lng) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, k);
}

/* ---------- Redundancy / cannibalization cells ----------
   A crew's competitive cells over a prebuilt scenario field, using the EXACT
   company-coverage cell math from map.js showCoverage: the shared global
   lattice (moatLatticePoints at coverage reach, US-land-masked) ranked by
   moatScoreCell over the composed field at keep = 1. */
const PLANNER_COV_CFG = { cellDegrees: MOAT_CONFIG.cellDegrees, maxRadius: MOAT_CONFIG.coverageRadius };
export function crewCompetitiveCells(crew, field) {
  const out = [];
  for (const [lat, lng] of moatLatticePoints(crew, PLANNER_COV_CFG, { landMask: true })) {
    const { rank } = moatScoreCell(crew, lat, lng, field, 1.0);
    out.push({ key: coverageCellKey(lat, lng), lat, lng, rank });
  }
  return out;
}

/* Fold hypo cells vs the company's existing footprint. "Competitive here"
   reuses isCoverageCompetitive (top-20, the coverage view's own cutoff).
   Components, not a verdict:
     overlap   = hypo-competitive cells the company already covers
     improves  = overlap cells where the hypo's rank BEATS the company's best
     newReach  = hypo-competitive cells the company does not cover
     pctNew    = newReach / hypo-competitive cells */
export function redundancyFold(hypoCells, companyCellsList) {
  const companyBest = new Map(); // cell key -> company's best (lowest) competitive rank
  for (const cells of companyCellsList) {
    for (const c of cells) {
      if (!isCoverageCompetitive(c.rank)) continue;
      const b = companyBest.get(c.key);
      if (b == null || c.rank < b) companyBest.set(c.key, c.rank);
    }
  }
  const hypoComp = hypoCells.filter(c => isCoverageCompetitive(c.rank));
  let overlap = 0, newReach = 0, improves = 0;
  for (const c of hypoComp) {
    const b = companyBest.get(c.key);
    if (b == null) newReach++;
    else { overlap++; if (c.rank < b) improves++; }
  }
  return {
    hypoCompetitiveCells: hypoComp.length, overlap, newReach, improves,
    pctNew: hypoComp.length ? newReach / hypoComp.length * 100 : 0,
    companyCompetitiveCells: companyBest.size,
    band: MOAT_CONFIG.bandOuter,
  };
}
