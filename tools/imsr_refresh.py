#!/usr/bin/env python3
"""
imsr_refresh.py — daily, server-side IMSR refresh orchestrator (CI-friendly).

The single entry point the GitHub Actions workflow
(.github/workflows/imsr-daily.yml) runs once a day. It is ADDITIVE: it only
fetches the day's inputs and drives the EXISTING offline pipeline
(imsr_pdf_to_text.py -> imsr_extract.py -> imsr_match.py -> imsr_build_live.py).
It edits none of those scripts and never runs in the browser, so the app's
startup path is untouched — the app still loads only the prebuilt imsr-live.json.

Flow:
  1. Fetch today's IMSR PDF (IMSR_PDF_URL) to a staging file.
  2. Run pdf_to_text + extract on it and read the REPORT's OWN date from the
     parse, so file naming follows the report, not the wall clock / publish lag.
  3. Copy the staged inputs/outputs to the repo's dated naming convention.
  4. Fetch a same-day incident-layer snapshot (IMSR_LAYER_URL) so imsr_match.py
     can corroborate today's incidents (its default snapshot is frozen at one day).
  5. Run match + build the live artifact (imsr-live.json at the repo root).
  6. Write a dated backup of the live artifact under tests/imsr/live_backups/.
  7. Prune dated artifacts to a 2-day window (keep today + one previous), never
     touching the active imsr-live.json or the committed validation fixtures.

Outcomes (always exit 0 for the three EXPECTED ones so a quiet source does not
paint the daily schedule red; only an unexpected pipeline error is a hard fail):
  - refreshed   : new IMSR data built; working tree has real changes to commit.
  - no-change   : source rebuilt identical data; tree restored, nothing to commit.
  - unavailable : today's PDF isn't published yet / not a PDF; tree untouched.
The chosen outcome is printed and, under Actions, written to $GITHUB_OUTPUT
(status=, date=) and appended to $GITHUB_STEP_SUMMARY.

Run locally (uses tools/.venv-imsr for the PDF step if present, else this python):
    python3 tools/imsr_refresh.py
Override sources without touching code:
    IMSR_PDF_URL=... IMSR_LAYER_URL=... python3 tools/imsr_refresh.py
"""
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --- configurable sources (env / GitHub repo variables override the defaults) ---
DEFAULT_PDF_URL = "https://www.nifc.gov/nicc/sitreprt.pdf"          # NICC daily IMSR
DEFAULT_LAYER_URL = ("https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/"
                     "services/USA_Wildfires_v1/FeatureServer/0")    # app's incident layer
PDF_URL = os.environ.get("IMSR_PDF_URL") or DEFAULT_PDF_URL
LAYER_URL = os.environ.get("IMSR_LAYER_URL") or DEFAULT_LAYER_URL
KEEP_RECENT = int(os.environ.get("IMSR_KEEP_DAYS") or "2")           # today + 1 previous

LIVE = "imsr-live.json"                                              # active app artifact (root)
BACKUP_DIR = "tests/imsr/live_backups"

# Committed validation fixtures (the cross-date test corpus) — cleanup must NEVER
# delete these. Add a date here if you add another permanent fixture.
PROTECTED_DATES = {"2024-07-29", "2024-09-30", "2025-08-27", "2026-06-12"}

# Dated artifacts under retention: (dir, filename-regex capturing the date).
DATED_PATTERNS = [
    ("tests/imsr/source", re.compile(r"^imsr-(\d{4}-\d{2}-\d{2})\.pdf$")),
    ("tests/imsr/source", re.compile(r"^imsr-(\d{4}-\d{2}-\d{2})\.txt$")),
    ("tests/imsr/out", re.compile(r"^imsr-(\d{4}-\d{2}-\d{2})-extracted\.json$")),
    ("tests/imsr/out", re.compile(r"^imsr-(\d{4}-\d{2}-\d{2})-match\.json$")),
    ("tests/imsr/out", re.compile(r"^imsr-(\d{4}-\d{2}-\d{2})-match-report\.md$")),
    ("tests/imsr/incident_layer",
     re.compile(r"^wfigs-usa-wildfires-snapshot-(\d{4}-\d{2}-\d{2})\.json$")),
    (BACKUP_DIR, re.compile(r"^imsr-live-(\d{4}-\d{2}-\d{2})\.json$")),
]

# Interpreter for the one stage that needs pypdf: prefer the local throwaway venv,
# else this interpreter (CI installs pypdf into it).
PY = sys.executable
PDF_PY = os.path.join(ROOT, "tools/.venv-imsr/bin/python")
if not os.path.exists(PDF_PY):
    PDF_PY = PY


def log(msg):
    print(f"[imsr-refresh] {msg}", flush=True)


def finish(status, date, summary):
    """Print the outcome and surface it to the workflow (outputs + job summary)."""
    log(f"STATUS: {status} — {summary}")
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a") as f:
            f.write(f"status={status}\n")
            f.write(f"date={date or ''}\n")
    gh_sum = os.environ.get("GITHUB_STEP_SUMMARY")
    if gh_sum:
        with open(gh_sum, "a") as f:
            f.write(f"**IMSR daily refresh** — `{status}`"
                    f"{f' ({date})' if date else ''}: {summary}\n")
    return 0


class Tx:
    """Tiny rollback ledger: snapshot a managed path's prior bytes BEFORE writing
    it, so a no-change / unavailable run can restore the tree exactly (and the
    workflow then commits only on a real refresh)."""

    def __init__(self):
        self._prior = {}  # abspath -> bytes | None (None = did not exist)

    def touch(self, path):
        ap = os.path.abspath(path)
        if ap in self._prior:
            return
        self._prior[ap] = open(ap, "rb").read() if os.path.exists(ap) else None

    def rollback(self):
        for ap, prior in self._prior.items():
            if prior is None:
                if os.path.exists(ap):
                    os.remove(ap)
            else:
                with open(ap, "wb") as f:
                    f.write(prior)


def http_get(url, timeout=120):
    req = urllib.request.Request(url, headers={"User-Agent": "t2c-imsr-refresh/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def run(cmd):
    log("run: " + " ".join(shlex.quote(c) for c in cmd))
    p = subprocess.run(cmd, capture_output=True, text=True)
    for ln in (p.stdout or "").strip().splitlines():
        log("  " + ln)
    if p.returncode != 0:
        for ln in (p.stderr or "").strip().splitlines():
            log("  ! " + ln)
        raise RuntimeError(f"command failed ({p.returncode}): {cmd[:3]}")
    return p


def fetch_layer_snapshot(url):
    """Pull the incident point layer as Esri JSON {features:[{attributes,geometry}]}
    — the exact shape imsr_match.py's load_layer() expects — paging through the
    server's transfer limit so the snapshot is never silently truncated.

    A pre-fetched local snapshot is honored too (a file: URL or an existing path),
    so the step works offline / for a manual run with a snapshot already on disk."""
    local = url[7:] if url.startswith("file://") else (url if os.path.exists(url) else None)
    if local:
        return json.load(open(local))
    base = url.rstrip("/")
    features, offset = [], 0
    while True:
        q = (f"{base}/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326"
             f"&f=json&resultOffset={offset}&resultRecordCount=2000")
        data = json.loads(http_get(q).decode("utf-8"))
        if "features" not in data:
            raise RuntimeError(f"layer query returned no 'features': {str(data)[:200]}")
        batch = data["features"]
        features.extend(batch)
        if data.get("exceededTransferLimit") and batch:
            offset += len(batch)
            continue
        break
    return {"features": features}


def live_canonical(raw_bytes):
    """JSON of the live file with the always-changing meta.generated_at removed,
    so 'same data, new build timestamp' is correctly treated as no change."""
    try:
        o = json.loads(raw_bytes)
        if isinstance(o.get("meta"), dict):
            o["meta"].pop("generated_at", None)
        return json.dumps(o, sort_keys=True)
    except Exception:
        return raw_bytes


def prune(keep_recent):
    """Keep PROTECTED_DATES always + the newest `keep_recent` other dates; delete
    the rest of the dated artifacts. Cannot touch the active root imsr-live.json
    (it matches no dated pattern), and skips it defensively anyway."""
    found = []  # (path, date)
    for d, rx in DATED_PATTERNS:
        full = os.path.join(ROOT, d)
        if not os.path.isdir(full):
            continue
        for fn in os.listdir(full):
            m = rx.match(fn)
            if m:
                found.append((os.path.join(full, fn), m.group(1)))
    recent = sorted({dt for _, dt in found if dt not in PROTECTED_DATES}, reverse=True)
    keep = set(recent[:keep_recent])
    deleted = []
    for path, d in found:
        if d in PROTECTED_DATES or d in keep:
            continue
        if os.path.abspath(path) == os.path.abspath(os.path.join(ROOT, LIVE)):
            continue  # never the active artifact
        os.remove(path)
        deleted.append(os.path.relpath(path, ROOT))
    log(f"retention: keep dates={sorted(keep, reverse=True)} "
        f"protected={sorted(PROTECTED_DATES)} deleted={len(deleted)}")
    for p in deleted:
        log(f"  - deleted {p}")
    return keep, deleted


def main():
    os.chdir(ROOT)  # the existing tools use repo-root-relative paths
    log(f"PDF_URL={PDF_URL}")
    log(f"LAYER_URL={LAYER_URL}")
    for d in ("tests/imsr/source", "tests/imsr/out", "tests/imsr/incident_layer", BACKUP_DIR):
        os.makedirs(d, exist_ok=True)

    tx = Tx()
    stage_pdf = "tests/imsr/source/.imsr-incoming.pdf"
    stage_txt = "tests/imsr/source/.imsr-incoming.txt"
    stage_ext = "tests/imsr/out/.imsr-incoming-extracted.json"

    try:
        # 1) Fetch today's PDF. A missing/levelled source is an EXPECTED skip.
        try:
            pdf_bytes = http_get(PDF_URL)
        except Exception as e:
            return finish("unavailable", None, f"PDF fetch failed: {e}")
        if pdf_bytes[:4] != b"%PDF":
            return finish("unavailable", None,
                          "source did not return a PDF (not yet published?)")
        with open(stage_pdf, "wb") as f:
            f.write(pdf_bytes)
        log(f"fetched PDF: {len(pdf_bytes)} bytes")

        # 2) PDF -> text -> extract (on staging), then read the report's own date.
        run([PDF_PY, "tools/imsr_pdf_to_text.py", stage_pdf, stage_txt])
        run([PY, "tools/imsr_extract.py", stage_txt, "--out", stage_ext])
        date = (json.load(open(stage_ext)).get("meta", {}) or {}).get("source_date")
        if not date or not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            return finish("unavailable", None,
                          "could not determine report date from the PDF (unparseable)")
        log(f"report date = {date}")

        # 3) Materialize the staged inputs/outputs under the dated convention.
        pdf_dated = f"tests/imsr/source/imsr-{date}.pdf"
        txt_dated = f"tests/imsr/source/imsr-{date}.txt"
        ext_dated = f"tests/imsr/out/imsr-{date}-extracted.json"
        for src, dst in ((stage_pdf, pdf_dated), (stage_txt, txt_dated), (stage_ext, ext_dated)):
            tx.touch(dst)
            shutil.copyfile(src, dst)

        # 4) Same-day incident-layer snapshot for matching.
        snap = f"tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-{date}.json"
        layer = fetch_layer_snapshot(LAYER_URL)
        tx.touch(snap)
        with open(snap, "w") as f:
            json.dump(layer, f)
        log(f"fetched layer snapshot: {len(layer['features'])} records")

        # 5) Match + build the live artifact.
        match_json = f"tests/imsr/out/imsr-{date}-match.json"
        match_md = f"tests/imsr/out/imsr-{date}-match-report.md"
        tx.touch(match_json)
        tx.touch(match_md)
        run([PY, "tools/imsr_match.py", ext_dated, snap,
             "--out-json", match_json, "--out-md", match_md])

        prev_live = open(LIVE, "rb").read() if os.path.exists(LIVE) else None
        tx.touch(LIVE)
        run([PY, "tools/imsr_build_live.py", date])
        new_live = open(LIVE, "rb").read()

        # 6) Real-change gate: ignore the always-fresh generated_at timestamp.
        if prev_live is not None and live_canonical(prev_live) == live_canonical(new_live):
            tx.rollback()  # restore tree; nothing meaningful changed
            return finish("no-change", date,
                          "rebuilt identical IMSR data — live artifact left as-is")

        # 7) Dated backup of the live artifact, then prune to the 2-day window.
        backup = f"{BACKUP_DIR}/imsr-live-{date}.json"
        shutil.copyfile(LIVE, backup)
        prune(KEEP_RECENT)
        return finish("refreshed", date,
                      f"updated {LIVE} (source_date {date}) + backup {backup}")
    finally:
        for p in (stage_pdf, stage_txt, stage_ext):
            if os.path.exists(p):
                os.remove(p)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:  # unexpected pipeline/infra error -> hard fail (visible)
        log(f"ERROR: {e}")
        sys.exit(1)
