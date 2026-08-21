# IMSR ↔ incident-layer match — 2026-08-21

- IMSR source: `tests/imsr/out/imsr-2026-08-21-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-08-21.json` (585 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **75**
- Match rate (exact+strong+weak): **94.7%**
- EXACT **70** · STRONG **1** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **4**
- Layer records with no IMSR match: **514** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 3× — no name/unit signal in layer
- 1× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Three Queens | **EXACT** | 2026-WAOWF-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MRP/Grand Park 2 | **EXACT** | 2026-WAMRP-000847 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/The Narrows | **EXACT** | 2026-ORMHF-000855 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-FWF/Wrights Spring | **EXACT** | 2026-ORFWF-260286 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Big Grass | **EXACT** | 2026-ORVAD-260201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-COA/Kaiser Canyon | **EXACT** | 2026-WACOA-260140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Modrite | **EXACT** | 2026-WANES-260149 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-712S/Fielder Mtn | **EXACT** | 2026-OR712S-030327 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Bologna | **EXACT** | 2026-ORUMF-000298 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-952S/Little Bear | **EXACT** | 2026-OR952S-026183 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-953S/Rosenbaum | **NO_MATCH** | — | 0.0 | — |
| OR-952S/Cottonwood | **EXACT** | 2026-OR952S-026181 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-GPF/High Lava | **EXACT** | 2026-WAGPF-000684 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Luna | **EXACT** | 2026-WANCP-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Balky Hill | **NO_MATCH** | — | 0.0 | — |
| WA-OWF/Ptarmigan | **EXACT** | 2026-WAOWF-260448 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-LAD/Picture Rock | **EXACT** | 2026-ORLAD-260313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-953S/0587 Shingle | **EXACT** | 2026-OR953S-000587 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Second Flat | **EXACT** | 2026-ORBUD-002693 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-711S/E Evans Creek Rd | **STRONG** | 2026-OR711S-000039 | 0.91 | name=0.8,unit=Y,st=Y,yr=Y |
| OR-MAF/Egypt | **EXACT** | 2026-ORMAF-002671 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NWS/Prairie Mountain | **EXACT** | 2026-WANWS-000125 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-NWS/Deer Creek | **EXACT** | 2026-MTNWS-000387 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-LG32/Windmill | **EXACT** | 2026-MTLG32-261150 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Bobcat Lakes | **EXACT** | 2026-MTBDF-266313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Skillet | **EXACT** | 2026-MTFNF-000306 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Moose | **EXACT** | 2026-MTBDF-266293 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-LNF/Cherry Peak | **EXACT** | 2026-MTLNF-260379 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Moose Mountain | **EXACT** | 2026-IDNCF-000349 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-HLF/Ant Park | **EXACT** | 2026-MTHLF-000529 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Black Bear | **EXACT** | 2026-MTBRF-000282 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Porcupine | **EXACT** | 2026-IDIPF-000495 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/North Fork Lost Horse | **EXACT** | 2026-MTBRF-000255 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Silvertip | **EXACT** | 2026-MTFNF-000280 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-CRA/Sarpy | **EXACT** | 2026-MTCRA-261132 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Little Weitas | **EXACT** | 2026-IDNCF-000333 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-CCD/Shoshone | **EXACT** | 2026-NVCCD-030721 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOF/Crooked | **EXACT** | 2026-IDBOF-000958 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-CAX/North Heglar | **EXACT** | 2026-IDCAX-000198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Black Canyon | **EXACT** | 2026-UTMLF-005244 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-NWS/Rocky Canyon | **EXACT** | 2026-UTNWS-200580 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-BRS/Little Mountain | **EXACT** | 2026-UTBRS-200627 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-UOA/Slough Canyon | **EXACT** | 2026-UTUOA-100254 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-CCD/Bug | **NO_MATCH** | — | 0.0 | — |
| ID-SCF/Doublesprings | **EXACT** | 2026-IDSCF-260103 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-FIF/Widemouth 2 | **EXACT** | 2026-UTFIF-260341 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-CMX/West Coal Creek | **EXACT** | 2026-WYCMX-000425 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SD-PRA/Rancher | **EXACT** | 2026-SDPRA-000134 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-LSX/Post | **EXACT** | 2026-COLSX-001549 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-HVT/MP18 | **EXACT** | 2026-CAHVT-000753 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-EVP/Movie Dome | **EXACT** | 2026-FLEVP-002542 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| GA-WSR/Main Trail | **EXACT** | 2026-GAWSR-000370 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MSS/Jackson HWY 90 | **EXACT** | 2026-MSMSS-018314 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Casey Lake | **EXACT** | 2026-TXTXS-267198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Frijoles | **EXACT** | 2026-NMSNF-000444 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAS/Mukluk | **EXACT** | 2026-AKTAS-613487 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 345113 ac)
- 2026-ORBUD-002696 — Coleman Creek (OR, 308863 ac)
- 2026-IDBOD-265460 — Tartar (ID, 158027 ac)
- 2026-UTMLF-005112 — Babylon (UT, 107189 ac)
- 2026-UTFIF-260198 — Cottonwood (UT, 97464 ac)
- 2026-NVCCD-030683 — Bug (CA, 93733 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79200 ac)
- 2026-ORVAD-260204 — FOX (OR, 78903 ac)
- 2026-ORBUD-002687 — Bald Mountain (OR, 76443 ac)
- 2026-OR951S-000433 — 0433 BREWER (OR, 70821 ac)
