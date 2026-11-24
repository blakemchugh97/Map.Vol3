# IMSR ↔ incident-layer match — 2026-11-24

- IMSR source: `tests/imsr/out/imsr-2026-11-24-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-11-24.json` (368 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **5**
- Match rate (exact+strong+weak): **40.0%**
- EXACT **2** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **3**
- Layer records with no IMSR match: **366** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 3× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| VA-VAF/Little Ridge | **EXACT** | 2026-VAVAF-260139 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| KY-KYS/Card Knob Road | **NO_MATCH** | — | 0.0 | — |
| VA-VAF/White Oak Flat | **EXACT** | 2026-VAVAF-260136 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| TN-TNS/Bledsoe Lester Cemetery | **NO_MATCH** | — | 0.0 | — |
| WV-WVS/Kessel | **NO_MATCH** | — | 0.0 | — |

## Largest layer incidents with NO IMSR match (sample)
- 2026-ORFWF-260286 — Wrights Spring (OR, 55134 ac)
- 2026-CALPF-002271 — TIMBER (CA, 25350 ac)
- 2026-MTLG14-000775 — Snow (MT, 14056 ac)
- 2026-ORWWF-000531 — McCully (OR, 13604 ac)
- 2026-ORMHF-000863 — AUSTIN (OR, 12888 ac)
- 2026-MTFNF-000393 — Camp Creek (MT, 9725 ac)
- 2026-CAYNP-000100 — DOME (CA, 6788 ac)
- 2026-IDNCF-000349 — Moose Mountain (ID, 5832 ac)
- 2026-WAOWF-260664 — SISI (WA, 4816 ac)
- 2026-UTUOA-100254 — Slough Canyon (UT, 4774 ac)
