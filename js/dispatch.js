/* ============================================================
   dispatch.js — pure math & simulation engine.
   No DOM. No Leaflet. Deterministic, testable functions.
   ============================================================ */

import { NICC, ZONE_SIM, MOAT_CONFIG, DESERT_CONFIG, effectiveKeepFraction, tierForRank } from './config.js';

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

/* ---------- PL thinning (POINT-LOCAL) ----------
   Drop the cheapest (1 - keepFraction) of crews BY COST TO A SPECIFIC POINT.
   This models "the cheapest option AT THIS POINT is already taken" and is the
   right lens for the rate-desert overlay (a per-location market-structure view).

   ⚠️ Do NOT use this to thin a crew's competitors for ranking. Ranking by cost to
   the same point you thinned by is circular: it deletes exactly the competitors
   that beat the subject *here*, so an expensive crew with no real local advantage
   rockets to rank #1 (its 42 beaters get thinned). Ranking views use the GLOBAL
   thinning below instead. See [[competitiveField]]. */
export function thinField(crews, incidentLat, incidentLng, keepFraction) {
  if (keepFraction >= 1.0) return crews.slice();
  // Precompute each cost once (N haversines), then sort — NOT in the comparator,
  // which would recompute costToPoint O(n log n) times.
  const ranked = crews
    .map(c => ({ c, cost: costToPoint(c, incidentLat, incidentLng) }))
    .sort((a, b) => a.cost - b.cost);
  return ranked.slice(Math.floor(ranked.length * (1 - keepFraction))).map(x => x.c);
}

/* ---------- PL thinning (GLOBAL — the availability model for ranking) ----------
   Drop the cheapest (1 - keepFraction) of crews BY THEIR OWN BASE COST (≡ rate,
   since base_cost = rate × crewSize × rotation × hoursPerDay). This is the correct
   model of "the cheapest crews are already committed to other fires": a crew's
   chance of being unavailable depends on its general desirability (low rate), NOT
   on how close it happens to be to the hypothetical point we're scoring.

   Because the surviving set is point-INDEPENDENT (the higher-rate crews, the same
   everywhere), ranking the survivors by cost-to-point is no longer circular: an
   expensive crew is still beaten by the cheaper survivors near it, so it only looks
   competitive where it genuinely has a geographic moat. Deterministic. */
export function thinFieldGlobal(crews, keepFraction) {
  if (keepFraction >= 1.0) return crews.slice();
  const ranked = crews.slice().sort((a, b) => a.base_cost - b.base_cost);
  return ranked.slice(Math.floor(ranked.length * (1 - keepFraction)));
}

/* ---------- The ONE competitive field (Model D) ----------
   Single source of truth for "who is available to fight a fire at this point,"
   shared by every ranking view (moat color/hover, zone sim, dropped incident) so
   they can never disagree. Two independent ideas combine here:

   1. AVAILABILITY (PL thinning) — uses GLOBAL thinning (thinFieldGlobal, by base
      cost/rate). The cheapest crews are committed elsewhere regardless of this
      point. This must NOT be point-local: thinning competitors by cost-to-THIS-point
      and then ranking by cost-to-THIS-point is circular and deletes exactly the
      crews that beat the subject here, so an expensive crew false-ranks #1 across
      huge areas (a $66 crew read #1 at PL3 where its true rank was ~#43). Global
      thinning keeps the surviving set point-independent, so the rank reflects the
      crew's REAL standing among who's actually available.

   2. THE SUBJECT (Model D) — the analyzed/selected crew is the hypothesis ("if I
      dispatch THIS crew here") and is ALWAYS available: it is exempt from thinning
      and prepended. (Matters for a CHEAP subject, which global thinning would
      otherwise remove.) With `selectedCrew` null there is no hypothesis, so the
      whole field is thinned literally.

   `lat`/`lng` are accepted for signature stability but unused now that thinning is
   global (the ranking caller still uses them to rank the returned field by cost). */
export function competitiveField(allCrews, lat, lng, keepFraction, selectedCrew = null) {
  if (!selectedCrew) return thinFieldGlobal(allCrews, keepFraction);
  const competitors = allCrews.filter(c => c.id !== selectedCrew.id);
  const survivors = keepFraction >= 1.0 ? competitors : thinFieldGlobal(competitors, keepFraction);
  return [selectedCrew, ...survivors]; // subject first so cost-ties resolve in its favor
}

/* ---------- Incident ranking ----------
   Rank every available crew by cost to the incident point, over the SAME Model-D
   field the moat/zone sim use (so a selected crew's incident rank equals the rank
   the moat overlay shows at that point). Returns rows with distance, travel/mob
   hours, cost. `selectedCrew` is the hypothesis to keep always-available (null when
   no crew is selected → literal full-field thinning).

   THE TIME FILTER IS A DISPLAY LENS, NOT A RANK INPUT. Rank is a pure function of
   the NICC cost ordering, so it is assigned over the FULL cost field FIRST, and the
   time filter only HIDES rows whose mobilization exceeds the limit afterward. The
   ranks of the surviving rows are therefore their true cost ranks (with gaps where
   unreachable crews were removed). If we filtered before ranking — the old behavior
   — removing far-but-cheap crews silently renumbered everyone, inflating a nearby
   expensive crew from (say) #130 to #15 and CONTRADICTING the moat overlay, which
   never time-filters. Ranking first guarantees moat rank === incident rank for any
   crew the time filter leaves visible. */
export function rankIncident(crews, lat, lng, plKey, timeFilter, selectedCrew = null) {
  const keepFraction = effectiveKeepFraction(plKey);
  const field = competitiveField(crews, lat, lng, keepFraction, selectedCrew);

  let rows = field.map(crew => {
    const dist = haversine(crew.lat, crew.lng, lat, lng);
    const travelHours = dist / NICC.speed;
    const mobHours = travelHours + NICC.mobBufferHours;
    return { crew, dist, travelHours, mobHours, cost: niccCost(crew, dist) };
  });

  // Rank over the full cost ordering BEFORE hiding anything, so ranks match the moat.
  rows.sort((a, b) => a.cost - b.cost);
  rows.forEach((r, i) => { r.rank = i + 1; });

  // Time filter hides unreachable crews from the list; it does NOT renumber ranks.
  if (timeFilter != null) rows = rows.filter(r => r.mobHours <= timeFilter);
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
   Maps a crew's rank at a point to a 0..1 score representing how safely it sits in
   the "useful competitive band" (top-10 to top-20). 1.0 = deeply in top-10 |
   0.0 = at/beyond ~2× the outer band (rank 40+).
   The anchors at rank 1 (1.0), 10 (0.70) and 20 (0.35) are load-bearing: the
   two-company coverage tints (classifyDuoCell / duoTintFraction, DUO_TOP10) read
   strength against them, so they MUST NOT move. Only the post-top-20 tail was
   steepened — it used to crawl to ~0.10 at rank 40 and not reach 0 until rank ~90,
   which painted ranks the incident table calls "weak" (25–40) as lingering orange.
   It now fades linearly to 0 by rank 40 so color stops over-implying competitiveness
   past the band. */
export function bandScore(rank) {
  if (rank <= 10) return Math.max(0.70, 1.0 - (rank - 1) * 0.033); // 1→1.0, 10→0.70
  if (rank <= 20) return 0.70 - (rank - 10) * 0.035;                // 10→0.70, 20→0.35
  if (rank <= 40) return Math.max(0, 0.35 - (rank - 20) * 0.0175);  // 20→0.35, 40→0.00
  return 0;                                                          // 40+ → no moat strength
}

/* Exact rank of selectedCrew at a point over the shared Model-D field (subject
   always available, competitors thinned). This is the SAME field rankIncident
   builds, so the moat's rank here equals the subject's rank in the incident table.
   Returns { rank, myCost, fieldSize, bestComp, bestCompCost }. */
export function computeRankAtPoint(selectedCrew, lat, lng, allCrews, keepFraction) {
  const field = competitiveField(allCrews, lat, lng, keepFraction, selectedCrew); // subject first
  const myCost = costToPoint(selectedCrew, lat, lng);
  let rank = 1, bestComp = null, bestCompCost = Infinity;
  for (const c of field) {
    if (c.id === selectedCrew.id) continue; // skip the subject; rank it against competitors
    const cost = costToPoint(c, lat, lng);
    if (cost < myCost) rank++;
    if (cost < bestCompCost) { bestCompCost = cost; bestComp = c; }
  }
  return { rank, myCost, fieldSize: field.length, bestComp, bestCompCost };
}

/* ============================================================
   Company-wide coverage (multi-crew moat) — pure helpers
   These reuse the EXACT single-crew rank math (computeRankAtPoint) so the
   company view follows identical behavior; only the rendering differs (map.js).
   ============================================================ */

/* Stable cell id for a lattice point. Footprints from different crews are snapped
   to the same global lattice (see moatLatticePoints), so coincident cells share a
   key and can be aggregated into overlap. */
export const coverageCellKey = (lat, lng) => `${lat.toFixed(4)},${lng.toFixed(4)}`;

/* Crew selection for the coverage view — the "select by price range" primitive.
   Returns the subset of allCrews constrained by company, price tier(s), and/or an
   explicit id set (all provided constraints are AND-ed; null/empty = unconstrained).
   Tier reuses the app-wide price→color mapping (tierForRank), so a "range" is a
   tier band — no new mapping is invented. */
export function selectCoverageCrews(allCrews, { company = null, tiers = null, ids = null } = {}) {
  const tierSet = tiers && tiers.length ? new Set(tiers) : null;
  const idSet   = ids && ids.length ? new Set(ids) : null;
  return allCrews.filter((c) => {
    if (company != null && c.company !== company) return false;
    if (tierSet && !tierSet.has(tierForRank(c.rate))) return false;
    if (idSet && !idSet.has(c.id)) return false;
    return true;
  });
}

/* Lattice points (cell centers) within a crew's competitive disc, snapped to a
   GLOBAL grid of cfg.cellDegrees so footprints from different crews coincide.
   Geometry only — no ranking. With { landMask: true }, cells over ocean / Canada /
   Mexico are dropped (same US-land polygon the rate-desert overlay uses), so the
   company-coverage map cuts off at the coastline and border. Returns [lat, lng][]. */
export function moatLatticePoints(crew, cfg = MOAT_CONFIG, { landMask = false } = {}) {
  const step = cfg.cellDegrees, r = cfg.maxRadius;
  const degLat = r / 69.0;
  const degLng = r / (69.0 * Math.cos(crew.lat * Math.PI / 180));
  const snap = (v) => Math.round(v / step) * step;
  const pts = [];
  for (let lat = snap(crew.lat - degLat); lat <= crew.lat + degLat + 1e-9; lat += step)
    for (let lng = snap(crew.lng - degLng); lng <= crew.lng + degLng + 1e-9; lng += step) {
      if (haversine(crew.lat, crew.lng, lat, lng) > r) continue;
      if (landMask && !isUSLand(lat, lng)) continue;
      pts.push([lat, lng]);
    }
  return pts;
}

/* Evaluate ONE cell for a crew using the EXACT single-crew moat math: the crew's
   rank vs the full field (computeRankAtPoint) mapped to the 0..1 band score
   (bandScore) the single-crew moat colors by. Every cell in the disc is returned
   (no threshold) so the company map shows the same red→emerald gradient. */
export function moatScoreCell(crew, lat, lng, allCrews, keepFraction) {
  const { rank, fieldSize, bestComp } = computeRankAtPoint(crew, lat, lng, allCrews, keepFraction);
  return { rank, fieldSize, bestComp, score: bandScore(rank) };
}

/* A crew's full moat: every cell across its disc with rank + band score. This is
   exactly the single-crew moat, just returned as data. Synchronous convenience for
   tests; the live overlay runs the same per-cell evaluation through runChunked. */
export function computeCrewFootprint(crew, allCrews, keepFraction, cfg = MOAT_CONFIG) {
  const out = [];
  for (const [lat, lng] of moatLatticePoints(crew, cfg)) {
    const { rank, score } = moatScoreCell(crew, lat, lng, allCrews, keepFraction);
    out.push({ key: coverageCellKey(lat, lng), lat, lng, rank, score });
  }
  return out;
}

/* Union many crews' moats into one cell map: each cell takes the BEST (max) band
   score across the crews whose disc covers it — i.e. "is ANY selected crew
   competitive here?" — so coloring by that score yields corridors of green where
   at least one crew has an advantage. `crews` keeps every covering crew (id, rank,
   score) for the hover readout. Pure. Input: [{ crew, cells }]. */
export function aggregateCoverageCells(perCrew) {
  const byCell = new Map();
  for (const { crew, cells } of perCrew) {
    for (const cell of cells) {
      let agg = byCell.get(cell.key);
      if (!agg) { agg = { key: cell.key, lat: cell.lat, lng: cell.lng, best: -Infinity, bestCrew: null, crews: [] }; byCell.set(cell.key, agg); }
      agg.crews.push({ id: crew.id, rank: cell.rank, score: cell.score });
      if (cell.score > agg.best) { agg.best = cell.score; agg.bestCrew = crew.id; }
    }
  }
  return byCell;
}

/* "Competitive here" for the coverage view: a crew counts as competitive at a cell
   when its rank falls within the moat's outer band (top-20). This is the SAME
   threshold the coverage hover readout and per-crew highlight already use, reused
   here so the single-company gradient and the two-company discrete coloring agree
   on what "competitive" means. */
export function isCoverageCompetitive(rank) { return rank <= MOAT_CONFIG.bandOuter; }

/* Two-company classification for a unioned coverage cell. `groupOf(id)` maps a
   covering crew id to 'A' | 'B' | null (null = assigned to neither company, e.g. an
   excluded hypo). Returns { a, b, category, strengthA, strengthB } where:
     - a/b      = "this company has at least one competitive crew (top-20) here"
     - category ∈ 'both' | 'a' | 'b' | 'neither'
     - strengthA/strengthB = each company's best-rank moat strength here, the SAME
       0..1 bandScore the single-company moat shades by (bandScore of the company's
       best/lowest rank among its covering crews; 0 if the company isn't here).
   The strengths drive the one-sided company tint in map.js (companyBlendColor),
   reusing the existing rank-band fade rather than any new scoring. Pure. */
export function classifyDuoCell(agg, groupOf) {
  let a = false, b = false, bestRankA = Infinity, bestRankB = Infinity;
  for (const c of agg.crews) {
    const g = groupOf(c.id);
    if (g === 'A') { if (c.rank < bestRankA) bestRankA = c.rank; if (isCoverageCompetitive(c.rank)) a = true; }
    else if (g === 'B') { if (c.rank < bestRankB) bestRankB = c.rank; if (isCoverageCompetitive(c.rank)) b = true; }
  }
  const strengthA = bestRankA === Infinity ? 0 : bandScore(bestRankA);
  const strengthB = bestRankB === Infinity ? 0 : bandScore(bestRankB);
  return { a, b, category: a && b ? 'both' : a ? 'a' : b ? 'b' : 'neither', strengthA, strengthB };
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
  const keepFraction = effectiveKeepFraction(plKey);
  const results = {
    ranks: [], win: 0, top5: 0, top10: 0, top20: 0,
    band1_5: 0, band6_10: 0, band11_20: 0, band21plus: 0,
    threats: {}, points,
  };

  for (const [lat, lng] of points) {
    // Same Model-D field as the moat + incident table (subject always available,
    // competitors thinned), so the zone sim's ranks match what they show.
    const ranked = competitiveField(allCrews, lat, lng, keepFraction, selectedCrew)
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
  else { field = thinFieldGlobal(allCrews.filter(c => c.id !== selectedCrew.id), keepFraction); needsSkip = false; }
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

/* ---------- Debug: cross-check the four views at one point ----------
   Side-by-side readout of everything that should agree at a coordinate, for the
   PL-thinning consistency audit. Returns the moat color/hover rank
   (computeRankAtPoint) + its band score, the legacy dollar margin (moatReadout,
   a DIFFERENT concept — kept here so the audit shows it explicitly), and the
   subject's rank in the dropped-incident table (rankIncident) at the SAME coords
   and PL. After the Model-D unification `moatRank === incidentRank` (consistent:true).
   Pure; ui.js exposes it on window.__moatAudit for manual console testing. */
export function auditMoatPoint(selectedCrew, lat, lng, allCrews, plKey, timeFilter = null) {
  const keepFraction = effectiveKeepFraction(plKey);
  const ro = computeRankAtPoint(selectedCrew, lat, lng, allCrews, keepFraction);
  const incident = rankIncident(allCrews, lat, lng, plKey, timeFilter, selectedCrew);
  const myRow = incident.find(r => r.crew.id === selectedCrew.id);
  const { margin } = moatReadout(selectedCrew, lat, lng, allCrews, keepFraction);
  // The time filter only HIDES rows; it never changes rank. So the subject is either
  // visible with its true (moat-matching) rank, or hidden because it cannot mobilize
  // in time — which is an availability fact, NOT a moat/incident contradiction.
  const mobHours = haversine(selectedCrew.lat, selectedCrew.lng, lat, lng) / NICC.speed + NICC.mobBufferHours;
  const subjectReachable = timeFilter == null || mobHours <= timeFilter;
  return {
    crew: selectedCrew.id, rate: selectedCrew.rate, coords: { lat, lng }, plKey, keepFraction, timeFilter,
    moatRank: ro.rank, moatFieldSize: ro.fieldSize, bandScore: bandScore(ro.rank),
    cheapestCompetitor: ro.bestComp ? ro.bestComp.id : null,
    moatMargin: margin, // moatReadout's dollar gap to the cheapest competitor (legacy concept)
    incidentRank: myRow ? myRow.rank : null,       // null === hidden by the time filter
    incidentVisible: !!myRow, subjectReachable, mobHours: +mobHours.toFixed(1),
    incidentFieldSize: incident.length,
    // Consistent when the subject's visible rank equals the moat rank, OR when it is
    // hidden purely because the time filter says it can't reach in time.
    consistent: myRow ? myRow.rank === ro.rank : !subjectReachable,
  };
}

/* ---------- Rate desert hover stats ----------
   Aggregate the surviving cheapest-topN rate across a cell's sample points.
   For each point we thin the field, take the cheapest `topN` survivors, and
   record the avg / lowest / highest RATE among them. The cell's reported value
   is the mean of those per-point stats (mirrors the existing avg-of-avgs), so
   the min ≤ avg ≤ max ordering is preserved.
   Returns { avg, min, max, n } or null if no sample point had any survivors
   (graceful empty handling for ocean / fully-thinned cells). */
export function computeRateDesertHoverStats(points, allCrews, keepFraction) {
  const per = [];
  for (const [lat, lng] of points) {
    const field = thinField(allCrews, lat, lng, keepFraction);
    if (field.length === 0) continue;
    // precompute costs once, then sort (avoid haversine in the comparator)
    const ranked = field
      .map(c => ({ c, cost: costToPoint(c, lat, lng) }))
      .sort((a, b) => a.cost - b.cost);
    const topN = ranked.slice(0, Math.min(DESERT_CONFIG.topN, ranked.length));
    const rates = topN.map(x => x.c.rate);
    per.push({
      avg: rates.reduce((s, r) => s + r, 0) / rates.length,
      min: Math.min(...rates),
      max: Math.max(...rates),
    });
  }
  if (!per.length) return null;
  const mean = (sel) => per.reduce((s, p) => s + sel(p), 0) / per.length;
  return { avg: mean(p => p.avg), min: mean(p => p.min), max: mean(p => p.max), n: per.length };
}

/* ---------- Rate desert cell (single point) ----------
   Back-compat scalar (avg only); delegates to the stats helper above. */
export function computeDesertCell(cellLat, cellLng, allCrews, keepFraction) {
  const s = computeRateDesertHoverStats([[cellLat, cellLng]], allCrews, keepFraction);
  return s ? s.avg : null;
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
// Summarize a set of crews into the popup stat shape (or null if empty).
function summarizeCrew(zoneCrew) {
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

export function zoneStats(dispUnitID, allCrews) {
  return summarizeCrew(allCrews.filter(c => c.disp_unit_id === dispUnitID));
}

// Aggregate stats across every dispatch zone in a GACC. `gaccOfUnit` maps a
// crew's disp_unit_id -> GACC abbreviation (built from the zone geojson).
export function gaccStats(gacc, allCrews, gaccOfUnit) {
  if (!gacc) return null;
  return summarizeCrew(allCrews.filter(c => gaccOfUnit[c.disp_unit_id] === gacc));
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
