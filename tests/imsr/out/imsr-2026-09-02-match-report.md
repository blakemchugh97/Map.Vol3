# IMSR ↔ incident-layer match — 2026-09-02

- IMSR source: `tests/imsr/out/imsr-2026-09-02-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-09-02.json` (640 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **87**
- Match rate (exact+strong+weak): **93.1%**
- EXACT **80** · STRONG **1** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **6**
- Layer records with no IMSR match: **559** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 4× — state_conflict (name matched but states differ)
- 2× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| ID-BOF/Crooked | **EXACT** | 2026-IDBOF-000958 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-WID/McConnell | **EXACT** | 2026-NVWID-020620 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-CCD/Blue Eagle | **EXACT** | 2026-NVCCD-030758 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-HTF/Calico | **EXACT** | 2026-NVHTF-020624 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Flint | **EXACT** | 2026-IDBOD-000994 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Wagon | **EXACT** | 2026-IDBOD-001046 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-UOA/Slough Canyon | **EXACT** | 2026-UTUOA-100254 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-SCF/Doublesprings | **EXACT** | 2026-IDSCF-260103 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Tom Creek | **EXACT** | 2026-UTWDD-200672 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/McCully | **EXACT** | 2026-ORWWF-000531 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/The Narrows | **EXACT** | 2026-ORMHF-000855 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Three Queens | **EXACT** | 2026-WAOWF-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/King | **EXACT** | 2026-WAOWF-260699 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Goat | **EXACT** | 2026-WAOWF-260711 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MRP/Wonderland Complex | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-FWF/Wrights Spring | **EXACT** | 2026-ORFWF-260286 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Luna | **EXACT** | 2026-WANCP-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-GPF/High Lava | **EXACT** | 2026-WAGPF-000684 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Big Grass | **EXACT** | 2026-ORVAD-260201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MSF/Electric | **EXACT** | 2026-WAMSF-000494 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Thunder Creek | **EXACT** | 2026-WANCP-000482 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Ptarmigan | **EXACT** | 2026-WAOWF-260448 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-COA/Kaiser Canyon | **EXACT** | 2026-WACOA-260140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Egypt | **EXACT** | 2026-ORMAF-002671 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Dudley | **EXACT** | 2026-IDIPF-000730 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Bobcat Lakes | **EXACT** | 2026-MTBDF-266313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Moose | **EXACT** | 2026-MTBDF-266293 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Skull | **EXACT** | 2026-MTBDF-266401 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Nature Grove | **EXACT** | 2026-MTBRF-000340 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
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
| MT-BRF/Scimitar | **NO_MATCH** | — | 0.0 | — |
| MT-NWS/Deer Creek | **EXACT** | 2026-MTNWS-000387 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Grotto | **EXACT** | 2026-IDNCF-000348 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Three Links | **EXACT** | 2026-IDNCF-000330 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Wolf Creek | **EXACT** | 2026-IDNCF-000295 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Ross | **EXACT** | 2026-TXTXS-267549 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Crumb Creek | **EXACT** | 2026-OKOKS-260934 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Alexander Trail | **EXACT** | 2026-OKOKS-260966 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/River Bluff | **EXACT** | 2026-TXTXS-267932 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Wildhorse Creek | **STRONG** | 2026-OKOKSC-260957 | 0.75 | name=EX,unit=n,st=Y,yr=Y |
| AR-OUF/West Glover | **NO_MATCH** | — | 0.0 | — |
| TX-TXS/Harris | **EXACT** | 2026-TXTXS-267913 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/McKee Draw | **EXACT** | 2026-TXTXS-267823 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-ANA/Railroad South | **EXACT** | 2026-OKANA-002686 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OMA/Wright | **EXACT** | 2026-OKOMA-002688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| GA-WSR/Main Trail | **EXACT** | 2026-GAWSR-000370 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Black Fox | **EXACT** | 2026-OKOKS-260983 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Sandy | **EXACT** | 2026-TXTXS-267837 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Crow | **EXACT** | 2026-TXTXS-267921 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OSA/Bison | **EXACT** | 2026-OKOSA-002548 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Plaskett | **EXACT** | 2026-CALPF-002475 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-NOD/S 1 Vya | **NO_MATCH** | — | 0.0 | — |
| CA-HVT/MP18 | **EXACT** | 2026-CAHVT-000753 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-GCP/Mount Emma | **EXACT** | 2026-AZGCP-000949 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Frijoles | **EXACT** | 2026-NMSNF-000444 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-CIF/Whiskey | **EXACT** | 2026-NMCIF-000540 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-CAF/Mogote Ridge | **EXACT** | 2026-NMCAF-000747 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-LNF/Sunset | **EXACT** | 2026-NMLNF-000654 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-FTA/Paddy Creek | **EXACT** | 2026-AZFTA-000812 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-N4S/4V | **EXACT** | 2026-NMN4S-000549 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAS/Mukluk | **EXACT** | 2026-AKTAS-613487 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 342923 ac)
- 2026-ORBUD-002696 — Coleman Creek (OR, 308863 ac)
- 2026-IDBOD-265460 — Tartar (ID, 158027 ac)
- 2026-UTFIF-260341 — Widemouth 2 (UT, 129741 ac)
- 2026-IDTFD-000216 — Wildhorse (ID, 107562.85 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-UTFIF-260198 — Cottonwood (UT, 97464 ac)
- 2026-NVCCD-030683 — Bug (CA, 93733 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79200 ac)
- 2026-ORVAD-260204 — FOX (OR, 78903 ac)
