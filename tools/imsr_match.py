#!/usr/bin/env python3
"""
imsr_match.py — OFFLINE IMSR-incident <-> incident-point-layer cross-check.

NOT app integration. Stdlib only. Reads:
  1. an IMSR extracted JSON (tests/imsr/out/imsr-<date>-extracted.json), and
  2. an ArcGIS layer snapshot JSON (the incident point source the map uses:
     USA_Wildfires_v1/0 -> tests/imsr/incident_layer/wfigs-*.json),
normalizes both, scores each IMSR row against every layer record with EXPLICIT
tiered rules, and writes machine + human match reports.

The point: an IMSR row is only a trustworthy map-enrichment candidate when it is
corroborated by the real incident layer. Weak/ambiguous links are labeled as
such; matches are never silently forced. See the matching spec in
tests/imsr/MATCHING_SPEC.md.

Usage:
  imsr_match.py <extracted.json> [layer_snapshot.json]
                [--out-json OUT] [--out-md OUT] [--quiet]
"""
import argparse
import datetime as dt
import json
import re
import sys

DEFAULT_LAYER = "tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-12.json"

# Tiers, best -> worst.
EXACT, STRONG, WEAK, AMBIGUOUS, NO_MATCH = "EXACT", "STRONG", "WEAK", "AMBIGUOUS", "NO_MATCH"
NAME_STOPWORDS = {"complex", "fire", "fires"}
FUZZY_THRESHOLD = 0.60   # token-set Jaccard for a "fuzzy" name hit
YEAR_TOLERANCE = 1       # |reportYear - fireYear| <= this is allowed (carryover)


# ---------------------------------------------------------------- normalization
def norm_name_tokens(s):
    """Lowercase, drop '* '/'+ ' markers, '(2 fires)', punctuation, and the
    stopwords complex/fire(s). Returns a token list used for name comparison."""
    s = s or ""
    s = re.sub(r"^[*+]\s*", "", s)         # new-incident marker
    s = re.sub(r"\(.*?\)", " ", s)         # parentheticals like "(2 fires)"
    s = s.lower()
    s = re.sub(r"[^a-z0-9 ]", " ", s)      # punctuation -> space
    return [t for t in s.split() if t and t not in NAME_STOPWORDS]


def name_key(s):
    return " ".join(norm_name_tokens(s))


def norm_unit_imsr(u):
    """IMSR unit 'NE-NBF' -> 'NENBF' to compare with a UFI unit segment."""
    return re.sub(r"[^A-Z0-9]", "", (u or "").upper())


def parse_ufi(ufi):
    """UniqueFireIdentifier 'YYYY-UNIT-NNNN' -> (year, unit, number)."""
    parts = (ufi or "").split("-")
    if len(parts) >= 3:
        return parts[0], parts[1].upper(), "-".join(parts[2:])
    return None, None, None


def norm_state(s):
    return (s or "").upper().replace("US-", "").strip()[:2]


def year_of(date_str):
    m = re.match(r"(\d{4})", str(date_str or ""))
    return m.group(1) if m else None


def jaccard(a, b):
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


# ----------------------------------------------------------------- loading data
def load_imsr(path):
    d = json.load(open(path))
    report_year = year_of(d.get("meta", {}).get("source_date"))
    rows = []
    for inc in d.get("incident_resources_daily", []) or []:
        iid = inc.get("incident_id", "")
        unit = iid.split("/", 1)[0] if "/" in iid else ""
        name = inc.get("incident_name", "")
        rows.append({
            "imsr_id": iid,
            "imsr_name": name,
            "_name_toks": norm_name_tokens(name),
            "_name_key": name_key(name),
            "_unit": norm_unit_imsr(unit),
            "_state": norm_state(inc.get("state")),
            "_year": year_of(inc.get("date")) or report_year,
        })
    return rows, d.get("meta", {})


def load_layer(path):
    d = json.load(open(path))
    recs = []
    for f in d.get("features", []) or []:
        a = f.get("attributes", {})
        g = f.get("geometry", {}) or {}
        yr, unit, num = parse_ufi(a.get("UniqueFireIdentifier"))
        name = a.get("IncidentName", "")
        recs.append({
            "oid": a.get("OBJECTID"),
            "ufi": a.get("UniqueFireIdentifier"),
            "layer_name": name,
            "_name_toks": norm_name_tokens(name),
            "_name_key": name_key(name),
            "_unit": (unit or ""),
            "_state": norm_state(a.get("POOState")),
            "_year": yr,
            "gacc": a.get("GACC"),
            "type": a.get("IncidentTypeCategory"),
            "acres": a.get("DailyAcres"),
            "lat": g.get("y"),
            "lng": g.get("x"),
        })
    return recs


# -------------------------------------------------------------------- scoring
def signals(im, la):
    nk_i, nk_l = im["_name_key"], la["_name_key"]
    name_exact = bool(nk_i) and nk_i == nk_l
    jac = jaccard(im["_name_toks"], la["_name_toks"])
    name_fuzzy = name_exact or jac >= FUZZY_THRESHOLD
    unit_match = bool(im["_unit"]) and im["_unit"] == la["_unit"]
    state_match = bool(im["_state"]) and im["_state"] == la["_state"]
    year_ok = (im["_year"] is not None and la["_year"] is not None
               and abs(int(im["_year"]) - int(la["_year"])) <= YEAR_TOLERANCE)
    # Both states known AND different = positive evidence AGAINST a match.
    state_conflict = bool(im["_state"]) and bool(la["_state"]) and im["_state"] != la["_state"]
    return {"name_exact": name_exact, "name_jaccard": round(jac, 3),
            "name_fuzzy": name_fuzzy, "unit_match": unit_match,
            "state_match": state_match, "state_conflict": state_conflict, "year_ok": year_ok}


def tier_for(sg):
    """Explicit, ordered tier rules. Conflicting evidence (different year, or
    different state) caps an otherwise-tempting link at *_CONFLICT, so cross-year
    or cross-state name coincidences are surfaced but never forced to match."""
    if not sg["year_ok"]:
        if (sg["unit_match"] and sg["name_fuzzy"]) or sg["name_exact"]:
            return "YEAR_CONFLICT"
        return NO_MATCH
    if sg["unit_match"] and sg["name_exact"] and sg["state_match"]:
        return EXACT
    if (sg["unit_match"] and sg["state_match"] and sg["name_fuzzy"]) or \
       (sg["name_exact"] and sg["state_match"]):
        return STRONG
    # WEAK = a name signal with NO contradicting state.
    if (sg["name_exact"] and not sg["state_conflict"]) or (sg["name_fuzzy"] and sg["state_match"]):
        return WEAK
    # Name matched but the states explicitly disagree -> evidence against.
    if sg["name_exact"] and sg["state_conflict"]:
        return "STATE_CONFLICT"
    return NO_MATCH


def score(sg):
    return round(0.45 * (1.0 if sg["name_exact"] else sg["name_jaccard"])
                 + 0.25 * sg["unit_match"] + 0.20 * sg["state_match"]
                 + 0.10 * sg["year_ok"], 3)


TIER_RANK = {EXACT: 5, STRONG: 4, WEAK: 3, "YEAR_CONFLICT": 2, "STATE_CONFLICT": 1, NO_MATCH: 0}


def match_one(im, layer):
    """Score one IMSR row against the whole layer; resolve to a final tier."""
    cands = []
    for la in layer:
        sg = signals(im, la)
        t = tier_for(sg)
        if t == NO_MATCH:
            continue
        cands.append({"layer": la, "signals": sg, "tier": t, "score": score(sg)})
    cands.sort(key=lambda c: (TIER_RANK[c["tier"]], c["score"]), reverse=True)

    if not cands:
        return {"final": NO_MATCH, "reason": "no name/unit signal in layer",
                "chosen": None, "candidates": []}

    best = cands[0]
    # Conflict-only candidates: refuse the match, but surface the temptation so a
    # reviewer can see WHY it was rejected (never silently dropped).
    if best["tier"] == "YEAR_CONFLICT":
        return {"final": NO_MATCH, "reason": "year_conflict (name/unit similar but years differ)",
                "chosen": None, "candidates": cands[:3]}
    if best["tier"] == "STATE_CONFLICT":
        return {"final": NO_MATCH, "reason": "state_conflict (name matched but states differ)",
                "chosen": None, "candidates": cands[:3]}

    # Ambiguity: >=2 candidates tied at the top real tier (EXACT/STRONG/WEAK).
    top = [c for c in cands if c["tier"] == best["tier"]
           and c["layer"]["oid"] != best["layer"]["oid"]]
    if best["tier"] in (EXACT, STRONG, WEAK) and top \
            and abs(top[0]["score"] - best["score"]) <= 0.05:
        return {"final": AMBIGUOUS, "reason": f">=2 competing {best['tier']} candidates",
                "chosen": best, "candidates": cands[:4]}

    return {"final": best["tier"], "reason": "best single candidate",
            "chosen": best, "candidates": cands[:3]}


# --------------------------------------------------------------------- runner
def run_match(imsr_path, layer_path):
    imsr_rows, meta = load_imsr(imsr_path)
    layer = load_layer(layer_path)

    results = []
    matched_oids = set()
    for im in imsr_rows:
        r = match_one(im, layer)
        ch = r["chosen"]
        if ch and r["final"] in (EXACT, STRONG, WEAK):
            matched_oids.add(ch["layer"]["oid"])
        results.append({
            "imsr_id": im["imsr_id"], "imsr_name": im["imsr_name"],
            "imsr_unit": im["_unit"], "imsr_state": im["_state"], "imsr_year": im["_year"],
            "final": r["final"], "reason": r["reason"],
            "score": ch["score"] if ch else 0.0,
            "signals": ch["signals"] if ch else None,
            "matched_layer": ({
                "ufi": ch["layer"]["ufi"], "name": ch["layer"]["layer_name"],
                "state": ch["layer"]["_state"], "acres": ch["layer"]["acres"],
                "lat": ch["layer"]["lat"], "lng": ch["layer"]["lng"],
            } if ch else None),
            "other_candidates": [{
                "ufi": c["layer"]["ufi"], "name": c["layer"]["layer_name"],
                "tier": c["tier"], "score": c["score"],
            } for c in r["candidates"] if not ch or c["layer"]["oid"] != ch["layer"]["oid"]][:3],
        })

    counts = {EXACT: 0, STRONG: 0, WEAK: 0, AMBIGUOUS: 0, NO_MATCH: 0}
    for r in results:
        counts[r["final"]] += 1
    total = len(results)
    matched = counts[EXACT] + counts[STRONG] + counts[WEAK]
    layer_only = [la for la in layer if la["oid"] not in matched_oids]

    # Top failure reasons (NO_MATCH / AMBIGUOUS).
    reasons = {}
    for r in results:
        if r["final"] in (NO_MATCH, AMBIGUOUS):
            reasons[r["reason"]] = reasons.get(r["reason"], 0) + 1

    return {
        "matched_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "imsr_source": imsr_path, "imsr_date": meta.get("source_date"),
        "layer_source": layer_path, "layer_records": len(layer),
        "extractor_unverified": True,
        "summary": {
            "imsr_incidents": total,
            "match_rate_pct": round(100.0 * matched / total, 1) if total else 0.0,
            "exact": counts[EXACT], "strong": counts[STRONG], "weak": counts[WEAK],
            "ambiguous": counts[AMBIGUOUS], "no_match": counts[NO_MATCH],
            "layer_only_count": len(layer_only),
        },
        "failure_reasons": dict(sorted(reasons.items(), key=lambda kv: -kv[1])),
        "results": results,
        "layer_only_sample": [{
            "ufi": la["ufi"], "name": la["layer_name"], "state": la["_state"],
            "acres": la["acres"],
        } for la in sorted(layer_only, key=lambda x: -(x["acres"] or 0))[:10]],
    }


# ------------------------------------------------------------------- markdown
def to_markdown(m):
    s = m["summary"]
    L = []
    L.append(f"# IMSR ↔ incident-layer match — {m['imsr_date']}")
    L.append("")
    L.append(f"- IMSR source: `{m['imsr_source']}`")
    L.append(f"- Layer source: `{m['layer_source']}` ({m['layer_records']} records)")
    L.append("- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**")
    L.append("")
    L.append("## Match summary")
    L.append(f"- IMSR incidents compared: **{s['imsr_incidents']}**")
    L.append(f"- Match rate (exact+strong+weak): **{s['match_rate_pct']}%**")
    L.append(f"- EXACT **{s['exact']}** · STRONG **{s['strong']}** · WEAK **{s['weak']}** "
             f"· AMBIGUOUS **{s['ambiguous']}** · NO_MATCH **{s['no_match']}**")
    L.append(f"- Layer records with no IMSR match: **{s['layer_only_count']}** "
             f"(expected — IMSR lists only large incidents)")
    L.append("")
    if m["failure_reasons"]:
        L.append("## Top failure / ambiguity reasons")
        for r, n in m["failure_reasons"].items():
            L.append(f"- {n}× — {r}")
        L.append("")
    L.append("## Per-incident result")
    L.append("")
    L.append("| IMSR incident | tier | matched layer (UFI) | score | signals |")
    L.append("|---|---|---|---|---|")
    for r in m["results"]:
        ml = r["matched_layer"]["ufi"] if r["matched_layer"] else "—"
        sg = r["signals"] or {}
        sigtxt = (f"name={'EX' if sg.get('name_exact') else sg.get('name_jaccard','-')},"
                  f"unit={'Y' if sg.get('unit_match') else 'n'},"
                  f"st={'Y' if sg.get('state_match') else 'n'},"
                  f"yr={'Y' if sg.get('year_ok') else 'n'}") if sg else "—"
        L.append(f"| {r['imsr_id']} | **{r['final']}** | {ml} | {r['score']} | {sigtxt} |")
    L.append("")
    L.append("## Largest layer incidents with NO IMSR match (sample)")
    for la in m["layer_only_sample"]:
        L.append(f"- {la['ufi']} — {la['name']} ({la['state']}, {la['acres']} ac)")
    L.append("")
    return "\n".join(L)


def main(argv):
    ap = argparse.ArgumentParser(description="Offline IMSR<->incident-layer matcher.")
    ap.add_argument("extracted")
    ap.add_argument("layer", nargs="?", default=DEFAULT_LAYER)
    ap.add_argument("--out-json")
    ap.add_argument("--out-md")
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args(argv[1:])

    m = run_match(args.extracted, args.layer)
    if args.out_json:
        json.dump(m, open(args.out_json, "w"), indent=2)
    if args.out_md:
        open(args.out_md, "w").write(to_markdown(m))
    s = m["summary"]
    if not args.quiet:
        print(f"[imsr_match] {m['imsr_date']}: {s['imsr_incidents']} IMSR rows | "
              f"rate={s['match_rate_pct']}% | EXACT={s['exact']} STRONG={s['strong']} "
              f"WEAK={s['weak']} AMBIG={s['ambiguous']} NO_MATCH={s['no_match']} | "
              f"layer_only={s['layer_only_count']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
