# Architecture

This document describes the system architecture and core logic for the Traffic Light System.

## Time & cycle timing services (virtual UI)

The virtual UI uses **two additional Apps Script services** beyond the main DB API:

- **Time sync** (`externaltimesync.gs`): returns epoch ms for client anchoring.
- **Cycle timing config** (`configapi.gs`): returns `[kestusSeconds, niheSeconds]` based on `foorinr`.

These directly feed `kestus` and `foorinihe` used in the phase calculation in `foorlogic.js`.

See `BACKEND_SERVICES.md` for request/response formats.


## Components
### Virtual traffic light UI (VeebiFoor)
- **HTML**: UI shell + intersection selection + DOM structure for lights.
- **CSS**: grid layout (prototype 12×10) + lamp styling; positions driven by CSS variables.
- **JS modules**
  - **Time sync** (`externaltimesync.js`): anchors client time to server time from Apps Script, and reads `duration` and `offset`.
  - **Data fetch + cleanup** (`fetch.js`): reads intersection configuration and cycle data; builds stage arrays.
  - **Navigation / selection** (`navigation.js`): chooses intersection; updates CSS variables for positioning; selects state machine.
  - **State machines** (`statemachines.js`): deterministic finite automata for 2-, 3-, 4-way intersections; safety fallback.
  - **Logic / rendering** (`foorlogic.js`): phase calculation; master color → state; DOM class updates.
  - **Temporal rules** (`temporalrules.js`): blink window override to `ALL_YELLOW`.

### Admin page (AdminLeht)
- `main.html`, `main.js`: CRUD-like management of `lights` and `cycles` tables via Apps Script.

### Backend + database
- **Google Sheets**: acts as a human-editable database with data validation
- **Google Apps Script Web App**: provides API endpoints such as `read`, `adminRead`, `adminWrite` and returns JSON responses.

### Physical traffic lights 
- NodeMCU/ESP8266 controllers fetch timing/config and drive physical lamps; can emit logs (prototype).

---

## Data model

### `lights` (intersection-light mapping)
One row per traffic light for a given intersection and cardinal direction.

Fields:
- `ID` — unique identifier
- `IsMainTrafficLight` — marks the “master” light
- `IntersectionID` — intersection identifier (e.g., 1..4)
- `CardinalDirection` — N/E/S/W
- `Offset` — per-light offset (currently unused in code)
- `Tile` — CSS grid tile/area name (e.g., `g5`)
- `CycleID` — foreign key to `cycles.ID`

### `cycles` (phase definitions)
Phases are defined as ratios (0..1) that should sum ~1. Missing/0 values are ignored.

Fields:
- `ID`
- `Length`
- `RedRatio`
- `RedYellowRatio`
- `GreenRatio`
- `GreenYellowRatio`
- `YellowRatio`
- `BlinkStart` / `BlinkEnd` — minutes after midnight, 0..1439 (supports overnight window if start > end)

---

## Backend response shape (UI expectation)
The frontend expects `{ data: [...] }` where each element contains the `lights` fields and embeds a `CycleData` object.

Example (schematic):

```json
{
  "data": [
    {
      "IntersectionID": 1,
      "CardinalDirection": "N",
      "IsMainTrafficLight": true,
      "Tile": "g5",
      "CycleID": 1,
      "CycleData": { "RedRatio": 0.3, "BlinkStart": 120, "BlinkEnd": 420 }
    }
  ]
}
```

---

## Core runtime chain (virtual UI)

1. On load, the app calls an `init`-like function that:
   - synchronizes time with server
   - starts a 1-second UI refresh loop
2. User selects an intersection (e.g., 1..4).
3. `navigation.js` fetches config for that intersection via `fetch.js`.
4. `Tile` values update CSS variables (e.g., `--grid-N/E/S/W`) so lights move on the grid.
5. Cycle ratios are converted to ordered stages:
   - `[[offset, ['red']], [offset, ['red','yellow']], ...]`
6. `foorlogic.js` computes phase:
   - `phase = ((authoritativeTime - offset) mod duration) / duration`
   - selects the stage where stageOffset <= phase
7. The master direction is detected (`IsMainTrafficLight=true`), and its current color is mapped to a state in the selected finite state machine.
8. The machine state defines all directions’ colors; DOM lamp classes are updated.
9. `temporalrules.js` checks the blink window at minute boundaries:
   - when active: overrides to `ALL_YELLOW`
   - when inactive: restores previous machine

---

## Time anchoring (authoritative clock)
A common approach used here:
- Store `(lastServerTime, lastClientTime)` on sync.
- Compute authoritative time:
  - `authoritativeTime = lastServerTime + (Date.now() - lastClientTime)`
- Continue locally when server is temporarily unreachable.

---

## Safety behavior
- If server data is invalid or intersection type can’t be determined, the UI can fall back to `ALL_YELLOW`.
- This protects the UI from undefined mappings and makes failures visible.

---

## Extensibility notes
- Use `Offset` for per-light physical alignment.
- Add more intersection topologies by adding state machines + schema support.
- Consider introducing authentication around admin endpoints.
