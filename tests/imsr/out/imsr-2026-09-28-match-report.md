# IMSR ↔ incident-layer match — 2026-09-28

- IMSR source: `tests/imsr/out/imsr-2026-09-28-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-09-28.json` (420 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **17**
- Match rate (exact+strong+weak): **100.0%**
- EXACT **17** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **0**
- Layer records with no IMSR match: **403** (expected — IMSR lists only large incidents)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| CA-YNP/Dome | **EXACT** | 2026-CAYNP-000100 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Plaskett | **EXACT** | 2026-CALPF-002475 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Rafter 4B | **EXACT** | 2026-TXTXS-268989 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Grover Bend | **EXACT** | 2026-TXTXS-269009 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Stone Bridge | **EXACT** | 2026-OKOKS-261182 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/The Narrows | **EXACT** | 2026-ORMHF-000855 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Three Queens | **EXACT** | 2026-WAOWF-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Second Street | **EXACT** | 2026-WAWFS-260847 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-HDD/Moonshine | **EXACT** | 2026-WYHDD-000478 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 342923 ac)
- 2026-WACOA-260140 — Kaiser Canyon (WA, 138293 ac)
- 2026-UTFIF-260341 — Widemouth 2 (UT, 129742 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-COCUX-001160 — Aspen Acres (CO, 102004 ac)
- 2026-OR953S-000587 — 0587 SHINGLE (OR, 73183 ac)
- 2026-OR951S-000433 — 0433 BREWER (OR, 70821 ac)
- 2026-ORWSA-000100 — Bench (OR, 67071 ac)
- 2026-WANES-260149 — Modrite (WA, 57594 ac)
- 2026-ORFWF-260286 — Wrights Spring (OR, 55134 ac)
