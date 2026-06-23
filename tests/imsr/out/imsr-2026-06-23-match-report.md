# IMSR ↔ incident-layer match — 2026-06-23

- IMSR source: `tests/imsr/out/imsr-2026-06-23-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-23.json` (436 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **35**
- Match rate (exact+strong+weak): **88.6%**
- EXACT **31** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **4**
- Layer records with no IMSR match: **405** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 4× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| UT-FIF/Cottonwood | **EXACT** | 2026-UTFIF-260198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-SCS/Iron | **EXACT** | 2026-UTSCS-260194 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Hastings | **EXACT** | 2026-UTWDD-200282 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Grapevine | **EXACT** | 2026-NVELD-040106 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Kane Springs | **EXACT** | 2026-NVELD-040107 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-UWF/Bonneville | **EXACT** | 2026-UTUWF-200287 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-CPD/Sawmill | **EXACT** | 2026-UTCPD-000225 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-A1S/Rock Canyon | **EXACT** | 2026-AZA1S-000208 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-WID/Shyster | **NO_MATCH** | — | 0.0 | — |
| UT-BRS/Middlefork | **EXACT** | 2026-UTBRS-200284 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-COF/Pocket | **EXACT** | 2026-AZCOF-000781 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-TNF/Sycamore | **EXACT** | 2026-AZTNF-000839 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-FTA/Flat | **EXACT** | 2026-AZFTA-000426 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Rio | **EXACT** | 2026-NMSNF-000285 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Bear | **EXACT** | 2026-NMGNF-000307 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Lytle | **EXACT** | 2026-ORVAD-260105 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Garred Road | **EXACT** | 2026-WAWFS-260260 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-COA/Kartar | **EXACT** | 2026-WACOA-260106 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Upriver | **EXACT** | 2026-WANES-001399 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-FAS/Starry | **EXACT** | 2026-AKFAS-611234 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Elliott Complex | **NO_MATCH** | — | 0.0 | — |
| AK-TAD/Bear | **EXACT** | 2026-AKTAD-000212 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Pogo | **EXACT** | 2026-AKDAS-612223 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-UYD/Kathul | **EXACT** | 2026-AKUYD-000233 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Shaw | **EXACT** | 2026-AKDAS-612226 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-SWS/Nowitna | **EXACT** | 2026-AKSWS-604237 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Kilolitna | **EXACT** | 2026-AKTAD-000177 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-CMS/Shingle Creek | **EXACT** | 2026-IDCMS-000183 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-CAS/Gold Run | **EXACT** | 2026-IDCAS-000239 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Well 13 | **NO_MATCH** | — | 0.0 | — |
| FL-FLS/Corrections 13 | **NO_MATCH** | — | 0.0 | — |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-LWR/Rookery | **EXACT** | 2026-FLLWR-001886 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Shell | **EXACT** | 2026-FLFNF-001638 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NE-NBF/South Fork | **EXACT** | 2026-NENBF-260530 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-NENES-260157 — Morrill (NE, 642029 ac)
- 2026-GAGAS-320025 — Pineland Road (GA, 32031 ac)
- 2026-NMLNF-000335 — SEVEN CABINS (NM, 31860 ac)
- 2026-WAYAA-000023 — 4170 Tule Rd (WA, 24180.23 ac)
- 2026-GAGAS-130044 — Hwy 82 (GA, 22419 ac)
- 2026-FLFLS-261800092 — QUARRY 2 (13) (FL, 19018 ac)
- 2025-CORBX-000995 — Elk RBX (CO, 14518 ac)
- 2026-WASPD-260221 — JUNIPER DUNES (WA, 13003 ac)
- 2026-WAWFS-260222 — TWIN SISTERS (WA, 8262 ac)
- 2026-WAWFS-020144 — Tucannon Mutual Aid (WA, 8069 ac)
