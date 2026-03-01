# Traffic Light System (Valgusfoori süsteem Eesti keelse versiooni jaoks vaata docs-i) 

Web dashboard for controlling and visualizing the operation of a traffic-light hardware system.

A low-footprint CRUD application designed for exceptional traffic management. It does not require a custom domain or a paid database. The system controller applies business logic based on sensor data and settings configured in the admin panel. After installation, the traffic lights configured for an intersection can be monitored through an NTP-synchronized web view.

A modular prototype for **visualizing and controlling traffic-light intersections** using:
- a **web-based virtual traffic light UI** (HTML/CSS/JavaScript),
- a **Google Sheets-based database** (tables: `lights`, `cycles`),
- a **Google Apps Script backend API** that connects the components,
- optional **physical traffic lights** driven by **NodeMCU/ESP8266** controllers,
- an **admin page** for managing Sheets data.

> Status: **Prototype** (the core virtual intersection flow works; the admin log view and some physical hardware features are still incomplete).

The goal is to build a globally usable open-source traffic light system that can be deployed quickly for temporary traffic control in crisis situations, during roadworks, in the event of technical failures, and in other scenarios where permanent traffic lights are not practical.

To support rapid and modular deployment, the project intentionally avoids centralized servers and specialized hardware. At the same time, operators often need to monitor intersections remotely and in real time. A localhost-only setup was not suitable, and requiring users to deploy and maintain their own always-on server near the device would add unnecessary complexity. Google Sheets was therefore chosen as the persistence layer: it provides Google's uptime, offers a familiar interface for administrators, and avoids the need for a paid domain or separate database hosting.

For more info or the Estonian version of this document please see the docs.
---

## Table of contents
- [Features](#features)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Quickstart](#quickstart)
- [Configuration](#configuration)
- [Backend API](#backend-api)
- [Admin panel](#admin-panel)
- [Physical controller (NodeMCU/ESP8266)](#physical-controller-nodemcuesp8266)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Features
- **Virtual intersection UI**: renders traffic lights on a **CSS grid**; updates every second.
- **Deterministic control logic**: finite state machines for **2-, 3-, and 4-way** intersections.
- **Master-light mapping**: “main” traffic light (master) defines the intersection phase; other directions derive deterministically.
- **Server-anchored timing**: local time is anchored to an authoritative server time via Apps Script, with drift handled by re-sync.
- **Config in Google Sheets**: intersections and cycles can be edited without redeploying the frontend.
- **Night flashing-yellow override**: configurable daily blink window (`BlinkStart`, `BlinkEnd`), including overnight windows.
- **Safety fallback**: if data is missing/invalid, the system can fall back to **ALL_YELLOW**.

---

## Architecture

### High-level data flow

```text
 Browser (Virtual UI)                     Google
 ┌──────────────────────┐               ┌──────────────────────┐
 │ valgusfoor.html      │   fetch/read  │ Apps Script Web App  │
 │ styles.css           ├──────────────►│  endpoints: read/... │
 │ navigation.js        │               └─────────┬────────────┘
 │ fetch.js             │                         │
 │ externaltimesync.js  │                         │ reads/writes
 │ foorlogic.js         │                         ▼
 │ statemachines.js     │               ┌──────────────────────┐
 │ temporalrules.js     │               │ Google Sheets        │
 └──────────────────────┘               │  lights / cycles     │
                                        └──────────────────────┘

 Optional hardware:
 NodeMCU/ESP8266 controllers fetch timing/config and drive physical lights + logs (prototype)
```

### Key concepts (short)
- **`lights`**: one row per traffic light per intersection direction (N/E/S/W); includes `Tile` (grid location) and `IsMainTrafficLight`.
- **`cycles`**: one row per cycle definition; phase ratios (`RedRatio`, `GreenRatio`, etc.) and a blink window (`BlinkStart`, `BlinkEnd`).
- **Phase calculation**: `(authoritativeTime - offset) mod duration` determines the current phase; ratios map to discrete stages.
- **Intersection type detection**: number of lights (2/3/4) selects the appropriate finite state machine; invalid count → safe mode.

For the deeper technical description, see **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**.

---

## Repository layout
This project is split into a **virtual UI**, an **admin UI**, and **backend/hardware** components.

### Virtual UI (VeebiFoor)
- `valgusfoor.html` — HTML UI, loads scripts/styles, intersection selection buttons, DOM for lights.
- `styles.css` — CSS Grid layout (12×10 prototype), light styling, and positioning via CSS variables.
- `externaltimesync.js` — anchors local time to server time, loads duration + offset.
- `fetch.js` — fetches intersection config and cycles; validates/cleans backend data.
- `navigation.js` — handles intersection selection; updates CSS grid positions; selects the correct state machine.
- `statemachines.js` — finite state machines for 2/3/4-way intersections; safety fallback.
- `foorlogic.js` — computes phase, maps master light → state, updates DOM lamp classes.
- `temporalrules.js` — night blink window evaluation; overrides to `ALL_YELLOW` when active.

<img width="1197" height="946" alt="image" src="https://github.com/user-attachments/assets/ce3a8d71-ceee-4604-ae8b-d519177f11c0" />
<img width="1200" height="955" alt="image" src="https://github.com/user-attachments/assets/6246a178-1d05-43b9-9f34-2671c26690ef" />

### Admin UI (AdminLeht)
- `main.html` — admin page for managing Sheets-backed database (`lights`/`cycles`).
- `main.js` — admin UI logic: load/save, change tracking.  

### Backend + database + hardware
- **Google Sheets**: tabs `lights`, `cycles`.
- **Google Apps Script Web App**: endpoints such as `read`, `adminRead`, `adminWrite`.
- **NodeMCU/ESP8266**: optional physical traffic light controller (prototype).

---

## Backend services (important)

This repo uses **three** Google Apps Script web apps:

1) **Main database API** (`api.gs`): serves `lights` + `cycles` from Sheets  
2) **Time sync API** (`externaltimesync.gs`): returns epoch ms for client time anchoring  
3) **Cycle timing config API** (`configapi.gs`): returns `[kestusSeconds, niheSeconds]` for the virtual UI

These are documented in:
- `BACKEND_SERVICES.md`
- `CONFIG_SHEET.md`
- `SCHEMA_CANONICAL.md`

> If you only deploy the main DB API, the virtual UI may not animate correctly because `kestus`/`foorinihe` stay at 0.


## Quickstart full installation can guide can be found in the INSTALLATION.md

### 1) Create the Google Sheets “database”
1. Create a new Google Sheets file (example name: `TrafficLightsDB`).
2. Create two tabs:
   - `lights`
   - `cycles`
3. Add headers in row 1:

**`lights` columns**
- `ID`
- `IsMainTrafficLight`
- `IntersectionID`
- `CardinalDirection` (N/E/S/W)
- `Offset` (currently unused in code)
- `Tile` (grid area name, e.g. `g5`)
- `CycleID`

**`cycles` columns**
- `ID`
- `Length`
- `RedRatio`
- `RedYellowRatio`
- `YellowRatio`
- `GreenYellowRatio`
- `GreenRatio`
- `BlinkStart` (minutes after midnight, 0–1439)
- `BlinkEnd` (minutes after midnight, 0–1439)

4. Share settings:
   - If you deploy a public web app endpoint, you may need the sheet accessible accordingly.
   - **Be careful**: public access can expose configuration data. See [Security](#security).

---

### 2) Deploy the Google Apps Script backend
1. In Google Drive: **New → More → Google Apps Script**.
2. Paste backend code from google scripts copy .
3. Set your Sheet/DB ID in the script (replace example
 placeholders`).
4. Deploy as Web App:
   - **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (or narrower if you add auth)
5. Copy the Web App URL:
   - Looks like `https://script.google.com/macros/s/.../exec`

---

### 3) Run the virtual traffic light UI
**Prereqs:** VS Code + Live Server (or any static file server) and a modern browser.

1. Open the project in VS Code.
2. Set the backend base URL (single source of truth recommended):
   - Example:
     ```js
     const BACKEND_BASE_URL = "https://script.google.com/macros/s/XXXX/exec";
     ```
3. Serve `valgusfoor.html`:
   - VS Code Live Server → “Open with Live Server”
   - or:
     ```bash
     python -m http.server 5500
     ```
4. In the browser, select an intersection (Ristmik 1..4).
5. Confirm the lamps update over time (server-synced).  
   If enabled, a debug block should show drift/phase calculation internals.

---

## Configuration

> **Schema note:** the cycles table currently uses the column name `Length` (typo). The firmware reads `CycleData["Length"]`.

> **Admin note:** the current admin UI code references `NightStart/NightEnd`, but the runtime logic uses `BlinkStart/BlinkEnd`. See `SCHEMA_CANONICAL.md`.



### Intersection configuration (`lights`)
Each row describes one direction light for a specific intersection.

| Field | Meaning |
|------|---------|
| `ID` | Unique row identifier |
| `IsMainTrafficLight` | `TRUE` for the “master” light (used to derive intersection phase) |
| `IntersectionID` | Intersection identifier (e.g. 1..4) |
| `CardinalDirection` | `N`, `E`, `S`, `W` |
| `Offset` | Offset (seconds/ms) — currently unused |
| `Tile` | CSS grid “area” name (e.g. `g5`) |
| `CycleID` | Foreign key to `cycles.ID` |

### Cycle configuration (`cycles`)
Cycle phases are configured as **ratios (0..1)** that should sum roughly to 1. Missing/0 values are skipped.

| Field | Meaning |
|------|---------|
| `ID` | Cycle identifier |
| `Length` | Optional/reserve duration field |
| `RedRatio` | fraction of cycle |
| `RedYellowRatio` | fraction of cycle |
| `GreenRatio` | fraction of cycle |
| `GreenYellowRatio` | fraction of cycle |
| `YellowRatio` | fraction of cycle |
| `BlinkStart` | minutes after midnight (0–1439) |
| `BlinkEnd` | minutes after midnight (0–1439); can wrap overnight |

### Night flashing-yellow behavior
- If current local (server-corrected) time falls within `[BlinkStart, BlinkEnd]`,
  the intersection state machine is overridden to **`ALL_YELLOW`**.
- If `BlinkStart > BlinkEnd`, the blink window spans midnight.

---

## Backend API

### Expected response shape
The virtual UI expects JSON shaped roughly like:

```json
{
  "data": [
    {
      "ID": 0,
      "IntersectionID": 1,
      "CardinalDirection": "N",
      "IsMainTrafficLight": true,
      "Tile": "g5",
      "CycleID": 1,
      "CycleData": {
        "RedRatio": 0.3,
        "RedYellowRatio": 0.1,
        "GreenRatio": 0.3,
        "GreenYellowRatio": 0.1,
        "YellowRatio": 0.2,
        "BlinkStart": 120,
        "BlinkEnd": 420
      }
    }
  ]
}
```

### Admin endpoints (typical)
- `adminRead` / `adminWrite` for managing the Sheets-backed database.

> Implementation details depend on your Apps Script code version (simplified vs admin-enabled).

---

## Admin panel
The admin page is intended for:
- Managing `lights` / `cycles` data (CRUD operations)

To run:
1. Set the same `BACKEND_BASE_URL` used by the virtual UI.
2. Serve `main.html` with Live Server (or any static server).
3. Use load/save controls to modify Sheets-backed data.

---

## Physical controller (NodeMCU/ESP8266)

### Requirements
- NodeMCU / ESP8266 (or equivalent Wi‑Fi MCU)
- Arduino IDE or PlatformIO
- ESP8266 board support package
- Libraries:
  - `ArduinoJson`
  - `ESP8266WiFi`, `ESP8266HTTPClient`, `WiFiClientSecureBearSSL` (from ESP8266 package)
  - `time.h` (toolchain)

### Setup (Arduino IDE)
1. Arduino IDE → Preferences → **Additional Boards Manager URLs**  
   Add:
   ```
   https://arduino.esp8266.com/stable/package_esp8266com_index.json
   ```
2. Tools → Board → Boards Manager → install **esp8266**.
3. Library Manager → install **ArduinoJson**.

### Configure secrets and endpoint
Create a header like:

```cpp
#pragma once
const char* WIFI_SSID = "YourWifi";
const char* WIFI_PASS = "YourPassword";
const char* BACKEND_URL = "https://script.google.com/macros/s/XXXX/exec";
```
Physical setup:
Uses light resistor to measure ambient light in order to dim lights to preserve battery.
<img width="608" height="472" alt="image" src="https://github.com/user-attachments/assets/4509ab15-c2da-445c-a832-0f9e53f41a7b" />
How the wires run. Note the lack of power bank and actual arduino instead of node mcu.
<img width="501" height="269" alt="Screenshot 2026-01-21 221655" src="https://github.com/user-attachments/assets/10795efe-d31a-4dee-beb0-52f1c047044f" />
For easier bug fixing I added tests to the arduino that can be activated with the keyboard number keys.
![20260302_014251](https://github.com/user-attachments/assets/b1c2b092-aeac-4e35-b6d3-2180e376d1c4)
University lab didn't have a propper drill and I really like the red wood and don't want to mess it up :( and the Local RIMI store power bank had faulty soldering so the powerbank couldn't be charged after the demo to the teacher.

### Notes
- If the controller clock is off (e.g., timezone drift), ensure your time source/timezone handling is correct
  (NTP, timezone offsets, or server-provided time). This matters for blink windows.

---

## Troubleshooting

### Virtual UI shows no updates / all yellow
- Backend unreachable, invalid payload, or intersection type not recognized.
- Check:
  - Apps Script web app is deployed and accessible.
  - Your `BACKEND_BASE_URL` is correct.
  - Your Sheets has the required headers and data types.
  - Intersection has **2, 3, or 4** direction entries.

### Lights appear in wrong grid positions
- `Tile` values must match the **grid template area names** defined in `styles.css`.
- Verify `fetch.js` updates CSS variables (e.g. `--grid-N/E/S/W`) with valid area names.

### Night blink doesn’t trigger
- Ensure `BlinkStart`/`BlinkEnd` are set (0–1439 minutes after midnight).
- Confirm server-synced time is working (externaltimesync) and local timezone assumptions are correct.

For more, see **[`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)**.

---

## Roadmap
- [ ] Finish admin log visualization (numeric/text/graph views).
- [ ] Make grid layout fully dynamic (not prototype static).
- [ ] Add automated tests for state machines and phase mapping.
- [ ] Add CI (lint/test) via GitHub Actions.
- [ ] Document and harden authentication/authorization for admin operations.
- [ ] Database input validation.
- [ ] Security improvements.
- [ ] Allow to add Google App Scripts in the UI.
- [ ] Add time server support for arduino clock.
- [ ] MAC address based assignment of physical traffic lights.
- [ ] API validation
- [ ] Migration to hexagonal grid developed by uber for their map system.
- [ ] Leaflet and the ability to add custom crossing sprites to the map via UI.
- [ ] Arduino security and automatic firmware install via UI and controll over used network.
- [ ] Hardening actual logic based on this video that I found while writing post mortem https://youtu.be/oov8HDz3qVk?si=OYZL9QhPs0p6U92z.
- [ ] Allow the user to construct state machines via admin UI.
- [ ] Due to the single threaded nature of JS I ran into some bugs when implementing midnight blinking mode. Both versions were broken in their own way. Plan is to also fix that.
- [ ] Migrate admin page to propper API for clock
- [ ] Migrate virtual ui to use database for offset instead of nihe and add validation and pairing logic so different traffic lights in one intersection can have different on times. Or allow multiple intersection in one UI.
- [ ] Dynamic amount of buttons in the ui for navigating between intersections depending on database size.
- [ ] Finnish docs.
- [ ] Automate setup and table creation in Google Sheets.
---

## Contributing
See **[`CONTRIBUTING.md`](CONTRIBUTING.md)** for setup, workflow, and PR checklist.

---

## Security
See **[`SECURITY.md`](SECURITY.md)** for reporting issues and guidance (Sheets access, web app exposure, secrets).

---

## License
This repo includes an **MIT License template** in [`LICENSE`](LICENSE).  
