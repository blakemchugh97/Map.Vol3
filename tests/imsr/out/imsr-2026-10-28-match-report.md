# IMSR ↔ incident-layer match — 2026-10-28

- IMSR source: `tests/imsr/out/imsr-2026-10-28-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-10-28.json` (537 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **11**
- Match rate (exact+strong+weak): **90.9%**
- EXACT **10** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **1**
- Layer records with no IMSR match: **527** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 1× — no name/unit signal in layer

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| SC-SCS/Hewitt Lane | **EXACT** | 2026-SCSCS-267730 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| FL-FLS/Bee Haven 2 24-06 | **NO_MATCH** | — | 0.0 | — |
| OK-OKS/East Bailey Road | **EXACT** | 2026-OKOKS-261256 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MNF/Range 47B | **EXACT** | 2026-MSMNF-000672 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MS-MSS/Hinds North Chapel Hill Rd | **EXACT** | 2026-MSMSS-019458 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| NY-NYS/Cherry Plain | **EXACT** | 2026-NYNYS-000176 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Black River | **EXACT** | 2026-MIMIS-270010 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| MI-MIS/Ridge | **EXACT** | 2026-MIMIS-520021 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| OR-MHF/Austin | **EXACT** | 2026-ORMHF-000863 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| WA-OWF/Sisi | **EXACT** | 2026-WAOWF-260664 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |
| CA-LPF/Timber | **EXACT** | 2026-CALPF-002271 | 1.0 | name=EX,unit=Y,st=Y,yr=Y |

## Largest layer incidents with NO IMSR match (sample)
- 2026-WAOWF-260406 — LITTLE GIANT (WA, 172912 ac)
- 2026-WANES-001791 — SINLAHEKIN (WA, 166007 ac)
- 2026-ORBUD-002693 — Second Flat (OR, 105854 ac)
- 2026-ORMHF-000688 — GRASSHOPPER (OR, 93972 ac)
- 2026-ORWSA-000100 — Bench (OR, 67071 ac)
- 2026-ORUMF-000324 — Hagen (OR, 61380 ac)
- 2026-ORFWF-260286 — Wrights Spring (OR, 55134 ac)
- 2026-MTBDF-266319 — Sand Creek (MT, 35520 ac)
- 2026-NVWID-020620 — McConnell (NV, 33816 ac)
- 2026-ORBUD-002694 — Jackass Butte (OR, 24724 ac)
