# IMSR ↔ incident-layer match — 2026-10-12

- IMSR source: `tests/imsr/out/imsr-2026-10-12-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-10-12.json` (384 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **12**
- Match rate (exact+strong+weak): **100.0%**
- EXACT **12** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **0**
- Layer records with no IMSR match: **372** (expected — IMSR lists only large incidents)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| CA-SQF/Cyrus | **EXACT** | 2026-CASQF-001695 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-YNP/Dome | **EXACT** | 2026-CAYNP-000100 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-ANF/Bouquet | **EXACT** | 2026-CAANF-264196 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-TFD/Buckhorn 2 | **EXACT** | 2026-IDTFD-000268 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-TMFX/Bull | **EXACT** | 2026-NVTMFX-030869 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Craig Lake 1 | **EXACT** | 2026-MIMIS-070006 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-SHX/Pk | **EXACT** | 2026-WYSHX-000391 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 342923 ac)
- 2026-WANES-001791 — SINLAHEKIN (WA, 166007 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-COCUX-001160 — Aspen Acres (CO, 102007 ac)
- 2026-OR951S-000433 — 0433 BREWER (OR, 70821 ac)
- 2026-ORUMF-000324 — Hagen (OR, 61380 ac)
- 2026-ORFWF-260286 — Wrights Spring (OR, 55134 ac)
- 2026-NVNAFQ-500729 — MOUSE MEADOW (NV, 52000 ac)
- 2026-MTBDF-266319 — Sand Creek (MT, 35520 ac)
- 2026-NVWID-020620 — McConnell (NV, 33816 ac)
