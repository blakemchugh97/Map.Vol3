# IMSR ↔ incident-layer match — 2026-10-23

- IMSR source: `tests/imsr/out/imsr-2026-10-23-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-10-23.json` (508 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **12**
- Match rate (exact+strong+weak): **91.7%**
- EXACT **10** · STRONG **1** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **497** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| TX-TXS/Kickapoo Creek | **EXACT** | 2026-TXTXS-269648 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Bee Haven 2 24-06 | **NO_MATCH** | — | 0.0 | — |
| MS-MSS/Neshoba Rd 832 | **EXACT** | 2026-MSMSS-019400 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MSS/Shelton Weeks Rd | **STRONG** | 2026-MSMSS-019376 | 0.82 | name=0.6,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Grasshopper | **EXACT** | 2026-ORMHF-000688 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-MEU/Cooley | **EXACT** | 2026-CAMEU-012265 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Ridge | **EXACT** | 2026-MIMIS-520021 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Black River | **EXACT** | 2026-MIMIS-270010 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MT-FHA/Bras | **EXACT** | 2026-MTFHA-000179 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-WAOWF-260406 — LITTLE GIANT (WA, 172912 ac)
- 2026-WANES-001791 — SINLAHEKIN (WA, 166007 ac)
- 2026-WACOA-260140 — Kaiser Canyon (WA, 138293 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-COCUX-001160 — Aspen Acres (CO, 102007 ac)
- 2026-ORWSA-000100 — Bench (OR, 67071 ac)
- 2026-COSJF-000536 — Ferris (CO, 64881 ac)
- 2026-ORUMF-000324 — Hagen (OR, 61380 ac)
- 2026-WANES-260149 — Modrite (WA, 57594 ac)
- 2026-ORFWF-260286 — Wrights Spring (OR, 55134 ac)
