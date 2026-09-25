# IMSR ↔ incident-layer match — 2026-09-25

- IMSR source: `tests/imsr/out/imsr-2026-09-25-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-09-25.json` (481 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **28**
- Match rate (exact+strong+weak): **96.4%**
- EXACT **27** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **454** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| OK-OKS/Lake Ranch | **EXACT** | 2026-OKOKS-261177 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Cedar Hollow | **EXACT** | 2026-OKOKS-261164 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Hydra | **EXACT** | 2026-TXTXS-268545 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MNF/Merit Creek | **EXACT** | 2026-MSMNF-000578 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-YNP/Dome | **EXACT** | 2026-CAYNP-000100 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Plaskett | **EXACT** | 2026-CALPF-002475 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/The Narrows | **EXACT** | 2026-ORMHF-000855 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Three Queens | **EXACT** | 2026-WAOWF-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| WA-OWF/King | **EXACT** | 2026-WAOWF-260699 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Goat | **EXACT** | 2026-WAOWF-260711 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-HDD/Moonshine | **EXACT** | 2026-WYHDD-000478 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-SJF/Swiss Roll | **EXACT** | 2026-COSJF-000985 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Nature Grove | **EXACT** | 2026-MTBRF-000340 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-CRA/Davis Coulee | **EXACT** | 2026-MTCRA-261393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-CIF/Whiskey | **EXACT** | 2026-NMCIF-000540 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-NEU/Floriston | **EXACT** | 2026-CANEU-029037 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORVAD-260201 — BIG GRASS (OR, 578637 ac)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 342923 ac)
- 2026-ORBUD-002696 — Coleman Creek (OR, 308863 ac)
- 2026-WACOA-260140 — Kaiser Canyon (WA, 138293 ac)
- 2026-UTFIF-260341 — Widemouth 2 (UT, 129742 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-COCUX-001160 — Aspen Acres (CO, 102004 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79200 ac)
- 2026-ORBUD-002687 — Bald Mountain (OR, 76443 ac)
- 2026-OR953S-000587 — 0587 SHINGLE (OR, 73183 ac)
