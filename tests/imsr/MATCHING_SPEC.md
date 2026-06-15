# IMSR ↔ incident-layer matching spec (offline cross-check)

Defines how `tools/imsr_match.py` decides whether an **extracted IMSR incident
row** corresponds to a record in the **incident point layer the map uses**. This
is a CROSS-CHECK stage only — nothing is wired into the app. Extracted IMSR rows
are UNVERIFIED; matching tells us which rows are *corroborated* by the real
incident layer (and therefore could later become enrichment candidates).

## Sources

- **IMSR side:** `tests/imsr/out/imsr-<date>-extracted.json` (incident rows:
  `incident_id = "<unit>/<name>"`, `incident_name`, `state`, `date`).
- **Layer side:** `tests/imsr/incident_layer/wfigs-usa-wildfires-snapshot-<date>.json`
  — an offline snapshot of `USA_Wildfires_v1/0` (the app's 🔥 layer,
  `WILDFIRE_CONFIG.url`). Key fields: `IncidentName`, `UniqueFireIdentifier`
  (`YYYY-UNIT-NNNN`), `POOState` (`US-XX`), `GACC`, `FireDiscoveryDateTime`,
  `IrwinID`, geometry.

> **Temporal caveat:** the snapshot is *current* incidents only (342/343 were
> 2026). So a real same-period match test is possible only for the current-day
> IMSR (2026-06-12). The 2024/2025 reports are run as **adversarial cross-period
> tests** — the matcher must REFUSE them, not invent matches.

## Fields used & normalization

| Concept | IMSR | Layer | Normalization |
|---|---|---|---|
| Name | `incident_name` | `IncidentName` | lowercase; strip leading `* `/`+ `; drop `(… fires)`; remove punctuation; drop stopwords `complex/fire(s)`; tokenize |
| Unit | unit part of `incident_id` (`NE-NBF`) | unit segment of `UniqueFireIdentifier` (`NENBF`) | uppercase, strip non-alphanumerics → compare `NENBF` == `NENBF` |
| State | `state` (`NE`) | `POOState` (`US-NE`) | strip `US-`, first 2 chars |
| Year | year of `date` | year segment of `UniqueFireIdentifier` | equal within ±1 (allows carryover fires) |

Name comparison is **token-set**, not raw string equality: `name_exact` = identical
token key; `name_fuzzy` = Jaccard ≥ 0.60. This handles wrapped names, `Complex`
differences, punctuation, case (`PUTAH`↔`Putah`), and spacing.

## Signals (computed per IMSR×layer pair, all reported — no black box)

`name_exact`, `name_jaccard`, `name_fuzzy`, `unit_match`, `state_match`,
`state_conflict` (both states known **and different**), `year_ok`.

## Confidence tiers (explicit, ordered)

1. **EXACT** — `unit_match` **and** `name_exact` **and** `state_match` (year ok).
2. **STRONG** — (`unit_match` and `state_match` and `name_fuzzy`) **or** (`name_exact` and `state_match`).
3. **WEAK** — a name signal with **no contradicting state**: (`name_exact` and not `state_conflict`) **or** (`name_fuzzy` and `state_match`). Plausible but uncorroborated by unit; review before trusting.
4. **AMBIGUOUS** — ≥2 competing candidates at the same top tier with scores within 0.05. Never auto-resolved.
5. **NO_MATCH** — nothing above, with a reason. Two reasons are *disconfirming evidence* and are surfaced as rejected near-misses (not silently dropped):
   - `year_conflict` — name/unit looked similar but years differ by >1.
   - `state_conflict` — name matched but states explicitly differ.

`score` (0–1, transparency only) = `0.45·name + 0.25·unit + 0.20·state + 0.10·year`.
The **tier**, not the score, is the decision.

## Why conflicts cap the tier

Generic fire names recur across years and states (`Spring Creek`, `Red`, `East`,
`Sunset`). A bare name hit is therefore weak evidence; an explicit year or state
*disagreement* is evidence the rows are different incidents. Capping at
`*_CONFLICT` (→ NO_MATCH) is what stops the matcher from silently forcing those.

## Direction of the join

IMSR (a few dozen large incidents) is a **subset** of the layer (hundreds incl.
small fires). So most layer records correctly have no IMSR match — that is normal,
not a failure. Enrichment flows layer-record → (optional) IMSR data when matched.
