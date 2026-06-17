# IMSR ↔ incident-layer match — 2026-06-17

- IMSR source: `tests/imsr/out/imsr-2026-06-17-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-17.json` (459 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **23**
- Match rate (exact+strong+weak): **87.0%**
- EXACT **17** · STRONG **3** · WEAK **0** · AMBIGUOUS **1** · NO_MATCH **2**
- Layer records with no IMSR match: **439** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — state_conflict (name matched but states differ)
- 1× — >=2 competing EXACT candidates
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| WA-NES/Upriver | **EXACT** | 2026-WANES-001399 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-973S/Old Emigrant | **EXACT** | 2026-OR973S-000139 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-YAA/Tule Rd | **STRONG** | 2026-WAYAA-000023 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| WA-SPD/Juniper Dunes | **EXACT** | 2026-WASPD-260221 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Twin Sisters | **EXACT** | 2026-WAWFS-260222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-TNF/Sycamore | **EXACT** | 2026-AZTNF-000839 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Bear | **EXACT** | 2026-NMGNF-000307 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-CPD/Sawmill | **EXACT** | 2026-UTCPD-000225 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-LAP/Dellenbaugh | **NO_MATCH** | — | 0.0 | — |
| ID-BOD/Chalk | **EXACT** | 2026-IDBOD-000460 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-A1S/Rock Canyon | **EXACT** | 2026-AZA1S-000208 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NE-NBF/South Fork | **EXACT** | 2026-NENBF-260530 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-RRU/Shore | **EXACT** | 2026-CARRU-096793 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-PMQ/Mateo | **AMBIGUOUS** | 2026-CAPMQ-001923 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-KRN/Wyly | **EXACT** | 2026-CAKRN-024220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Quarry 2 | **EXACT** | 2026-FLFLS-261800092 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Well 13 | **NO_MATCH** | — | 0.0 | — |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-LWR/Rookery | **EXACT** | 2026-FLLWR-001886 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Trail 13 09 | **STRONG** | 2026-FLFLS-261100459 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| FL-FNF/Shell | **EXACT** | 2026-FLFNF-001638 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Green Gate 26 | **STRONG** | 2026-FLFLS-261700146 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| AK-TAD/Kilolitna | **EXACT** | 2026-AKTAD-000177 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-GAGAS-320025 — Pineland Road (GA, 32031 ac)
- 2026-NMLNF-000335 — SEVEN CABINS (NM, 31860 ac)
- 2026-GAGAS-130044 — Hwy 82 (GA, 22419 ac)
- 2026-CACNP-001159 — Santa Rosa Island (CA, 18379 ac)
- 2025-CORBX-000995 — Elk RBX (CO, 14518 ac)
- 2026-SDSDS-260142 — Qury (SD, 9168 ac)
- 2026-IDGOX-000081 — Median (ID, 8624 ac)
- 2026-FLLXR-001817 — LXR Lower Third RX 0609 (FL, 7609 ac)
- 2026-FLAPQ-001647 — WaWa 2 (FL, 7121 ac)
- 2026-WYNAX-000051 — Sandpiper (WY, 6287 ac)
