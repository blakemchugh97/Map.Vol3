#!/usr/bin/env python3
"""
geocode_geocodio.py — Batch-geocode a list of addresses via the Geocodio API.

Sends ONE batch POST to https://api.geocod.io/v1.7/geocode. TLS is verified
against an explicit CA bundle (--ca). The API key is read from a file (--key-file)
so it never appears in the command line, output, or the emitted result map.

INPUT   --addresses  JSON list of raw address strings.
KEY     --key-file   file containing only the Geocodio API key.
OUTPUT  --out        JSON map: address -> {lat, lng, accuracy, accuracy_type}
                     (only successful geocodes; failures are reported, not written).

USAGE
  python3 tools/geocode_geocodio.py \
      --addresses scratchpad/unresolved.json \
      --key-file  scratchpad/geocodio_key.txt \
      --out       scratchpad/geocoded.json \
      --ca /etc/ssl/cert.pem
"""
import argparse, json, ssl, sys, urllib.request, urllib.error, socket
from collections import Counter

API = "https://api.geocod.io/v1.7/geocode"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--addresses", required=True)
    ap.add_argument("--key-file", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--ca", default="/etc/ssl/cert.pem")
    ap.add_argument("--timeout", type=int, default=180)
    args = ap.parse_args()

    addresses = json.load(open(args.addresses))
    key = open(args.key_file).read().strip()
    if not key:
        sys.exit("empty API key")

    ctx = ssl.create_default_context(cafile=args.ca)
    socket.setdefaulttimeout(args.timeout)
    body = json.dumps(addresses).encode()
    req = urllib.request.Request(
        f"{API}?api_key={key}", data=body,
        headers={"Content-Type": "application/json"}, method="POST")

    print(f"POST {API} — batch of {len(addresses)} addresses (TLS verified via {args.ca}) ...")
    try:
        with urllib.request.urlopen(req, context=ctx) as r:
            payload = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"Geocodio HTTP {e.code} {e.reason}: {e.read()[:400].decode(errors='replace')}")

    results = payload.get("results", [])
    out, failures, oob = {}, [], []
    acc = Counter()
    for item in results:
        q = item.get("query")
        matches = (item.get("response") or {}).get("results") or []
        if not matches:
            failures.append(q); continue
        best = matches[0]
        loc = best.get("location") or {}
        lat, lng = loc.get("lat"), loc.get("lng")
        atype = best.get("accuracy_type", "?")
        if not isinstance(lat, (int, float)) or not isinstance(lng, (int, float)):
            failures.append(q); continue
        out[q] = {"lat": lat, "lng": lng, "accuracy": best.get("accuracy"), "accuracy_type": atype}
        acc[atype] += 1
        if not (24.5 <= lat <= 49.5 and -125.0 <= lng <= -66.9):
            oob.append((q, lat, lng))

    json.dump(out, open(args.out, "w"), indent=2, ensure_ascii=False)
    print(f"geocoded OK: {len(out)} / {len(addresses)}   (failures: {len(failures)})")
    print("accuracy_type distribution:", dict(acc))
    if oob:
        print(f"OUT-OF-CONUS results ({len(oob)}) — will be flagged, not written as coords:")
        for x in oob: print("  ", x)
    if failures:
        print(f"FAILED to geocode ({len(failures)}):")
        for q in failures: print("  ", q)
    print("wrote ->", args.out)


if __name__ == "__main__":
    main()
