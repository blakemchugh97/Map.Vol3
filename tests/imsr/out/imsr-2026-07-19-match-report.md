# IMSR ↔ incident-layer match — 2026-07-19

- IMSR source: `tests/imsr/out/imsr-2026-07-19-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-07-19.json` (542 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **71**
- Match rate (exact+strong+weak): **83.1%**
- EXACT **55** · STRONG **4** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **12**
- Layer records with no IMSR match: **483** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 11× — no name/unit signal in layer
- 1× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| WA-COA/Kaiser Canyon | **EXACT** | 2026-WACOA-260140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-951S/Brewer | **NO_MATCH** | — | 0.0 | — |
| OR-955S/Akawa Butte | **STRONG** | 2026-OR955S-000494 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| OR-PRD/Pilot | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Hay Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-711S/E Evans Creek Rd | **STRONG** | 2026-OR711S-000039 | 0.91 | name=0.8,unit=Y,st=Y,yr=Y |
| OR-UMF/Salmon | **EXACT** | 2026-ORUMF-000222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Olive Butte | **EXACT** | 2026-ORWWF-000224 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Anthony | **EXACT** | 2026-ORWWF-000227 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-OCF/Coyote | **STRONG** | 2026-ORUMF-000318 | 0.75 | name=EX,unit=n,st=Y,yr=Y |
| OR-PRD/Henry | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Powder River | **EXACT** | 2026-ORVAD-260173 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Horse Ridge | **EXACT** | 2026-ORUMF-000315 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Modrite | **EXACT** | 2026-WANES-260149 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-MCR/Royal Lake | **EXACT** | 2026-WAMCR-260429 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Lyons Ferry | **EXACT** | 2026-WAWFS-260428 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Devils Canyon | **NO_MATCH** | — | 0.0 | — |
| WA-WFS/Neff Jones | **EXACT** | 2026-WAWFS-260423 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Bologna | **EXACT** | 2026-ORUMF-000298 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Burnt Creek | **EXACT** | 2026-ORWWF-000342 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Wallace Walker | **EXACT** | 2026-WAWFS-260455 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Egypt | **EXACT** | 2026-ORMAF-002671 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Riddle | **EXACT** | 2026-ORBUD-002665 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/B And O | **EXACT** | 2026-WANES-001607 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-973S/Lower Dry Creek Mutual Aid | **EXACT** | 2026-OR973S-000268 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SPD/Ruby | **EXACT** | 2026-WASPD-260440 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-MRF/Fishhook | **NO_MATCH** | — | 0.0 | — |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-SJF/Ferris | **EXACT** | 2026-COSJF-000536 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-WRD/P L Gulch | **EXACT** | 2026-COWRD-000853 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-2NS/Chub | **EXACT** | 2026-MN2NS-002423 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Camp | **EXACT** | 2026-MNSUF-002393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Little Knife | **EXACT** | 2026-MNSUF-002510 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-EIS/Ohio | **EXACT** | 2026-IDEIS-000139 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-1AX/Claremont | **NO_MATCH** | — | 0.0 | — |
| ID-TFD/Grassy Hills | **EXACT** | 2026-IDTFD-000140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Stookey | **EXACT** | 2026-UTWDD-200417 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Babylon | **EXACT** | 2026-UTMLF-005112 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-FIF/Cottonwood | **EXACT** | 2026-UTFIF-260198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-UWF/Buck Basin | **EXACT** | 2026-UTUWF-200428 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-TFD/Sailor | **NO_MATCH** | — | 0.0 | — |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NIA/Turner | **EXACT** | 2026-IDNIA-000405 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Berger 50 | **NO_MATCH** | — | 0.0 | — |
| VA-VAF/Taylor Hollow | **EXACT** | 2026-VAVAF-260102 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Hill Bay | **EXACT** | 2026-NCNCS-260064 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/06 | **NO_MATCH** | — | 0.0 | — |
| FL-FLS/Broward 06 | **NO_MATCH** | — | 0.0 | — |
| FL-BCP/Charger 2 | **EXACT** | 2026-FLBCP-002227 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Sand Mine 53 | **STRONG** | 2026-FLFLS-261400366 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| FL-FNF/Mailbox | **EXACT** | 2026-FLFNF-002135 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-EVP/Sawgrass | **EXACT** | 2026-FLEVP-002232 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-NOD/Biscar | **EXACT** | 2026-CANOD-004474 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-SHU/Brook | **EXACT** | 2026-CASHU-008640 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-TNF/Elephant | **EXACT** | 2026-CATNF-001154 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LMU/Loomis | **EXACT** | 2026-CALMU-004291 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-PNF/Twain | **EXACT** | 2026-CAPNF-001305 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-SDU/Thorn | **EXACT** | 2026-CASDU-016203 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LAC/Summit | **EXACT** | 2026-CALAC-240823 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-N5S/Long Ridge | **EXACT** | 2026-NMN5S-000565 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-COF/Pocket | **EXACT** | 2026-AZCOF-000781 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Sacaton | **EXACT** | 2026-NMGNF-000354 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000476 — 0476 HOAG (OR, 50403 ac)
- 2026-UTSCS-260194 — Iron (UT, 41842 ac)
- 2026-UTWDD-260218 — Cherry (UT, 34252 ac)
- 2026-UTDRD-005113 — Snyder (UT, 28264 ac)
- 2026-NVELD-040106 — Grapevine (NV, 26464 ac)
- 2026-UTWDD-200282 — Hastings (UT, 26355 ac)
- 2026-WAYAA-000023 — 4170 Tule Rd (WA, 24180.23 ac)
- 2026-FLFLS-261800092 — QUARRY 2 (13) (FL, 19018 ac)
- 2026-NVELD-040107 — Kane Springs (NV, 17042 ac)
- 2026-ORPRD-000449 — 0449 PORCUPINE RIDGE (OR, 15621 ac)
