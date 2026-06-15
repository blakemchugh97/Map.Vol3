# IMSR ↔ incident-layer match — 2026-06-15

- IMSR source: `tests/imsr/out/imsr-2026-06-15-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-15.json` (403 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **17**
- Match rate (exact+strong+weak): **94.1%**
- EXACT **15** · STRONG **1** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **387** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| NE-NBF/South Fork | **EXACT** | 2026-NENBF-260530 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-UPD/Bee Hive | **EXACT** | 2026-COUPD-000064 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SPD/Juniper Dunes | **EXACT** | 2026-WASPD-260221 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Twin Sisters | **EXACT** | 2026-WAWFS-260222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-YAA/4170 Tule Rd | **EXACT** | 2026-WAYAA-000023 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Snake River | **EXACT** | 2026-WAWFS-001375 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Bear | **EXACT** | 2026-NMGNF-000307 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Green Gate 26 | **STRONG** | 2026-FLFLS-261700146 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-LWR/Rookery | **EXACT** | 2026-FLLWR-001886 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Shell | **EXACT** | 2026-FLFNF-001638 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Midnight Fire 53 | **NO_MATCH** | — | 0.0 | — |
| ID-BOD/Pv | **EXACT** | 2026-IDBOD-000452 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LNU/Putah | **EXACT** | 2026-CALNU-009543 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-KRN/Wyly | **EXACT** | 2026-CAKRN-024220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-GAD/Kopshesut | **EXACT** | 2026-AKGAD-000137 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Canyon | **EXACT** | 2026-AKTAD-000174 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-GAGAS-320025 — Pineland Road (GA, 32031 ac)
- 2026-NMLNF-000335 — SEVEN CABINS (NM, 31860 ac)
- 2026-GAGAS-130044 — Hwy 82 (GA, 22419 ac)
- 2026-CACNP-001159 — Santa Rosa Island (CA, 18379 ac)
- 2026-NENES-260153 — Anderson Bridge (NE, 17229 ac)
- 2025-CORBX-000995 — Elk RBX (CO, 14518 ac)
- 2026-SDSDS-260142 — Qury (SD, 9168 ac)
- 2026-FLLXR-001817 — LXR Lower Third RX 0609 (FL, 7609 ac)
- 2026-FLAPQ-001647 — WaWa 2 (FL, 7121 ac)
- 2026-WYNAX-000051 — Sandpiper (WY, 6287 ac)
