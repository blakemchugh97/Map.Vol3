# IMSR ↔ incident-layer match — 2026-07-26

- IMSR source: `tests/imsr/out/imsr-2026-07-26-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-07-26.json` (669 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **90**
- Match rate (exact+strong+weak): **88.9%**
- EXACT **78** · STRONG **2** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **10**
- Layer records with no IMSR match: **589** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 9× — no name/unit signal in layer
- 1× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| OR-955S/Akawa Butte | **STRONG** | 2026-OR955S-000494 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Horse Ridge | **EXACT** | 2026-ORUMF-000315 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-951S/Brewer | **NO_MATCH** | — | 0.0 | — |
| OR-OCF/Mountain | **NO_MATCH** | — | 0.0 | — |
| WA-COA/Kaiser Canyon | **EXACT** | 2026-WACOA-260140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/Hay Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-WWF/Anthony | **EXACT** | 2026-ORWWF-000227 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Burnt Creek | **EXACT** | 2026-ORWWF-000342 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Dirty Face | **EXACT** | 2026-WAOWF-260504 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Powder River | **EXACT** | 2026-ORVAD-260173 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Fox | **EXACT** | 2026-ORVAD-260204 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-OCF/Coyote | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Henry | **NO_MATCH** | — | 0.0 | — |
| OR-UMF/Salmon | **EXACT** | 2026-ORUMF-000222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Olive Butte | **EXACT** | 2026-ORWWF-000224 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-711S/E Evans Creek Rd | **STRONG** | 2026-OR711S-000039 | 0.91 | name=0.8,unit=Y,st=Y,yr=Y |
| OR-VAD/Hat | **EXACT** | 2026-ORVAD-260207 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-953S/0587 Shingle | **EXACT** | 2026-OR953S-000587 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WSA/Bench | **EXACT** | 2026-ORWSA-000100 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Ptarmigan | **EXACT** | 2026-WAOWF-260448 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Big Grass | **EXACT** | 2026-ORVAD-260201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/0579 Ten Mile | **EXACT** | 2026-ORPRD-000579 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Bologna | **EXACT** | 2026-ORUMF-000298 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Railroad | **EXACT** | 2026-WAWFS-260500 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WSA/Beachcomb | **EXACT** | 2026-ORWSA-000101 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Border 2 | **EXACT** | 2026-WANCP-000266 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UPF/Castle | **EXACT** | 2026-ORUPF-260297 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-YAA/Signal Peak | **EXACT** | 2026-WAYAA-000069 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NCP/Luna | **EXACT** | 2026-WANCP-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Bradeen Hill | **EXACT** | 2026-WANES-001782 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Bob Creek | **EXACT** | 2026-ORVAD-000402 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SPD/Pearl Hill | **EXACT** | 2026-WASPD-260521 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Egypt | **EXACT** | 2026-ORMAF-002671 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Second Flat | **EXACT** | 2026-ORBUD-002693 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAR/Stubble | **EXACT** | 2026-ORMAR-002683 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Jackass Butte | **EXACT** | 2026-ORBUD-002694 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Bald Mountain | **EXACT** | 2026-ORBUD-002687 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Crater | **EXACT** | 2026-ORBUD-002680 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Modrite | **EXACT** | 2026-WANES-260149 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Stone Creek | **EXACT** | 2026-ORMAF-002667 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Dairy | **EXACT** | 2026-ORMAF-002690 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Well | **EXACT** | 2026-ORBUD-002691 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Crowley | **EXACT** | 2026-ORVAD-260203 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Locust Grove | **EXACT** | 2026-WAWFS-000711 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-NOD/Biscar | **EXACT** | 2026-CANOD-004474 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-NEU/Chute | **EXACT** | 2026-CANEU-020978 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-TNF/Elephant | **EXACT** | 2026-CATNF-001154 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Camp | **EXACT** | 2026-MNSUF-002393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Chub | **EXACT** | 2026-MNSUF-002423 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Little Knife | **EXACT** | 2026-MNSUF-002510 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Tartar | **EXACT** | 2026-IDBOD-265460 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Duncan | **EXACT** | 2026-IDBOD-000742 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Hopper | **EXACT** | 2026-IDBOD-000754 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Peer | **EXACT** | 2026-IDBOD-000764 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ECFX/Hoppie Basin | **EXACT** | 2026-NVECFX-010335 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-1AX/Claremont | **NO_MATCH** | — | 0.0 | — |
| ID-BOD/Scorp | **EXACT** | 2026-IDBOD-000773 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Stookey | **EXACT** | 2026-UTWDD-200417 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Babylon | **EXACT** | 2026-UTMLF-005112 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-FIF/Cottonwood | **EXACT** | 2026-UTFIF-260198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Beck | **EXACT** | 2026-IDBOD-000760 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SC-FMF/Horse Island | **EXACT** | 2026-SCFMF-000363 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| GA-GAS/Buie Driggers Rd | **EXACT** | 2026-GAGAS-042701 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Mailbox | **EXACT** | 2026-FLFNF-002135 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Hill Bay | **EXACT** | 2026-NCNCS-260064 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| LA-SBR/Brown Ditch | **EXACT** | 2026-LASBR-000237 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/06 | **NO_MATCH** | — | 0.0 | — |
| LA-SBR/West Blue Crab | **EXACT** | 2026-LASBR-000235 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| LA-SBR/Boardwalk | **EXACT** | 2026-LASBR-000240 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-MRF/Fishhook | **NO_MATCH** | — | 0.0 | — |
| CO-SJF/Ferris | **EXACT** | 2026-COSJF-000536 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-WRD/Keystone | **EXACT** | 2026-COWRD-000957 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-MFX/Fuhr Gulch | **EXACT** | 2026-COMFX-000964 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Mt Carmel | **EXACT** | 2026-COPSF-001391 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-BDU/Cinder Complex | **NO_MATCH** | — | 0.0 | — |
| CA-BDU/Rock | **EXACT** | 2026-CABDU-011136 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-MMU/Fields | **EXACT** | 2026-CAMMU-015106 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 149705 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 79198 ac)
- 2026-ORPRD-000476 — 0476 HOAG (OR, 50224 ac)
- 2026-OR951S-000433 — 0433 BREWER (OR, 37319 ac)
- 2026-ORBUD-002696 — Coleman Creek (OR, 34000 ac)
- 2026-WAWFS-260428 — LYONS FERRY (WA, 33749 ac)
- 2026-UTDRD-005113 — Snyder (UT, 28264 ac)
- 2026-ORPRD-000497 — 0497 HENRY (OR, 27710 ac)
- 2026-AZCOF-000781 — Pocket (AZ, 27393 ac)
- 2026-NVELD-040106 — Grapevine (NV, 26464 ac)
