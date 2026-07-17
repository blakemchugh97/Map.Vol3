/* ============================================================
   compare.js — READ-ONLY FY2025 vs FY2026 cross-year diff.

   Computes purely from the two FROZEN crew arrays. Crews are joined
   by `id` ONLY — never by company name, company_key, address, or
   zone (ids are the only stable bridge across contract years; company
   names, DDPs, and even zones legitimately change year to year).

   This module imports NOTHING from the dispatch engine and never feeds
   its output back into any ranking / thinning / overlay computation.
   It only reads the frozen inputs and returns plain data for the UI.

   Truthful interpretation (per the brief): the field grew 802 -> 880,
   so a rank shift is NOT the same as a rate shift. `rate_delta` is the
   primary signal; `rank_delta` must be labeled as field-size-affected.
   ============================================================ */

const EARTH_MILES = 3958.8;
function haversine(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(s)));
}
const round = (n, d = 2) => (Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null);
function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b), m = s.length >> 1;
  return round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}

/* Per-2025-company -> the MAJORITY 2026 company among the SAME crew ids (the
   id-derived alias). null when none of that company's crews are held into 2026
   (a company that fully exited). This is how company rollups bridge the two
   years WITHOUT any fuzzy name matching. */
function buildCompanyAlias(from, toById) {
  const byCompany = new Map();
  for (const c of from) {
    if (!byCompany.has(c.company)) byCompany.set(c.company, []);
    byCompany.get(c.company).push(c.id);
  }
  const alias = new Map();
  for (const [company, ids] of byCompany) {
    const votes = new Map();
    for (const id of ids) {
      const b = toById.get(id);
      if (b) votes.set(b.company, (votes.get(b.company) || 0) + 1);
    }
    let best = null, bestN = 0;
    for (const [name, n] of votes) if (n > bestN) { best = name; bestN = n; }
    alias.set(company, best);
  }
  return alias;
}

function crewLite(c) {
  return {
    id: c.id, company: c.company, rate: c.rate, rank: c.rank, color: c.color,
    hucc: c.hucc, hucc_code: c.hucc_code, hucc_name: c.hucc_name,
    lat: c.lat, lng: c.lng, ddl: c.ddl,
  };
}

/* Build the full cross-year diff. `from` = FY2025 crews, `to` = FY2026 crews
   (both frozen). Returns { counts, held[], entered[], exited[], alias,
   companyRollup[], zoneRollup[] }. Inputs are never mutated. */
export function buildCompare(from, to) {
  const fromById = new Map(from.map((c) => [c.id, c]));
  const toById = new Map(to.map((c) => [c.id, c]));

  // Held crews (present in BOTH years) — one diff row per id.
  const held = [];
  for (const a of from) {
    const b = toById.get(a.id);
    if (!b) continue;
    const rate_delta = round(b.rate - a.rate);
    held.push({
      id: a.id,
      company_from: a.company, company_to: b.company,
      rate_from: a.rate, rate_to: b.rate, rate_delta,
      rate_pct_delta: a.rate ? round((rate_delta / a.rate) * 100) : null,
      rank_from: a.rank, rank_to: b.rank, rank_delta: b.rank - a.rank,
      color_from: a.color, color_to: b.color,
      zone_from: a.hucc_code, zone_to: b.hucc_code, zone_moved: a.hucc_code !== b.hucc_code,
      zone_name_from: a.hucc_name, zone_name_to: b.hucc_name,
      ddp_from: a.ddl, ddp_to: b.ddl, ddp_moved: a.ddl !== b.ddl,
      miles_moved: round(haversine(a.lat, a.lng, b.lat, b.lng), 1),
      // FY2026 (current) position — where the delta map layer plots this crew.
      lat: b.lat, lng: b.lng, lat_from: a.lat, lng_from: a.lng,
    });
  }

  const entered = to.filter((c) => !fromById.has(c.id)).map(crewLite);   // FY2026-only
  const exited = from.filter((c) => !toById.has(c.id)).map(crewLite);    // FY2025-only

  const alias = buildCompanyAlias(from, toById);
  const canon = (company2025) => alias.get(company2025) || company2025;

  // Company rollup, unified by the id-derived alias (2025 company -> 2026 name).
  const cAgg = new Map();
  const cGet = (k) => {
    if (!cAgg.has(k)) cAgg.set(k, { company: k, from: 0, to: 0, held: 0, entered: 0, exited: 0, deltas: [] });
    return cAgg.get(k);
  };
  for (const c of from) { const g = cGet(canon(c.company)); g.from++; if (!toById.has(c.id)) g.exited++; }
  for (const c of to) {
    const g = cGet(c.company); g.to++;
    const a = fromById.get(c.id);
    if (a) { g.held++; g.deltas.push(c.rate - a.rate); } else g.entered++;
  }
  const companyRollup = [...cAgg.values()].map((r) => ({
    company: r.company, count_from: r.from, count_to: r.to, count_delta: r.to - r.from,
    held: r.held, entered: r.entered, exited: r.exited, median_rate_delta: median(r.deltas),
  })).sort((a, b) => b.count_to - a.count_to || a.company.localeCompare(b.company));

  // Zone rollup by hucc_code: delta of the zone's MEDIAN rate + crew counts.
  const zAgg = new Map();
  const zGet = (code, name) => {
    if (!zAgg.has(code)) zAgg.set(code, { hucc_code: code, hucc_name: name, from: [], to: [] });
    const g = zAgg.get(code); if (name && !g.hucc_name) g.hucc_name = name; return g;
  };
  for (const c of from) zGet(c.hucc_code, c.hucc_name).from.push(c.rate);
  for (const c of to) zGet(c.hucc_code, c.hucc_name).to.push(c.rate);
  const zoneRollup = [...zAgg.values()].map((z) => {
    const mFrom = median(z.from), mTo = median(z.to);
    return {
      hucc_code: z.hucc_code, hucc_name: z.hucc_name,
      count_from: z.from.length, count_to: z.to.length, count_delta: z.to.length - z.from.length,
      median_rate_from: mFrom, median_rate_to: mTo,
      median_rate_delta: (mFrom != null && mTo != null) ? round(mTo - mFrom) : null,
    };
  }).sort((a, b) => a.hucc_code.localeCompare(b.hucc_code));

  return {
    counts: { from: from.length, to: to.length, held: held.length, entered: entered.length, exited: exited.length },
    held, entered, exited, alias, companyRollup, zoneRollup,
  };
}
