# IMSR extraction accuracy summary — 2026-06-12

> **Not a correctness proof.** This compares one offline extraction against one hand-verified fixture for a single report date. A populated field is not a verified field.

- Fields compared: **119**
- Exact matches: **114** (95.8%)
- Mismatched values: **2**
- Missing (in fixture, not extracted): **1**
- Ambiguous / over-parsed (in extractor, not fixture): **2**

## Non-exact fields

| bucket | key | category | verified | extracted | why |
|---|---|---|---|---|---|
| national_resource_totals_daily | `national_resource_totals_daily.totals.total_personnel` | **ambiguous** | 2559 | 2,559 | equal only after normalization |
| gac_pl_daily | `SWCC.preparedness_level` | **mismatch** | 3 | 4 |  |
| incident_resources_daily | `AK-GAD/Kopshesut` | **missing** | None | None | record present in fixture but not produced by extractor |
| incident_resources_daily | `NE-NBF/South Fork.size_acres` | **mismatch** | 23112 | 9999 |  |
| incident_resources_daily | `ZZ-ZZZ/Ghost` | **ambiguous** | None | None | record present in extractor but not in fixture (possible over-parse) |

