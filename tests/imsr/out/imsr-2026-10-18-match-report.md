# IMSR ↔ incident-layer match — 2026-10-18

- IMSR source: `tests/imsr/out/imsr-2026-10-18-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-10-18.json` (340 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **16**
- Match rate (exact+strong+weak): **87.5%**
- EXACT **14** · STRONG **0** · WEAK **0** · AMBIGUOUS **2** · NO_MATCH **0**
- Layer records with no IMSR match: **326** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 2× — >=2 competing EXACT candidates

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| CA-PMQ/Henderson | **EXACT** | 2026-CAPMQ-003992 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-ORC/Norte | **EXACT** | 2026-CAORC-149182 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-YNP/Dome | **EXACT** | 2026-CAYNP-000100 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Ridge | **EXACT** | 2026-MIMIS-520021 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Black River | **AMBIGUOUS** | 2026-MIMIS-260420 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Craig Lake 1 | **EXACT** | 2026-MIMIS-070006 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MSS/Mount Pilgrim Road | **EXACT** | 2026-MSMSS-019162 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MSS/Jasper CR 25 | **AMBIGUOUS** | 2026-MSMSS-000643 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OK-OKS/South White Wolf | **EXACT** | 2026-OKOKS-261126 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-MEU/Cooley | **EXACT** | 2026-CAMEU-012265 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WY-SHX/Pk | **EXACT** | 2026-WYSHX-000391 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Smore | **EXACT** | 2026-IDBOD-001264 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-WAOWF-260406 — LITTLE GIANT (WA, 172912 ac)
- 2026-WANES-001791 — SINLAHEKIN (WA, 166007 ac)
- 2026-WACOA-260140 — Kaiser Canyon (WA, 138293 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-COCUX-001160 — Aspen Acres (CO, 102007 ac)
- 2026-ORWSA-000100 — Bench (OR, 67071 ac)
- 2026-ORUMF-000324 — Hagen (OR, 61380 ac)
- 2026-WANES-260149 — Modrite (WA, 57594 ac)
- 2026-ORFWF-260286 — Wrights Spring (OR, 55134 ac)
- 2026-COGMF-000099 — Gold Mountain (CO, 39747 ac)
