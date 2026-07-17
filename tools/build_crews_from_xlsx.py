#!/usr/bin/env python3
"""
build_crews_from_xlsx.py — Canonical T2C crew dataset builder (stdlib only).

Reads a Type 2 Crew Rate Data .xlsx (as published for a given fiscal year) and
emits a canonical `crews_<year>.json` in the same schema as the FY2025
`crews.json`, with strict assertions. NO third-party dependencies: the .xlsx is
parsed directly as a zip of XML (zipfile + xml.etree), which preserves string
types and, crucially, the leading zeros on `HUCC Code` (e.g. "0026", never 26).
Pandas/openpyxl are intentionally avoided.

--------------------------------------------------------------------------------
EXPECTED XLSX STRUCTURE (FY2026 "2026 Type 2 Crew Rate Data.xlsx")
--------------------------------------------------------------------------------
  Sheet (first sheet):  "2026 T2C Rate Data"
  Row 1:                empty
  Row 2:                header
  Rows 3..N:            data rows (880 for FY2026)
  Column A:             empty
  Columns B..I:
    B  Company
    C  SAM UEI
    D  Agreement No.
    E  T2C Crew ID                         -> id
    F  HUCC Code                           -> hucc_code (zero-padded string)
    G  HUCC / Dispatch Zone                -> hucc_name (city only)
    H  Designated Dispatch Point Address   -> ddl
    I  Rate per Person per Hour ($)        -> rate

--------------------------------------------------------------------------------
OUTPUT SCHEMA (mirrors FY2025 crews.json + 3 added fields; Phase-2 fields are
placeholders here and are filled by the coordinate/disp-unit resolver later)
--------------------------------------------------------------------------------
  id, company, company_key, uei, agreement,
  hucc_code, hucc_name, hucc,
  disp_unit_id (null -> Phase 2), ddl, rate, base_cost,
  lat (null -> Phase 2), lng (null -> Phase 2), geo_quality ("pending" -> Phase 2),
  notes, rank, color

NB: the FY2025 crews.json has no `src_page`; the .xlsx carries no page column, so
this builder does not emit `src_page`. (A prior PDF-based build did.)

--------------------------------------------------------------------------------
NORMALIZATION STEPS
--------------------------------------------------------------------------------
  * company     : curly apostrophe (U+2019) -> straight, trimmed.
  * hucc_code   : trimmed; if all-digits, zero-padded to 4 ("0026").
  * hucc_name   : from "City, ST" -> "City" (strip trailing ", ST"); curly
                  apostrophe -> straight; contract typo "Coville" -> "Colville".
  * hucc        : f"{hucc_code} {hucc_name}".
  * ddl         : trimmed, internal whitespace collapsed.
  * rate        : round(float, 2).
  * base_cost   : round(rate * 2240, 2)      (= rate * 20 persons * 14 days * 8 h).
  * company_key : lower -> drop parentheticals -> split on `dba` (prefer text
                  BEFORE dba, else after) -> drop legal suffixes
                  (inc|llc|corp|co|ltd|lp|llp|company) as words -> non-alnum to
                  space -> collapse whitespace. Keeps single spaces. ("company"
                  is beyond the brief's list, added per user decision.)
  * rank        : sort by (rate asc, numeric id suffix asc); 1..N, ties distinct.
                  IDs are NOT zero-padded (3- and 4-digit suffixes coexist), so
                  the tiebreak is int(id[3:]), never a string sort.
  * color       : rank tiers (see YEAR config).

--------------------------------------------------------------------------------
ASSERTIONS (any failure stops the build; the output file is NOT written)
--------------------------------------------------------------------------------
  len == N; unique id == N; unique company/uei/agreement == companies;
  unique hucc_code == expected; unique ddl == expected;
  rate range == [rate_min, rate_max]; rank is a clean 1..N permutation;
  every hucc_code maps to exactly one hucc_name;
  unique company_key == companies and none empty;
  FY-prior base_cost formula holds against crews.json (rate * 2240).

--------------------------------------------------------------------------------
USAGE
--------------------------------------------------------------------------------
  python3 tools/build_crews_from_xlsx.py --year 2026 \
      --xlsx "/path/to/2026 Type 2 Crew Rate Data.xlsx" \
      --out  crews_2026.json

For a future year, add a YEARS entry with that year's expected counts / tier
boundaries / typo fixes and run with the new --xlsx/--out.
"""
import argparse
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict

# --- XML namespaces used inside an .xlsx ------------------------------------
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"

# --- YEAR-SPECIFIC CONFIG ----------------------------------------------------
# Everything that differs year-to-year lives here. Tier boundaries below are the
# FY2026 rank cutoffs derived from applying FY2025's tier percentiles to the 880
# crew field (green<=110, yellow<=230, orange<=426, red rest).
YEARS = {
    2026: {
        "sheet": "2026 T2C Rate Data",
        "companies": 119,
        "n": 880,
        "hucc_codes": 33,
        "unique_ddl": 478,
        "rate_min": 47.93,
        "rate_max": 89.00,
        # color tiers as (max_rank, color); last entry catches the rest.
        "tiers": [(110, "green"), (230, "yellow"), (426, "orange"), (10**9, "red")],
        # contract typo fixes applied to hucc_name AFTER the state suffix strip.
        "hucc_name_fixes": {"Coville": "Colville"},
    },
}

CURLY = "’"
STATE_SUFFIX_RE = re.compile(r",\s*[A-Za-z]{2}\.?\s*$")   # trailing ", OR" / ", WA."
# Brief's list is inc|llc|corp|co|ltd|lp|llp; "company" added per user decision
# (2026-07-16) so "Rocky Mountain Fire Company" -> "rocky mountain fire".
LEGAL_SUFFIX_RE = re.compile(r"\b(?:inc|llc|corp|co|ltd|lp|llp|company)\b")
DBA_SPLIT_RE = re.compile(r"(?<![a-z0-9])dba(?![a-z0-9])")
TRAIL_DIGITS_RE = re.compile(r"(\d+)$")


# --- .xlsx reader (stdlib) ---------------------------------------------------
def _col_index(cell_ref):
    """'F3' -> 6 (1-based column index)."""
    letters = re.match(r"[A-Z]+", cell_ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n


def _cell_value(c, shared):
    """Raw cell value as a string (numbers kept as their literal text)."""
    t = c.get("t")
    v = c.find(f"{NS}v")
    if t == "s":  # shared string
        return shared[int(v.text)] if v is not None else None
    if t == "inlineStr":
        is_ = c.find(f"{NS}is")
        return "".join(x.text or "" for x in is_.iter(f"{NS}t")) if is_ is not None else None
    if t == "str":  # formula string
        return v.text if v is not None else None
    return v.text if v is not None else None  # numeric/bool/etc -> literal text


def read_xlsx_rows(path, sheet_name=None):
    """Return list of {col_index: value} dicts, one per row that has cells."""
    z = zipfile.ZipFile(path)
    names = set(z.namelist())

    shared = []
    if "xl/sharedStrings.xml" in names:
        sst = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in sst.iter(f"{NS}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))

    # Resolve the target sheet's XML part via workbook rels.
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    sheets = [(s.get("name"), s.get(f"{RID}id")) for s in wb.iter(f"{NS}sheet")]
    if sheet_name is not None:
        match = [(nm, rid) for nm, rid in sheets if nm == sheet_name]
        if not match:
            raise SystemExit(f"Sheet {sheet_name!r} not found; sheets={[s[0] for s in sheets]}")
        _, rid = match[0]
    else:
        _, rid = sheets[0]

    target = "xl/worksheets/sheet1.xml"
    if "xl/_rels/workbook.xml.rels" in names:
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        id_to_target = {r.get("Id"): r.get("Target") for r in rels.iter(f"{REL}Relationship")}
        tgt = id_to_target.get(rid)
        if tgt:
            if tgt.startswith("/"):        # absolute package path, e.g. /xl/worksheets/sheet1.xml
                target = tgt.lstrip("/")
            elif tgt.startswith("xl/"):
                target = tgt
            else:                          # relative to the xl/ part
                target = "xl/" + tgt
        if target not in names:            # last-resort fallback
            target = "xl/worksheets/sheet1.xml"

    sheet = ET.fromstring(z.read(target))
    rows = []
    for row in sheet.iter(f"{NS}row"):
        cells = {}
        for c in row.iter(f"{NS}c"):
            ref = c.get("r")
            if ref:
                cells[_col_index(ref)] = _cell_value(c, shared)
        rows.append((int(row.get("r")), cells))
    return rows


# --- normalization helpers ---------------------------------------------------
def _fix_apostrophe(s):
    return s.replace(CURLY, "'") if s else s


def norm_company(raw):
    return _fix_apostrophe((raw or "").strip())


def norm_hucc_code(raw):
    s = str(raw if raw is not None else "").strip()
    return s.zfill(4) if s.isdigit() else s


def norm_hucc_name(raw_zone, fixes):
    s = _fix_apostrophe((raw_zone or "").strip())
    s = STATE_SUFFIX_RE.sub("", s).strip()
    return fixes.get(s, s)


def norm_ddl(raw):
    return re.sub(r"\s+", " ", _fix_apostrophe((raw or "").strip()))


def company_key(raw):
    s = _fix_apostrophe(raw or "").lower()
    s = re.sub(r"\([^)]*\)", " ", s)           # drop parentheticals
    parts = DBA_SPLIT_RE.split(s)              # handle "... dba ..."
    if len(parts) > 1:
        before = parts[0].strip()
        s = before if before else " ".join(parts[1:]).strip()
    s = LEGAL_SUFFIX_RE.sub(" ", s)            # drop legal suffixes as words
    s = re.sub(r"[^a-z0-9]+", " ", s)          # non-alnum -> space
    return re.sub(r"\s+", " ", s).strip()      # collapse whitespace


def color_for_rank(rank, tiers):
    for max_rank, color in tiers:
        if rank <= max_rank:
            return color
    return tiers[-1][1]


def id_sort_num(crew_id):
    m = TRAIL_DIGITS_RE.search(crew_id)
    return int(m.group(1)) if m else 0


# --- FY-prior formula validation --------------------------------------------
def validate_prior_base_cost(crews_json_path):
    """Confirm base_cost == round(rate*2240, 2) for every FY-prior record."""
    data = json.load(open(crews_json_path))
    bad = []
    for r in data:
        expect = round(r["rate"] * 2240, 2)
        if abs(r.get("base_cost", 0) - expect) > 0.005:
            bad.append((r.get("id"), r.get("rate"), r.get("base_cost"), expect))
    # spot-check the two documented examples too
    examples = {58.00: 129920.0, 57.97: 129852.8}
    ex_bad = [(k, v, round(k * 2240, 2)) for k, v in examples.items() if abs(round(k * 2240, 2) - v) > 0.005]
    return bad, ex_bad, len(data)


# --- build -------------------------------------------------------------------
def build_records(rows, cfg):
    records = []
    for rnum, cells in rows:
        if rnum < 3:  # rows 1 (empty) and 2 (header)
            continue
        # required columns B..I -> 2..9
        crew_id = (cells.get(5) or "").strip()
        if not crew_id:
            continue  # skip fully blank trailing rows
        company = norm_company(cells.get(2))
        uei = (cells.get(3) or "").strip()
        agreement = (cells.get(4) or "").strip()
        hucc_code = norm_hucc_code(cells.get(6))
        hucc_name = norm_hucc_name(cells.get(7), cfg["hucc_name_fixes"])
        ddl = norm_ddl(cells.get(8))
        rate = round(float(cells.get(9)), 2)
        rec = {
            "id": crew_id,
            "company": company,
            "company_key": company_key(company),
            "uei": uei,
            "agreement": agreement,
            "hucc_code": hucc_code,
            "hucc_name": hucc_name,
            "hucc": f"{hucc_code} {hucc_name}",
            "disp_unit_id": None,          # Phase 2
            "ddl": ddl,
            "rate": rate,
            "base_cost": round(rate * 2240, 2),
            "lat": None,                   # Phase 2
            "lng": None,                   # Phase 2
            "geo_quality": "pending",      # Phase 2
            "notes": "",
            "rank": None,                  # set below
            "color": None,                 # set below
        }
        records.append(rec)

    # rank by (rate asc, numeric id asc); assign 1..N and color tiers.
    records.sort(key=lambda r: (r["rate"], id_sort_num(r["id"])))
    for i, r in enumerate(records, 1):
        r["rank"] = i
        r["color"] = color_for_rank(i, cfg["tiers"])
    return records


def run_assertions(records, cfg, prior_path):
    failures = []
    report = {}

    def check(name, cond, detail=""):
        report[name] = "PASS" if cond else f"FAIL {detail}"
        if not cond:
            failures.append(f"{name}: {detail}")

    n = cfg["n"]
    ids = [r["id"] for r in records]
    check("length == %d" % n, len(records) == n, f"got {len(records)}")
    check("unique id == %d" % n, len(set(ids)) == n, f"got {len(set(ids))}")
    check("unique company == %d" % cfg["companies"],
          len({r["company"] for r in records}) == cfg["companies"],
          f"got {len({r['company'] for r in records})}")
    check("unique uei == %d" % cfg["companies"],
          len({r["uei"] for r in records}) == cfg["companies"],
          f"got {len({r['uei'] for r in records})}")
    check("unique agreement == %d" % cfg["companies"],
          len({r["agreement"] for r in records}) == cfg["companies"],
          f"got {len({r['agreement'] for r in records})}")
    check("unique hucc_code == %d" % cfg["hucc_codes"],
          len({r["hucc_code"] for r in records}) == cfg["hucc_codes"],
          f"got {len({r['hucc_code'] for r in records})}")
    check("unique ddl == %d" % cfg["unique_ddl"],
          len({r["ddl"] for r in records}) == cfg["unique_ddl"],
          f"got {len({r['ddl'] for r in records})}")

    rates = [r["rate"] for r in records]
    check("rate range == [%s, %s]" % (cfg["rate_min"], cfg["rate_max"]),
          min(rates) == cfg["rate_min"] and max(rates) == cfg["rate_max"],
          f"got [{min(rates)}, {max(rates)}]")

    ranks = sorted(r["rank"] for r in records)
    check("rank is clean 1..%d permutation" % n, ranks == list(range(1, n + 1)),
          "gaps/repeats present")

    # every hucc_code -> exactly one hucc_name
    code_to_names = defaultdict(set)
    for r in records:
        code_to_names[r["hucc_code"]].add(r["hucc_name"])
    multi = {c: sorted(v) for c, v in code_to_names.items() if len(v) > 1}
    check("each hucc_code -> one hucc_name", not multi, f"offenders={multi}")

    keys = [r["company_key"] for r in records]
    empt = [r["id"] for r in records if not r["company_key"]]
    check("unique company_key == %d" % cfg["companies"],
          len(set(keys)) == cfg["companies"],
          f"got {len(set(keys))}")
    check("no empty company_key", not empt, f"empty for ids={empt[:10]}")

    # FY-prior base_cost formula
    bad, ex_bad, prior_n = validate_prior_base_cost(prior_path)
    check("prior base_cost = rate*2240 (all %d)" % prior_n, not bad,
          f"{len(bad)} mismatches, e.g. {bad[:3]}")
    check("base_cost examples (58.00, 57.97)", not ex_bad, f"{ex_bad}")

    return report, failures


def main():
    ap = argparse.ArgumentParser(description="Build canonical crews_<year>.json from a T2C rate XLSX.")
    ap.add_argument("--year", type=int, default=2026)
    ap.add_argument("--xlsx", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--prior", default="crews.json",
                    help="FY-prior crews.json used to validate the base_cost formula.")
    args = ap.parse_args()

    if args.year not in YEARS:
        raise SystemExit(f"No YEARS config for {args.year}; add one first.")
    cfg = YEARS[args.year]

    rows = read_xlsx_rows(args.xlsx, cfg["sheet"])
    records = build_records(rows, cfg)
    report, failures = run_assertions(records, cfg, args.prior)

    print(f"=== build_crews_from_xlsx.py  year={args.year}  records={len(records)} ===")
    for name, status in report.items():
        print(f"  [{status.split()[0]:4}] {name}" + ("" if status == "PASS" else f"   -> {status}"))

    # color distribution (informational)
    from collections import Counter
    dist = Counter(r["color"] for r in records)
    print("  color distribution:", dict(dist))

    if failures:
        print("\n!!! ASSERTION FAILURE(S) — output NOT written:")
        for f in failures:
            print("   -", f)
        sys.exit(1)

    with open(args.out, "w") as fh:
        json.dump(records, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(f"\nOK — wrote {args.out} ({len(records)} records). All assertions passed.")


if __name__ == "__main__":
    main()
