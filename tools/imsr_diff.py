#!/usr/bin/env python3
"""
imsr_diff.py - OFFLINE comparison of extractor output vs a hand-verified
fixture. Stdlib-only. Produces a machine-readable diff (JSON) and a short
human-readable accuracy summary (Markdown).

Every comparable field is classified into exactly one of:
    exact      both sides present and equal (after numeric normalization)
    mismatch   both sides present but different values
    missing    present in the HAND-VERIFIED fixture but absent/None in the extractor
    ambiguous  present in the EXTRACTOR but not in the fixture (possible over-parse /
               "believable but wrong" hallucination), or values that only match
               after lossy normalization

CONSERVATIVE BY DESIGN: a high exact-match rate on ONE report does NOT prove the
extractor is correct. It proves it reproduced this one hand-verified sample.

Usage:
    python3 tools/imsr_diff.py [EXTRACTED.json] [VERIFIED.json] \
        [--out-json OUT.json] [--out-md OUT.md]
"""
import argparse
import datetime as dt
import json
import os
import sys

EXACT, MISMATCH, MISSING, AMBIGUOUS = "exact", "mismatch", "missing", "ambiguous"


def norm(v):
    """Normalize for comparison: ints stay ints; numeric strings (with commas)
    become ints; other strings are stripped. Returns (value, was_lossy)."""
    if isinstance(v, str):
        s = v.strip()
        t = s.replace(",", "")
        if t.lstrip("-").isdigit():
            return int(t), (s != t)  # comma-stripping counts as lossy
        return s, (s != v)
    return v, False


def classify(ext_has, ext_val, ver_has, ver_val):
    """Return (category, detail) for one field given presence + values."""
    ext_present = ext_has and ext_val is not None
    ver_present = ver_has and ver_val is not None
    if ver_present and not ext_present:
        return MISSING, {"verified": ver_val, "extracted": None}
    if ext_present and not ver_present:
        return AMBIGUOUS, {"verified": None, "extracted": ext_val, "why": "extractor produced a value the fixture lacks"}
    if not ext_present and not ver_present:
        return EXACT, {"verified": None, "extracted": None, "why": "both absent (agreement on absence)"}
    en, el = norm(ext_val)
    vn, vl = norm(ver_val)
    if en == vn:
        if el or vl:
            return AMBIGUOUS, {"verified": ver_val, "extracted": ext_val, "why": "equal only after normalization"}
        return EXACT, {"verified": ver_val, "extracted": ext_val}
    return MISMATCH, {"verified": ver_val, "extracted": ext_val}


def get(d, path):
    """(has, value) for a dotted path into nested dicts."""
    cur = d
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return False, None
    return True, cur


def diff_scalar_bucket(ext, ver, fields, results):
    for f in fields:
        eh, ev = get(ext, f)
        vh, vv = get(ver, f)
        cat, detail = classify(eh, ev, vh, vv)
        results.append({"bucket": "national_resource_totals_daily", "key": f, "category": cat, **detail})


def index_by(items, key):
    return {it.get(key): it for it in (items or []) if isinstance(it, dict)}


def diff_keyed_bucket(bucket, ext_items, ver_items, key, fields, results, listed_only=False):
    """Diff records keyed by `key`. When `listed_only` is True (the fixture
    declared its bucket is a documented SUBSET via meta._diff_incident_scope),
    extractor-only records are reported as out-of-scope extras and NOT penalized
    as ambiguous/over-parse. Returns the list of extractor-only keys."""
    ext_idx = index_by(ext_items, key)
    ver_idx = index_by(ver_items, key)
    extras = []
    for k in sorted(set(ext_idx) | set(ver_idx), key=lambda x: str(x)):
        e = ext_idx.get(k)
        v = ver_idx.get(k)
        if v is None:  # extractor produced a record the fixture lacks
            if listed_only:
                extras.append(str(k))  # outside the verified subset; informational only
            else:
                results.append({"bucket": bucket, "key": str(k), "category": AMBIGUOUS,
                                "why": "record present in extractor but not in fixture (possible over-parse)"})
            continue
        if e is None:  # fixture has a record the extractor missed
            results.append({"bucket": bucket, "key": str(k), "category": MISSING,
                            "why": "record present in fixture but not produced by extractor"})
            continue
        for f in fields:
            eh, ev = get(e, f)
            vh, vv = get(v, f)
            cat, detail = classify(eh, ev, vh, vv)
            results.append({"bucket": bucket, "key": f"{k}.{f}", "category": cat, **detail})
    return extras


def run_diff(ext, ver):
    results = []
    diff_scalar_bucket(ext, ver, [
        "national_resource_totals_daily.date",
        "national_resource_totals_daily.national_preparedness_level",
        "national_resource_totals_daily.totals.crews",
        "national_resource_totals_daily.totals.engines",
        "national_resource_totals_daily.totals.helicopters",
        "national_resource_totals_daily.totals.total_personnel",
    ], results)

    diff_keyed_bucket("gac_pl_daily",
                      ext.get("gac_pl_daily"), ver.get("gac_pl_daily"),
                      key="gacc", fields=["preparedness_level", "date"], results=results)

    scope = ver.get("meta", {}).get("_diff_incident_scope")
    listed_only = (scope == "listed_only")
    extras = diff_keyed_bucket("incident_resources_daily",
                               ext.get("incident_resources_daily"), ver.get("incident_resources_daily"),
                               key="incident_id",
                               fields=["incident_name", "gacc", "state", "size_acres", "percent_contained",
                                       "resources.crews", "resources.engines",
                                       "resources.helicopters", "resources.total_personnel"],
                               results=results, listed_only=listed_only)

    counts = {EXACT: 0, MISMATCH: 0, MISSING: 0, AMBIGUOUS: 0}
    for r in results:
        counts[r["category"]] += 1
    total = len(results)
    pct = round(100.0 * counts[EXACT] / total, 1) if total else 0.0

    return {
        "compared_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "fixture_date": ver.get("meta", {}).get("source_date"),
        "extractor_date": ext.get("meta", {}).get("source_date"),
        "extractor_unverified": ext.get("meta", {}).get("is_fixture") is False,
        "incident_scope": scope or "full",
        "extractor_extra_incidents": len(extras),
        "extractor_extra_incident_ids": extras,
        "summary": {"fields_compared": total, "exact_match_pct": pct, **counts},
        "extractor_warnings": ext.get("_extractor_warnings", []),
        "results": results,
    }


def to_markdown(diff):
    s = diff["summary"]
    lines = []
    lines.append(f"# IMSR extraction accuracy summary — {diff['fixture_date']}")
    lines.append("")
    lines.append("> **Not a correctness proof.** This compares one offline extraction against one "
                 "hand-verified fixture for a single report date. A populated field is not a verified field.")
    lines.append("")
    lines.append(f"- Fields compared: **{s['fields_compared']}**")
    lines.append(f"- Exact matches: **{s['exact']}** ({s['exact_match_pct']}%)")
    lines.append(f"- Mismatched values: **{s['mismatch']}**")
    lines.append(f"- Missing (in fixture, not extracted): **{s['missing']}**")
    lines.append(f"- Ambiguous / over-parsed (in extractor, not fixture): **{s['ambiguous']}**")
    if diff.get("incident_scope") and diff["incident_scope"] != "full":
        lines.append(f"- Incident scope: **{diff['incident_scope']}** "
                     f"(extractor produced **{diff.get('extractor_extra_incidents', 0)}** "
                     f"additional incidents outside the verified subset — informational, not penalized)")
    lines.append("")
    if diff["extractor_warnings"]:
        lines.append("## Extractor self-reported warnings")
        for w in diff["extractor_warnings"]:
            lines.append(f"- {w}")
        lines.append("")
    problems = [r for r in diff["results"] if r["category"] != EXACT]
    if problems:
        lines.append("## Non-exact fields")
        lines.append("")
        lines.append("| bucket | key | category | verified | extracted | why |")
        lines.append("|---|---|---|---|---|---|")
        for r in problems:
            lines.append(f"| {r['bucket']} | `{r['key']}` | **{r['category']}** | "
                         f"{r.get('verified')} | {r.get('extracted')} | {r.get('why','')} |")
        lines.append("")
    else:
        lines.append("_All compared fields matched exactly. Still only one sample — see caveats above._")
        lines.append("")
    return "\n".join(lines) + "\n"


def main(argv=None):
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser(description="Diff IMSR extractor output vs hand-verified fixture")
    ap.add_argument("extracted", nargs="?",
                    default=os.path.join(here, "tests/imsr/out/imsr-2026-06-12-extracted.json"))
    ap.add_argument("verified", nargs="?",
                    default=os.path.join(here, "tests/imsr/fixtures/imsr-2026-06-12-verified.json"))
    ap.add_argument("--out-json", default=os.path.join(here, "tests/imsr/out/imsr-2026-06-12-diff.json"))
    ap.add_argument("--out-md", default=os.path.join(here, "tests/imsr/out/imsr-2026-06-12-accuracy.md"))
    args = ap.parse_args(argv)

    with open(args.extracted, encoding="utf-8") as f:
        ext = json.load(f)
    with open(args.verified, encoding="utf-8") as f:
        ver = json.load(f)

    diff = run_diff(ext, ver)
    os.makedirs(os.path.dirname(args.out_json), exist_ok=True)
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump(diff, f, indent=2)
        f.write("\n")
    with open(args.out_md, "w", encoding="utf-8") as f:
        f.write(to_markdown(diff))

    s = diff["summary"]
    print(f"[imsr_diff] {args.out_json}")
    print(f"[imsr_diff] {args.out_md}")
    print(f"[imsr_diff] compared={s['fields_compared']} exact={s['exact']} "
          f"({s['exact_match_pct']}%) mismatch={s['mismatch']} missing={s['missing']} "
          f"ambiguous={s['ambiguous']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
