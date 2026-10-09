# IMSR ↔ incident-layer match — 2026-10-09

- IMSR source: `tests/imsr/out/imsr-2026-10-09-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-10-09.json` (462 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **10**
- Match rate (exact+strong+weak): **100.0%**
- EXACT **10** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **0**
- Layer records with no IMSR match: **452** (expected — IMSR lists only large incidents)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| CA-YNP/Dome | **EXACT** | 2026-CAYNP-000100 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-ANF/Bouquet | **EXACT** | 2026-CAANF-264196 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-TMFX/Bull | **EXACT** | 2026-NVTMFX-030869 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ECFX/Jones | **EXACT** | 2026-NVECFX-010656 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MSS/Amite Kahnville Rd | **EXACT** | 2026-MSMSS-018942 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 342923 ac)
- 2026-WANES-001791 — SINLAHEKIN (WA, 166007 ac)
- 2026-UTFIF-260341 — Widemouth 2 (UT, 129742 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-COCUX-001160 — Aspen Acres (CO, 102007 ac)
- 2026-OR951S-000433 — 0433 BREWER (OR, 70821 ac)
- 2026-ORUMF-000324 — Hagen (OR, 61380 ac)
- 2026-ORFWF-260286 — Wrights Spring (OR, 55134 ac)
- 2026-NVNAFQ-500729 — MOUSE MEADOW (NV, 52000 ac)
- 2026-MTBDF-266319 — Sand Creek (MT, 35520 ac)
