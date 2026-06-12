/* ============================================================
   coverage.test.js — tests for the company-coverage logic.

   This project has no build step and (on this machine) no Node, so tests run in
   the browser against the REAL ES modules over the dev server: open
   tests/coverage.test.html via http://localhost:8000/tests/coverage.test.html.
   Everything here is pure (no DOM/Leaflet), so it exercises the same dispatch.js
   functions the app uses. Emphasis (per the brief) is the price-range → crews
   selection.
   ============================================================ */
import { tierForRank, effectiveKeepFraction } from '../js/config.js';
import {
  selectCoverageCrews, computeCrewFootprint, aggregateCoverageCells,
  moatLatticePoints, coverageCellKey, moatScoreCell, isUSLand,
  isCoverageCompetitive, classifyDuoCell,
  computeRankAtPoint, rankIncident, bandScore, competitiveField,
  thinField, thinFieldGlobal, costToPoint,
} from '../js/dispatch.js';

/* ---- tiny test harness ---- */
const cases = [];
const test = (name, fn) => cases.push({ name, fn });
const assert = (cond, msg) => { if (!cond) throw new Error(msg || 'assertion failed'); };
const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg || 'eq'}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };

/* A company with a known green→red spread (see plan exploration). */
const COMPANY = 'Pacific Oasis, Inc.';

/* ---------- tierForRank boundaries (the price→tier mapping) ---------- */
test('tierForRank: tier boundaries are half-open at 59.50 / 61 / 63', () => {
  eq(tierForRank(51.00), 'green');
  eq(tierForRank(59.49), 'green');
  eq(tierForRank(59.50), 'yellow');
  eq(tierForRank(60.99), 'yellow');
  eq(tierForRank(61.00), 'orange');
  eq(tierForRank(62.99), 'orange');
  eq(tierForRank(63.00), 'red');
  eq(tierForRank(67.15), 'red');
});

/* ---------- selectCoverageCrews — the price-range → crews selection ---------- */
function selectionTests(crews) {
  const companyCrews = crews.filter(c => c.company === COMPANY).sort((a, b) => a.rate - b.rate);

  test('select: company scoping returns only that company', () => {
    const sel = selectCoverageCrews(crews, { company: COMPANY });
    eq(sel.length, companyCrews.length, 'count');
    assert(sel.every(c => c.company === COMPANY), 'all in company');
  });

  test('select: single tier = every company crew in that band', () => {
    const sel = selectCoverageCrews(crews, { company: COMPANY, tiers: ['orange'] });
    const expected = companyCrews.filter(c => tierForRank(c.rate) === 'orange');
    assert(expected.length > 0, 'fixture has orange crews');
    eq(sel.length, expected.length, 'count');
    assert(sel.every(c => tierForRank(c.rate) === 'orange'), 'all orange');
  });

  test('select: multiple tiers = union of bands', () => {
    const sel = selectCoverageCrews(crews, { company: COMPANY, tiers: ['green', 'red'] });
    const expected = companyCrews.filter(c => ['green', 'red'].includes(tierForRank(c.rate)));
    eq(sel.length, expected.length, 'count');
    assert(sel.every(c => ['green', 'red'].includes(tierForRank(c.rate))), 'only green/red');
  });

  test('select: empty tiers == no tier constraint (all of company)', () => {
    const a = selectCoverageCrews(crews, { company: COMPANY, tiers: [] });
    const b = selectCoverageCrews(crews, { company: COMPANY });
    eq(a.length, b.length, 'empty == unconstrained');
    eq(a.length, companyCrews.length, 'all crews');
  });

  test('select: explicit ids intersect the company', () => {
    const ids = companyCrews.slice(0, 3).map(c => c.id);
    const sel = selectCoverageCrews(crews, { company: COMPANY, ids });
    eq(sel.length, 3, 'count');
    eq(sel.map(c => c.id).sort().join(','), ids.slice().sort().join(','), 'ids');
  });

  test('select: tier ∩ ids — a tier cutoff excludes off-tier ids', () => {
    const orange = companyCrews.filter(c => tierForRank(c.rate) === 'orange');
    const green = companyCrews.find(c => tierForRank(c.rate) === 'green');
    const ids = [...orange.map(c => c.id), ...(green ? [green.id] : [])];
    const sel = selectCoverageCrews(crews, { company: COMPANY, tiers: ['orange'], ids });
    eq(sel.length, orange.length, 'green id dropped by orange tier filter');
  });

  test('select: a different company is fully excluded', () => {
    const sel = selectCoverageCrews(crews, { company: COMPANY, tiers: ['green'] });
    assert(sel.every(c => c.company === COMPANY), 'no cross-company leakage');
  });
}

/* ---------- per-crew moat + union ---------- */
function footprintTests(crews) {
  const cheapest = crews.slice().sort((a, b) => a.rate - b.rate)[0]; // global rank 1

  test('moatScoreCell: score = bandScore(rank); cheapest crew is rank 1 at its DDP', () => {
    const s = moatScoreCell(cheapest, cheapest.lat, cheapest.lng, crews, 1.0);
    eq(s.rank, 1, 'rank 1 at own DDP');
    assert(s.score > 0.95, 'rank 1 → near-max band score');
  });

  test('computeCrewFootprint: full disc, every cell scored 0..1, lattice-snapped', () => {
    const fp = computeCrewFootprint(cheapest, crews, 1.0);
    assert(fp.length > 0, 'non-empty');
    // Full disc returned (no top-20 threshold) — one scored cell per lattice point.
    eq(fp.length, moatLatticePoints(cheapest).length, 'returns EVERY disc cell, not just top-20');
    assert(fp.every(c => c.score >= 0 && c.score <= 1), 'score in [0,1]');
    assert(fp.some(c => c.rank <= 10), 'cheapest crew is top-10 somewhere (green corridor)');
    const step = 0.4; // MOAT_CONFIG.cellDegrees
    assert(fp.every(c => Math.abs(c.lat / step - Math.round(c.lat / step)) < 1e-6
                      && Math.abs(c.lng / step - Math.round(c.lng / step)) < 1e-6), 'snapped to global lattice');
    assert(fp.every(c => c.key === coverageCellKey(c.lat, c.lng)), 'cell key matches helper');
  });

  test('moatLatticePoints: every point is within the competitive disc', () => {
    assert(moatLatticePoints(crews[0]).length > 0, 'non-empty');
  });

  test('moatLatticePoints landMask: keeps only US-land cells (cuts ocean/Canada)', () => {
    const coastal = { lat: 34.0, lng: -119.5 }; // SoCal coast: disc spans Pacific + land
    const cfg = { cellDegrees: 0.4, maxRadius: 400 };
    const all = moatLatticePoints(coastal, cfg);
    const masked = moatLatticePoints(coastal, cfg, { landMask: true });
    assert(masked.length > 0, 'some land cells remain');
    assert(masked.length < all.length, 'mask drops ocean/Canada cells');
    assert(masked.every(([la, ln]) => isUSLand(la, ln)), 'every masked cell is US land');
  });

  test('aggregateCoverageCells: each cell takes the BEST (max) score; coincident cells dedupe', () => {
    // A cheap crew (competitive widely) and an expensive one 0.1° away (rarely).
    const mk = (id, lat, lng, rate) => ({ id, company: 'TST', rate, base_cost: rate * 20 * 14 * 8, lat, lng });
    const a = mk('TST1', 40.0, -120.0, 51), b = mk('TST2', 40.1, -120.1, 66);
    const field = [...crews, a, b];
    const fpA = computeCrewFootprint(a, field, 1.0);
    const fpB = computeCrewFootprint(b, field, 1.0);
    const agg = aggregateCoverageCells([{ crew: a, cells: fpA }, { crew: b, cells: fpB }]);

    eq(agg.size, new Set([...fpA, ...fpB].map(c => c.key)).size, 'one entry per distinct cell (deduped)');

    let overlaps = 0;
    for (const v of agg.values()) {
      eq(v.best, Math.max(...v.crews.map(c => c.score)), 'best = max score across crews');
      const top = v.crews.reduce((p, c) => (c.score > p.score ? c : p));
      eq(v.bestCrew, top.id, 'bestCrew = the max-score crew');
      if (v.crews.length === 2) overlaps++;
    }
    assert(overlaps > 0, 'the two discs overlap somewhere');
  });
}

/* ---------- two-company coloring (classifyDuoCell) ----------
   Pure classifier over a unioned cell's covering crews. Build cells by hand so the
   four cases are exercised independently of the live map. A crew counts as
   "competitive" at rank <= 20 (MOAT_CONFIG.bandOuter), the same threshold the
   single-company gradient's "competitive corridor" uses. */
function duoTests() {
  // groupOf: a1/a2 -> Company A, b1/b2 -> Company B, x1 -> neither (e.g. excluded hypo).
  const groupOf = (id) => (id[0] === 'a' ? 'A' : id[0] === 'b' ? 'B' : null);
  const cell = (...crews) => ({ key: 'k', lat: 40, lng: -120, crews });
  const crew = (id, rank) => ({ id, rank, score: 0 });

  test('isCoverageCompetitive: top-20 is competitive, 21+ is not', () => {
    assert(isCoverageCompetitive(1), 'rank 1');
    assert(isCoverageCompetitive(20), 'rank 20 (boundary)');
    assert(!isCoverageCompetitive(21), 'rank 21');
    assert(!isCoverageCompetitive(99), 'rank 99');
  });

  test('classifyDuoCell: both companies competitive -> both (green)', () => {
    const cls = classifyDuoCell(cell(crew('a1', 5), crew('b1', 8)), groupOf);
    assert(cls.a && cls.b, 'a and b both true');
    eq(cls.category, 'both');
  });

  test('classifyDuoCell: only A competitive -> a (Company A color)', () => {
    // B reaches the cell but is NOT competitive here (rank 30).
    const cls = classifyDuoCell(cell(crew('a1', 4), crew('b1', 30)), groupOf);
    assert(cls.a && !cls.b, 'a only');
    eq(cls.category, 'a');
  });

  test('classifyDuoCell: only B competitive -> b (Company B color)', () => {
    const cls = classifyDuoCell(cell(crew('a1', 25), crew('b1', 3)), groupOf);
    assert(!cls.a && cls.b, 'b only');
    eq(cls.category, 'b');
  });

  test('classifyDuoCell: neither competitive -> neither (red)', () => {
    const cls = classifyDuoCell(cell(crew('a1', 40), crew('b1', 55)), groupOf);
    assert(!cls.a && !cls.b, 'neither');
    eq(cls.category, 'neither');
  });

  test('classifyDuoCell: ungrouped (neither-company) crews never flip a/b', () => {
    // x1 is competitive but assigned to neither company (e.g. an excluded hypo).
    const cls = classifyDuoCell(cell(crew('x1', 2)), groupOf);
    assert(!cls.a && !cls.b, 'ungrouped ignored');
    eq(cls.category, 'neither');
  });
}

/* ---------- PL thinning must be GLOBAL, not point-local (the green-square bug) ----
   PL thinning models "the cheapest crews are already committed elsewhere." It must
   key off each crew's OWN base cost (rate), GLOBALLY — never the cost to the point
   being scored. Point-local thinning is circular: it deletes the very competitors
   that beat the subject AT THAT CELL, so an expensive ($66) crew false-ranks #1
   across huge areas at PL3 and the moat paints it green. These tests pin the fix. */
function consistencyTests(crews) {
  const expensive = crews.slice().sort((a, b) => b.rate - a.rate)[0]; // most expensive crew
  const cheap     = crews.slice().sort((a, b) => a.rate - b.rate)[0]; // cheapest crew
  const lat = expensive.lat, lng = expensive.lng;                     // its own DDP
  const keep = effectiveKeepFraction('PL3');

  test('bandScore: anchors (1/10/20) preserved, tail hits 0 by rank 40', () => {
    eq(bandScore(1), 1.0, 'rank 1');
    assert(Math.abs(bandScore(10) - 0.703) < 1e-9, 'rank 10 anchor unchanged (~0.703)');
    assert(Math.abs(bandScore(20) - 0.35) < 1e-9, 'rank 20 anchor = 0.35');
    eq(bandScore(40), 0, 'rank 40 → 0');
    eq(bandScore(90), 0, 'rank 90 → 0 (was ~0 only here before)');
    assert(bandScore(30) < 0.20, 'rank 30 no longer lingers orange');
  });

  test('thinFieldGlobal: removes the cheapest-by-base fraction, point-independently', () => {
    const survivors = thinFieldGlobal(crews, keep);
    eq(survivors.length, crews.length - Math.floor(crews.length * (1 - keep)), 'kept count = keepFraction');
    assert(!survivors.some(c => c.id === cheap.id), 'cheapest crew (lowest base) is removed');
    assert(survivors.some(c => c.id === expensive.id), 'most expensive crew survives');
    const maxRemovedBase = Math.max(...crews.filter(c => !survivors.includes(c)).map(c => c.base_cost));
    const minKeptBase = Math.min(...survivors.map(c => c.base_cost));
    assert(maxRemovedBase <= minKeptBase, 'a clean base-cost split (cheapest removed, dearest kept)');
  });

  test('PL3: GLOBAL thinning fixes the false-#1 green-square bug for an expensive crew', () => {
    // The exact regression: point-local thinning deleted the crews beating the
    // expensive crew at each cell, collapsing it to ~#1 (green) across its disc.
    let pointLocalTop10 = 0, globalTop10 = 0, n = 0;
    for (const [la, ln] of moatLatticePoints(expensive)) {
      n++;
      // current/global behavior (what computeRankAtPoint now does):
      if (computeRankAtPoint(expensive, la, ln, crews, keep).rank <= 10) globalTop10++;
      // simulate the OLD point-local thinning at the same cell:
      const survivors = thinField(crews.filter(c => c.id !== expensive.id), la, ln, keep);
      const myCost = costToPoint(expensive, la, ln);
      const plRank = 1 + survivors.filter(c => costToPoint(c, la, ln) < myCost).length;
      if (plRank <= 10) pointLocalTop10++;
    }
    assert(pointLocalTop10 > n * 0.5, `point-local bug: expensive crew falsely top-10 in >50% of cells (${pointLocalTop10}/${n})`);
    assert(globalTop10 < n * 0.15, `global fix: expensive crew rarely top-10 (${globalTop10}/${n})`);
  });

  test('PL3: subject present and incident rank === moat rank (Model D, global thinning)', () => {
    const moat = computeRankAtPoint(expensive, lat, lng, crews, keep);
    const myRow = rankIncident(crews, lat, lng, 'PL3', null, expensive).find(r => r.crew.id === expensive.id);
    assert(myRow, 'subject is present in the incident table (Model D exemption)');
    eq(myRow.rank, moat.rank, 'incident rank === moat rank (one shared field)');
  });

  test('PL3: global thinning removes a CHEAP crew unless it is the exempt subject', () => {
    const p = { lat: 41.0, lng: -114.0 };
    const notSubject = rankIncident(crews, p.lat, p.lng, 'PL3', null, expensive).find(r => r.crew.id === cheap.id);
    assert(!notSubject, 'cheap crew is committed elsewhere (thinned) when it is NOT the subject');
    const asSubject = rankIncident(crews, p.lat, p.lng, 'PL3', null, cheap).find(r => r.crew.id === cheap.id);
    assert(asSubject, 'cheap crew present when it IS the subject (Model D exemption)');
  });

  test('competitiveField: subject prepended; null subject thins globally', () => {
    const withSubj = competitiveField(crews, lat, lng, keep, expensive);
    assert(withSubj.some(c => c.id === expensive.id), 'subject kept');
    eq(withSubj[0].id, expensive.id, 'subject prepended (cost-tie favors it)');
    const literal = competitiveField(crews, lat, lng, keep, null);
    eq(literal.length, thinFieldGlobal(crews, keep).length, 'null subject → global thinning applied');
    assert(!literal.some(c => c.id === cheap.id), 'global thinning dropped the cheapest crew');
  });

  test('time filter HIDES rows but never renumbers: visible incident rank === moat rank', () => {
    const plat = expensive.lat + 4, plng = expensive.lng + 4;
    for (const tf of [6, 8, 10]) {
      const moat = computeRankAtPoint(expensive, plat, plng, crews, effectiveKeepFraction('none'));
      const rows = rankIncident(crews, plat, plng, 'none', tf, expensive);
      const myRow = rows.find(r => r.crew.id === expensive.id);
      for (let i = 1; i < rows.length; i++) assert(rows[i].rank > rows[i - 1].rank, 'ranks strictly increasing (no renumber)');
      assert(rows.every(r => r.mobHours <= tf), `all visible rows within ${tf}h`);
      if (myRow) eq(myRow.rank, moat.rank, `tf=${tf}: visible subject rank === moat rank`);
    }
  });

  test('PL3: rank is subject-dependent via the exemption — UI must re-rank on select', () => {
    // A cheap crew is competitive on its OWN moat (exempt) but is thinned out of a
    // table ranked around a DIFFERENT subject — so the UI must recompute on select.
    const ownMoat = computeRankAtPoint(cheap, cheap.lat, cheap.lng, crews, keep).rank;
    const ownRow  = rankIncident(crews, cheap.lat, cheap.lng, 'PL3', null, cheap).find(r => r.crew.id === cheap.id);
    assert(ownRow && ownRow.rank === ownMoat, 'as subject: incident rank === moat rank');
    const otherRow = rankIncident(crews, cheap.lat, cheap.lng, 'PL3', null, expensive).find(r => r.crew.id === cheap.id);
    assert(!otherRow, 'absent from a table ranked around a different subject (globally thinned)');
  });

  test('PL none: rank is subject-INDEPENDENT (no thinning → exemption is a no-op)', () => {
    const moatB = computeRankAtPoint(expensive, lat, lng, crews, effectiveKeepFraction('none')).rank;
    const subjB = rankIncident(crews, lat, lng, 'none', null, expensive).find(r => r.crew.id === expensive.id);
    const subjOther = rankIncident(crews, lat, lng, 'none', null, cheap).find(r => r.crew.id === expensive.id);
    assert(subjB && subjOther, 'B present under either subject at PL none');
    eq(subjB.rank, moatB, 'subject=B matches moat');
    eq(subjOther.rank, moatB, 'subject=other ALSO matches moat (no thinning → subject irrelevant)');
  });

  test('time filter: subject hidden when unreachable is NOT a contradiction', () => {
    const plat = expensive.lat + 6, plng = expensive.lng + 6;
    const rows = rankIncident(crews, plat, plng, 'none', 6, expensive);
    assert(!rows.some(r => r.crew.id === expensive.id), 'subject correctly hidden by the time filter');
  });
}

/* ---- run ---- */
export async function runCoverageTests() {
  const crews = await (await fetch('../crews.json')).json();
  selectionTests(crews);
  footprintTests(crews);
  duoTests();
  consistencyTests(crews);

  const results = [];
  for (const { name, fn } of cases) {
    try { fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, err: e.message }); }
  }
  return results;
}
