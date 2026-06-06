/* ============================================================
   dispatch.js — pure math & simulation engine.
   No DOM. No Leaflet. Deterministic, testable functions.
   ============================================================ */

import { NICC, PL_CONFIG, ZONE_SIM, MOAT_CONFIG, DESERT_CONFIG } from './config.js';

/* ---------- Geometry ---------- */
export function haversine(lat1, lng1, lat2, lng2) {
  const R = NICC.earthRadiusMiles;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ---------- NICC dispatch cost ---------- */
// base_cost is pre-computed (rate × 20 × 14 × 8).
// Travel term: rate × 20 people ÷ 50 mph × dist × 2 (round trip).
export function niccCost(crew, dist) {
  return crew.base_cost + (crew.rate * NICC.crewSize / NICC.speed) * dist * 2;
}

export function baseCostFor(rate) {
  return rate * NICC.crewSize * NICC.rotation * NICC.hoursPerDay;
}

export function costToPoint(crew, lat, lng) {
  return niccCost(crew, haversine(crew.lat, crew.lng, lat, lng));
}

/* ---------- PL thinning ----------
   Keep only the top keepFraction of crews by cost to a point.
   The cheapest (1 - keepFraction) are assumed already dispatched. */
export function thinField(crews, incidentLat, incidentLng, keepFraction) {
  if (keepFraction >= 1.0) return crews.slice();
  // Precompute each cost once (N haversines), then sort — NOT in the comparator,
  // which would recompute costToPoint O(n log n) times.
  const ranked = crews
    .map(c => ({ c, cost: costToPoint(c, incidentLat, incidentLng) }))
    .sort((a, b) => a.cost - b.cost);
  return ranked.slice(Math.floor(ranked.length * (1 - keepFraction))).map(x => x.c);
}

/* ---------- Incident ranking ----------
   Rank every (thinned) crew by cost to the incident point.
   Returns rows with distance, travel/mob hours, cost. Optional time filter. */
export function rankIncident(crews, lat, lng, plKey, timeFilter) {
  const keepFraction = PL_CONFIG[plKey].keepFraction;
  let field = thinField(crews, lat, lng, keepFraction);

  let rows = field.map(crew => {
    const dist = haversine(crew.lat, crew.lng, lat, lng);
    const travelHours = dist / NICC.speed;
    const mobHours = travelHours + NICC.mobBufferHours;
    return { crew, dist, travelHours, mobHours, cost: niccCost(crew, dist) };
  });

  if (timeFilter != null) rows = rows.filter(r => r.mobHours <= timeFilter);

  rows.sort((a, b) => a.cost - b.cost);
  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

/* ---------- Sample points inside a circle ----------
   Sunflower (Vogel) distribution: the golden-angle spiral places ~n points with
   quasi-uniform spatial density and no row/column banding — visually far more
   even than a square lattice clipped to a disc. r = sqrt(t) gives equal-area
   radial density (points don't bunch at the center). Returns exactly n points,
   all inside the radius, as [lat, lng] pairs. */
export function generateGridPoints(centerLat, centerLng, radiusMiles, n = ZONE_SIM.points) {
  const points = [];
  const degLat = radiusMiles / 69.0;
  const degLng = radiusMiles / (69.0 * Math.cos(centerLat * Math.PI / 180));
  const golden = Math.PI * (3 - Math.sqrt(5)); // ~2.39996 rad
  // Always sample the crew's own DDP (center) first.
  points.push([centerLat, centerLng]);
  for (let i = 1; i < n; i++) {
    const r = Math.sqrt(i / (n - 1));   // 0..1, equal-area
    const theta = i * golden;
    points.push([
      centerLat + r * degLat * Math.sin(theta),
      centerLng + r * degLng * Math.cos(theta),
    ]);
  }
  return points;
}

/* ---------- Band-based moat scoring ----------
   Maps a crew's rank at a point to a 0..1 score representing how safely
   it sits in the "useful competitive band" (top-10 to top-20).
   1.0 = deeply in top-10 | 0.0 = well outside top-20+ */
export function bandScore(rank) {
  if (rank <= 10) return Math.max(0.70, 1.0 - (rank - 1) * 0.033); // 1→1.0, 10→0.70
  if (rank <= 20) return 0.70 - (rank - 10) * 0.035;                // 10→0.70, 20→0.35
  if (rank <= 40) return 0.35 - (rank - 20) * 0.0125;               // 20→0.35, 40→0.10
  return Math.max(0, 0.10 - (rank - 40) * 0.002);                   // 40+→0
}

/* Exact rank of selectedCrew at a point after PL thinning of competitors.
   Returns { rank, myCost, fieldSize, bestComp, bestCompCost }. */
export function computeRankAtPoint(selectedCrew, lat, lng, allCrews, keepFraction) {
  const competitors = allCrews.filter(c => c.id !== selectedCrew.id);
  const myCost = costToPoint(selectedCrew, lat, lng);
  const field = keepFraction >= 1.0
    ? competitors
    : thinField(competitors, lat, lng, keepFraction);
  let rank = 1, bestComp = null, bestCompCost = Infinity;
  for (const c of field) {
    const cost = costToPoint(c, lat, lng);
    if (cost < myCost) rank++;
    if (cost < bestCompCost) { bestCompCost = cost; bestComp = c; }
  }
  return { rank, myCost, fieldSize: field.length + 1, bestComp, bestCompCost };
}

/* ---------- Zone (competitive radius) simulation ----------
   Model D: the analyzed crew is the hypothesis ("if dispatched here") and is
   ALWAYS available. PL thinning models *competitors* being drawn to other fires,
   not the subject — so we thin only the competitor field and always include the
   selected crew. (Thinning the full field, as in the brief's literal spec, lets
   a locally-cheap crew thin itself out of its own analysis at high PL.) This also
   makes the zone sim consistent with the moat overlay, which already exempts the
   selected crew. */
export function runZoneSimulation(selectedCrew, radiusMiles, allCrews, plKey) {
  const points = generateGridPoints(selectedCrew.lat, selectedCrew.lng, radiusMiles);
  const keepFraction = PL_CONFIG[plKey].keepFraction;
  const competitors = allCrews.filter(c => c.id !== selectedCrew.id);
  const results = {
    ranks: [], win: 0, top5: 0, top10: 0, top20: 0,
    band1_5: 0, band6_10: 0, band11_20: 0, band21plus: 0,
    threats: {}, points,
  };

  for (const [lat, lng] of points) {
    const field = thinField(competitors, lat, lng, keepFraction);
    // precompute costs once, then sort (avoid haversine in the comparator).
    // selectedCrew is prepended so it is always ranked, never thinned out.
    const ranked = [selectedCrew, ...field]
      .map(c => ({ c, cost: costToPoint(c, lat, lng) }))
      .sort((a, b) => a.cost - b.cost)
      .map(x => x.c);
    const myIdx = ranked.findIndex(c => c.id === selectedCrew.id);
    if (myIdx === -1) continue; // defensive; selectedCrew is always present
    const myRank = myIdx + 1;
    results.ranks.push(myRank);
    if (myRank === 1)  results.win++;
    if (myRank <= 5)   results.top5++;
    if (myRank <= 10)  results.top10++;
    if (myRank <= 20)  results.top20++;
    // exclusive band buckets
    if      (myRank <= 5)  results.band1_5++;
    else if (myRank <= 10) results.band6_10++;
    else if (myRank <= 20) results.band11_20++;
    else                   results.band21plus++;

    for (let i = 0; i < myIdx; i++) {
      const t = ranked[i].id;
      results.threats[t] = (results.threats[t] || 0) + 1;
    }
  }

  const n = results.ranks.length;
  results.win_pct    = n > 0 ? (results.win   / n * 100).toFixed(1) : '0';
  results.top5_pct   = n > 0 ? (results.top5  / n * 100).toFixed(1) : '0';
  results.top10_pct  = n > 0 ? (results.top10 / n * 100).toFixed(1) : '0';
  results.top20_pct  = n > 0 ? (results.top20 / n * 100).toFixed(1) : '0';
  results.avg_rank   = n > 0 ? (results.ranks.reduce((a, b) => a + b, 0) / n).toFixed(1) : '0';
  if (n > 0) {
    const s = [...results.ranks].sort((a, b) => a - b);
    results.median_rank = (n % 2 === 0
      ? ((s[n / 2 - 1] + s[n / 2]) / 2)
      : s[Math.floor(n / 2)]).toFixed(1);
  } else {
    results.median_rank = '0';
  }
  results.total_pts = n;

  results.threat_list = Object.entries(results.threats)
    .filter(([, cnt]) => cnt / n >= ZONE_SIM.threatThreshold)
    .sort((a, b) => b[1] - a[1])
    .slice(0, ZONE_SIM.maxThreats)
    .map(([id, cnt]) => ({
      id,
      beat_pct: (cnt / n * 100).toFixed(0),
      crew: allCrews.find(c => c.id === id),
    }));

  return results;
}

/* ---------- Rate sensitivity ---------- */
export function makeRateVariant(crew, testRate, overrides = {}) {
  return { ...crew, rate: testRate, base_cost: baseCostFor(testRate), ...overrides };
}

export function rateSensitivity(selectedCrew, testRate, radius, allCrews, plKey) {
  const testCrew = makeRateVariant(selectedCrew, testRate);
  const base = runZoneSimulation(selectedCrew, radius, allCrews, plKey);
  const test = runZoneSimulation(
    testCrew, radius,
    allCrews.map(c => (c.id === selectedCrew.id ? testCrew : c)),
    plKey
  );
  return {
    base, test,
    delta_top10: (parseFloat(test.top10_pct) - parseFloat(base.top10_pct)).toFixed(1),
    delta_top20: (parseFloat(test.top20_pct) - parseFloat(base.top20_pct)).toFixed(1),
    delta_top5:  (parseFloat(test.top5_pct)  - parseFloat(base.top5_pct)).toFixed(1),
    delta_win:   (parseFloat(test.win_pct)   - parseFloat(base.win_pct)).toFixed(1),
    delta_rank:  (parseFloat(test.avg_rank)  - parseFloat(base.avg_rank)).toFixed(1),
    delta_base:  (testRate - selectedCrew.rate) * 20 * 14 * 8,
    new_gl_rank: allCrews.filter(c => c.rate < testRate).length + 1,
  };
}

/* ---------- Breakeven rate ----------
   Rate at which selected crew ties the #1 threat crew at the zone center.
   Both NICC costs are linear in rate, so solve for testRate exactly. */
export function breakevenRate(selectedCrew, threatCrew, centerLat, centerLng) {
  if (!threatCrew) return null;
  const dThis   = haversine(selectedCrew.lat, selectedCrew.lng, centerLat, centerLng);
  const dThreat = haversine(threatCrew.lat, threatCrew.lng, centerLat, centerLng);
  // cost(rate) = rate*20*14*8 + (rate*20/50)*d*2 = rate * (2240 + 0.8*d)
  const threatCost = threatCrew.rate * (2240 + 0.8 * dThreat);
  const myFactor   = 2240 + 0.8 * dThis;
  return threatCost / myFactor;
}

/* ---------- Moat cell readout ----------
   Full exact readout at a point: the selected crew's NICC cost, the single
   cheapest *available* OTHER crew after PL thinning, and the margin
   (bestCompetitorCost - myCost; positive => selected crew is cheaper).
   If PL thinned out every competitor, the crew is effectively the only option,
   so margin caps at strongAdvantage (reads green rather than blank). */
export function moatReadout(selectedCrew, cellLat, cellLng, allCrews, keepFraction) {
  const myCost = niccCost(selectedCrew, haversine(selectedCrew.lat, selectedCrew.lng, cellLat, cellLng));
  // At PL-none (keep>=1) the only requirement is the single cheapest competitor,
  // so iterate the full list directly (skipping self) — no array copies. Thinning
  // only needs the allocated/sorted path when PL actually removes the cheap field.
  let field, needsSkip;
  if (keepFraction >= 1.0) { field = allCrews; needsSkip = true; }
  else { field = thinField(allCrews.filter(c => c.id !== selectedCrew.id), cellLat, cellLng, keepFraction); needsSkip = false; }
  let bestCompCost = Infinity, bestCompCrew = null;
  for (const c of field) {
    if (needsSkip && c.id === selectedCrew.id) continue;
    const cost = costToPoint(c, cellLat, cellLng);
    if (cost < bestCompCost) { bestCompCost = cost; bestCompCrew = c; }
  }
  const margin = bestCompCrew ? bestCompCost - myCost : MOAT_CONFIG.strongAdvantage;
  return { myCost, bestCompCost, bestCompCrew, margin };
}

export function computeMoatCell(cellLat, cellLng, selectedCrew, allCrews, keepFraction) {
  const dist = haversine(selectedCrew.lat, selectedCrew.lng, cellLat, cellLng);
  if (dist > MOAT_CONFIG.maxRadius) return null;
  return moatReadout(selectedCrew, cellLat, cellLng, allCrews, keepFraction).margin;
}

/* ---------- Rate desert cell (single point) ---------- */
export function computeDesertCell(cellLat, cellLng, allCrews, keepFraction) {
  const field = thinField(allCrews, cellLat, cellLng, keepFraction);
  if (field.length === 0) return null;
  // precompute costs once, then sort (avoid haversine in the comparator)
  const ranked = field
    .map(c => ({ c, cost: costToPoint(c, cellLat, cellLng) }))
    .sort((a, b) => a.cost - b.cost);
  const topN = ranked.slice(0, Math.min(DESERT_CONFIG.topN, ranked.length));
  return topN.reduce((sum, x) => sum + x.c.rate, 0) / topN.length;
}

/* ---------- US land mask ----------
   Simplified contiguous-US outline ([lng,lat]) used as a practical land mask so
   the rate-desert grid skips obvious ocean / non-US cells. Great Lakes count as
   land (acceptable approximation). */
export const US_LAND_POLY = [
  [-124.7, 48.4], [-124.4, 46.3], [-124.4, 43.0], [-124.2, 40.4], [-122.4, 37.8],
  [-120.6, 34.5], [-117.1, 32.5], [-114.7, 32.7], [-111.1, 31.3], [-108.2, 31.3],
  [-106.5, 31.8], [-103.0, 29.0], [-101.5, 29.8], [-99.5, 27.5], [-97.4, 25.9],
  [-97.2, 27.8], [-95.3, 28.9], [-93.8, 29.7], [-91.0, 29.2], [-89.0, 29.2],
  [-88.0, 30.4], [-85.5, 29.7], [-83.0, 29.1], [-82.8, 27.8], [-81.8, 26.0],
  [-80.4, 25.2], [-80.6, 28.5], [-81.4, 30.7], [-80.9, 32.0], [-78.5, 33.8],
  [-75.5, 35.2], [-76.0, 37.0], [-75.1, 38.8], [-74.0, 40.5], [-71.9, 41.3],
  [-70.7, 41.7], [-70.8, 43.1], [-67.0, 44.8], [-69.2, 47.4], [-71.5, 45.0],
  [-75.0, 45.0], [-76.5, 43.6], [-79.2, 43.3], [-82.5, 41.7], [-83.2, 46.0],
  [-84.4, 46.5], [-88.4, 48.3], [-90.0, 48.1], [-95.2, 49.0], [-104.0, 49.0],
  [-114.0, 49.0], [-123.0, 49.0],
];
export function pointInPoly(lng, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    const hit = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}
export function isUSLand(lat, lng) { return pointInPoly(lng, lat, US_LAND_POLY); }

/* ---------- Zone stats ---------- */
export function zoneStats(dispUnitID, allCrews) {
  const zoneCrew = allCrews.filter(c => c.disp_unit_id === dispUnitID);
  if (zoneCrew.length === 0) return null;
  const rates = zoneCrew.map(c => c.rate);
  const companies = [...new Set(zoneCrew.map(c => c.company))];
  const sorted = zoneCrew.slice().sort((a, b) => a.rate - b.rate);
  return {
    crew_count: zoneCrew.length,
    company_count: companies.length,
    avg_rate: (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(2),
    min_rate: Math.min(...rates).toFixed(2),
    max_rate: Math.max(...rates).toFixed(2),
    cheapest: sorted[0],
  };
}

/* ---------- Async chunked iteration (non-blocking overlays) ----------
   Calls `work(item, index)` for each item, yielding to the browser
   every `chunk` items. `onProgress(done,total)` fires after each chunk.
   Uses setTimeout(0) so it keeps progressing even in throttled/background
   tabs where requestAnimationFrame is paused. Returns a cancel handle. */
export function runChunked(items, work, { chunk = 60, onProgress, onDone } = {}) {
  let i = 0;
  let cancelled = false;
  const total = items.length;
  function step() {
    if (cancelled) return;
    const end = Math.min(i + chunk, total);
    for (; i < end; i++) work(items[i], i);
    if (onProgress) onProgress(i, total);
    if (i < total) setTimeout(step, 0);
    else if (onDone) onDone();
  }
  setTimeout(step, 0);
  return { cancel() { cancelled = true; } };
}
