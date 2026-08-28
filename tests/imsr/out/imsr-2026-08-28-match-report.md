# IMSR ↔ incident-layer match — 2026-08-28

- IMSR source: `tests/imsr/out/imsr-2026-08-28-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-08-28.json` (638 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **103**
- Match rate (exact+strong+weak): **87.4%**
- EXACT **90** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **13**
- Layer records with no IMSR match: **548** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 10× — no name/unit signal in layer
- 3× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Three Queens | **EXACT** | 2026-WAOWF-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/King | **EXACT** | 2026-WAOWF-260699 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Goat | **EXACT** | 2026-WAOWF-260711 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MRP/Wonderland Complex | **NO_MATCH** | — | 0.0 | — |
| WA-MRP/Grand Park 2 | **EXACT** | 2026-WAMRP-000847 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/McCully | **EXACT** | 2026-ORWWF-000531 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/The Narrows | **EXACT** | 2026-ORMHF-000855 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-FWF/Wrights Spring | **EXACT** | 2026-ORFWF-260286 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| WA-NCP/Luna | **EXACT** | 2026-WANCP-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-GPF/High Lava | **EXACT** | 2026-WAGPF-000684 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Big Grass | **EXACT** | 2026-ORVAD-260201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-COA/Kaiser Canyon | **EXACT** | 2026-WACOA-260140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Mitchell Springs | **EXACT** | 2026-ORVAD-260264 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MSF/Electric | **EXACT** | 2026-WAMSF-000494 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Ptarmigan | **EXACT** | 2026-WAOWF-260448 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-LAD/Picture Rock | **EXACT** | 2026-ORLAD-260313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-953S/Rosenbaum | **NO_MATCH** | — | 0.0 | — |
| WA-YAA/Colwash | **EXACT** | 2026-WAYAA-000090 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Egypt | **EXACT** | 2026-ORMAF-002671 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/North Pole | **EXACT** | 2026-ORWWF-000535 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Mustang | **NO_MATCH** | — | 0.0 | — |
| OR-712S/Fielder Mtn | **EXACT** | 2026-OR712S-030327 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-WID/McConnell | **EXACT** | 2026-NVWID-020620 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-TFD/Wildhorse | **EXACT** | 2026-IDTFD-000216 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOF/Crooked | **EXACT** | 2026-IDBOF-000958 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-HTF/Calico | **EXACT** | 2026-NVHTF-020624 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-EKD/Oxley | **EXACT** | 2026-NVEKD-010515 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-CCD/Blue Eagle | **EXACT** | 2026-NVCCD-030758 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Flint | **EXACT** | 2026-IDBOD-000994 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-EKD/Forleen | **EXACT** | 2026-NVEKD-010519 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-WID/Juniper Ridge | **NO_MATCH** | — | 0.0 | — |
| UT-UOA/Slough Canyon | **EXACT** | 2026-UTUOA-100254 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-WID/Sombrero | **NO_MATCH** | — | 0.0 | — |
| NV-WHIX/Kearny | **EXACT** | 2026-NVWHIX-040406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Black Canyon | **EXACT** | 2026-UTMLF-005244 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-BRS/Brushy Canyon | **EXACT** | 2026-UTBRS-200695 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-SWS/Teddy Valley | **EXACT** | 2026-UTSWS-000581 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Tom Creek | **EXACT** | 2026-UTWDD-200672 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-SCF/Doublesprings | **EXACT** | 2026-IDSCF-260103 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-HTF/California Creek | **NO_MATCH** | — | 0.0 | — |
| NV-ECFX/Bull Run | **NO_MATCH** | — | 0.0 | — |
| ID-BOD/Cave | **NO_MATCH** | — | 0.0 | — |
| ID-IPF/Dudley | **EXACT** | 2026-IDIPF-000730 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-CES/Roe 2 | **EXACT** | 2026-MTCES-266405 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Bobcat Lakes | **EXACT** | 2026-MTBDF-266313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Moose | **EXACT** | 2026-MTBDF-266293 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Nature Grove | **EXACT** | 2026-MTBRF-000340 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-NWS/Deer Creek | **EXACT** | 2026-MTNWS-000387 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Silver | **EXACT** | 2026-IDIPF-000697 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Moose Mountain | **EXACT** | 2026-IDNCF-000349 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Skillet | **EXACT** | 2026-MTFNF-000306 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Parker Lake | **EXACT** | 2026-IDIPF-000702 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Porcupine | **EXACT** | 2026-IDIPF-000495 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Camp Creek | **EXACT** | 2026-MTFNF-000393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Silvertip | **EXACT** | 2026-MTFNF-000280 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Cooper | **NO_MATCH** | — | 0.0 | — |
| ID-NCF/Cascade | **EXACT** | 2026-IDNCF-000283 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Grotto | **EXACT** | 2026-IDNCF-000348 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Three Links | **EXACT** | 2026-IDNCF-000330 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Wolf Creek | **EXACT** | 2026-IDNCF-000295 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-CRA/Sarpy | **NO_MATCH** | — | 0.0 | — |
| MT-LNF/Cherry Peak | **EXACT** | 2026-MTLNF-260379 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Corky | **EXACT** | 2026-TXTXS-267740 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Ross | **EXACT** | 2026-TXTXS-267549 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| GA-OKR/Mitchell | **EXACT** | 2026-GAOKR-002585 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Buck Creek | **EXACT** | 2026-OKOKS-260920 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| GA-WSR/Main Trail | **EXACT** | 2026-GAWSR-000370 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Rio Escondido | **EXACT** | 2026-TXTXS-267552 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AR-OUF/West Glover | **NO_MATCH** | — | 0.0 | — |
| OK-OSA/Bison | **EXACT** | 2026-OKOSA-002548 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-ANA/Sugar Creek | **EXACT** | 2026-OKANA-002553 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-ANA/2690 | **EXACT** | 2026-OKANA-002546 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Tower | **EXACT** | 2026-FLFLS-261200565 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Adams | **EXACT** | 2026-TXTXS-267660 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-NOD/S 1 Vya | **NO_MATCH** | — | 0.0 | — |
| CA-HVT/MP18 | **EXACT** | 2026-CAHVT-000753 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Plaskett | **EXACT** | 2026-CALPF-002475 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-A5S/Campwood | **EXACT** | 2026-AZA5S-261347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-FTA/Paddy Creek | **EXACT** | 2026-AZFTA-000812 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Frijoles | **EXACT** | 2026-NMSNF-000444 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-LNF/Sunset | **EXACT** | 2026-NMLNF-000654 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ND-SRA/HWY 1806 | **EXACT** | 2026-NDSRA-000139 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SD-PRA/Rancher | **EXACT** | 2026-SDPRA-000134 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAS/Mukluk | **EXACT** | 2026-AKTAS-613487 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 342923 ac)
- 2026-ORBUD-002696 — Coleman Creek (OR, 308863 ac)
- 2026-IDBOD-265460 — Tartar (ID, 158027 ac)
- 2026-UTFIF-260341 — Widemouth 2 (UT, 129741 ac)
- 2026-UTMLF-005112 — Babylon (UT, 107189 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-UTFIF-260198 — Cottonwood (UT, 97464 ac)
- 2026-NVCCD-030683 — Bug (CA, 93733 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79200 ac)
- 2026-ORVAD-260204 — FOX (OR, 78903 ac)
