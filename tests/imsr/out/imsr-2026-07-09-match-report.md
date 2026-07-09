# IMSR ↔ incident-layer match — 2026-07-09

- IMSR source: `tests/imsr/out/imsr-2026-07-09-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-07-09.json` (545 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **42**
- Match rate (exact+strong+weak): **95.2%**
- EXACT **40** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **2**
- Layer records with no IMSR match: **505** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer
- 1× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-SJF/Ferris | **EXACT** | 2026-COSJF-000536 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-1AX/Claremont | **NO_MATCH** | — | 0.0 | — |
| UT-FIF/Cottonwood | **EXACT** | 2026-UTFIF-260198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Babylon | **EXACT** | 2026-UTMLF-005112 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-FIF/Wild Goose | **EXACT** | 2026-UTFIF-260220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Parsnip Peak | **EXACT** | 2026-NVELD-040135 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Grapevine | **EXACT** | 2026-NVELD-040106 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-BTF/Kinky Creek | **EXACT** | 2026-WYBTF-002606 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-DRD/Snyder | **EXACT** | 2026-UTDRD-005113 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IFD/Maze | **EXACT** | 2026-IDIFD-000096 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Salmon | **EXACT** | 2026-ORUMF-000222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-973S/North Cayuse | **EXACT** | 2026-OR973S-000206 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SES/Ryegrass Coulee | **EXACT** | 2026-WASES-260359 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-BUD/Hoop | **EXACT** | 2026-ORBUD-002650 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SES/Chelan Hills | **EXACT** | 2026-WASES-260321 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SES/Navarre Coulee | **EXACT** | 2026-WASES-260329 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-COF/Pocket | **EXACT** | 2026-AZCOF-000781 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Sacaton | **EXACT** | 2026-NMGNF-000354 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-CAF/Beehive | **EXACT** | 2026-NMCAF-000357 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-FAS/Tatlanika | **EXACT** | 2026-AKFAS-611246 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Pogo | **EXACT** | 2026-AKDAS-612223 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Shaw | **EXACT** | 2026-AKDAS-612226 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-SWS/Hoholitna | **EXACT** | 2026-AKSWS-604220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Big | **EXACT** | 2026-AKTAD-000313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Siruk | **EXACT** | 2026-AKTAD-000340 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Ishtalitna | **EXACT** | 2026-AKTAD-000354 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Mustang | **EXACT** | 2026-AKTAD-000368 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-UYD/Polly | **EXACT** | 2026-AKUYD-000228 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Michigan | **EXACT** | 2026-AKTAD-000309 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-GAD/Mud | **EXACT** | 2026-AKGAD-000287 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-CMS/Shingle Creek | **EXACT** | 2026-IDCMS-000183 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-LG13/Deer Hollow | **EXACT** | 2026-MTLG13-000199 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LMU/3-1 Pit | **EXACT** | 2026-CALMU-004201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-MMU/Van | **EXACT** | 2026-CAMMU-013885 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-SLU/Bear | **NO_MATCH** | — | 0.0 | — |
| FL-EVP/Avocado | **EXACT** | 2026-FLEVP-002146 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SC-SCS/Can City | **EXACT** | 2026-SCSCS-002663 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| SC-SCS/Groton Road | **EXACT** | 2026-SCSCS-265648 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-UTSCS-260194 — Iron (UT, 41842 ac)
- 2026-NENBF-260530 — South Fork (NE, 39696 ac)
- 2026-UTWDD-260218 — Cherry (UT, 34252 ac)
- 2026-UTWDD-200282 — Hastings (UT, 26355 ac)
- 2026-WAYAA-000023 — 4170 Tule Rd (WA, 24180.23 ac)
- 2026-FLFLS-261800092 — QUARRY 2 (13) (FL, 19018 ac)
- 2026-NVELD-040107 — Kane Springs (NV, 17042 ac)
- 2026-NVHUMX-020340 — Dutch Flat (NV, 15558 ac)
- 2026-WAMCR-260297 — LAMBDIN (WA, 12776 ac)
- 2026-FLFLS-261800098 — AREA 2 (FL, 12000 ac)
