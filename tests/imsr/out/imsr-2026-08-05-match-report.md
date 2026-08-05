# IMSR ↔ incident-layer match — 2026-08-05

- IMSR source: `tests/imsr/out/imsr-2026-08-05-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-08-05.json` (579 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **95**
- Match rate (exact+strong+weak): **93.7%**
- EXACT **86** · STRONG **3** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **6**
- Layer records with no IMSR match: **490** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 6× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| WA-NES/Old Trails | **EXACT** | 2026-WANES-001845 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Autumn Lane | **EXACT** | 2026-WANES-001857 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Fairview | **EXACT** | 2026-WANES-001852 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Modrite | **EXACT** | 2026-WANES-260149 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Bradeen Hill | **EXACT** | 2026-WANES-001782 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SPA/Mitre Rock | **EXACT** | 2026-WASPA-001868 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Hudspeth | **EXACT** | 2026-WANES-001860 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Sinlahekin | **EXACT** | 2026-WANES-001791 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-COA/Kaiser Canyon | **EXACT** | 2026-WACOA-260140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Horse Ridge | **EXACT** | 2026-ORUMF-000315 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Hat | **EXACT** | 2026-ORVAD-260207 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Big Grass | **EXACT** | 2026-ORVAD-260201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-UPF/Castle | **EXACT** | 2026-ORUPF-260297 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Second Flat | **EXACT** | 2026-ORBUD-002693 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Coleman Creek | **EXACT** | 2026-ORBUD-002696 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-953S/0587 Shingle | **EXACT** | 2026-OR953S-000587 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-OCF/Coyote | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Henry | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Powder River | **EXACT** | 2026-ORVAD-260173 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Fox | **EXACT** | 2026-ORVAD-260204 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Bob Creek | **EXACT** | 2026-ORVAD-000402 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WSA/Bench | **EXACT** | 2026-ORWSA-000100 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-OCF/0658 Round Butte | **EXACT** | 2026-OROCF-000658 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-711S/E Evans Creek Rd | **STRONG** | 2026-OR711S-000039 | 0.91 | name=0.8,unit=Y,st=Y,yr=Y |
| OR-712S/I5 MM 57 Nb | **EXACT** | 2026-OR712S-020327 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Ptarmigan | **EXACT** | 2026-WAOWF-260448 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Jackass Butte | **EXACT** | 2026-ORBUD-002694 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Bald Mountain | **EXACT** | 2026-ORBUD-002687 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAR/Stubble | **EXACT** | 2026-ORMAR-002683 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Crater | **EXACT** | 2026-ORBUD-002680 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-GPF/Skyo | **EXACT** | 2026-WAGPF-000669 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Burnt Creek | **EXACT** | 2026-ORWWF-000342 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Salmon | **EXACT** | 2026-ORUMF-000222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Olive Butte | **EXACT** | 2026-ORWWF-000224 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-955S/Akawa Butte | **STRONG** | 2026-OR955S-000494 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| OR-974S/Eggo | **EXACT** | 2026-OR974S-000423 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Luna | **EXACT** | 2026-WANCP-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Egypt | **EXACT** | 2026-ORMAF-002671 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Anthony | **EXACT** | 2026-ORWWF-000227 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Bologna | **EXACT** | 2026-ORUMF-000298 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-YAA/Mccullough Rd | **STRONG** | 2026-WAYAA-000076 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| WA-YAA/Ransier | **EXACT** | 2026-WAYAA-000072 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-FIF/Widemouth 2 | **EXACT** | 2026-UTFIF-260341 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Tartar | **EXACT** | 2026-IDBOD-265460 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-HTF/Ward | **EXACT** | 2026-NVHTF-040303 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Black Canyon | **EXACT** | 2026-UTMLF-005244 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IFD/Big Rock | **EXACT** | 2026-IDIFD-000152 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-CCD/New Pass | **EXACT** | 2026-NVCCD-030614 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-SCF/Doublesprings | **EXACT** | 2026-IDSCF-260103 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-SND/Quail Springs | **EXACT** | 2026-NVSND-500738 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-EKD/Antelope Creek | **EXACT** | 2026-NVEKD-010378 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Skillet | **EXACT** | 2026-MTFNF-000306 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Bobcat Lakes | **EXACT** | 2026-MTBDF-266313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-LNF/Elder 1 | **EXACT** | 2026-MTLNF-260296 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Sand Creek | **EXACT** | 2026-MTBDF-266319 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-HLF/Ant Park | **EXACT** | 2026-MTHLF-000529 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BDF/Moose | **EXACT** | 2026-MTBDF-266293 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FNF/Silvertip | **EXACT** | 2026-MTFNF-000280 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Moose Mountain | **EXACT** | 2026-IDNCF-000349 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-MCD/Griffin | **EXACT** | 2026-MTMCD-000641 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-BRF/North Fork Lost Horse | **EXACT** | 2026-MTBRF-000255 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Cascade | **EXACT** | 2026-IDNCF-000283 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NCF/Wolf Creek | **EXACT** | 2026-IDNCF-000295 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-LG12/Kimmit | **NO_MATCH** | — | 0.0 | — |
| CA-TCU/Gann | **EXACT** | 2026-CATCU-011483 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-BDU/Cinder | **NO_MATCH** | — | 0.0 | — |
| CA-BDU/Rock | **EXACT** | 2026-CABDU-011136 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-SDU/Grade | **EXACT** | 2026-CASDU-017420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-SJF/Rio Blanco | **EXACT** | 2026-COSJF-000806 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-MEU/Feliz | **EXACT** | 2026-CAMEU-008929 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-NEU/Chute | **EXACT** | 2026-CANEU-020978 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Wolfpack | **EXACT** | 2026-MNSUF-002417 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Camp | **EXACT** | 2026-MNSUF-002393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Little Knife | **EXACT** | 2026-MNSUF-002510 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-N6S/L Bar Ranch | **EXACT** | 2026-NMN6S-000499 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-N6S/Frio | **EXACT** | 2026-NMN6S-000506 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Bear Hallow | **EXACT** | 2026-TXTXS-266543 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/Dennis Rock | **EXACT** | 2026-OKOKS-260776 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Mailbox | **EXACT** | 2026-FLFNF-002135 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/06 | **NO_MATCH** | — | 0.0 | — |
| FL-EVP/Bluegill | **EXACT** | 2026-FLEVP-002390 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 307661 ac)
- 2026-UTMLF-005112 — Babylon (UT, 107189 ac)
- 2026-UTFIF-260198 — Cottonwood (UT, 97464 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79200 ac)
- 2026-OR951S-000433 — 0433 BREWER (OR, 70821 ac)
- 2026-CANOD-004474 — BISCAR (CA, 69352 ac)
- 2026-COSJF-000536 — Ferris (CO, 64881 ac)
- 2026-ORPRD-000476 — 0476 HOAG (OR, 50224 ac)
- 2026-ORPRD-000567 — 0567 LITTLE BUCK (OR, 43818 ac)
- 2026-NVNAFQ-500729 — MOUSE MEADOW (NV, 38000 ac)
