# IMSR ↔ incident-layer match — 2024-09-30

- IMSR source: `tests/imsr/out/imsr-2024-09-30-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-12.json` (343 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **31**
- Match rate (exact+strong+weak): **0.0%**
- EXACT **0** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **31**
- Layer records with no IMSR match: **343** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 31× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| OR-PRD/Rail Ridge | **NO_MATCH** | — | 0.0 | — |
| OR-OCF/Wiley Flat | **NO_MATCH** | — | 0.0 | — |
| OR-WIF/Willamette Complex | **NO_MATCH** | — | 0.0 | — |
| OR-DEF/Red | **NO_MATCH** | — | 0.0 | — |
| OR-UPF/Homestead Complex | **NO_MATCH** | — | 0.0 | — |
| OR-UPF/Diamond Complex | **NO_MATCH** | — | 0.0 | — |
| WA-NES/Goosmus | **NO_MATCH** | — | 0.0 | — |
| OR-DEF/Bachelor Complex | **NO_MATCH** | — | 0.0 | — |
| OR-721S/Bottom Creek | **NO_MATCH** | — | 0.0 | — |
| OR-FWF/Buck Creek | **NO_MATCH** | — | 0.0 | — |
| WY-BTF/Pack Trail | **NO_MATCH** | — | 0.0 | — |
| UT-UWF/Yellow Lake | **NO_MATCH** | — | 0.0 | — |
| ID-BOF/Lava | **NO_MATCH** | — | 0.0 | — |
| ID-BOF/Wapiti | **NO_MATCH** | — | 0.0 | — |
| ID-STF/Frog | **NO_MATCH** | — | 0.0 | — |
| ID-SCF/Red Rock | **NO_MATCH** | — | 0.0 | — |
| ID-BOF/Goat | **NO_MATCH** | — | 0.0 | — |
| ID-BOF/Snag | **NO_MATCH** | — | 0.0 | — |
| ID-BOF/Middle Fork Complex | **NO_MATCH** | — | 0.0 | — |
| NV-HUMX/Button | **NO_MATCH** | — | 0.0 | — |
| WY-BTF/Fish Creek | **NO_MATCH** | — | 0.0 | — |
| ID-SCF/Black Eagle | **NO_MATCH** | — | 0.0 | — |
| CA-BDF/Line | **NO_MATCH** | — | 0.0 | — |
| CA-ANF/Bridge | **NO_MATCH** | — | 0.0 | — |
| CA-ORC/Airport | **NO_MATCH** | — | 0.0 | — |
| WY-BHF/Elk | **NO_MATCH** | — | 0.0 | — |
| CO-ARF/Wildhorse 5 | **NO_MATCH** | — | 0.0 | — |
| SD-RBA/Lincoln | **NO_MATCH** | — | 0.0 | — |
| AZ-PMA/Fall | **NO_MATCH** | — | 0.0 | — |
| AZ-COF/Brigade | **NO_MATCH** | — | 0.0 | — |
| AZ-TNF/West | **NO_MATCH** | — | 0.0 | — |

## Largest layer incidents with NO IMSR match (sample)
- 2026-GAGAS-320025 — Pineland Road (GA, 32031 ac)
- 2026-NMLNF-000335 — SEVEN CABINS (NM, 31860 ac)
- 2026-NENBF-260530 — South Fork (NE, 23112 ac)
- 2026-GAGAS-130044 — Hwy 82 (GA, 22419 ac)
- 2026-CACNP-001159 — Santa Rosa Island (CA, 18379 ac)
- 2026-NENES-260153 — Anderson Bridge (NE, 17229 ac)
- 2025-CORBX-000995 — Elk RBX (CO, 14518 ac)
- 2026-SDSDS-260142 — Qury (SD, 9168 ac)
- 2026-FLLXR-001817 — LXR Lower Third RX 0609 (FL, 7609 ac)
- 2026-FLAPQ-001647 — WaWa 2 (FL, 7121 ac)
