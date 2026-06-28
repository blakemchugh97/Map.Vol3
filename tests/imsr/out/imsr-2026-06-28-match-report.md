# IMSR ↔ incident-layer match — 2026-06-28

- IMSR source: `tests/imsr/out/imsr-2026-06-28-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-28.json` (478 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **47**
- Match rate (exact+strong+weak): **97.9%**
- EXACT **46** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **432** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| UT-FIF/Cottonwood | **EXACT** | 2026-UTFIF-260198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-FIF/Wild Goose | **EXACT** | 2026-UTFIF-260220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-SCS/Iron | **EXACT** | 2026-UTSCS-260194 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Cherry | **EXACT** | 2026-UTWDD-260218 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Grapevine | **EXACT** | 2026-NVELD-040106 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Parsnip Peak | **EXACT** | 2026-NVELD-040135 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Dry Canyon | **EXACT** | 2026-NVELD-040141 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Babylon | **EXACT** | 2026-UTMLF-005112 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-BTF/Kinky Creek | **EXACT** | 2026-WYBTF-002606 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Kane Springs | **EXACT** | 2026-NVELD-040107 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-DRD/Snyder | **EXACT** | 2026-UTDRD-005113 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-CPD/Sawmill | **EXACT** | 2026-UTCPD-000225 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Hastings | **EXACT** | 2026-UTWDD-200282 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Maple Peak | **EXACT** | 2026-UTWDD-260214 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-COF/Pocket | **EXACT** | 2026-AZCOF-000781 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-CAF/Beehive | **EXACT** | 2026-NMCAF-000357 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-KNF/Butte | **EXACT** | 2026-AZKNF-000588 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-GID/Steamboat | **EXACT** | 2026-AZGID-000321 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-TNF/Sycamore | **EXACT** | 2026-AZTNF-000839 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/McCauley Springs | **EXACT** | 2026-NMSNF-000312 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-N6S/Canyon Venado | **EXACT** | 2026-NMN6S-000349 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Rio | **EXACT** | 2026-NMSNF-000285 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-FTA/Flat | **EXACT** | 2026-AZFTA-000426 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-SCA/White Tail | **EXACT** | 2026-AZSCA-000894 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-SJF/Ferris | **EXACT** | 2026-COSJF-000536 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-FAS/Starry | **EXACT** | 2026-AKFAS-611234 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Elliott Complex | **NO_MATCH** | — | 0.0 | — |
| AK-TAD/Big | **EXACT** | 2026-AKTAD-000313 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Cecil | **EXACT** | 2026-AKTAD-000315 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Allen | **EXACT** | 2026-AKTAD-000308 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-UYD/Doorstep | **EXACT** | 2026-AKUYD-000298 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-UYD/Kathul | **EXACT** | 2026-AKUYD-000233 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-UYD/Polly | **EXACT** | 2026-AKUYD-000228 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Mailbox | **EXACT** | 2026-AKTAD-000290 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Shaw | **EXACT** | 2026-AKDAS-612226 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Pogo | **EXACT** | 2026-AKDAS-612223 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-SWS/Nowitna | **EXACT** | 2026-AKSWS-604237 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-GAD/Mud | **EXACT** | 2026-AKGAD-000287 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-GAD/Kilusiktok | **EXACT** | 2026-AKGAD-000296 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-MID/Buffalo | **EXACT** | 2026-AKMID-000263 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-MID/Glacier | **EXACT** | 2026-AKMID-000225 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Bear | **EXACT** | 2026-AKTAD-000212 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-RRU/Iron | **EXACT** | 2026-CARRU-103569 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-CMS/Shingle Creek | **EXACT** | 2026-IDCMS-000183 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-LWR/Rookery | **EXACT** | 2026-FLLWR-001886 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-COA/Kartar | **EXACT** | 2026-WACOA-260106 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-NENES-260157 — Morrill (NE, 642029 ac)
- 2026-NENBF-260530 — South Fork (NE, 39696 ac)
- 2026-WAYAA-000023 — 4170 Tule Rd (WA, 24180.23 ac)
- 2026-FLFLS-261800092 — QUARRY 2 (13) (FL, 19018 ac)
- 2026-WASPD-260221 — JUNIPER DUNES (WA, 13003 ac)
- 2026-FLFLS-261800098 — AREA 2 (FL, 12000 ac)
- 2026-WAWFS-260222 — TWIN SISTERS (WA, 8262 ac)
- 2026-WAWFS-020144 — Tucannon Mutual Aid (WA, 8069 ac)
- 2026-CAKRN-025007 — LOST (CA, 7834 ac)
- 2026-NMGNF-000307 — Bear (NM, 7769 ac)
