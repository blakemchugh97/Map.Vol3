# IMSR ↔ incident-layer match — 2026-10-24

- IMSR source: `tests/imsr/out/imsr-2026-10-24-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-10-24.json` (499 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **9**
- Match rate (exact+strong+weak): **88.9%**
- EXACT **8** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **491** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| MS-MSS/Pontotoc Pennington Rd | **EXACT** | 2026-MSMSS-019403 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Bee Haven 2 24-06 | **NO_MATCH** | — | 0.0 | — |
| MS-MSS/Claiborne Freeman Hall | **EXACT** | 2026-MSMSS-019408 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Ridge | **EXACT** | 2026-MIMIS-520021 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Black River | **EXACT** | 2026-MIMIS-270010 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-MEU/Cooley | **EXACT** | 2026-CAMEU-012265 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-WAOWF-260406 — LITTLE GIANT (WA, 172912 ac)
- 2026-WANES-001791 — SINLAHEKIN (WA, 166007 ac)
- 2026-WACOA-260140 — Kaiser Canyon (WA, 138293 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-COCUX-001160 — Aspen Acres (CO, 102007 ac)
- 2026-ORMHF-000688 — GRASSHOPPER (OR, 93972 ac)
- 2026-ORWSA-000100 — Bench (OR, 67071 ac)
- 2026-COSJF-000536 — Ferris (CO, 64881 ac)
- 2026-ORUMF-000324 — Hagen (OR, 61380 ac)
- 2026-WANES-260149 — Modrite (WA, 57594 ac)
