# Installation & Runbook

This runbook covers:
- Virtual web UI (VeebiFoor)
- Admin page (AdminLeht)
- Google Sheets + Apps Script backend
- NodeMCU/ESP8266 physical controller (prototype)

## Prerequisites
- Google account (Drive, Sheets, Apps Script)
- VS Code + Live Server (or any static file server)
- Modern browser (Chrome/Edge/Firefox)
- Optional hardware:
  - NodeMCU / ESP8266
  - Arduino IDE or PlatformIO
  - ESP8266 boards package
  - ArduinoJson library

---

## 1) Create the Sheets “database”
1. Create a Google Sheets file (e.g., `TrafficLightsDB`).
2. Add tabs: `lights`, `cycles`.
3. Add column headers (row 1):

### lights
`ID`, `IsMainTrafficLight`, `IntersectionID`, `CardinalDirection`, `Offset`, `Tile`, `CycleID`

### cycles
`ID`, `Length`, `RedRatio`, `RedYellowRatio`, `YellowRatio`, `GreenYellowRatio`, `GreenRatio`, `BlinkStart`, `BlinkEnd`

4. Populate data and keep IDs consistent:
- `CycleID` in `lights` must exist as `ID` in `cycles`.
- `CardinalDirection` must be `N/E/S/W`.
- Ratios should sum close to 1.0 (missing/0 values are ignored).

---

## 2) Set up the Apps Script backend
1. Drive → New → More → Google Apps Script.
2. Paste your backend code (admin-enabled or simplified).
3. Set your Sheets file ID in the script.
4. Deploy:
   - Deploy → New deployment → Web app
   - Execute as: Me
   - Access: Anyone (or stricter if you add auth)
5. Copy the Web app URL.

---

## 2.1) Deploy the Time sync API (`externaltimesync.gs`)
1. Create a new Apps Script project.
2. Paste the contents of `externaltimesync.gs`.
3. Deploy as a Web App.
4. Copy the deployment URL and update it in `externaltimesync.js` (`syncFromServerTime()`).

Expected response body is a plain epoch-ms number (text), e.g. `1768947772020`.

---

## 2.2) Deploy the Cycle timing config API (`configapi.gs`)
1. Create (or choose) a small Google Sheet for cycle timing config. See `CONFIG_SHEET.md`.
2. Create a new Apps Script project and paste `configapi.gs`.
3. Update the Spreadsheet ID in `configapi.gs` to your sheet ID.
4. Deploy as a Web App.
5. Update the URL in `externaltimesync.js` (`kysiKonf()`).

Endpoint: `.../exec?foorinr=1`  
Response: `[kestusSeconds, niheSeconds]`

> **Note:** the current UI code uses a fixed `foorinr=1`. If you have multiple intersections, you must define how `foorinr` maps to intersection selection.


---

## 3) Run the virtual UI (VeebiFoor)
1. Open the repo in VS Code.
2. Set `BACKEND_BASE_URL` in your JS config.
3. Serve `valgusfoor.html`:
   - Live Server, or `python -m http.server 5500`
4. Use the intersection selection UI.

Validation:
- Lamps update once per second.
- If enabled, debug output shows time drift and phase.

---

## 4) Run the admin page (AdminLeht)
1. Set the same `BACKEND_BASE_URL`.
2. Serve `main.html` with Live Server.
3. Use load/save to manage tables.

Note: log visualization may be incomplete in current prototype.

---

## 5) NodeMCU/ESP8266 (optional)
### Arduino IDE setup
- Preferences → Additional Boards Manager URLs:
  `https://arduino.esp8266.com/stable/package_esp8266com_index.json`
- Boards Manager → install `esp8266`
- Library Manager → install `ArduinoJson`

### Configure secrets
Use a local header (gitignored), e.g.:
```cpp
#pragma once
const char* WIFI_SSID = "...";
const char* WIFI_PASS = "...";
const char* BACKEND_URL = "https://script.google.com/macros/s/XXXX/exec";
```

### Build / flash
- Select the correct board/port.
- Compile and upload.

Time note:
- Ensure time source and timezone are correct if you use blink windows.
