# Backend services and endpoints 

This project currently uses **multiple Google Apps Script web apps**:

1. **Main database API** (Sheets-backed): `api.gs`
2. **Time sync API** (authoritative epoch ms): `externaltimesync.gs`
3. **Cycle timing config API** (`kestus` + per-foor `nihe`): `configapi.gs`

Because the frontend and firmware depend on these services, keeping their **URLs + spreadsheet IDs** documented and configurable is critical.

---

## 1) Main database API (`api.gs`)

### Purpose
Provides the intersection configuration from Google Sheets:
- `lights` table
- `cycles` table

It also exposes admin endpoints used by the admin page.

### Required configuration
In `api.gs` you must set:

- `DATABASE_ID` — the Google Sheets file ID containing the `lights` and `cycles` tabs.

If `DATABASE_ID` is empty, all API calls will fail.

### Endpoint
Deployed as a Google Apps Script Web App.

Requests are made using query parameters:

- `?action=read&intersectionID=<id>`
- `?action=adminRead`
- `?action=adminWrite&data=<json>`

> Note: your actual deployment base URL looks like  
> `https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec`

### Read (virtual UI + firmware)
**Request**
- `GET .../exec?action=read&intersectionID=1`

**Response (shape)**
```json
{
  "success": true,
  "messages": [],
  "time": 0,
  "data": [
    {
      "ID": 0,
      "IsMainTrafficLight": true,
      "IntersectionID": 1,
      "CardinalDirection": "N",
      "Offset": 0,
      "Tile": "g5",
      "CycleID": 1,
      "CycleData": {
        "ID": 1,
        "Length": 20,
        "RedRatio": 0.3,
        "RedYellowRatio": 0.1,
        "GreenRatio": 0.3,
        "GreenYellowRatio": 0.1,
        "YellowRatio": 0.2,
        "BlinkStart": 0,
        "BlinkEnd": 300
      }
    }
  ]
}
```

#### Important implementation notes
- `CycleData` is attached per light based on the light row’s `CycleID`.
  Firmware reads `cycle["Length"]`.

### Admin endpoints (admin page)
- `adminRead`: returns full tables + schema metadata.
- `adminWrite`: writes back changes.

> **Auth warning:** current code does not enforce authentication. If deployed to “Anyone”, `adminWrite` is unsafe.

---

## 2) Time sync API (`externaltimesync.gs`)

### Purpose
The virtual UI anchors its local clock to a server-provided time.

### Response format
`externaltimesync.gs` returns the current epoch time in milliseconds.

Example response body:
```text
1768947772020
```

### Endpoint
Deployed as a separate Apps Script web app.

The current code calls a hardcoded URL in `externaltimesync.js`:
- `syncFromServerTime()` fetches plain text and does `parseInt(...)`.

---

## 3) Cycle timing config API (`configapi.gs`)

### Purpose
Provides two values to the virtual UI:
- `kestus` (cycle duration, seconds)
- `nihe` (offset per foor, seconds)

`externaltimesync.js` converts these to milliseconds and uses them to compute:
- `fooriaeg = (authoritativeTime - foorinihe) % kestus`

### Request
`GET .../exec?foorinr=1`

### Response
A JSON array:
```json
[15, 0]
```
Meaning:
- `15` = `kestus` seconds (cycle duration)
- `0` = `nihe` seconds for the selected `foorinr`

### Backing spreadsheet layout (config sheet)
`configapi.gs` reads a **fixed 5×5 range** from the first sheet of a separate spreadsheet.

Layout example:

| ID | IsMainTrafficLight | IntersectionID | CardinalDirection | Offset | Tile | CycleID |
|---:|:-------------------|---------------:|:------------------|-------:|:-----|--------:|
| 0  | TRUE               | 1              | N                 | 0      | g5   | 1 |
| 1  | FALSE              | 1              | W                 | 0      | e6   | 1 |
| 2  | FALSE              | 1              | S                 | 0      | g7   | 1 |
| 3  | TRUE               | 2              | N                 | 0      | f4   | 3 |
| 4  | FALSE              | 2              | E                 | 0      | g5   | 3 |
| 5  | FALSE              | 2              | S                 | 0      | f7   | 3 |
| 6  | FALSE              | 2              | W                 | 0      | e6   | 3 |
| 7  | TRUE               | 3              | N                 | 0      | f4   | 2 |
| 8  | FALSE              | 3              | S                 | 0      | g6   | 2 |
| 9  | FALSE              | 3              | W                 | 0      | e6   | 2 |
| 10 | TRUE               | 4              | E                 | 0      | g6   | 7 |
| 11 | TRUE               | 4              | W                 | 0      | i5   | 7 |
| 12 | TRUE               | 5              | N                 | 0      | a1   | 1 |
| 13 | FALSE              | 0              | S                 | 0      | a1   | 1 |

| ID | Length | RedRatio | RedYellowRatio | GreenRatio | GreenYellowRatio | YellowRatio | BlinkStart | BlinkEnd |
|---:|-------:|---------:|---------------:|-----------:|-----------------:|------------:|-----------:|---------:|
| 0 | 0  | 0.8  | 0.05 | 0.05 | 0.05 | 0.05 | 0    | 300 |
| 1 | 0  | 0.3  | 0.1  | 0.3  | 0.1  | 0.2  | 0    | 300 |
| 2 | 0  | 0.01 | 0    | 0.49 | 0    | 0.5  | 1    | 420 |
| 3 | 0  | 0.1  | 0.05 | 0.1  | 0.05 | 0.7  | 575  | 420 |
| 4 | 0  | 0.3  | 0.5  | 0.3  | 0.5  | 0.3  | 1300 | 420 |
| 5 | 20 | 0.1  | 0.25 | 0.25 | 0.25 | 0.15 | 0    | 420 |
| 6 | 30 | 0.2  | 0.2  | 0.2  | 0.2  | 0.2  | 0    | 360 |
| 7 | 20 | 0.8  | 0.05 | 0.05 | 0.05 | 0.05 | 1320 | 420 |

Warning currently there's little data validation  keep in mind hard coded limitations such as the css grid size, N S W E, one main traffic light per intersection, supported intersection size in state machines aka intersections should have **2, 3, or 4** light rows, ratios have to add up to 1 and that blink start or end cant be negative nor have more minutes in it than there are in a day.

grid-template-areas:
  "a1 b1 c1 d1 e1 f1 g1 h1 i1 j1 k1 l1 "
  "a2 b2 c2 d2 e2 f2 g2 h2 i2 j2 k2 l2 "
  "a3 b3 c3 d3 e3 f3 g3 h3 i3 j3 k3 l3 "
  "a4 b4 c4 d4 e4 f4 g4 h4 i4 j4 k4 l4 "
  "a5 b5 c5 d5 e5 f5 g5 h5 i5 j5 k5 l5 "
  "a6 b6 c6 d6 e6 f6 g6 h6 i6 j6 k6 l6 "
  "a7 b7 c7 d7 e7 f7 g7 h7 i7 j7 k7 l7 "
  "a8 b8 c8 d8 e8 f8 g8 h8 i8 j8 k8 l8 "
  "a9 b9 c9 d9 e9 f9 g9 h9 i9 j9 k9 l9 "
  "a10 b10 c10 d10 e10 f10 g10 h10 i10 j10 k10 l10 "
;
