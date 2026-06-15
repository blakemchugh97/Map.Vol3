# IMSR validation scaffold (dev-only, isolated)

A **validation-first** harness for testing how we extract and shape data from the
NIFC **Incident Management Situation Report (IMSR)** — *before* any of it touches
the live map. This folder is deliberately walled off from the running app.

> **Status: scaffold only. Not production-ready. Nothing here is wired into the
> map.** The highest readiness state this harness can report is
> `HUMAN_VERIFIED_ONLY` — meaning *a person looked at it* — which is **not** the
> same as "safe to ship".

## Why this exists

PDF/table extraction can produce **believable but wrong** output. So step one is
*not* live integration — it's a place to feed in hand-verified JSON fixtures and
confirm they match an expected shape, with an honest readiness signal.

## Isolation guarantees

- The live app (`index.html` → `js/ui.js`) **never imports** anything in
  `tests/imsr/`. There is no code path from production into this folder.
- **Zero existing files were edited** to add this. It is purely additive.
- The feature flag (`imsr-flag.js`) is **`IMSR_ENABLED = false`** and lives here,
  not in `js/config.js`.
- Fully reversible: `rm -rf tests/imsr/` removes it with no other changes.

## Files

| File | What it is |
|------|------------|
| `imsr-schema.js`    | Normalized schema: the 3 buckets + meta/verification field specs. Pure data, no logic. |
| `imsr-validator.js` | Pure `validateImsrFixture(obj)` → report. No DOM, no app imports. |
| `imsr-flag.js`      | `IMSR_ENABLED = false` (off-by-default). Future-integration gate only. |
| `fixtures/imsr-sample.json`          | FAKE, hand-entered, fully valid + verified → `HUMAN_VERIFIED_ONLY`. |
| `fixtures/imsr-sample-partial.json`  | FAKE, parseable but incomplete → `PARTIAL`. |
| `fixtures/imsr-sample-invalid.json`  | FAKE, deliberately broken → `INVALID`. |
| `imsr-validate.html` | Standalone dev page that loads the fixtures, runs the validator, and prints a report. |

## The three data buckets

- **`gac_pl_daily`** — per-GACC preparedness level, per day.
- **`national_resource_totals_daily`** — national committed-resource totals (one object).
- **`incident_resources_daily`** — per large incident, resources committed (lat/lng nullable; geocoding not trusted yet).

Each fixture also carries a `meta` block with a **provenance / verification**
sub-block: `verified_by`, `verified_at`, `verification_method`,
`verification_notes`.

## Readiness ladder (worst → best)

| State | Meaning |
|-------|---------|
| `INVALID` | Hard structural/type errors. Do not use. |
| `PARTIAL` | Parseable but a recommended bucket is missing/empty. |
| `STRUCTURALLY_VALID` | Required shape + types present, but **no human attested** to the values. |
| `HUMAN_VERIFIED_ONLY` | Structurally valid **and** a person recorded that they checked it. Still only a human's word. |

`parse_confidence` is **structural confidence only** (capped at 0.9) — it never
claims the *values* are correct.

## How to run (manual test plan)

1. Serve the repo over HTTP (the app can't run on `file://`):
   ```bash
   cd t2c-dispatch-map
   python3 -m http.server 8000
   ```
2. Open <http://localhost:8000/tests/imsr/imsr-validate.html>.
3. Expect: **4/4 fixtures matched their expected readiness state · all green**
   - `imsr-sample.json` → `HUMAN_VERIFIED_ONLY`
   - `imsr-sample-partial.json` → `PARTIAL`
   - `imsr-sample-invalid.json` → `INVALID` (with a list of specific errors + missing fields)
   - in-memory unverified sample → `STRUCTURALLY_VALID`
4. The console also logs one summary line per fixture and a final
   `[imsr.validate] N/4 fixtures matched expected readiness`. A machine-readable
   summary is on `window.__imsrValidate`.

To experiment, edit a fixture (or add your own) and reload — the validator will
report exactly which fields are missing or mis-typed.

## Step 2 — offline extraction comparison (added later, still off-app)

A real PDF was run through an **offline** extract-and-diff pipeline to measure how
well extraction reproduces a hand-verified ground truth. Still nothing wired into
the app; everything runs by hand from `tools/`.

- **Chosen report date:** **2026-06-12** (NIFC IMSR, 0730 MDT, National PL 2).
- **Source:** `source/imsr-2026-06-12.pdf` (real) + `source/imsr-2026-06-12.txt` (its text layer).
- **Hand-verified ground truth:** `fixtures/imsr-2026-06-12-verified.json`.
- **Field mapping:** `manifest/imsr-field-manifest-2026-06-12.json`.
- **Scripts (in `tools/`):**
  - `imsr_pdf_to_text.py` — Stage A, PDF → text (needs `pypdf`; uses the gitignored `tools/.venv-imsr/`).
  - `imsr_extract.py` — Stage B, text → normalized JSON. **Stdlib-only**, runs with stock `python3`.
  - `imsr_diff.py` — diffs extractor output vs the hand-verified fixture.
- **Outputs (in `out/`):** `*-extracted.json`, `*-diff.json` (machine), `*-accuracy.md` (human).

Run it:
```bash
# Stage A (one-time; needs the venv)
python3 -m venv tools/.venv-imsr && tools/.venv-imsr/bin/pip install pypdf
tools/.venv-imsr/bin/python tools/imsr_pdf_to_text.py tests/imsr/source/imsr-2026-06-12.pdf tests/imsr/source/imsr-2026-06-12.txt
# Stage B + diff (stock python3, no installs)
python3 tools/imsr_extract.py
python3 tools/imsr_diff.py
```

Result for 2026-06-12: **126/126 fields exact**. That is *corroboration on one
report*, **not** a correctness proof — see "still unproven" below.

The diff classifies every field as `exact` / `mismatch` / `missing` / `ambiguous`.
To prove it actually catches bad output, a **negative control** (a deliberately
corrupted extraction) lives at `out/imsr-2026-06-12-extracted-DEMO-corrupted.json`;
diffing it produces `out/imsr-2026-06-12-DEMO-accuracy.md` showing detected
mismatches, a missing record, and ambiguous/over-parsed records.

### What this revealed about the schema (real findings)
- **Per-GACC PL** (`gac_pl_daily`) only exists for areas with a large-incident
  section header (`… Area (PL n)`). 6 of 10 GACCs here; NWCC/OSCC/NRCC/EACC have none.
- **`incident_resources_daily`** detail rows cover only **12** incidents, but the
  page-1 summary counts **31** active incidents — the other 19 have no resource breakdown.
- **No `overhead`** total and **no lat/lng** in the report (locations are textual only).
- **Intra-document disagreement:** ONCC summary "Crews" = 22 vs Putah detail "Crw" = 19.
- **Derived keys:** `incident_id` is synthesized as `<Unit>/<name>` (no official id exists).

## Step 3 — multi-date stress test (added later, still off-app)

The same offline pipeline was run against **three more real reports** to test
layout robustness: `2024-07-29` (PL 5, 14p), `2024-09-30` (PL 3, 8p),
`2025-08-27` (PL 4, 11p). Sources in `source/`, hand-verified fixtures in
`fixtures/imsr-<date>-verified.json`, drift notes in
`manifest/imsr-field-manifest-2024-2025-notes.md`, per-date diffs in `out/`, and
the roll-up in **`out/imsr-cross-date-summary.md`**.

Fixtures are scoped: **national totals + GACC PLs complete; incidents = a
documented document-order subset** (full hand-verification of 30–93 rows/report
would risk my own transcription errors). A fixture declares
`meta._diff_incident_scope: "listed_only"`; `imsr_diff.py` then compares only the
listed incident_ids and reports extractor-only rows as *out-of-scope extras*
(informational), not over-parse. The 2026-06-12 full comparison is unchanged.

**Result:** the v0.1.0 extractor broke on real drift (national comma columns,
non-standard unit codes, wrapped names, `* ` prefixes) — all as *dropped/mis-keyed
records, never wrong values*. A minimal **v0.2.0** fix (documented at the top of
`tools/imsr_extract.py`) brought the verified subset to 100% on all three dates,
with 2026-06-12 still 126/126. **138 of 178 parsed incidents remain unverified**
— 100% means "reproduced the verified subset", not a full-report correctness proof.

## Step 4 — incident matching / cross-check (added later, still off-app)

Cross-checks extracted IMSR incident rows against the **incident point layer the
map uses** (`USA_Wildfires_v1/0`), so we can tell which IMSR rows are corroborated
by the real layer (matchable), which are ambiguous, and which are unmatched.
Still no app integration.

- Matcher: `tools/imsr_match.py` (stdlib, explainable tiered rules).
- Spec: `MATCHING_SPEC.md` (fields, normalization, tiers: EXACT/STRONG/WEAK/AMBIGUOUS/NO_MATCH).
- Layer snapshot (offline): `incident_layer/wfigs-usa-wildfires-snapshot-2026-06-12.json` (343 records).
- Per-date output: `out/imsr-<date>-match.json` + `out/imsr-<date>-match-report.md`.
- Roll-up + recommendations: `out/imsr-match-cross-date-summary.md`.

Run: `python3 tools/imsr_match.py tests/imsr/out/imsr-<date>-extracted.json`

**Temporal caveat:** the layer snapshot is *current* incidents only, so the only
true same-period test is the current-day IMSR (2026-06-12) → **12/12 EXACT**. The
2024/2025 reports are adversarial cross-period tests → **0% (correctly refused)**,
with the lone generic-name collision (`Spring Creek`) rejected by the state guard.
Join-key recommendation: composite `unit + normalized name + state` (+year), then
carry the layer's `UniqueFireIdentifier`/`IrwinID` downstream. Popup enrichment is
**not ready** (matching validated on one small day; parser still subset-verified).

## Daily automated refresh (GitHub Actions)

The offline pipeline above is wired into a **server-side** daily job so the app
always serves a current `imsr-live.json` without anyone running Python by hand —
and **without** moving any parsing into the browser. The app still loads only the
prebuilt `imsr-live.json` at startup; all fetching/building happens in CI.

- **Workflow:** [`.github/workflows/imsr-daily.yml`](../../.github/workflows/imsr-daily.yml)
- **Orchestrator:** [`tools/imsr_refresh.py`](../../tools/imsr_refresh.py) (stdlib;
  shells out to the existing `imsr_pdf_to_text.py` → `imsr_extract.py` →
  `imsr_match.py` → `imsr_build_live.py`. It edits none of them.)
- **Schedule:** every day at **15:00 UTC** (`cron: "0 15 * * *"`), a buffer after
  NICC publishes the morning report; also runnable on demand via **workflow_dispatch**.

**What one run does**
1. Fetch today's IMSR **PDF** → `tests/imsr/source/imsr-<date>.pdf` (`.txt` sidecar too).
2. Derive `<date>` from the **report's own parsed date** (not the wall clock), so a
   publish lag never mislabels the files.
3. Fetch a same-day **incident-layer snapshot** →
   `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-<date>.json` (matching
   needs a *current* layer; the committed snapshot is frozen at one day).
4. Run extract + match → `tests/imsr/out/imsr-<date>-extracted.json`,
   `…-match.json`, `…-match-report.md`.
5. Build the live artifact → **`imsr-live.json`** (repo root) and a dated backup →
   `tests/imsr/live_backups/imsr-live-<date>.json`.
6. **Commit only on a real change** — the `generated_at` timestamp is ignored when
   comparing, so an unchanged report produces no commit.

**Source URLs (configurable, no code edit)** — set repository **Variables**
(Settings → Secrets and variables → Actions → *Variables*); unset = built-in defaults:

| Variable | Default | What |
|----------|---------|------|
| `IMSR_PDF_URL`   | `https://www.nifc.gov/nicc/sitreprt.pdf` | NICC daily IMSR PDF |
| `IMSR_LAYER_URL` | `…/USA_Wildfires_v1/FeatureServer/0` | incident point layer the app uses |

**Retention** (kept vs deleted) — `imsr_refresh.py` prunes the dated artifacts to a
**2-day window**: it keeps today + **one previous day**, and deletes anything older.
Managed patterns (the `<date>` files in `source/`, `out/`, `incident_layer/`, and
`live_backups/`). Always protected from deletion: the committed validation fixtures
**2024-07-29, 2024-09-30, 2025-08-27, 2026-06-12** and the active root
`imsr-live.json` (which matches no dated pattern).

**Outcomes / logging** — each run prints a final `STATUS:` line (and writes it to the
Actions job summary):
- `refreshed` — new data built and committed;
- `no-change` — source rebuilt identical data, working tree restored, nothing committed;
- `unavailable` — today's PDF isn't published yet (or isn't a PDF); **the current
  `imsr-live.json` is left untouched**. This is a graceful, non-failing skip.

**Run it manually**
```bash
# In GitHub: Actions → "IMSR daily refresh" → Run workflow.
# Locally (uses tools/.venv-imsr for the PDF step if present):
python3 tools/imsr_refresh.py
# Offline / with a pre-fetched PDF + snapshot:
IMSR_PDF_URL="file:///abs/imsr.pdf" IMSR_LAYER_URL="/abs/snapshot.json" python3 tools/imsr_refresh.py
```

**One-time GitHub setup:** ensure Actions can push (Settings → Actions → General →
Workflow permissions → **Read and write**); the workflow itself already requests
`contents: write`. Optionally set the two Variables above to override the sources.

## What is NOT done (on purpose)

- No PDF fetching or parsing **in the live app**. Step 2's parsing is offline,
  in `tools/`, run by hand — never by the app, never on app load.
- No IMSR values feeding GACC styling, wildfire popups, or PL thinning.
- No change to the existing simulated PL logic.
- The flag stays OFF; nothing auto-integrates.
