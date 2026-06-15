# IMSR extraction accuracy summary — 2024-09-30

> **Not a correctness proof.** This compares one offline extraction against one hand-verified fixture for a single report date. A populated field is not a verified field.

- Fields compared: **66**
- Exact matches: **61** (92.4%)
- Mismatched values: **0**
- Missing (in fixture, not extracted): **5**
- Ambiguous / over-parsed (in extractor, not fixture): **0**
- Incident scope: **listed_only** (extractor produced **23** additional incidents outside the verified subset — informational, not penalized)

## Non-exact fields

| bucket | key | category | verified | extracted | why |
|---|---|---|---|---|---|
| incident_resources_daily | `OR-721S/Bottom Creek` | **missing** | None | None | record present in fixture but not produced by extractor |
| incident_resources_daily | `OR-DEF/Bachelor Complex` | **missing** | None | None | record present in fixture but not produced by extractor |
| incident_resources_daily | `OR-UPF/Diamond Complex` | **missing** | None | None | record present in fixture but not produced by extractor |
| incident_resources_daily | `OR-UPF/Homestead Complex` | **missing** | None | None | record present in fixture but not produced by extractor |
| incident_resources_daily | `OR-WIF/Willamette Complex` | **missing** | None | None | record present in fixture but not produced by extractor |

