#!/usr/bin/env python3
"""
imsr_build_live.py — build the CURATED live IMSR data file the app consumes.

Takes the already-produced offline outputs and emits a single, conservative
`imsr-live.json` at the repo root containing ONLY what has earned enough
confidence for the first live step:
  - gac_pl              : per-GACC preparedness level (complete bucket)
  - national_totals     : national committed-resource totals (for optional sit-rep thinning)
  - exact_incidents     : EXACT-tier matched incidents ONLY, keyed by UniqueFireIdentifier

Weak/ambiguous/unmatched incidents are deliberately EXCLUDED. The app loads this
file only when the IMSR-LIVE feature flag is on, and fails safe (shows nothing)
for anything missing. Re-run after regenerating the extract/match outputs.

Usage: python3 tools/imsr_build_live.py [date]   (default: today)
"""
import datetime as dt
import json
import os
import sys

# Default to TODAY (not a frozen literal) so a no-arg run targets the current day
# and fails loudly when that day's inputs are missing — instead of silently
# rebuilding a stale date and leaving the app on old data.
DATE = sys.argv[1] if len(sys.argv) > 1 else dt.date.today().isoformat()
EXTRACT = f"tests/imsr/out/imsr-{DATE}-extracted.json"
MATCH = f"tests/imsr/out/imsr-{DATE}-match.json"
OUT = "imsr-live.json"


def main():
    # Current-day data is built from that day's IMSR PDF run through the offline
    # pipeline. If those inputs are absent, stop and say so (do NOT overwrite the
    # existing OUT with a half-built/old file) so the stale state stays obvious.
    missing = [p for p in (EXTRACT, MATCH) if not os.path.exists(p)]
    if missing:
        sys.stderr.write(
            f"[imsr_build_live] no IMSR inputs for {DATE}: missing {', '.join(missing)}.\n"
            f"  Fetch that day's IMSR PDF to tests/imsr/source/imsr-{DATE}.pdf and run the\n"
            f"  offline pipeline (imsr_pdf_to_text.py -> imsr_extract.py -> imsr_match.py),\n"
            f"  or pass an available date, e.g.: python3 tools/imsr_build_live.py 2026-06-12\n"
            f"  Existing {OUT} left untouched.\n")
        return 1
    ext = json.load(open(EXTRACT))
    mat = json.load(open(MATCH))

    # gac_pl -> {GACC: PL}
    gac_pl = {r["gacc"]: r["preparedness_level"] for r in ext.get("gac_pl_daily", [])}

    # national totals (+ national PL)
    nat = ext.get("national_resource_totals_daily", {}) or {}
    national_totals = {
        "date": nat.get("date"),
        "national_preparedness_level": nat.get("national_preparedness_level"),
        **(nat.get("totals", {}) or {}),
    }

    # resources by IMSR id (to enrich the EXACT matches)
    res_by_id = {i["incident_id"]: i for i in ext.get("incident_resources_daily", [])}

    # EXACT matches only, keyed by UniqueFireIdentifier
    exact = {}
    for r in mat.get("results", []):
        if r.get("final") != "EXACT":
            continue
        ml = r.get("matched_layer") or {}
        ufi = ml.get("ufi")
        if not ufi:
            continue
        src = res_by_id.get(r["imsr_id"], {})
        rsc = src.get("resources", {}) or {}
        exact[ufi] = {
            "tier": "EXACT",
            "report_date": DATE,
            "imsr_id": r["imsr_id"],
            "imsr_name": r.get("imsr_name"),
            "layer_name": ml.get("name"),
            "state": ml.get("state"),
            "crews": rsc.get("crews"),
            "engines": rsc.get("engines"),
            "helicopters": rsc.get("helicopters"),
            "total_personnel": rsc.get("total_personnel"),
        }

    out = {
        "meta": {
            "source_date": DATE,
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "generator": "tools/imsr_build_live.py",
            "review_only": True,
            "note": ("CURATED current-day IMSR data for the live app. EXACT-tier "
                     "incidents only; weak/ambiguous/unmatched excluded. UNVERIFIED "
                     "review data — not core app truth."),
            "counts": {"gac_pl": len(gac_pl), "exact_incidents": len(exact)},
        },
        "gac_pl": gac_pl,
        "national_totals": national_totals,
        "exact_incidents": exact,
    }
    json.dump(out, open(OUT, "w"), indent=2)
    print(f"[imsr_build_live] wrote {OUT}: gac_pl={len(gac_pl)} "
          f"national_crews={national_totals.get('crews')} exact_incidents={len(exact)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
