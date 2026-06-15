#!/usr/bin/env python3
"""Build gacc_regions.geojson — one dissolved region polygon per GACC.

The "GACC regions" zone view needs a clean outer boundary per region. The source
dispatch_zones.geojson is NOT a clean planar partition: across some GACCs the
dispatch-zone polygons are stored as many disjoint fragments with sub-km gaps and
slightly non-conforming shared edges. A runtime edge-cancellation dissolve therefore
leaves leftover internal seam fragments. Instead we dissolve OFFLINE with shapely:

  1. union all dispatch-zone polygons that share a GACCAbbreviation,
  2. drop sliver PARTS and sliver HOLES (< REL of the region's largest part) — these
     are the non-conforming-edge artifacts that would render as internal lines,
     while real geography (mainland + major islands) is always >> REL and is kept.

The result: each GACC is one Polygon/MultiPolygon with 0 holes, so the normal zone
stroke draws a single clean outline with no internal dispatch-center seams.

NOTE: crew->GACC membership is computed at RUNTIME by point-in-polygon against the
full dispatch_zones.geojson (see js/ui.js buildCrewGacc), NOT against this file, so
dropping minor islands here never drops a crew from a region's list.

Regenerate whenever dispatch_zones.geojson changes:
    python3 -m pip install shapely
    python3 tools/build_gacc_regions.py
"""
import json
import os
from collections import defaultdict

from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import unary_union

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "dispatch_zones.geojson")
OUT = os.path.join(ROOT, "gacc_regions.geojson")
REL = 0.01  # keep parts/holes >= 1% of the region's largest part; below = sliver


def clean(geom):
    polys = list(geom.geoms) if geom.geom_type == "MultiPolygon" else [geom]
    thr = max(p.area for p in polys) * REL
    kept = []
    for poly in polys:
        if poly.area < thr:
            continue  # drop sliver part
        holes = [r for r in poly.interiors if Polygon(r).area >= thr]  # drop sliver holes
        kept.append(Polygon(poly.exterior, holes))
    kept.sort(key=lambda p: p.area, reverse=True)
    return kept[0] if len(kept) == 1 else MultiPolygon(kept)


def round_coords(o):
    if isinstance(o, float):
        return round(o, 6)
    if isinstance(o, list):
        return [round_coords(x) for x in o]
    if isinstance(o, dict):
        return {k: round_coords(v) for k, v in o.items()}
    return o


def main():
    src = json.load(open(SRC))
    geoms, members = defaultdict(list), defaultdict(list)
    for f in src["features"]:
        p = f["properties"]
        g = p.get("GACCAbbreviation", "") or ""
        gm = shape(f["geometry"])
        if not gm.is_valid:
            gm = gm.buffer(0)  # fix self-touch / bowtie before union
        geoms[g].append(gm)
        if p.get("DispUnitID"):
            members[g].append(p["DispUnitID"])

    feats = []
    for g in sorted(geoms):
        u = unary_union(geoms[g])
        if not u.is_valid:
            u = u.buffer(0)
        cu = clean(u)
        feats.append({
            "type": "Feature",
            "properties": {"GACCAbbreviation": g, "DispUnitIDs": sorted(set(members[g]))},
            "geometry": mapping(cu),
        })

    json.dump(round_coords({"type": "FeatureCollection", "features": feats}), open(OUT, "w"))
    print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes, {len(feats)} regions)")


if __name__ == "__main__":
    main()
