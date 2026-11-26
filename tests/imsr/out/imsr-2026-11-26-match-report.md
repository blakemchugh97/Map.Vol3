# IMSR ↔ incident-layer match — 2026-11-26

- IMSR source: `tests/imsr/out/imsr-2026-11-26-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-11-26.json` (294 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **3**
- Match rate (exact+strong+weak): **100.0%**
- EXACT **3** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **0**
- Layer records with no IMSR match: **291** (expected — IMSR lists only large incidents)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| AL-ALF/Dugger | **EXACT** | 2026-ALALF-000537 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| VA-VAF/Little Ridge | **EXACT** | 2026-VAVAF-260139 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| VA-VAF/White Oak Flat | **EXACT** | 2026-VAVAF-260136 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

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
