#!/usr/bin/env python3
"""
resolve_coords.py — Fill disp_unit_id + lat/lng/geo_quality for a crews_<year>.json.

Two data sources, in priority order:
  1. disp_unit_id  : mapped from a prior year's crews.json (authoritative HUCC ->
                     disp_unit_id table). Any hucc_code missing from the prior year
                     is reported and left null (build stops on --write).
  2. lat/lng       : carried over from the prior year by normalized-address match
                     (exact, then a guarded near-match), else geocoded externally.

Address normalizer (both years): lowercase; strip punctuation; standardize street
suffixes + directionals; ZIP -> 5 digits; expand a full state NAME to its
abbreviation ONLY in the state slot (token before the trailing ZIP) so city/street
words like "Idaho Falls" / "Old Oregon Trail" survive intact.

Near-match (only when exact fails): same (house, zip5) AND no leading-directional
swap AND every street-name word pairs within edit-distance 2 to one on the other
side (rejects "E Center St" vs "E Central" and "N 105 N" vs "E 105 N").

geo_quality values written:
  carried_2025:<orig>     coords reused from the prior year's record
  geocodio:<accuracy_type> coords freshly geocoded (via --geocoded map)
  geocode_failed / geocode_out_of_range:<lat,lng>   reported, never zeroed

CONUS validation: lat in [24.5, 49.5], lng in [-125, -66.9].

USAGE
  # 1) dry-run report + emit the unique raw addresses that still need geocoding
  python3 tools/resolve_coords.py --in crews_2026.json --prior crews.json \
      --emit-unresolved scratchpad/unresolved.json

  # 2) after geocoding those into a {address: {lat,lng,accuracy_type}} JSON:
  python3 tools/resolve_coords.py --in crews_2026.json --prior crews.json \
      --geocoded scratchpad/geocoded.json --write
"""
import argparse, json, re, sys
from collections import defaultdict, Counter

FULL = {'alabama':'al','alaska':'ak','arizona':'az','arkansas':'ar','california':'ca','colorado':'co',
'connecticut':'ct','delaware':'de','florida':'fl','georgia':'ga','hawaii':'hi','idaho':'id','illinois':'il',
'indiana':'in','iowa':'ia','kansas':'ks','kentucky':'ky','louisiana':'la','maine':'me','maryland':'md',
'massachusetts':'ma','michigan':'mi','minnesota':'mn','mississippi':'ms','missouri':'mo','montana':'mt',
'nebraska':'ne','nevada':'nv','ohio':'oh','oklahoma':'ok','oregon':'or','pennsylvania':'pa','tennessee':'tn',
'texas':'tx','utah':'ut','vermont':'vt','virginia':'va','washington':'wa','wisconsin':'wi','wyoming':'wy'}
ABBR = set(FULL.values())
SUF = {'street':'st','avenue':'ave','av':'ave','boulevard':'blvd','drive':'dr','road':'rd','lane':'ln',
'court':'ct','place':'pl','circle':'cir','terrace':'ter','highway':'hwy','parkway':'pkwy','trail':'trl',
'tr':'trl','route':'rte','square':'sq','bypass':'byp'}
SUFSET = set(SUF.values())
DIR = {'north':'n','south':'s','east':'e','west':'w','northeast':'ne','northwest':'nw','southeast':'se','southwest':'sw'}
DIRS = set(DIR.values())
CONUS = (24.5, 49.5, -125.0, -66.9)  # lat_min, lat_max, lng_min, lng_max


def norm(a):
    s = (a or "").lower().replace("’", "'")
    s = re.sub(r"[.,#]", " ", s)
    s = re.sub(r"[^a-z0-9\s'-]", " ", s)
    toks = [SUF.get(t, DIR.get(t, t)) for t in s.split()]
    for i, t in enumerate(toks):
        m = re.match(r'(\d{5})-\d{4}$', t)
        if m:
            toks[i] = m.group(1)
    for i in range(len(toks) - 1):
        if re.match(r'\d{5}$', toks[i + 1]) and toks[i] in FULL:
            toks[i] = FULL[toks[i]]
    return " ".join(toks)


def hz(n):
    t = n.split()
    h = t[0] if t and t[0].isdigit() else None
    z = None
    for x in reversed(t):
        if re.match(r'\d{5}$', x):
            z = x
            break
    return h, z


def ed(a, b):
    if a == b:
        return 0
    m, k = len(a), len(b)
    d = list(range(k + 1))
    for i in range(1, m + 1):
        p = d[0]; d[0] = i
        for j in range(1, k + 1):
            t = d[j]; d[j] = min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] != b[j - 1])); p = t
    return d[k]


def names_dir(n, h, z):
    toks = [t for i, t in enumerate(n.split()) if not (i == 0 and t == h) and t != z]
    if toks and len(toks[-1]) == 2 and toks[-1] in ABBR:
        toks.pop()
    names = [t for t in toks if t not in SUFSET and t not in DIRS]
    dirs = [t for t in toks if t in DIRS]
    return names, (dirs[0] if dirs else None)


def near_ok(n26, n25, h, z):
    nm26, ld26 = names_dir(n26, h, z)
    nm25, ld25 = names_dir(n25, h, z)
    if ld26 and ld25 and ld26 != ld25:
        return False
    paired = lambda a, b: all(any(ed(x, y) <= 2 for y in b) for x in a)
    return paired(nm26, nm25) and paired(nm25, nm26)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="infile", required=True)
    ap.add_argument("--prior", required=True)
    ap.add_argument("--geocoded", help="JSON map: raw_ddl -> {lat,lng,accuracy_type}")
    ap.add_argument("--emit-unresolved", help="write unique raw addresses still needing geocoding")
    ap.add_argument("--write", action="store_true", help="write resolved crews back to --in")
    args = ap.parse_args()

    prior = json.load(open(args.prior))
    crews = json.load(open(args.infile))

    # 1) authoritative hucc_code -> disp_unit_id
    code_unit = {}
    for r in prior:
        code_unit.setdefault(r["hucc_code"], r.get("disp_unit_id"))
    missing_codes = sorted({r["hucc_code"] for r in crews if not code_unit.get(r["hucc_code"])})

    # 2) prior-year address index
    exact = {}          # norm -> (lat,lng,geo_quality)
    byhz = defaultdict(list)   # (house,zip) -> [(norm, lat,lng,geo_quality)]
    for r in prior:
        lat, lng, gq = r.get("lat"), r.get("lng"), r.get("geo_quality")
        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            continue
        n = norm(r["ddl"]); exact.setdefault(n, (lat, lng, gq))
        h, z = hz(n)
        if h and z:
            byhz[(h, z)].append((n, lat, lng, gq))

    geocoded = json.load(open(args.geocoded)) if args.geocoded else {}

    stats = Counter()
    unresolved_raw = {}   # raw ddl -> None (unique)
    oob = []              # out-of-range / failed
    for r in crews:
        r["disp_unit_id"] = code_unit.get(r["hucc_code"])
        raw = r["ddl"]; n = norm(raw); h, z = hz(n)
        lat = lng = gq = None
        if n in exact:
            lat, lng, oq = exact[n]; gq = f"carried_2025:{oq}"; stats["exact"] += 1
        else:
            hit = next((c for c in byhz.get((h, z), []) if near_ok(n, c[0], h, z)), None)
            if hit:
                lat, lng, oq = hit[1], hit[2], hit[3]; gq = f"carried_2025:{oq}"; stats["near"] += 1
            elif raw in geocoded and isinstance(geocoded[raw].get("lat"), (int, float)):
                g = geocoded[raw]; lat, lng = g["lat"], g["lng"]
                gq = f"geocodio:{g.get('accuracy_type','?')}"; stats["geocoded"] += 1
            else:
                stats["unresolved"] += 1; unresolved_raw[raw] = None
        # CONUS validation for anything we set
        if lat is not None:
            if not (CONUS[0] <= lat <= CONUS[1] and CONUS[2] <= lng <= CONUS[3]):
                oob.append((r["id"], raw, lat, lng, gq)); gq = f"geocode_out_of_range:{lat},{lng}"
        r["lat"] = lat; r["lng"] = lng
        r["geo_quality"] = gq if gq else "pending"

    print("=== resolve_coords report ===")
    print("hucc_codes with NO disp_unit_id in prior year:", missing_codes or "none")
    print("carry(exact):", stats["exact"], "| carry(near):", stats["near"],
          "| geocoded:", stats["geocoded"], "| unresolved:", stats["unresolved"])
    print("unique raw addresses still needing geocoding:", len(unresolved_raw))
    print("geo_quality distribution:", dict(Counter(r["geo_quality"] for r in crews)))
    if oob:
        print("OUT-OF-RANGE / failed coords (reported, not zeroed):")
        for x in oob:
            print("  ", x)

    if args.emit_unresolved:
        json.dump(sorted(unresolved_raw), open(args.emit_unresolved, "w"), indent=2, ensure_ascii=False)
        print("wrote unresolved addresses ->", args.emit_unresolved)

    if args.write:
        if missing_codes:
            sys.exit(f"REFUSING to write: {len(missing_codes)} hucc_codes lack a disp_unit_id: {missing_codes}")
        if stats["unresolved"]:
            sys.exit(f"REFUSING to write: {stats['unresolved']} crews still unresolved (geocode them first).")
        if oob:
            sys.exit(f"REFUSING to write: {len(oob)} out-of-range coords need review.")
        json.dump(crews, open(args.infile, "w"), indent=2, ensure_ascii=False)
        open(args.infile, "a").write("\n")
        print("WROTE", args.infile)


if __name__ == "__main__":
    main()
