# IMSR extraction accuracy summary — 2024-07-29

> **Not a correctness proof.** This compares one offline extraction against one hand-verified fixture for a single report date. A populated field is not a verified field.

- Fields compared: **106**
- Exact matches: **97** (91.5%)
- Mismatched values: **0**
- Missing (in fixture, not extracted): **9**
- Ambiguous / over-parsed (in extractor, not fixture): **0**
- Incident scope: **listed_only** (extractor produced **76** additional incidents outside the verified subset — informational, not penalized)

## Extractor self-reported warnings
- national_totals: 'Total' summary row not found

## Non-exact fields

| bucket | key | category | verified | extracted | why |
|---|---|---|---|---|---|
| national_resource_totals_daily | `national_resource_totals_daily.date` | **missing** | 2024-07-29 | None |  |
| national_resource_totals_daily | `national_resource_totals_daily.national_preparedness_level` | **missing** | 5 | None |  |
| national_resource_totals_daily | `national_resource_totals_daily.totals.crews` | **missing** | 604 | None |  |
| national_resource_totals_daily | `national_resource_totals_daily.totals.engines` | **missing** | 1625 | None |  |
| national_resource_totals_daily | `national_resource_totals_daily.totals.helicopters` | **missing** | 157 | None |  |
| national_resource_totals_daily | `national_resource_totals_daily.totals.total_personnel` | **missing** | 27110 | None |  |
| incident_resources_daily | `OR-953S/Courtrock` | **missing** | None | None | record present in fixture but not produced by extractor |
| incident_resources_daily | `OR-973S/Battle Mountain Complex` | **missing** | None | None | record present in fixture but not produced by extractor |
| incident_resources_daily | `OR-VAD/Badland Complex` | **missing** | None | None | record present in fixture but not produced by extractor |

