# IMSR ↔ incident-layer match — 2024-07-29

- IMSR source: `tests/imsr/out/imsr-2024-07-29-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-12.json` (343 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **93**
- Match rate (exact+strong+weak): **0.0%**
- EXACT **0** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **93**
- Layer records with no IMSR match: **343** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 91× — no name/unit signal in layer
- 2× — year_conflict (name/unit similar but years differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| WA-COA/Swawilla I | **NO_MATCH** | — | 0.0 | — |
| WA-NES/Bridge Creek | **NO_MATCH** | — | 0.0 | — |
| OR-MAF/Falls | **NO_MATCH** | — | 0.0 | — |
| OR-MAF/Telephone | **NO_MATCH** | — | 0.0 | — |
| OR-BUD/Ritter | **NO_MATCH** | — | 0.0 | — |
| WA-SES/Retreat | **NO_MATCH** | — | 0.0 | — |
| OR-973S/Battle Mountain Complex | **NO_MATCH** | — | 0.0 | — |
| OR-953S/Courtrock | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Badland Complex | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Durkee | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Cow Valley | **NO_MATCH** | — | 0.0 | — |
| WA-SES/Pioneer | **NO_MATCH** | — | 0.0 | — |
| WA-OWF/Easy | **NO_MATCH** | — | 0.0 | — |
| OR-UPF/Diamond Complex | **NO_MATCH** | — | 0.0 | — |
| OR-CLP/Middle Fork | **NO_MATCH** | — | 0.0 | — |
| OR-954S/Microwave Tower | **NO_MATCH** | — | 0.0 | — |
| OR-MHF/Whisky Creek | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Lone Rock | **NO_MATCH** | — | 0.0 | — |
| OR-OCF/Crazy Creek | **NO_MATCH** | — | 0.0 | — |
| OR-WIF/Chalk | **NO_MATCH** | — | 0.0 | — |
| OR-WIF/Moss Mountain | **NO_MATCH** | — | 0.0 | — |
| OR-WIF/Coffeepot | **NO_MATCH** | — | 0.0 | — |
| OR-WIF/208 | **NO_MATCH** | — | 0.0 | — |
| WA-SES/Cougar Creek | **NO_MATCH** | — | 0.0 | — |
| OR-UPF/Homestead Complex | **NO_MATCH** | — | 0.0 | — |
| OR-DEF/Red | **NO_MATCH** | — | 0.0 | — |
| OR-DEF/Wickiup | **NO_MATCH** | — | 0.0 | — |
| OR-711S/Lane 1 | **NO_MATCH** | — | 0.0 | — |
| OR-UPF/Adam Mountain | **NO_MATCH** | — | 0.0 | — |
| OR-WIF/Ore | **NO_MATCH** | — | 0.0 | — |
| OR-WIF/Pyramid | **NO_MATCH** | — | 0.0 | — |
| WA-WFS/Big Horn | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Grasshopper | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Hole-In-The- Ground | **NO_MATCH** | — | 0.0 | — |
| OR-974S/Winding Water Complex | **NO_MATCH** | — | 0.0 | — |
| WA-SPD/Umtanum | **NO_MATCH** | — | 0.0 | — |
| WA-SES/Black Canyon | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Cedar Creek | **NO_MATCH** | — | 0.0 | — |
| OR-VAD/Deer Creek | **NO_MATCH** | — | 0.0 | — |
| OR-PRD/Camp Creek | **NO_MATCH** | — | 0.0 | — |
| OR-WWF/Cliff Mountain | **NO_MATCH** | — | 0.0 | — |
| OR-UMF/Double Snag | **NO_MATCH** | — | 0.0 | — |
| WA-MSF/Miners | **NO_MATCH** | — | 0.0 | — |
| ID-PAF/Limepoint | **NO_MATCH** | — | 0.0 | — |
| ID-PAF/Oxbow | **NO_MATCH** | — | 0.0 | — |
| ID-BOF/Boulder | **NO_MATCH** | — | 0.0 | — |
| ID-PAF/Wolf Creek | **NO_MATCH** | — | 0.0 | — |
| NV-WID/Stockade Canyon | **NO_MATCH** | — | 0.0 | — |
| UT-SWS/Kolob | **NO_MATCH** | — | 0.0 | — |
| UT-FIF/Dry Wash | **NO_MATCH** | — | 0.0 | — |
| ID-STF/Clarks | **NO_MATCH** | — | 0.0 | — |
| ID-SCF/Thunder | **NO_MATCH** | — | 0.0 | — |
| ID-STF/Bench Lake | **NO_MATCH** | — | 0.0 | — |
| UT-ASF/Speirs | **NO_MATCH** | — | 0.0 | — |
| UT-CPD/Third Canyon | **NO_MATCH** | — | 0.0 | — |
| UT-FIF/Silver King | **NO_MATCH** | — | 0.0 | — |
| UT-FIF/Little Twist | **NO_MATCH** | — | 0.0 | — |
| UT-NES/Dikker Hill | **NO_MATCH** | — | 0.0 | — |
| CA-BTU/Park | **NO_MATCH** | — | 0.0 | — |
| CA-PNF/Gold Complex | **NO_MATCH** | — | 0.0 | — |
| CA-KNF/Shelly | **NO_MATCH** | — | 0.0 | — |
| CA-SRF/Hill | **NO_MATCH** | — | 0.0 | — |
| CA-LNU/Ridge | **NO_MATCH** | — | 0.0 | — |
| CA-SCU/Point | **NO_MATCH** | — | 0.0 | — |
| CA-SCU/Creek | **NO_MATCH** | — | 0.0 | — |
| CA-SCU/Flynn | **NO_MATCH** | — | 0.0 | — |
| CA-SQF/Borel | **NO_MATCH** | — | 0.0 | — |
| CA-SQF/Trout | **NO_MATCH** | — | 0.0 | — |
| CA-SQF/Long | **NO_MATCH** | — | 0.0 | — |
| CA-LPF/Apache | **NO_MATCH** | — | 0.0 | — |
| CA-LPF/Lake | **NO_MATCH** | — | 0.0 | — |
| CA-ANF/Fork | **NO_MATCH** | — | 0.0 | — |
| CA-SDU/Grove 2 | **NO_MATCH** | — | 0.0 | — |
| ID-NPT/Gwen | **NO_MATCH** | — | 0.0 | — |
| ID-CMS/Rock Creek | **NO_MATCH** | — | 0.0 | — |
| MT-FHA/Mill Pocket | **NO_MATCH** | — | 0.0 | — |
| MT-FHA/Sullivan | **NO_MATCH** | — | 0.0 | — |
| MT-LNF/Miller Peak | **NO_MATCH** | — | 0.0 | — |
| ID-IPF/Bluff Creek Complex | **NO_MATCH** | — | 0.0 | — |
| MT-BDF/Grouse | **NO_MATCH** | — | 0.0 | — |
| MT-LG40/Diamond | **NO_MATCH** | — | 0.0 | — |
| ID-NCF/Wye | **NO_MATCH** | — | 0.0 | — |
| AZ-TNF/Sand Stone | **NO_MATCH** | — | 0.0 | — |
| AZ-TNF/Adessa | **NO_MATCH** | — | 0.0 | — |
| AZ-A5S/Waterman | **NO_MATCH** | — | 0.0 | — |
| AZ-CRD/Windy Mesa | **NO_MATCH** | — | 0.0 | — |
| NM-CAF/Mestenas Canyon | **NO_MATCH** | — | 0.0 | — |
| AZ-SCA/Summit | **NO_MATCH** | — | 0.0 | — |
| NM-SNF/Tanques | **NO_MATCH** | — | 0.0 | — |
| WY-SHF/Clearwater | **NO_MATCH** | — | 0.0 | — |
| WY-CMX/3 Mile Creek | **NO_MATCH** | — | 0.0 | — |
| WY-HPD/Beaver Creek | **NO_MATCH** | — | 0.0 | — |
| FL-FLS/C-41 | **NO_MATCH** | — | 0.0 | — |

## Largest layer incidents with NO IMSR match (sample)
- 2026-GAGAS-320025 — Pineland Road (GA, 32031 ac)
- 2026-NMLNF-000335 — SEVEN CABINS (NM, 31860 ac)
- 2026-NENBF-260530 — South Fork (NE, 23112 ac)
- 2026-GAGAS-130044 — Hwy 82 (GA, 22419 ac)
- 2026-CACNP-001159 — Santa Rosa Island (CA, 18379 ac)
- 2026-NENES-260153 — Anderson Bridge (NE, 17229 ac)
- 2025-CORBX-000995 — Elk RBX (CO, 14518 ac)
- 2026-SDSDS-260142 — Qury (SD, 9168 ac)
- 2026-FLLXR-001817 — LXR Lower Third RX 0609 (FL, 7609 ac)
- 2026-FLAPQ-001647 — WaWa 2 (FL, 7121 ac)
