# IMSR field-mapping manifest — date-specific notes (2024-07-29, 2024-09-30, 2025-08-27)

The **base field→source mapping is identical** to
[`imsr-field-manifest-2026-06-12.json`](imsr-field-manifest-2026-06-12.json)
(same three buckets, same column meanings, same derived `incident_id = <unit>/<name>`,
same null lat/lng). This file records only the **layout drift** observed in the
three additional test reports and how the extractor handles it. One shared
manifest with per-date notes is used because the mapping itself did not change —
only the parsing robustness did.

## Confirmed stable across all dates
- Report date / National PL on page 1 (`Friday June 12, 2026 …` style header).
- `Active Incident Resource Summary` → `Total` row → national totals.
- `… Area (PL n)` section headers → per-GACC PL (only for areas with a section).
- Incident table column order: `Name Unit TotalAcres ChgAcres %Ctn <Ctn|Comp> EstDate TotalPPL ChgPPL Crw Eng Heli Strc $$CTD Origin`.

## Date-specific drift

### 2024-07-29 (National PL 5, 14 pages, peak season)
- **National `Total` row has commas in mid columns** (`… 604 1,625 157 27,110 …`).
  v0.1.0 failed to parse it; v0.2.0 allows commas in every numeric column.
- **Non-standard unit codes**: `OR-973S`, `OR-953S`, `OR-954S`, `OR-973S`,
  `OR-974S`, `AZ-A5S`, `MT-LG40`. Dropped by v0.1.0; matched by v0.2.0's
  `[A-Z]{2}-[A-Z0-9]{2,4}`.
- **Wrapped names**: `Battle Mountain` + `Complex …`, `Badland` + `Complex …`,
  `Microwave` + `Tower …`, `Diamond` + `Complex …`. Repaired in v0.2.0.
- Example raw: `Battle Mountain` / `Complex OR-973S 172,334 12,880 8 Ctn 8/31 1,745 33 53 104 5 13 27.3M ST`

### 2024-09-30 (National PL 3, 8 pages)
- **Wrapped names**: `Willamette`/`Homestead`/`Diamond`/`Bachelor` + `Complex …`.
- **Non-standard unit codes**: `OR-721S`, `NV-HUMX` (4-char unit).
- Example raw: `Willamette` / `Complex OR-WIF 26,841 3 54 Ctn 10/31 722 -9 8 24 0 0 156M FS`
- `---` placeholders appear in change columns (e.g. `Buck Creek OR-FWF 5,758 --- 98 Ctn …`); harmless (those columns aren't in the schema).

### 2025-08-27 (National PL 4, 11 pages)
- **Asterisk-prefixed new incidents**: `* Rhoda Creek`, `* Waldo Bar`. v0.2.0 strips
  the leading `* `.
- **`Comp` (completion) containment code** instead of `Ctn` (e.g. `East ID-NCF 636 286 0 Comp …`); already an accepted anchor.
- **Leading-space rows**: `␠West Fork …`, `␠Corral Creek …`, `␠Pot Mountain …`; handled by line-strip.
- **Name containing a digit**: `Sandbar 2`. Parses correctly (unit anchor is the boundary).
- **Non-standard unit code**: `MT-LG25`. A legend line (`FNF - Flathead NF … LG25 - Madison County, MT`) is correctly NOT parsed (space around the dash + no containment anchor).
- **Narrative false-positive guard**: `Six US Army HH-60 MEDEVAC Helicopters …` — `HH-60` matches the broadened unit pattern but is rejected because the line has no containment anchor at the right offset.

## Still NOT mapped (out of scope, all dates)
- Per-incident est. containment date, change-in-acres/personnel, structures lost, cost-to-date, ownership.
- Fires/Acres Yesterday & YTD-by-protection tables; Predictive Services discussion.
- The many active incidents counted in the page-1 summary that have no detailed table row.
- Any incident **outside the hand-verified subset** for each date (parsed but unverified).
