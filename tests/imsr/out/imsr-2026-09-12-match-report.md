# IMSR ↔ incident-layer match — 2026-09-12

- IMSR source: `tests/imsr/out/imsr-2026-09-12-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-09-12.json` (534 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **58**
- Match rate (exact+strong+weak): **89.7%**
- EXACT **52** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **6**
- Layer records with no IMSR match: **482** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 3× — state_conflict (name matched but states differ)
- 3× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| AL-ALS/Ray Coaker | **EXACT** | 2026-ALALS-260909-4 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Ross | **EXACT** | 2026-TXTXS-267549 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Kurk | **EXACT** | 2026-TXTXS-268233 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AR-OUF/West Glover | **NO_MATCH** | — | 0.0 | — |
| OK-ANA/Meers | **EXACT** | 2026-OKANA-002798 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Half Section | **EXACT** | 2026-TXTXS-268117 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Vega | **EXACT** | 2026-TXTXS-268361 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Lucero | **EXACT** | 2026-TXTXS-268343 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-HDD/Moonshine | **EXACT** | 2026-WYHDD-000478 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SD-SDS/Lookout | **EXACT** | 2026-SDSDS-260964 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LNU/Lucas | **EXACT** | 2026-CALNU-016127 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-HVT/MP18 | **EXACT** | 2026-CAHVT-000753 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOF/Crooked | **EXACT** | 2026-IDBOF-000958 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-WID/McConnell | **EXACT** | 2026-NVWID-020620 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-SCF/Doublesprings | **EXACT** | 2026-IDSCF-260103 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-UOA/Slough Canyon | **EXACT** | 2026-UTUOA-100254 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Plaskett | **EXACT** | 2026-CALPF-002475 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Nature Grove | **EXACT** | 2026-MTBRF-000340 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Moose Mountain | **EXACT** | 2026-IDNCF-000349 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Cascade | **EXACT** | 2026-IDNCF-000283 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Silvertip | **EXACT** | 2026-MTFNF-000280 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Camp Creek | **EXACT** | 2026-MTFNF-000393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Bobcat Lakes | **EXACT** | 2026-MTBDF-266313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Parker Lake | **EXACT** | 2026-IDIPF-000702 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Cooper | **NO_MATCH** | — | 0.0 | — |
| MT-BRF/Scimitar | **NO_MATCH** | — | 0.0 | — |
| MT-LG09/Beaver Creek | **NO_MATCH** | — | 0.0 | — |
| MT-BDF/Moose | **EXACT** | 2026-MTBDF-266293 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Silver | **EXACT** | 2026-IDIPF-000697 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-982S/Sycan | **EXACT** | 2026-OR982S-260350 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/The Narrows | **EXACT** | 2026-ORMHF-000855 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Three Queens | **EXACT** | 2026-WAOWF-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/King | **EXACT** | 2026-WAOWF-260699 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Goat | **EXACT** | 2026-WAOWF-260711 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/McCully | **EXACT** | 2026-ORWWF-000531 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| WA-MSF/Electric | **EXACT** | 2026-WAMSF-000494 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Luna | **EXACT** | 2026-WANCP-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Big Grass | **EXACT** | 2026-ORVAD-260201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Ptarmigan | **EXACT** | 2026-WAOWF-260448 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MRP/Wonderland Complex | **NO_MATCH** | — | 0.0 | — |
| WA-GPF/High Lava | **EXACT** | 2026-WAGPF-000684 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-CIF/Whiskey | **EXACT** | 2026-NMCIF-000540 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Frijoles | **EXACT** | 2026-NMSNF-000444 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 342923 ac)
- 2026-ORBUD-002696 — Coleman Creek (OR, 308863 ac)
- 2026-IDBOD-265460 — Tartar (ID, 158027 ac)
- 2026-WACOA-260140 — Kaiser Canyon (WA, 138293 ac)
- 2026-UTFIF-260341 — Widemouth 2 (UT, 129741 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-UTFIF-260198 — Cottonwood (UT, 97464 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79200 ac)
- 2026-ORVAD-260204 — FOX (OR, 78903 ac)
- 2026-ORBUD-002687 — Bald Mountain (OR, 76443 ac)
