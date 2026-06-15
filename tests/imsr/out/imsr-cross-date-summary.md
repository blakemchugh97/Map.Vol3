# IMSR extractor — cross-date comparison (offline, validation-only)

Four real IMSR reports run through the offline pipeline. **Nothing here is wired
into the app.** Extracted output is UNVERIFIED; a populated field is not a
verified field. "100%" below means *the extractor reproduced the hand-verified
subset for that date* — it is **not** a correctness proof for the whole report.

## Coverage / scope per date

| Date | Nat'l PL | Pages | Incidents parsed | Incidents hand-verified | GACC PLs (complete) | Nat'l totals |
|---|---|---|---|---|---|---|
| 2024-07-29 | 5 | 14 | 93 | 12 (first NW rows) | 8 | complete |
| 2024-09-30 | 3 | 8  | 31 | 10 (full NW table) | 5 | complete |
| 2025-08-27 | 4 | 11 | 54 | 18 (full N. Rockies table) | 8 | complete |
| 2026-06-12 (baseline) | 2 | 6 | 12 | 12 (full) | 6 | complete |

Incident verification is a **documented document-order subset** for the three new
dates (full hand-verification of 30–93 rows/report would risk transcription
errors of my own). The diff is scoped to the verified incident_ids; the other
incidents are parsed but **unverified** (see "extra incidents" below).

## Round 1 — current extractor v0.1.0 (no changes) vs hand-verified fixtures

| Date | Compared | Exact | Mismatch | Missing | Ambiguous | Warnings |
|---|---|---|---|---|---|---|
| 2024-07-29 | 106 | 97 (91.5%) | 0 | 9 | 0 | 1 (Total row not parsed) |
| 2024-09-30 | 66  | 61 (92.4%) | 0 | 5 | 0 | 0 |
| 2025-08-27 | 160 | 157 (98.1%) | 0 | 3 | 0 | 0 |

**Where it broke, and why (all failures = dropped/mis-keyed records, NOT wrong values):**
- **National totals comma bug** (2024-07-29): the `Total` row has `1,625` engines;
  v0.1.0's regex disallowed commas in the crews/engines/helicopters columns, so
  the entire national bucket failed to parse (→ 6 missing fields + a warning).
- **Non-standard unit codes dropped**: `OR-973S`, `OR-953S` (2024-07-29),
  `OR-721S` (2024-09-30), `MT-LG25` (2025-08-27) don't match `[A-Z]{2}-[A-Z]{3}`,
  so those rows vanished.
- **Wrapped multi-line names mis-keyed**: `Willamette`/`Complex`,
  `Badland`/`Complex`, etc. parsed as name "Complex" → wrong incident_id → missing.
- **Asterisk-prefixed new incidents mis-keyed**: `* Rhoda Creek`, `* Waldo Bar`
  parsed with the leading `* ` in the name → wrong incident_id → missing.

**What held up even in v0.1.0:** GACC PL section-header parsing (all dates), the
national totals on dates without big numbers, every *value* that did parse
(zero mismatches — no silent corruption), and leading-space rows / the `Comp`
containment code (already handled).

## Round 2 — drift-hardened extractor v0.2.0 vs the same fixtures

Minimal, isolated changes in `tools/imsr_extract.py` (documented at the top of the
file): (1) allow commas in national numeric columns; (2) broaden unit code to
`[A-Z]{2}-[A-Z0-9]{2,4}`; (3) repair one-line wrapped names; (4) strip `* `/`+ `
markers. Guarded by the containment anchor so narrative like `HH-60` is not
mistaken for an incident.

| Date | Compared | Exact | Mismatch | Missing | Ambiguous | Warnings | Extra (unverified) incidents |
|---|---|---|---|---|---|---|---|
| 2024-07-29 | 130 | **130 (100%)** | 0 | 0 | 0 | 0 | 81 |
| 2024-09-30 | 106 | **106 (100%)** | 0 | 0 | 0 | 0 | 21 |
| 2025-08-27 | 184 | **184 (100%)** | 0 | 0 | 0 | 0 | 36 |
| 2026-06-12 (regression) | 126 | **126 (100%)** | 0 | 0 | 0 | 0 | 0 (full scope) |

Incident counts rose by exactly the previously-missed real rows (86→93, 29→31,
52→54) with **no spurious incidents added** — strong evidence the broadened regex
matched real rows, not noise.

## Readiness assessment

- **GACC PL bucket:** robust across PL 1–5 and 5/6/8/8-area reports. The
  `… Area (PL n)` header format is stable. Lowest risk.
- **National totals bucket:** robust after the comma fix; consistent `Total` row
  format across all four dates.
- **Incident bucket:** v0.2.0 reproduces the verified subset perfectly, but
  **138 of 178 parsed incidents across the three dates remain unverified.** The
  row parser still depends on a fixed column layout anchored on `Ctn`/`Comp`.
- **Posture:** STRUCTURALLY promising, NOT production-ready, NOT verified at full
  coverage, flag stays OFF, nothing wired into the app.
