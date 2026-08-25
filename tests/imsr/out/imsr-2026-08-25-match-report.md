# IMSR ↔ incident-layer match — 2026-08-25

- IMSR source: `tests/imsr/out/imsr-2026-08-25-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-08-25.json` (686 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **90**
- Match rate (exact+strong+weak): **96.7%**
- EXACT **87** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **3**
- Layer records with no IMSR match: **599** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 3× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| OR-WWF/McCully | **EXACT** | 2026-ORWWF-000531 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/North Pole | **EXACT** | 2026-ORWWF-000535 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Three Queens | **EXACT** | 2026-WAOWF-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MRP/Grand Park 2 | **EXACT** | 2026-WAMRP-000847 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/King | **EXACT** | 2026-WAOWF-260699 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Goat | **EXACT** | 2026-WAOWF-260711 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MRP/Wonderland | **NO_MATCH** | — | 0.0 | — |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/The Narrows | **EXACT** | 2026-ORMHF-000855 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-FWF/Wrights Spring | **EXACT** | 2026-ORFWF-260286 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| WA-COA/Kaiser Canyon | **EXACT** | 2026-WACOA-260140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Modrite | **EXACT** | 2026-WANES-260149 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-YAA/Colwash | **EXACT** | 2026-WAYAA-000090 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Big Grass | **EXACT** | 2026-ORVAD-260201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-GPF/High Lava | **EXACT** | 2026-WAGPF-000684 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Luna | **EXACT** | 2026-WANCP-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Ptarmigan | **EXACT** | 2026-WAOWF-260448 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-953S/0587 Shingle | **EXACT** | 2026-OR953S-000587 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Egypt | **EXACT** | 2026-ORMAF-002671 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-LAD/Picture Rock | **EXACT** | 2026-ORLAD-260313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-712S/Fielder Mtn | **EXACT** | 2026-OR712S-030327 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-953S/Rosenbaum | **NO_MATCH** | — | 0.0 | — |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Bobcat Lakes | **EXACT** | 2026-MTBDF-266313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Moose | **EXACT** | 2026-MTBDF-266293 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Nature Grove | **EXACT** | 2026-MTBRF-000340 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-NWS/Deer Creek | **EXACT** | 2026-MTNWS-000387 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Moose Mountain | **EXACT** | 2026-IDNCF-000349 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-LNF/Cherry Peak | **EXACT** | 2026-MTLNF-260379 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Skillet | **EXACT** | 2026-MTFNF-000306 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Porcupine | **EXACT** | 2026-IDIPF-000495 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Silvertip | **EXACT** | 2026-MTFNF-000280 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Cascade | **EXACT** | 2026-IDNCF-000283 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Grotto | **EXACT** | 2026-IDNCF-000348 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Three Links | **EXACT** | 2026-IDNCF-000330 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-CRA/Sarpy | **EXACT** | 2026-MTCRA-261132 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Black Bear | **EXACT** | 2026-MTBRF-000282 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/North Fork Lost Horse | **EXACT** | 2026-MTBRF-000255 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-LG32/Windmill | **EXACT** | 2026-MTLG32-261150 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOF/Crooked | **EXACT** | 2026-IDBOF-000958 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Black Canyon | **EXACT** | 2026-UTMLF-005244 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-UOA/Slough Canyon | **EXACT** | 2026-UTUOA-100254 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-EKD/Oxley | **EXACT** | 2026-NVEKD-010515 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-EKD/Forleen | **EXACT** | 2026-NVEKD-010519 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Flint | **EXACT** | 2026-IDBOD-000994 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-CAX/North Heglar | **EXACT** | 2026-IDCAX-000198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ECFX/Master | **EXACT** | 2026-NVECFX-010499 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-SCF/Doublesprings | **EXACT** | 2026-IDSCF-260103 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-TFD/Shale Butte | **EXACT** | 2026-IDTFD-000206 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Rio Escondido | **EXACT** | 2026-TXTXS-267552 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Ross | **EXACT** | 2026-TXTXS-267549 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| GA-OKR/Mitchell | **EXACT** | 2026-GAOKR-002585 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/H2 | **EXACT** | 2026-FLFLS-261800142 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OSA/Bison | **EXACT** | 2026-OKOSA-002548 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Rustler | **EXACT** | 2026-TXTXS-267465 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-EVP/Chipmunk | **EXACT** | 2026-FLEVP-002565 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| GA-WSR/Main Trail | **EXACT** | 2026-GAWSR-000370 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-ANA/Sugar Creek | **EXACT** | 2026-OKANA-002553 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-ANA/2690 | **EXACT** | 2026-OKANA-002546 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MSS/Jackson HWY 90 | **EXACT** | 2026-MSMSS-018314 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MSS/Hancock Texas Flat Road | **EXACT** | 2026-MSMSS-018407 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-EVP/Movie Dome | **EXACT** | 2026-FLEVP-002542 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-EVP/Vulture | **EXACT** | 2026-FLEVP-002570 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Old Deer | **EXACT** | 2026-TXTXS-267516 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/22 | **EXACT** | 2026-FLFLS-1800143 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LMU/4-1 | **EXACT** | 2026-CALMU-005311 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-HVT/MP18 | **EXACT** | 2026-CAHVT-000753 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Frijoles | **EXACT** | 2026-NMSNF-000444 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-N2S/Rabbit Ear East | **EXACT** | 2026-NMN2S-000724 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-LNF/Sunset | **EXACT** | 2026-NMLNF-000654 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-N2S/Laughlin | **EXACT** | 2026-NMN2S-000723 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SD-PRA/Rancher | **EXACT** | 2026-SDPRA-000134 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAS/Mukluk | **EXACT** | 2026-AKTAS-613487 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 342977 ac)
- 2026-ORBUD-002696 — Coleman Creek (OR, 308863 ac)
- 2026-IDBOD-265460 — Tartar (ID, 158027 ac)
- 2026-UTFIF-260341 — Widemouth 2 (UT, 129741 ac)
- 2026-UTMLF-005112 — Babylon (UT, 107189 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-UTFIF-260198 — Cottonwood (UT, 97464 ac)
- 2026-NVCCD-030683 — Bug (CA, 93733 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79200 ac)
- 2026-ORVAD-260204 — FOX (OR, 78903 ac)
