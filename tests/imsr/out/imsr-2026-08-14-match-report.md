# IMSR ↔ incident-layer match — 2026-08-14

- IMSR source: `tests/imsr/out/imsr-2026-08-14-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-08-14.json` (596 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **96**
- Match rate (exact+strong+weak): **95.8%**
- EXACT **91** · STRONG **1** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **4**
- Layer records with no IMSR match: **504** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 3× — no name/unit signal in layer
- 1× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Three Queens | **EXACT** | 2026-WAOWF-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MRP/Grand Park 2 | **EXACT** | 2026-WAMRP-000847 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Big Grass | **EXACT** | 2026-ORVAD-260201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-FWF/Wrights Spring | **EXACT** | 2026-ORFWF-260286 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Bologna | **EXACT** | 2026-ORUMF-000298 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-952S/Cottonwood | **EXACT** | 2026-OR952S-026181 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-952S/Little Bear | **EXACT** | 2026-OR952S-026183 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-COA/Kaiser Canyon | **EXACT** | 2026-WACOA-260140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Modrite | **EXACT** | 2026-WANES-260149 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Bradeen Hill | **EXACT** | 2026-WANES-001782 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Hudspeth | **EXACT** | 2026-WANES-001860 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Ptarmigan | **EXACT** | 2026-WAOWF-260448 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Old Trails | **EXACT** | 2026-WANES-001845 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Autumn Lane | **EXACT** | 2026-WANES-001857 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Fairview | **EXACT** | 2026-WANES-001852 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Second Flat | **EXACT** | 2026-ORBUD-002693 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Coleman Creek | **EXACT** | 2026-ORBUD-002696 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Bald Mountain | **EXACT** | 2026-ORBUD-002687 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-953S/0587 Shingle | **EXACT** | 2026-OR953S-000587 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-OCF/Coyote | **NO_MATCH** | — | 0.0 | — |
| WA-GPF/High Lava | **EXACT** | 2026-WAGPF-000684 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Luna | **EXACT** | 2026-WANCP-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UPF/Castle | **EXACT** | 2026-ORUPF-260297 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NWS/Prairie Mountain | **EXACT** | 2026-WANWS-000125 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Alpowa | **EXACT** | 2026-WAWFS-001959 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-712S/Fielder Mtn | **EXACT** | 2026-OR712S-030327 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-711S/E Evans Creek Rd | **STRONG** | 2026-OR711S-000039 | 0.91 | name=0.8,unit=Y,st=Y,yr=Y |
| OR-974S/Eggo | **EXACT** | 2026-OR974S-000423 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Fox | **EXACT** | 2026-ORVAD-260204 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Burnt Creek | **EXACT** | 2026-ORWWF-000342 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Egypt | **EXACT** | 2026-ORMAF-002671 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Anthony | **EXACT** | 2026-ORWWF-000227 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WSA/Bench | **EXACT** | 2026-ORWSA-000100 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Salmon | **EXACT** | 2026-ORUMF-000222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SPD/Nunamaker Road | **EXACT** | 2026-WASPD-260605 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-GPF/Skyo | **EXACT** | 2026-WAGPF-000669 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-CCD/Bug | **NO_MATCH** | — | 0.0 | — |
| UT-FIF/Widemouth 2 | **EXACT** | 2026-UTFIF-260341 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-NWS/Rocky Canyon | **EXACT** | 2026-UTNWS-200580 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Black Canyon | **EXACT** | 2026-UTMLF-005244 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-SWS/MM81 HWY55 | **EXACT** | 2026-IDSWS-000919 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-SCF/Doublesprings | **EXACT** | 2026-IDSCF-260103 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-PAF/Lake | **EXACT** | 2026-IDPAF-265532 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-BTF/Bare | **EXACT** | 2026-WYBTF-002621 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Tartar | **EXACT** | 2026-IDBOD-265460 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-HTF/Ward | **EXACT** | 2026-NVHTF-040303 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-CCD/New Pass | **EXACT** | 2026-NVCCD-030614 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-SWS/MM115 HWY 20 | **EXACT** | 2026-IDSWS-000901 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Porcupine | **EXACT** | 2026-IDIPF-000495 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Bobcat Lakes | **EXACT** | 2026-MTBDF-266313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Skillet | **EXACT** | 2026-MTFNF-000306 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Moose | **EXACT** | 2026-MTBDF-266293 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-HLF/Ant Park | **EXACT** | 2026-MTHLF-000529 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/Black Bear | **EXACT** | 2026-MTBRF-000282 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/North Fork Lost Horse | **EXACT** | 2026-MTBRF-000255 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Silvertip | **EXACT** | 2026-MTFNF-000280 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Moose Mountain | **EXACT** | 2026-IDNCF-000349 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-LSX/Post | **EXACT** | 2026-COLSX-001549 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-LSX/Sheep Pen | **EXACT** | 2026-COLSX-001553 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SD-PRA/Rancher | **EXACT** | 2026-SDPRA-000134 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SD-PRA/Redwood | **EXACT** | 2026-SDPRA-000133 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-WBD/Weiser Knoll | **EXACT** | 2026-WYWBD-000294 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SD-PRA/XU Hill | **EXACT** | 2026-SDPRA-000130 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GFX/310 | **EXACT** | 2026-COGFX-260411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-SLU/Plains | **NO_MATCH** | — | 0.0 | — |
| CA-HVT/MP18 | **EXACT** | 2026-CAHVT-000753 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Frijoles | **EXACT** | 2026-NMSNF-000444 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Johnson | **EXACT** | 2026-NMGNF-000506 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Pump Station | **EXACT** | 2026-OKOKS-260838 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| VA-VAS/Clearwater | **EXACT** | 2026-VAVAS-ER2600665 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Grass Burr | **EXACT** | 2026-TXTXS-266910 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| LA-LAS/State Line | **EXACT** | 2026-LALAS-000267 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Dos Pistolas | **EXACT** | 2026-TXTXS-266829 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-LWR/Jones Island | **EXACT** | 2026-FLLWR-002456 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Mill Creek | **EXACT** | 2026-OKOKS-260823 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Wolfpack | **EXACT** | 2026-MNSUF-002417 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Camp | **EXACT** | 2026-MNSUF-002393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-FAS/Tatlanika | **EXACT** | 2026-AKFAS-611246 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 344909 ac)
- 2026-UTMLF-005112 — Babylon (UT, 107189 ac)
- 2026-UTFIF-260198 — Cottonwood (UT, 97464 ac)
- 2026-NVCCD-030683 — Bug (CA, 88422 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79200 ac)
- 2026-OR951S-000433 — 0433 BREWER (OR, 70821 ac)
- 2026-COSJF-000536 — Ferris (CO, 64881 ac)
- 2026-NVNAFQ-500729 — MOUSE MEADOW (NV, 52000 ac)
- 2026-ORPRD-000476 — 0476 HOAG (OR, 50224 ac)
- 2026-ORPRD-000567 — 0567 LITTLE BUCK (OR, 43818 ac)
