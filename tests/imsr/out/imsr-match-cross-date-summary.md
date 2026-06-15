# IMSR ↔ incident-layer matching — cross-date summary

Offline cross-check of extracted IMSR incident rows against a snapshot of the
app's incident point layer (`USA_Wildfires_v1/0`, 343 current records). **Nothing
wired into the app.** See `MATCHING_SPEC.md` for rules; per-date detail in
`imsr-<date>-match-report.md` / `.json`.

## Results

| IMSR date | Period vs layer | IMSR rows | EXACT | STRONG | WEAK | AMBIG | NO_MATCH | Match rate |
|---|---|---|---|---|---|---|---|---|
| 2026-06-12 | **same period** | 12 | **12** | 0 | 0 | 0 | 0 | **100%** |
| 2025-08-27 | cross (≈1 yr) | 54 | 0 | 0 | 0 | 0 | 54 | 0% |
| 2024-09-30 | cross (≈2 yr) | 31 | 0 | 0 | 0 | 0 | 31 | 0% |
| 2024-07-29 | cross (≈2 yr) | 93 | 0 | 0 | 0 | 0 | 93 | 0% |

Layer records with no IMSR match: 331 (2026-06-12) — expected; IMSR lists only
large incidents while the layer holds 343 incl. small fires.

## What this shows

- **Same-period matching is reliable** on this sample: all 12 current IMSR
  incidents matched their layer record at EXACT via unit + exact-name + state,
  including hard names — numeric `340` (`FL-FNF/340` → `2026-FLFNF-001659`),
  generic `Tower`/`Bear`/`Putah`, and case-folded `SEVEN CABINS`/`ROSE BAY CANAL`.
- **Cross-period coincidences are refused, not forced.** Every 2024/2025 row
  resolved to NO_MATCH. The year guard handled the 2-year-old reports outright.
- **The one true false-positive risk was caught.** `WY-WAX/Spring Creek` (2025,
  WY) shares its name with `2026-COWRF Spring Creek` (CO) and fell inside the
  ±1-year tolerance — but the **state guard** rejected it (`state_conflict`) and
  kept it as a labeled near-miss. Without that guard it would have been a WEAK
  false match.

## Top failure / recurring reasons

- `no name/unit signal in layer` — the dominant "failure", and the *correct*
  outcome for non-contemporaneous reports (those fires aren't in a current layer).
- `state_conflict` / `year_conflict` — rare; exactly the generic-name collisions
  the tiers are designed to catch.
- **Recurring naming/unit problems observed earlier (parser stage) did NOT break
  matching:** wrapped `Complex` names normalize to their base and would match
  (stopword drop), and non-standard units (`OR-721S`, `MT-LG25`) still compare
  cleanly because the layer's `UniqueFireIdentifier` carries the same unit token.

## Is the source layer good enough for future enrichment?

**For the join itself, yes** — `USA_Wildfires_v1/0` is well-suited: it exposes
`UniqueFireIdentifier` (unit token), `POOState`, year, and `IrwinID`, which
together gave clean EXACT matches with zero mismatches on the same-period test.
**But coverage is unproven:** this is ONE same-period day, small (PL2, 12
incidents). A high-PL day with dozens of concurrent incidents — where duplicate
names within a state are more likely — has not been matched against a
contemporaneous snapshot.

## Recommendation — future join key (deliverable 5)

Use a **composite key, not a single string**:

1. **Primary:** `unit` (IMSR `NE-NBF` → `NENBF`) **+** normalized incident name **+** `state`, requiring `year` agreement (±1). This is the EXACT tier and was 12/12 clean.
2. **On match, capture the layer's stable IDs** — `UniqueFireIdentifier` and `IrwinID` — and carry THOSE downstream as the durable reference (they're authoritative and stable; the IMSR-derived key is only for the initial fuzzy join).
3. Never join on name alone, and never on unit alone (units repeat across fires, e.g. three `OR-VAD` fires on 2024-07-29).

## Recommendation — popup enrichment readiness (deliverable 6)

**Not ready — but the matching layer is no longer the blocker.** Cleanly separated:

- **Parser correctness:** still only subset-verified (~138 of 178 parsed
  incidents unverified across the three stress dates). *Unproven.*
- **Record-matching quality:** logic is sound and conservatively fails safe;
  EXACT 12/12 on one small same-period day. *Promising but thin.*
- **Readiness for map enrichment:** **premature.** Validated on a single low-PL
  day. Before any debug-only preview, collect 2–3 more *current-day* IMSR↔layer
  snapshots (ideally a higher-PL day) to confirm match rate, ambiguity behavior
  at scale, and that EXACT stays mismatch-free.

If you want a preview sooner, the safest possible slice is: a **read-only,
flag-OFF, standalone debug page** that displays only **EXACT-tier, current-day**
matches and labels everything UNVERIFIED — never touching the live map, popups,
or thinning.
