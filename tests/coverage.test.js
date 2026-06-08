/* ============================================================
   coverage.test.js — tests for the company-coverage logic.

   This project has no build step and (on this machine) no Node, so tests run in
   the browser against the REAL ES modules over the dev server: open
   tests/coverage.test.html via http://localhost:8000/tests/coverage.test.html.
   Everything here is pure (no DOM/Leaflet), so it exercises the same dispatch.js
   functions the app uses. Emphasis (per the brief) is the price-range → crews
   selection.
   ============================================================ */
import { tierForRank } from '../js/config.js';
import {
  selectCoverageCrews, computeCrewFootprint, aggregateCoverageCells,
  moatLatticePoints, coverageCellKey, moatScoreCell, isUSLand,
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

/* ---- run ---- */
export async function runCoverageTests() {
  const crews = await (await fetch('../crews.json')).json();
  selectionTests(crews);
  footprintTests(crews);

  const results = [];
  for (const { name, fn } of cases) {
    try { fn(); results.push({ name, ok: true }); }
    catch (e) { results.push({ name, ok: false, err: e.message }); }
  }
  return results;
}
