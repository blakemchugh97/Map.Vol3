# IMSR ↔ incident-layer match — 2026-11-04

- IMSR source: `tests/imsr/out/imsr-2026-11-04-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-11-04.json` (464 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **5**
- Match rate (exact+strong+weak): **80.0%**
- EXACT **4** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **460** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| TN-BSP/BSP Cactus | **EXACT** | 2026-TNBSP-926029 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Bee Haven 2 24-06 | **NO_MATCH** | — | 0.0 | — |
| NH-WMF/Wild River | **EXACT** | 2026-NHWMF-000182 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Ridge | **EXACT** | 2026-MIMIS-520021 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-WAOWF-260406 — LITTLE GIANT (WA, 172912 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-ORMHF-000688 — GRASSHOPPER (OR, 93972 ac)
- 2026-ORUMF-000324 — Hagen (OR, 61380 ac)
- 2026-ORPRD-000476 — 0476 HOAG (OR, 50224 ac)
- 2026-ORPRD-000567 — 0567 LITTLE BUCK (OR, 43818 ac)
- 2026-MTBDF-266319 — Sand Creek (MT, 35520 ac)
- 2026-CALPF-002271 — Timber (CA, 25350 ac)
- 2026-ORBUD-002694 — Jackass Butte (OR, 24724 ac)
- 2026-TXMCR-000378 — Star Lake (TX, 16412 ac)
