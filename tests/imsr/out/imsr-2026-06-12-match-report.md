# IMSR ↔ incident-layer match — 2026-06-12

- IMSR source: `tests/imsr/out/imsr-2026-06-12-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-12.json` (343 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **12**
- Match rate (exact+strong+weak): **100.0%**
- EXACT **12** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **0**
- Layer records with no IMSR match: **331** (expected — IMSR lists only large incidents)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| NE-NBF/South Fork | **EXACT** | 2026-NENBF-260530 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-UPD/Bee Hive | **EXACT** | 2026-COUPD-000064 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Bear | **EXACT** | 2026-NMGNF-000307 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-COF/Papa | **EXACT** | 2026-AZCOF-000681 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-LNF/Seven Cabins | **EXACT** | 2026-NMLNF-000335 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-NWS/South Mountain | **EXACT** | 2026-UTNWS-200220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Tower | **EXACT** | 2026-UTWDD-260151 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LNU/Putah | **EXACT** | 2026-CALNU-009543 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Shell | **EXACT** | 2026-FLFNF-001638 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/340 | **EXACT** | 2026-FLFNF-001659 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-GAD/Kopshesut | **EXACT** | 2026-AKGAD-000137 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-GAGAS-320025 — Pineland Road (GA, 32031 ac)
- 2026-GAGAS-130044 — Hwy 82 (GA, 22419 ac)
- 2026-CACNP-001159 — Santa Rosa Island (CA, 18379 ac)
- 2026-NENES-260153 — Anderson Bridge (NE, 17229 ac)
- 2025-CORBX-000995 — Elk RBX (CO, 14518 ac)
- 2026-SDSDS-260142 — Qury (SD, 9168 ac)
- 2026-FLLXR-001817 — LXR Lower Third RX 0609 (FL, 7609 ac)
- 2026-FLAPQ-001647 — WaWa 2 (FL, 7121 ac)
- 2026-WYNAX-000051 — Sandpiper (WY, 6287 ac)
- 2026-WASPD-260182 — MOXEE ORCHARD (WA, 5918 ac)
