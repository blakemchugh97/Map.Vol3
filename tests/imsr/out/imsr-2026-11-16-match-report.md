# IMSR ↔ incident-layer match — 2026-11-16

- IMSR source: `tests/imsr/out/imsr-2026-11-16-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-11-16.json` (352 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **5**
- Match rate (exact+strong+weak): **80.0%**
- EXACT **4** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **348** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| MS-MNF/201W | **EXACT** | 2026-MSMNF-000720 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MNF/Range 47 | **EXACT** | 2026-MSMNF-000723 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Bee Haven 2 24-06 | **NO_MATCH** | — | 0.0 | — |
| TN-TNS/Campbell Glassman Way | **EXACT** | 2026-TNTNS-261076 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NH-WMF/Wild River | **EXACT** | 2026-NHWMF-000182 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORMHF-000688 — GRASSHOPPER (OR, 93972 ac)
- 2026-CALPF-002271 — Timber (CA, 25350 ac)
- 2026-TXMCR-000378 — Star Lake (TX, 16412 ac)
- 2026-ORWWF-000531 — McCully (OR, 13604 ac)
- 2026-ORMHF-000863 — AUSTIN (OR, 12888 ac)
- 2026-MTBDF-266313 — Bobcat Lakes (MT, 10896 ac)
- 2026-MTFNF-000393 — Camp Creek (MT, 9725 ac)
- 2026-AZASF-000940 — D6 Wallow West Unit 6 RX (AZ, 7605 ac)
- 2026-MTFNF-000280 — Silvertip (MT, 7280 ac)
- 2026-IDNCF-000349 — Moose Mountain (ID, 5832 ac)
