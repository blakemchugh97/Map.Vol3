# IMSR ↔ incident-layer match — 2025-08-27

- IMSR source: `tests/imsr/out/imsr-2025-08-27-extracted.json`
- Layer source: `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-2026-06-12.json` (343 records)
- **Extracted IMSR rows are UNVERIFIED; this measures record MATCHING, not parser or value correctness.**

## Match summary
- IMSR incidents compared: **54**
- Match rate (exact+strong+weak): **0.0%**
- EXACT **0** · STRONG **0** · WEAK **0** · AMBIGUOUS **0** · NO_MATCH **54**
- Layer records with no IMSR match: **343** (expected — IMSR lists only large incidents)

## Top failure / ambiguity reasons
- 53× — no name/unit signal in layer
- 1× — state_conflict (name matched but states differ)

## Per-incident result

| IMSR incident | tier | matched layer (UFI) | score | signals |
|---|---|---|---|---|
| ID-POS/Sunset | **NO_MATCH** | — | 0.0 | — |
| MT-SWS/Windy Rock | **NO_MATCH** | — | 0.0 | — |
| MT-SWS/Devil Mountain | **NO_MATCH** | — | 0.0 | — |
| MT-BDF/Bivens Creek | **NO_MATCH** | — | 0.0 | — |
| MT-BDF/Cloudrest | **NO_MATCH** | — | 0.0 | — |
| MT-CGF/West Fork | **NO_MATCH** | — | 0.0 | — |
| MT-LNF/Corral Creek | **NO_MATCH** | — | 0.0 | — |
| MT-NWS/Knowles | **NO_MATCH** | — | 0.0 | — |
| MT-KNF/Ransome | **NO_MATCH** | — | 0.0 | — |
| ID-NCF/Island Creek | **NO_MATCH** | — | 0.0 | — |
| MT-HLF/Sandbar 2 | **NO_MATCH** | — | 0.0 | — |
| ID-IPF/Lightning Creek | **NO_MATCH** | — | 0.0 | — |
| ID-NCF/Rhoda Creek | **NO_MATCH** | — | 0.0 | — |
| MT-BRF/Waldo Bar | **NO_MATCH** | — | 0.0 | — |
| ID-NCF/East | **NO_MATCH** | — | 0.0 | — |
| MT-FNF/Pot Mountain | **NO_MATCH** | — | 0.0 | — |
| ID-NCF/Mire | **NO_MATCH** | — | 0.0 | — |
| MT-LG25/McAllister | **NO_MATCH** | — | 0.0 | — |
| OR-WIF/Emigrant | **NO_MATCH** | — | 0.0 | — |
| OR-955S/Flat | **NO_MATCH** | — | 0.0 | — |
| WA-OLF/Bear Gulch | **NO_MATCH** | — | 0.0 | — |
| WA-OWF/Pomas | **NO_MATCH** | — | 0.0 | — |
| CA-LNU/Pickett | **NO_MATCH** | — | 0.0 | — |
| CA-SRF/Dillon | **NO_MATCH** | — | 0.0 | — |
| CA-SHF/Peak | **NO_MATCH** | — | 0.0 | — |
| CA-AEU/Coyote | **NO_MATCH** | — | 0.0 | — |
| CA-SNF/Garnet | **NO_MATCH** | — | 0.0 | — |
| CA-SQF/Little | **NO_MATCH** | — | 0.0 | — |
| CA-LPF/Gifford | **NO_MATCH** | — | 0.0 | — |
| WY-BTF/Dollar Lake | **NO_MATCH** | — | 0.0 | — |
| ID-BOF/Rock | **NO_MATCH** | — | 0.0 | — |
| NV-EKD/Cottonwood Peak | **NO_MATCH** | — | 0.0 | — |
| WY-BTF/Willow Creek | **NO_MATCH** | — | 0.0 | — |
| UT-FIF/Widemouth | **NO_MATCH** | — | 0.0 | — |
| UT-FIF/Monroe Canyon | **NO_MATCH** | — | 0.0 | — |
| ID-BOD/Box | **NO_MATCH** | — | 0.0 | — |
| UT-UWF/Buckley Draw | **NO_MATCH** | — | 0.0 | — |
| UT-BRS/Willard Peak | **NO_MATCH** | — | 0.0 | — |
| UT-UWF/Beulah | **NO_MATCH** | — | 0.0 | — |
| NV-EKD/Big Butte | **NO_MATCH** | — | 0.0 | — |
| CO-WRF/Derby | **NO_MATCH** | — | 0.0 | — |
| CO-SJF/Stoner Mesa | **NO_MATCH** | — | 0.0 | — |
| CO-PSF/La Plata | **NO_MATCH** | — | 0.0 | — |
| CO-WRD/Lee | **NO_MATCH** | — | 0.0 | — |
| WY-WBD/Red Canyon | **NO_MATCH** | — | 0.0 | — |
| CO-GRD/Turner Gulch | **NO_MATCH** | — | 0.0 | — |
| WY-WAX/Spring Creek | **NO_MATCH** | — | 0.0 | — |
| WY-WRA/Bull Lake | **NO_MATCH** | — | 0.0 | — |
| AZ-GCP/Dragon Bravo | **NO_MATCH** | — | 0.0 | — |
| AZ-TNF/Billy | **NO_MATCH** | — | 0.0 | — |
| AZ-ASG/Fishhook | **NO_MATCH** | — | 0.0 | — |
| AZ-TNF/Washington | **NO_MATCH** | — | 0.0 | — |
| NM-GNF/Packstring | **NO_MATCH** | — | 0.0 | — |
| FL-FLS/Mile Marker 39 | **NO_MATCH** | — | 0.0 | — |

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
