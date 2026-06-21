# IMSR ↔ incident-layer match — 2026-06-21

- IMSR source: `tests/imsr/out/imsr-2026-06-21-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-21.json` (394 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **35**
- Match rate (exact+strong+weak): **91.4%**
- EXACT **30** · STRONG **2** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **3**
- Layer records with no IMSR match: **362** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 2× — no name/unit signal in layer
- 1× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| UT-SCS/Iron | **EXACT** | 2026-UTSCS-260194 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Grapevine | **EXACT** | 2026-NVELD-040106 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-CPD/Sawmill | **EXACT** | 2026-UTCPD-000225 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-ELD/Kane Springs | **EXACT** | 2026-NVELD-040107 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-A1S/Rock Canyon | **EXACT** | 2026-AZA1S-000208 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NV-LAP/Dellenbaugh | **NO_MATCH** | — | 0.0 | — |
| NV-WID/Shyster | **EXACT** | 2026-NVWID-020281 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-WDD/Hastings | **EXACT** | 2026-UTWDD-200282 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Mary | **EXACT** | 2026-IDBOD-000530 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-NWS/Middlefork | **STRONG** | 2026-UTBRS-200284 | 0.75 | name=EX,unit=n,st=Y,yr=Y |
| AZ-TNF/Sycamore | **EXACT** | 2026-AZTNF-000839 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-COF/Pocket | **EXACT** | 2026-AZCOF-000781 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-N6S/Deer Canyon | **EXACT** | 2026-NMN6S-000340 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-SNF/Rio | **EXACT** | 2026-NMSNF-000285 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-GNF/Bear | **EXACT** | 2026-NMGNF-000307 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-COA/Kartar | **EXACT** | 2026-WACOA-260106 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Upriver | **EXACT** | 2026-WANES-001399 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-973S/Old Emigrant | **EXACT** | 2026-OR973S-000139 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-YAA/Tule Rd | **STRONG** | 2026-WAYAA-000023 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| OR-VAD/Dry Creek | **NO_MATCH** | — | 0.0 | — |
| WA-SPD/Roza | **EXACT** | 2026-WASPD-260234 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-KRN/Lost | **EXACT** | 2026-CAKRN-025007 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-KRN/Star | **EXACT** | 2026-CAKRN-025235 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-RRU/Shore | **EXACT** | 2026-CARRU-096793 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-EVP/Coptic | **EXACT** | 2026-FLEVP-001936 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Well 13 | **NO_MATCH** | — | 0.0 | — |
| NC-NCS/Rose Bay Canal | **EXACT** | 2026-NCNCS-260058 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-LWR/Rookery | **EXACT** | 2026-FLLWR-001886 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Shell | **EXACT** | 2026-FLFNF-001638 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Quarry 2 | **EXACT** | 2026-FLFLS-261800092 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/School Lands | **EXACT** | 2026-OKOKS-260760 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-CAS/Gold Run | **EXACT** | 2026-IDCAS-000239 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NE-NBF/South Fork | **EXACT** | 2026-NENBF-260530 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Bear | **EXACT** | 2026-AKTAD-000212 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AK-TAD/Kilolitna | **EXACT** | 2026-AKTAD-000177 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-NENES-260157 — Morrill (NE, 642029 ac)
- 2026-GAGAS-320025 — Pineland Road (GA, 32031 ac)
- 2026-NMLNF-000335 — SEVEN CABINS (NM, 31860 ac)
- 2026-GAGAS-130044 — Hwy 82 (GA, 22419 ac)
- 2025-CORBX-000995 — Elk RBX (CO, 14518 ac)
- 2026-WASPD-260221 — JUNIPER DUNES (WA, 13003 ac)
- 2026-WAWFS-260222 — TWIN SISTERS (WA, 8262 ac)
- 2026-WAWFS-020144 — Tucannon Mutual Aid (WA, 8069 ac)
- 2026-FLLXR-001817 — LXR Lower Third RX 0609 (FL, 7609 ac)
- 2026-FLAPQ-001647 — WaWa 2 (FL, 7121 ac)
