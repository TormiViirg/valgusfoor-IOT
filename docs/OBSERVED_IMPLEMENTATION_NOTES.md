# Observed implementation notes (from code + screenshots)

This document captures **what is objectively observable** in the current repository snapshot:
- actual column names and sample values seen in the provided screenshots
- hardcoded endpoints in the code
- runtime/diagnostic behaviors visible in logs/UI

It is meant to support documentation work and help resolve “what is canonical?” questions.

---

## 1) Google Sheets schema as observed

### 1.1 `lights` sheet columns (screenshot)
Observed header set:
- `ID`
- `IsMainTrafficLight`
- `IntersectionID`
- `CardinalDirection`
- `Offset`
- `Tile`
- `CycleID`

Observed data patterns / anomalies:
- Some `IntersectionID`s have 3 lights (e.g., N/W/S without E).
- Some have 4 lights (N/E/S/W).
- Some have 2 lights (E/W only).
- At least one `IntersectionID` appears to have only **one** row (single configured direction).
- At least one intersection appears to mark **multiple** rows as `IsMainTrafficLight=TRUE`.

Why this matters:
- The virtual UI selects a 2-/3-/4-way state machine based on **row count per intersection**.
- The “master” direction is taken as the **first** row with `IsMainTrafficLight=true`.

### 1.2 `cycles` sheet columns (screenshot)
Observed header set:
- `ID`
- `Length`  *(spelled this way in the screenshot and in firmware parser)*
- `RedRatio`
- `RedYellowRatio`
- `GreenRatio`
- `GreenYellowRatio` *(header in screenshot is truncated but implied)*
- `YellowRatio`
- `BlinkStart`
- `BlinkEnd`

Observed data patterns / anomalies:
- Some rows have `Length = 0` (implies “unused” or “fallback to konf kestus”, but this needs a clear rule).
- Some rows contain ratios that do **not** sum to 1.0 (and may exceed 1.0), which implies either:
  - the data is invalid and needs validation, or
  - the fields are weights and should be normalized (but the current JS UI does not normalize).

Observed blink window behavior:
- Some rows show `BlinkStart > BlinkEnd` (e.g., 575 → 420; 1300 → 420), which implies an **overnight** window spanning midnight.
- Firmware logic supports this wrap-around interpretation.

---

## 2) Backend (Apps Script) as implemented in `api.gs`

### 2.1 Entry points
`doGet(e)` supports:
- `action=read&intersectionID=<id>`
- `action=adminRead`
- `action=adminWrite&data=<json>`

### 2.2 Required configuration
- `DATABASE_ID` is currently an **empty string** and must be set to a real Google Sheets ID.

### 2.3 Shape of `read` response
- Filters `lights` rows by `IntersectionID`.
- Builds a lookup by `cycles.ID`.
- For each light row, embeds `CycleData` from the `cycles` row matching `CycleID`.

### 2.4 Notable behaviors/risks
- `adminWrite` uses GET with a JSON query parameter (URL length + logging exposure risks).
- There is no built-in validation of:
  - required columns
  - ratio sums / negativity
  - “exactly one master” constraints

---

## 3) Virtual UI runtime behavior (selected highlights)

### 3.1 Time authority + cycle phase
- `externaltimesync.js` maintains an “authoritative” clock by anchoring local time to a server-provided timestamp.
- It separately polls a “konf” endpoint returning `[kestusSeconds, fooriniheSeconds]`.

Observed from UI debug screenshot:
- Debug block displays `client now`, `server anchored`, `elapsed`, `authoritative`, and `delta(ms)`.

### 3.2 Blinking override
Observed from UI screenshots/console:
- `Blinking: Active | ForceYellow: ON`
- Console logs repeatedly show “All Yellow (Safety Mode)” while the override is active.

Interpretation:
- When blink window is active, the intersection state machine is overridden to `ALL_YELLOW` (forced yellow on all configured directions).

---

## 4) Firmware (`traffic_light_real_test.ino`) runtime/diagnostics

### 4.1 Blink window semantics
- Blink override is based on **time window only** (start/end minutes after midnight), independent of other modes.
- Supports wrap-around (start > end means “spans midnight”).

### 4.2 Cycle duration + ratios
- Firmware reads from `CycleData`:
  - `Length` (seconds) → `cycleLengthSec`
  - ratios: `RedRatio`, `RedYellowRatio`, `YellowRatio`, `GreenYellowRatio`, `GreenRatio`
  - `BlinkStart`, `BlinkEnd` (minutes after midnight; numeric or `"HH:MM"` string supported)

### 4.3 Boot self-test output (screenshot)
- WiFi OK, NTP OK
- HTTPS fetch FAIL (code=0 len=0)
- JSON parse OK

This strongly suggests:
- network connectivity exists,
- but the HTTPS fetch to the configured Apps Script URL is failing intermittently or due to network/TLS/redirect constraints.

---

## 5) Hardcoded endpoints found in code (must be documented or centralized)

Virtual UI:
- `fetch.js`: `apiLink = https://script.google.com/macros/s/<...>/exec`
- `externaltimesync.js`: time sync endpoint (plain text ms)
- `externaltimesync.js`: konf endpoint `...?foorinr=1` (returns `[kestus, foorinihe]`)

Firmware:
- `traffic_light_real_test.ino`: `apiurl = https://script.google.com/macros/s/<...>/exec?action=read&intersectionID=5`

---

End of observed notes.


## Newly observed: separate time sync + config APIs

### Time sync (`externaltimesync.gs`)
- Deployed Apps Script endpoint returns epoch ms (number as text).
- Virtual UI calls it every 30 seconds; if unreachable, it keeps running on local clock.

### Cycle timing config (`configapi.gs`)
- Deployed Apps Script endpoint expects `?foorinr=<int>` and returns `[kestusSeconds, niheSeconds]`.
- Reads from a small config sheet where:
  - `kestus` is stored in cell B5
  - `nihe` values are stored in row 2 (B=foor1, C=foor2, ...)

### Important mismatch
- Virtual UI uses `kestus/nihe` from config API for timing.
- Firmware uses `CycleData["Length"]` from the cycles table for timing.
