# IMSR ↔ incident-layer match — 2026-06-16

- IMSR source: `tests/imsr/out/imsr-2026-06-16-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-16.json` (435 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **20**
- Match rate (exact+strong+weak): **90.0%**
- EXACT **16** · STRONG **2** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **2**
- Layer records with no IMSR match: **417** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — state_conflict (name matched but states differ)
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| WA-YAA/Tule Rd | **STRONG** | 2026-WAYAA-000023 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| WA-SPD/Juniper Dunes | **EXACT** | 2026-WASPD-260221 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Twin Sisters | **EXACT** | 2026-WAWFS-260222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Snake River | **EXACT** | 2026-WAWFS-001375 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NE-NBF/South Fork | **EXACT** | 2026-NENBF-260530 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-UPD/Bee Hive | **EXACT** | 2026-COUPD-000064 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Bear | **EXACT** | 2026-NMGNF-000307 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-LAP/Dellenbaugh | **NO_MATCH** | — | 0.0 | — |
| ID-BOD/Pv | **EXACT** | 2026-IDBOD-000452 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-RRU/Shore | **EXACT** | 2026-CARRU-096793 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-KRN/Wyly | **EXACT** | 2026-CAKRN-024220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Dade 13 | **NO_MATCH** | — | 0.0 | — |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Green Gate 26 | **STRONG** | 2026-FLFLS-261700146 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| FL-LWR/Rookery | **EXACT** | 2026-FLLWR-001886 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Shell | **EXACT** | 2026-FLFNF-001638 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/West Buck Lake | **EXACT** | 2026-FLFLS-261200371 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Billy Matthews | **EXACT** | 2026-NCNCS-260060 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LNU/Putah | **EXACT** | 2026-CALNU-009543 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-GAD/Kopshesut | **EXACT** | 2026-AKGAD-000137 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-GAGAS-320025 — Pineland Road (GA, 32031 ac)
- 2026-NMLNF-000335 — SEVEN CABINS (NM, 31860 ac)
- 2026-GAGAS-130044 — Hwy 82 (GA, 22419 ac)
- 2026-CACNP-001159 — Santa Rosa Island (CA, 18379 ac)
- 2025-CORBX-000995 — Elk RBX (CO, 14518 ac)
- 2026-SDSDS-260142 — Qury (SD, 9168 ac)
- 2026-FLLXR-001817 — LXR Lower Third RX 0609 (FL, 7609 ac)
- 2026-FLAPQ-001647 — WaWa 2 (FL, 7121 ac)
- 2026-WYNAX-000051 — Sandpiper (WY, 6287 ac)
- 2026-WASPD-260182 — MOXEE ORCHARD (WA, 5918 ac)
