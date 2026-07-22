# IMSR ↔ incident-layer match — 2026-07-22

- IMSR source: `tests/imsr/out/imsr-2026-07-22-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-07-22.json` (488 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **63**
- Match rate (exact+strong+weak): **84.1%**
- EXACT **49** · STRONG **4** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **10**
- Layer records with no IMSR match: **435** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 8× — no name/unit signal in layer
- 2× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| OR-955S/Akawa Butte | **STRONG** | 2026-OR955S-000494 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| OR-UMF/Paradise | **EXACT** | 2026-ORUMF-000302 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Hagen | **EXACT** | 2026-ORUMF-000324 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Horse Ridge | **EXACT** | 2026-ORUMF-000315 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-COA/Kaiser Canyon | **EXACT** | 2026-WACOA-260140 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-NES/Modrite | **EXACT** | 2026-WANES-260149 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-951S/0512 Box Springs | **EXACT** | 2026-OR951S-000512 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-951S/Brewer | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Rowe Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Hay Creek Complex | **NO_MATCH** | — | 0.0 | — |
| OR-711S/E Evans Creek Rd | **STRONG** | 2026-OR711S-000039 | 0.91 | name=0.8,unit=Y,st=Y,yr=Y |
| OR-VAD/Powder River | **EXACT** | 2026-ORVAD-260173 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Anthony | **EXACT** | 2026-ORWWF-000227 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Burnt Creek | **EXACT** | 2026-ORWWF-000342 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-UMF/Salmon | **EXACT** | 2026-ORUMF-000222 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-WWF/Olive Butte | **EXACT** | 2026-ORWWF-000224 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-OCF/Coyote | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Henry | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/0496 Crooked | **EXACT** | 2026-ORPRD-000496 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Egypt | **EXACT** | 2026-ORMAF-002671 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MAF/Stone Creek | **EXACT** | 2026-ORMAF-002667 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Little Giant | **EXACT** | 2026-WAOWF-260406 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-VAD/Cow Camp Complex | **NO_MATCH** | — | 0.0 | — |
| OR-UMF/Bologna | **EXACT** | 2026-ORUMF-000298 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-PRD/518 Sully | **EXACT** | 2026-ORPRD-000518 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-WFS/Lyons Ferry | **EXACT** | 2026-WAWFS-260428 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-NOD/Biscar | **EXACT** | 2026-CANOD-004474 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-SCU/Little | **EXACT** | 2026-CASCU-003908 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LNU/Rumsey | **EXACT** | 2026-CALNU-012618 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-SHU/Brook | **EXACT** | 2026-CASHU-008640 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-TNF/Elephant | **EXACT** | 2026-CATNF-001154 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LMU/Loomis | **EXACT** | 2026-CALMU-004291 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Sioux | **EXACT** | 2026-MNSUF-002411 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Bear Trap | **EXACT** | 2026-MNSUF-002394 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Camp | **EXACT** | 2026-MNSUF-002393 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-SUF/Thumb | **EXACT** | 2026-MNSUF-002396 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MN-2NS/Chub | **STRONG** | 2026-MNSUF-002423 | 0.75 | name=EX,unit=n,st=Y,yr=Y |
| MN-SUF/Little Knife | **EXACT** | 2026-MNSUF-002510 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-IPF/Upper Smith | **EXACT** | 2026-IDIPF-000347 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-NIA/Turner | **EXACT** | 2026-IDNIA-000405 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| VA-VAF/Taylor Hollow | **EXACT** | 2026-VAVAF-260102 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NC-NCS/Rose Hill Bay | **EXACT** | 2026-NCNCS-260064 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FNF/Mailbox | **EXACT** | 2026-FLFNF-002135 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/06 | **NO_MATCH** | — | 0.0 | — |
| FL-FLS/Berger 50 | **NO_MATCH** | — | 0.0 | — |
| SC-FMF/Horse Island | **EXACT** | 2026-SCFMF-000363 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Sand Mine 53 | **STRONG** | 2026-FLFLS-261400366 | 0.85 | name=0.667,unit=Y,st=Y,yr=Y |
| CO-CUX/Aspen Acres | **EXACT** | 2026-COCUX-001160 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-MRF/Fishhook | **NO_MATCH** | — | 0.0 | — |
| CO-GMF/Gold Mountain | **EXACT** | 2026-COGMF-000099 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-GMF/Elk | **EXACT** | 2026-COGMF-000114 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-PSF/Willow | **EXACT** | 2026-COPSF-001153 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-SJF/Ferris | **EXACT** | 2026-COSJF-000536 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-WRD/P L Gulch | **EXACT** | 2026-COWRD-000853 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CO-MFX/Big Gulch | **EXACT** | 2026-COMFX-000934 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-1AX/Claremont | **NO_MATCH** | — | 0.0 | — |
| UT-WDD/Stookey | **EXACT** | 2026-UTWDD-200417 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-FIF/Cottonwood | **EXACT** | 2026-UTFIF-260198 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| UT-MLF/Babylon | **EXACT** | 2026-UTMLF-005112 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-EIS/Ohio | **EXACT** | 2026-IDEIS-000139 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-BDU/Rock | **EXACT** | 2026-CABDU-011136 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AZ-COF/Pocket | **EXACT** | 2026-AZCOF-000781 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NM-N5S/Long Ridge | **EXACT** | 2026-NMN5S-000565 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORPRD-000445 — 0445 CROSSWHITE (OR, 121046 ac)
- 2026-ORPRD-000476 — 0476 HOAG (OR, 50403 ac)
- 2026-UTSCS-260194 — Iron (UT, 41842 ac)
- 2026-UTWDD-260218 — Cherry (UT, 34252 ac)
- 2026-UTDRD-005113 — Snyder (UT, 28264 ac)
- 2026-OR951S-000433 — 0433 BREWER (OR, 27932 ac)
- 2026-NVELD-040106 — Grapevine (NV, 26464 ac)
- 2026-UTWDD-200282 — Hastings (UT, 26355 ac)
- 2026-ORPRD-000462 — 0462 (OR, 25253 ac)
- 2026-WAYAA-000023 — 4170 Tule Rd (WA, 24180.23 ac)
