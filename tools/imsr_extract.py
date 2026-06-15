#!/usr/bin/env python3
"""
imsr_extract.py - OFFLINE, validation-only IMSR text -> normalized JSON extractor.

Stage B of a two-stage offline pipeline:
    Stage A  imsr_pdf_to_text.py   PDF -> text layer (uses pypdf; one-time)
    Stage B  imsr_extract.py       text -> normalized JSON   <-- this file

This is the part whose accuracy we actually care about: turning messy report
text into the three normalized buckets used by the IMSR scaffold. It is
deliberately STDLIB-ONLY so it runs anywhere with `python3` and no installs.

IMPORTANT / CONSERVATIVE BY DESIGN:
  * Output is UNVERIFIED machine output. is_fixture=false, verification=null.
  * A populated field is NOT a correct field. Always diff against a
    hand-verified fixture (see tools/imsr_diff.py) before trusting anything.
  * Nothing here touches the live app. Not wired in. Flag stays OFF.

Usage:
    python3 tools/imsr_extract.py [INPUT.txt] [--out OUTPUT.json]
Defaults:
    INPUT  = tests/imsr/source/imsr-2026-06-12.txt
    OUTPUT = tests/imsr/out/imsr-2026-06-12-extracted.json
"""
import argparse
import datetime as dt
import json
import os
import re
import sys

PARSER_VERSION = "imsr_extract.py 0.2.0"
# v0.2.0 (drift-hardening, motivated by the 2024-07-29 / 2024-09-30 / 2025-08-27
# test reports; see tests/imsr/out/imsr-cross-date-summary.md):
#   1. National 'Total' row: allow commas in the crews/engines/helicopters
#      columns (2024-07-29 had engines "1,625", which v0.1.0 failed to parse).
#   2. Broaden the unit-code pattern to allow digits (OR-721S, OR-973S, MT-LG25,
#      NV-HUMX) so those incident rows are no longer dropped.
#   3. Repair one-line wrapped incident names (e.g. "Willamette" + "Complex ...").
#   4. Strip leading "* "/"+ " new-incident markers from names.
# These only AFFECT extraction; they do not touch the app. The 2026-06-12 full
# comparison stays 126/126 (regression-checked).

MONTHS = {m: i + 1 for i, m in enumerate([
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"])}

# Full geographic-area name (as it appears in a section header) -> GACC
# abbreviation (as used in the page-1 Active Incident Resource Summary).
AREA_TO_GACC = {
    "Alaska": "AICC",
    "Northwest": "NWCC",
    "Northern California": "ONCC",
    "Southern California": "OSCC",
    "Northern Rockies": "NRCC",
    "Great Basin": "GBCC",
    "Southwest": "SWCC",
    "Rocky Mountain": "RMCC",
    "Eastern": "EACC",
    "Southern": "SACC",
}

# Containment-status tokens that anchor the numeric columns of an incident row.
CONTAIN_CODES = {"Ctn", "Comp", "UC", "UUC"}

# Incident rows begin with a name then a unit code. v0.2.0 broadens the unit to
# allow digits after the dash: standard NE-NBF, but also OR-721S, OR-973S,
# MT-LG25, NV-HUMX. The 2-letter state prefix + dash is still required, and the
# containment-anchor check below rejects non-table lines that happen to match
# (e.g. narrative "US Army HH-60 MEDEVAC Helicopters ...").
UNIT_RE = re.compile(r"^(?P<name>.+?)\s+(?P<unit>[A-Z]{2}-[A-Z0-9]{2,4})\s+(?P<rest>.+)$")
AREA_HDR_RE = re.compile(r"^(?P<area>[A-Za-z][A-Za-z ]*?)\s+Area\s+\(PL\s+(?P<pl>\d)\)")

# Table-header fragment lines (normalized: lower-cased, whitespace-collapsed).
# These repeat at the top of every incident table and must NOT be mistaken for a
# wrapped-name prefix. The line immediately above the first data row is "Own".
HEADER_FRAGMENTS = {
    "incident name unit total", "acres", "chge in", "acres % ctn/", "acres % ctn",
    "comp est total", "est total", "ctn/ comp est total", "ppl",
    "ppl crw eng heli strc", "ppl chge in", "lost $$ ctd origin", "origin",
    "origin own", "own", "total", "total acres", "% ctn/", "% ctn",
}


def _norm(s):
    return re.sub(r"\s+", " ", s).strip().lower()


def clean_name(name):
    """Strip leading new-incident markers ('* ', '+ ') and collapse whitespace."""
    return re.sub(r"\s+", " ", re.sub(r"^[*+]\s*", "", name)).strip()


def is_wrap_prefix(prev_line):
    """True if `prev_line` looks like the first part of an incident name that
    wrapped onto the next line (e.g. 'Willamette' before 'Complex OR-WIF ...').
    Conservative: alphabetic, short, not a header fragment, not a section header,
    no unit code, no terminal punctuation."""
    if not prev_line:
        return False
    s = prev_line.strip()
    if not s or any(ch.isdigit() for ch in s):
        return False
    if _norm(s) in HEADER_FRAGMENTS:
        return False
    if AREA_HDR_RE.match(s) or UNIT_RE.match(s):
        return False
    if s[-1] in ".,:;":
        return False
    return 1 <= len(s.split()) <= 3


def to_int(tok):
    """Strip commas and parse an integer, or return None if not a clean int."""
    if tok is None:
        return None
    t = tok.replace(",", "").strip()
    if re.fullmatch(r"-?\d+", t):
        return int(t)
    return None


def parse_report_date(text):
    m = re.search(r"(" + "|".join(MONTHS) + r")\s+(\d{1,2}),\s+(\d{4})", text)
    if not m:
        return None
    month, day, year = MONTHS[m.group(1)], int(m.group(2)), int(m.group(3))
    return f"{year:04d}-{month:02d}-{day:02d}"


def parse_national_pl(text):
    m = re.search(r"National Preparedness Level\s+(\d)", text)
    return int(m.group(1)) if m else None


def parse_national_totals(text, date):
    # Total row: GACC=Total, Incidents, Cumulative Acres, Crews, Engines,
    # Helicopters, Total Personnel, Change in Personnel.
    # v0.2.0: every numeric column allows commas. Peak-season reports push the
    # crews/engines/helicopters columns into the thousands (e.g. engines "1,625"
    # on 2024-07-29), which the comma-free v0.1.0 pattern silently failed to match.
    m = re.search(
        r"^Total\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+(-?[\d,]+)\s*$",
        text, re.MULTILINE)
    if not m:
        return None, ["national_totals: 'Total' summary row not found"]
    obj = {
        "date": date,
        "national_preparedness_level": parse_national_pl(text),
        "totals": {
            "crews": to_int(m.group(3)),
            "engines": to_int(m.group(4)),
            "helicopters": to_int(m.group(5)),
            "total_personnel": to_int(m.group(6)),
        },
    }
    return obj, []


def parse_lines(text, date):
    """Single pass: track the current area header, collect GACC PLs and the
    detailed incident rows beneath each header."""
    gac_pl = []
    seen_gacc = set()
    incidents = []
    warnings = []
    current_gacc = None
    current_area = None
    prev_line = None  # previous non-blank line; candidate wrapped-name prefix

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            prev_line = None
            continue

        hdr = AREA_HDR_RE.match(line)
        if hdr:
            area = hdr.group("area").strip()
            gacc = AREA_TO_GACC.get(area)
            current_area, current_gacc = area, gacc
            if gacc is None:
                warnings.append(f"gac_pl: unmapped area header '{area}'")
            elif gacc not in seen_gacc:
                seen_gacc.add(gacc)
                gac_pl.append({
                    "gacc": gacc, "gacc_name": area,
                    "preparedness_level": int(hdr.group("pl")), "date": date,
                })
            prev_line = None
            continue

        m = UNIT_RE.match(line)
        if not m:
            prev_line = line  # may be a wrapped-name prefix for the next row
            continue
        toks = m.group("rest").split()
        # Locate the containment-status anchor; bail if this isn't a data row.
        anchor = next((i for i, t in enumerate(toks) if t in CONTAIN_CODES), None)
        if anchor is None or anchor < 3 or anchor + 6 >= len(toks):
            prev_line = line  # not a real data row; keep as text candidate
            continue  # narrative/other line that happened to contain a code

        unit = m.group("unit")
        # v0.2.0: clean markers, and repair a one-line name wrap by prepending the
        # previous bare fragment (e.g. "Willamette" + "Complex OR-WIF ...").
        name = clean_name(m.group("name"))
        if is_wrap_prefix(prev_line):
            name = clean_name(prev_line + " " + name)
        prev_line = None  # this data row consumes any pending prefix
        size_acres = to_int(toks[anchor - 3])
        pct = to_int(toks[anchor - 1])
        ppl = to_int(toks[anchor + 2])
        crw = to_int(toks[anchor + 4])
        eng = to_int(toks[anchor + 5])
        heli = to_int(toks[anchor + 6])

        rec = {
            "incident_id": f"{unit}/{name}",
            "incident_name": name,
            "gacc": current_gacc,
            "state": unit[:2],
            "date": date,
            "size_acres": size_acres,
            "percent_contained": pct,
            "resources": {
                "crews": crw, "engines": eng,
                "helicopters": heli, "total_personnel": ppl,
            },
            "lat": None,
            "lng": None,
        }
        if current_gacc is None:
            warnings.append(f"incident '{name}': no enclosing area header (gacc=null)")
        if None in (size_acres, pct, ppl, crw, eng, heli):
            warnings.append(f"incident '{name}': one or more numeric fields failed to parse")
        incidents.append(rec)

    return gac_pl, incidents, warnings


def extract(text):
    date = parse_report_date(text)
    warnings = []
    if date is None:
        warnings.append("meta: report date not found")
    national, w1 = parse_national_totals(text, date)
    warnings += w1
    gac_pl, incidents, w2 = parse_lines(text, date)
    warnings += w2

    envelope = {
        "meta": {
            "source_type": "IMSR_PDF",
            "source_date": date,
            "report_label": f"IMSR — {date} (auto-extracted, UNVERIFIED)",
            "parser_version": PARSER_VERSION,
            "ingested_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "is_fixture": False,
            "notes": "Auto-extracted from the PDF text layer. UNVERIFIED machine "
                     "output - a populated field is NOT a verified field. Diff "
                     "against a hand-verified fixture before trusting anything.",
            "verification": {
                "verified_by": None, "verified_at": None,
                "verification_method": None, "verification_notes": None,
            },
        },
        "gac_pl_daily": gac_pl,
        "national_resource_totals_daily": national if national else {},
        "incident_resources_daily": incidents,
        "_extractor_warnings": warnings,
    }
    return envelope


def main(argv=None):
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap = argparse.ArgumentParser(description="Offline IMSR text -> normalized JSON")
    ap.add_argument("input", nargs="?",
                    default=os.path.join(here, "tests/imsr/source/imsr-2026-06-12.txt"))
    ap.add_argument("--out", default=os.path.join(here, "tests/imsr/out/imsr-2026-06-12-extracted.json"))
    args = ap.parse_args(argv)

    with open(args.input, encoding="utf-8") as f:
        text = f.read()
    env = extract(text)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(env, f, indent=2)
        f.write("\n")

    n_inc = len(env["incident_resources_daily"])
    n_pl = len(env["gac_pl_daily"])
    n_warn = len(env["_extractor_warnings"])
    print(f"[imsr_extract] wrote {args.out}")
    print(f"[imsr_extract] date={env['meta']['source_date']} "
          f"gac_pl={n_pl} incidents={n_inc} warnings={n_warn}")
    for w in env["_extractor_warnings"]:
        print(f"  ! {w}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
