# IMSR extraction accuracy summary — 2025-08-27

> **Not a correctness proof.** This compares one offline extraction against one hand-verified fixture for a single report date. A populated field is not a verified field.

- Fields compared: **160**
- Exact matches: **157** (98.1%)
- Mismatched values: **0**
- Missing (in fixture, not extracted): **3**
- Ambiguous / over-parsed (in extractor, not fixture): **0**
- Incident scope: **listed_only** (extractor produced **37** additional incidents outside the verified subset — informational, not penalized)

## Non-exact fields

| bucket | key | category | verified | extracted | why |
|---|---|---|---|---|---|
| incident_resources_daily | `ID-NCF/Rhoda Creek` | **missing** | None | None | record present in fixture but not produced by extractor |
| incident_resources_daily | `MT-BRF/Waldo Bar` | **missing** | None | None | record present in fixture but not produced by extractor |
| incident_resources_daily | `MT-LG25/McAllister` | **missing** | None | None | record present in fixture but not produced by extractor |

