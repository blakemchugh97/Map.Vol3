# IMSR ↔ incident-layer match — 2026-09-19

- IMSR source: `tests/imsr/out/imsr-2026-09-19-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-09-19.json` (468 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **48**
- Match rate (exact+strong+weak): **97.9%**
- EXACT **47** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **421** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| TX-TXS/Dry River | **EXACT** | 2026-TXTXS-268594 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-ANA/Gracemont | **EXACT** | 2026-OKANA-002871 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Hydra | **EXACT** | 2026-TXTXS-268545 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-MCR/Star Lake | **EXACT** | 2026-TXMCR-000378 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Clark | **EXACT** | 2026-TXTXS-268613 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Tram Trail | **EXACT** | 2026-OKOKS-261089 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AR-ARS/Bunker | **EXACT** | 2026-ARARS-100236 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Calvary Creek | **EXACT** | 2026-OKOKS-261109 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Breezy | **EXACT** | 2026-TXTXS-268653 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-NEU/Floriston | **EXACT** | 2026-CANEU-029037 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LNU/Lucas | **EXACT** | 2026-CALNU-016127 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-YNP/Dome | **EXACT** | 2026-CAYNP-000100 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Plaskett | **EXACT** | 2026-CALPF-002475 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-SCF/Doublesprings | **EXACT** | 2026-IDSCF-260103 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-UOA/Slough Canyon | **EXACT** | 2026-UTUOA-100254 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOF/Crooked | **EXACT** | 2026-IDBOF-000958 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-HDD/Moonshine | **EXACT** | 2026-WYHDD-000478 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-SJF/Swiss Roll | **EXACT** | 2026-COSJF-000985 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/The Narrows | **EXACT** | 2026-ORMHF-000855 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Three Queens | **EXACT** | 2026-WAOWF-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/King | **EXACT** | 2026-WAOWF-260699 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Goat | **EXACT** | 2026-WAOWF-260711 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Luna | **EXACT** | 2026-WANCP-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Ptarmigan | **EXACT** | 2026-WAOWF-260448 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-CRA/Davis Coulee | **EXACT** | 2026-MTCRA-261393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Bobcat Lakes | **EXACT** | 2026-MTBDF-266313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Parker Lake | **EXACT** | 2026-IDIPF-000702 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Silver | **EXACT** | 2026-IDIPF-000697 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Cascade | **EXACT** | 2026-IDNCF-000283 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Nature Grove | **EXACT** | 2026-MTBRF-000340 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Moose | **EXACT** | 2026-MTBDF-266293 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-CIF/Whiskey | **EXACT** | 2026-NMCIF-000540 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Frijoles | **EXACT** | 2026-NMSNF-000444 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORVAD-260201 — BIG GRASS (OR, 578637 ac)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 342923 ac)
- 2026-ORBUD-002696 — Coleman Creek (OR, 308863 ac)
- 2026-WACOA-260140 — Kaiser Canyon (WA, 138293 ac)
- 2026-UTFIF-260341 — Widemouth 2 (UT, 129742 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-TXTXS-267549 — Ross (TX, 89989 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79200 ac)
- 2026-ORVAD-260204 — FOX (OR, 78903 ac)
- 2026-ORBUD-002687 — Bald Mountain (OR, 76443 ac)
