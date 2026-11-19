# IMSR ↔ incident-layer match — 2026-11-19

- IMSR source: `tests/imsr/out/imsr-2026-11-19-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-11-19.json` (529 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **6**
- Match rate (exact+strong+weak): **66.7%**
- EXACT **4** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **2**
- Layer records with no IMSR match: **525** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 2× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| FL-FLS/Bee Haven 2 24-06 | **NO_MATCH** | — | 0.0 | — |
| MS-MNF/201W | **EXACT** | 2026-MSMNF-000720 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MNF/Range 47 | **EXACT** | 2026-MSMNF-000723 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| AR-OZF/Shady Hollow | **EXACT** | 2026-AROZF-003220 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WV-WVS/Kessel | **NO_MATCH** | — | 0.0 | — |
| NH-WMF/Wild River | **EXACT** | 2026-NHWMF-000182 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORMHF-000688 — GRASSHOPPER (OR, 93972 ac)
- 2026-ORFWF-260286 — Wrights Spring (OR, 55134 ac)
- 2026-CALPF-002271 — TIMBER (CA, 25350 ac)
- 2026-ORPRD-000584 — 0584 COTTONWOOD (OR, 15658 ac)
- 2026-MTLG14-000775 — Snow (MT, 14056 ac)
- 2026-ORWWF-000531 — McCully (OR, 13604 ac)
- 2026-ORMHF-000863 — AUSTIN (OR, 12888 ac)
- 2026-MTFNF-000393 — Camp Creek (MT, 9725 ac)
- 2026-AZASF-000940 — D6 Wallow West Unit 6 RX (AZ, 7605 ac)
- 2026-MTFNF-000280 — Silvertip (MT, 7280 ac)
