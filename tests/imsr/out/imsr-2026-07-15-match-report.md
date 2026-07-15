# IMSR ↔ incident-layer match — 2026-07-15

- IMSR source: `tests/imsr/out/imsr-2026-07-15-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-07-15.json` (508 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **48**
- Match rate (exact+strong+weak): **93.8%**
- EXACT **43** · STRONG **2** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **3**
- Layer records with no IMSR match: **463** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 2× — no name/unit signal in layer
- 1× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-MRF/Fishhook | **NO_MATCH** | — | 0.0 | — |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-SJF/Ferris | **EXACT** | 2026-COSJF-000536 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-WRD/P L Gulch | **EXACT** | 2026-COWRD-000853 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Camp | **EXACT** | 2026-MNSUF-002393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Wolfpack | **EXACT** | 2026-MNSUF-002417 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-2NS/Chub | **EXACT** | 2026-MN2NS-002423 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-1AX/Claremont | **NO_MATCH** | — | 0.0 | — |
| UT-WDD/Stookey | **EXACT** | 2026-UTWDD-200417 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Babylon | **EXACT** | 2026-UTMLF-005112 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-UWF/Buck Basin | **EXACT** | 2026-UTUWF-200428 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-FIF/Cottonwood | **EXACT** | 2026-UTFIF-260198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-EKD/18 Mile | **EXACT** | 2026-NVEKD-010270 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Horse Flat | **NO_MATCH** | — | 0.0 | — |
| OR-711S/E Evans Creek Rd | **STRONG** | 2026-OR711S-000039 | 0.91 | name=0.8,unit=Y,st=Y,yr=Y |
| OR-UMF/Salmon | **EXACT** | 2026-ORUMF-000222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Olive Butte | **EXACT** | 2026-ORWWF-000224 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Anthony | **EXACT** | 2026-ORWWF-000227 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/B And O | **EXACT** | 2026-WANES-001607 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-TNF/Elephant | **EXACT** | 2026-CATNF-001154 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-PNF/Twain | **EXACT** | 2026-CAPNF-001305 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LMU/Loomis | **EXACT** | 2026-CALMU-004291 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LMU/3-1 Pit | **EXACT** | 2026-CALMU-004201 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-CTS/Greer | **EXACT** | 2026-IDCTS-000254 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LAC/Summit | **EXACT** | 2026-CALAC-240823 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| VA-VAF/Taylor Hollow | **EXACT** | 2026-VAVAF-260102 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Mailbox | **EXACT** | 2026-FLFNF-002135 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Hill Bay | **EXACT** | 2026-NCNCS-260064 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Sand Mine 53 | **STRONG** | 2026-FLFLS-261400366 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-COF/Pocket | **EXACT** | 2026-AZCOF-000781 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Sacaton | **EXACT** | 2026-NMGNF-000354 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Konedsin Minnkohwin | **EXACT** | 2026-AKTAD-000404 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-FAS/Tatlanika | **EXACT** | 2026-AKFAS-611246 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Pogo | **EXACT** | 2026-AKDAS-612223 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-DAS/Shaw | **EXACT** | 2026-AKDAS-612226 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-SWS/Hoholitna | **EXACT** | 2026-AKSWS-604220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Hogatza | **EXACT** | 2026-AKTAD-000392 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Nutmeg | **EXACT** | 2026-AKTAD-000397 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Mustang | **EXACT** | 2026-AKTAD-000368 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Ishtalitna | **EXACT** | 2026-AKTAD-000354 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-UTSCS-260194 — Iron (UT, 41842 ac)
- 2026-UTWDD-260218 — Cherry (UT, 34252 ac)
- 2026-UTDRD-005113 — Snyder (UT, 30202 ac)
- 2026-NVELD-040106 — Grapevine (NV, 26464 ac)
- 2026-UTWDD-200282 — Hastings (UT, 26355 ac)
- 2026-WAYAA-000023 — 4170 Tule Rd (WA, 24180.23 ac)
- 2026-FLFLS-261800092 — QUARRY 2 (13) (FL, 19018 ac)
- 2026-KSMEX-000701 — Proffitt Lake (KS, 17968 ac)
- 2026-NVELD-040107 — Kane Springs (NV, 17042 ac)
- 2026-UTFIF-260220 — Wild Goose (UT, 12665 ac)
