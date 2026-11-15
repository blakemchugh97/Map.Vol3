# IMSR ↔ incident-layer match — 2026-11-15

- IMSR source: `tests/imsr/out/imsr-2026-11-15-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-11-15.json` (309 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **6**
- Match rate (exact+strong+weak): **66.7%**
- EXACT **4** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **2**
- Layer records with no IMSR match: **305** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 2× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| MS-MNF/201W | **EXACT** | 2026-MSMNF-000720 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MNF/Range 47 | **EXACT** | 2026-MSMNF-000723 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Bee Haven 2 24-06 | **NO_MATCH** | — | 0.0 | — |
| TN-TNS/Campbell Glassman Way | **EXACT** | 2026-TNTNS-261076 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NH-WMF/Wild River | **EXACT** | 2026-NHWMF-000182 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| ID-BOD/Mud | **NO_MATCH** | — | 0.0 | — |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORMHF-000688 — GRASSHOPPER (OR, 93972 ac)
- 2026-CALPF-002271 — Timber (CA, 25350 ac)
- 2026-TXMCR-000378 — Star Lake (TX, 16412 ac)
- 2026-ORWWF-000531 — McCully (OR, 13604 ac)
- 2026-ORMHF-000863 — AUSTIN (OR, 12888 ac)
- 2026-MTBDF-266313 — Bobcat Lakes (MT, 10896 ac)
- 2026-AZASF-000940 — D6 Wallow West Unit 6 RX (AZ, 7605 ac)
- 2026-IDNCF-000349 — Moose Mountain (ID, 5832 ac)
- 2026-AZASF-000955 — D2 Dye RX (AZ, 5246 ac)
- 2026-AZASF-000967 — D3 Bear RX (AZ, 5072 ac)
