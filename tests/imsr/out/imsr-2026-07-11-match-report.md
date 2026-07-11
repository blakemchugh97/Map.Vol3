# IMSR ↔ incident-layer match — 2026-07-11

- IMSR source: `tests/imsr/out/imsr-2026-07-11-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-07-11.json` (475 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **42**
- Match rate (exact+strong+weak): **97.6%**
- EXACT **39** · STRONG **2** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **434** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-SJF/Ferris | **EXACT** | 2026-COSJF-000536 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-1AX/Claremont | **NO_MATCH** | — | 0.0 | — |
| UT-FIF/Cottonwood | **EXACT** | 2026-UTFIF-260198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Babylon | **EXACT** | 2026-UTMLF-005112 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-EKD/Jim Mtn | **EXACT** | 2026-NVEKD-010251 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-FIF/Wild Goose | **EXACT** | 2026-UTFIF-260220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-TFD/Martin | **EXACT** | 2026-IDTFD-000119 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-DRD/Snyder | **EXACT** | 2026-UTDRD-005113 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Salmon | **EXACT** | 2026-ORUMF-000222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-973S/North Cayuse | **EXACT** | 2026-OR973S-000206 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Anthony | **EXACT** | 2026-ORWWF-000227 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/B And O | **EXACT** | 2026-WANES-001607 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-YAA/HWY 97 Mp 43 | **EXACT** | 2026-WAYAA-000055 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-711S/E Evans Creek Rd | **STRONG** | 2026-OR711S-000039 | 0.91 | name=0.8,unit=Y,st=Y,yr=Y |
| OR-BUD/Hoop | **EXACT** | 2026-ORBUD-002650 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SES/Chelan Hills | **EXACT** | 2026-WASES-260321 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-SES/Navarre Coulee | **EXACT** | 2026-WASES-260329 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LAC/Summit | **EXACT** | 2026-CALAC-240823 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-MMU/Van | **EXACT** | 2026-CAMMU-013885 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LMU/3-1 Pit | **EXACT** | 2026-CALMU-004201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-CMS/Shingle Creek | **EXACT** | 2026-IDCMS-000183 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Mailbox | **EXACT** | 2026-FLFNF-002135 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Sand Mine 53 | **STRONG** | 2026-FLFLS-261400366 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| TX-TXS/Cusenbarry Draw | **EXACT** | 2026-TXTXS-265876 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TX-TXS/Getaway Pens | **EXACT** | 2026-TXTXS-265848 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-EVP/Avocado | **EXACT** | 2026-FLEVP-002146 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Hill Bay | **EXACT** | 2026-NCNCS-260064 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-COF/Pocket | **EXACT** | 2026-AZCOF-000781 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Sacaton | **EXACT** | 2026-NMGNF-000354 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-CAF/Beehive | **EXACT** | 2026-NMCAF-000357 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Hogatza | **EXACT** | 2026-AKTAD-000392 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-FAS/Tatlanika | **EXACT** | 2026-AKFAS-611246 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Pogo | **EXACT** | 2026-AKDAS-612223 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Shaw | **EXACT** | 2026-AKDAS-612226 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-SWS/Hoholitna | **EXACT** | 2026-AKSWS-604220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Ishtalitna | **EXACT** | 2026-AKTAD-000354 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Mustang | **EXACT** | 2026-AKTAD-000368 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-UTSCS-260194 — Iron (UT, 41842 ac)
- 2026-UTWDD-260218 — Cherry (UT, 34252 ac)
- 2026-NVELD-040106 — Grapevine (NV, 26464 ac)
- 2026-UTWDD-200282 — Hastings (UT, 26355 ac)
- 2026-WAYAA-000023 — 4170 Tule Rd (WA, 24180.23 ac)
- 2026-FLFLS-261800092 — QUARRY 2 (13) (FL, 19018 ac)
- 2026-NVELD-040107 — Kane Springs (NV, 17042 ac)
- 2026-WAMCR-260297 — LAMBDIN (WA, 12776 ac)
- 2026-AZTNF-000839 — Sycamore (AZ, 11939 ac)
- 2026-WAWFS-020144 — Tucannon Mutual Aid (WA, 8069 ac)
