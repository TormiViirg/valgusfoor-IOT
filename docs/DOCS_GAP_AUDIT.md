# Documentation gap audit (point‑by‑point)

This file is a **painstaking, best‑practices checklist** comparing what a “professional” GitHub repo typically documents vs. what is currently present in this repository (docs + code).  
Use it as a punch‑list: each item includes **Status (✅ / ⚠️ / ❌)** and **What is still needed**.

---

## Scope of what was reviewed

### Documentation files
- `README.md`, `README.et.md`
- `ARCHITECTURE.md`
- `INSTALLATION.md`
- `TROUBLESHOOTING.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
- `dokumentatsioon (1).txt` (original spec/notes)

### Source code files (to extract “implied requirements” and hidden assumptions)
- Frontend (virtual UI): `valgusfoor.html`, `styles.css`, `navigation.js`, `fetch.js`, `externaltimesync.js`, `foorlogic.js`, `statemachines.js`, `temporalrules.js`
- Backend (Apps Script): `api.gs`
- Firmware (NodeMCU/ESP8266): `traffic_light_real_test.ino`

---

## Status legend
- ✅ **Complete / adequate** for a public repo
- ⚠️ **Partial** (exists but missing key details or is inconsistent with code)
- ❌ **Missing** (not documented or referenced but absent)

---

## 1) Repo “front door” expectations (README-level)

### 1.1 What the project is, who it’s for, and what problem it solves
- Status: ⚠️ Partial
- What exists:
  - README has an overview + feature list.
- Still needed:
  - Explicit target audience(s): e.g. “school project demo”, “research prototype”, “municipal pilot”, etc.
  - What is *in scope* vs *out of scope* (e.g., not a certified controller; no safety guarantees).

### 1.2 One clear “Quick start” that actually works from a clean clone
- Status: ⚠️ Partial
- What exists:
  - Quickstart for Sheets + Apps Script + static server.
- Still needed:
  - A **single source of configuration** for URLs: right now URLs are hardcoded in multiple JS files and in firmware.
  - A “smoke test checklist” with expected UI output and known-good test data (example Sheets rows).

### 1.3 Screenshots / short demo (GIF/video)
- Status: ❌ Missing
- Still needed:
  - At least 1 screenshot of the virtual UI and (optionally) the admin UI and hardware setup.

### 1.4 Badges (build, license, status)
- Status: ❌ Missing
- Still needed:
  - If you add CI later, add a build badge.
  - A license badge once `LICENSE` exists.

### 1.5 Repository layout is accurate
- Status: ✅ Complete
- What exists:
  - README + repo now include `main.html` / `main.js` admin UI.
- Still needed:
  - Keep docs and file paths in sync if you reorganize folders.
### 1.6 Links in README are valid
- Status: ⚠️ Partial
- Still needed:
  - Some links referenced a `docs/` folder (but docs currently live in repo root). Ensure links match actual paths.

---

## 2) Installation, configuration, and operations

### 2.1 Explicit prerequisites (versions + tools)
- Status: ⚠️ Partial
- Still needed:
  - Browser requirements (tested versions).
  - For firmware: Arduino IDE/PlatformIO versions; ESP8266 core version; ArduinoJson major version.

### 2.2 Configuration reference (all configurable knobs)
- Status: ⚠️ Partial
- What exists:
  - Some config described (Sheets headers, blink window).
- Still needed (high impact):
  - **All URL endpoints** and where to set them:
    - Virtual UI `apiLink` (`fetch.js`)
    - Time sync URL + “konf” URL (`externaltimesync.js`)
    - Firmware `apiurl` (`traffic_light_real_test.ino`)
  - Refresh intervals (frontend: 1s render loop; time sync every 30s; konf fetch every 10s; firmware fetch every 5 min).
  - Timezone assumptions (frontend/server vs firmware NTP TZ).

### 2.3 Reproducible “golden” example data
- Status: ❌ Missing
- Still needed:
  - A minimal example Sheets dataset (lights + cycles) in CSV/JSON or documented rows that you can copy/paste.

### 2.4 Deployment guidance & limitations (Apps Script quotas, hosting)
- Status: ⚠️ Partial
- Still needed:
  - Apps Script quotas/limits relevant to polling intervals and number of clients.
  - CORS/browser access notes (how your web app is accessed and any restrictions).

---

## 3) Backend API contract (Apps Script)

### 3.1 Endpoint list with parameters, methods, and examples
- Status: ⚠️ Partial
- What exists:
  - README mentions `read/adminRead/adminWrite`.
- Still needed:
  - Document exact query params:
    - `action=read&intersectionID=<id>`
    - `action=adminRead`
    - `action=adminWrite&data=<json>`
  - Note that `adminWrite` currently uses **GET with a JSON query parameter** (URL length limits).

### 3.2 Response schema (including errors)
- Status: ⚠️ Partial
- What exists:
  - Docs mostly show `{ data: [...] }`.
- Still needed:
  - Full schema as implemented: `{ success, messages, time, data }`.
  - Error behavior: on invalid request, the backend currently returns plain text `"Invalid request"` instead of JSON.

### 3.3 Data validation rules (required headers, types, allowed values)
- Status: ⚠️ Partial
- Still needed:
  - Required columns in `lights` and `cycles` (and what happens if missing).
  - `api.gs` requires `DATABASE_ID` to be set (it is currently empty), otherwise *all* reads/writes will fail.
  - Enforce/validate that each `IntersectionID` has 2, 3, or 4 rows (current state machines only support these counts).
  - Type expectations: boolean for `IsMainTrafficLight`, N/E/S/W for `CardinalDirection`, numeric ratios.
  - Whether multiple masters are allowed and how ties are resolved (code picks the *first* `IsMainTrafficLight==true`).

### 3.4 AuthN/AuthZ (especially for adminWrite)
- Status: ⚠️ Partial
- Still needed:
  - A minimal auth strategy (token, allowlist, Google account restriction) if deployed beyond a classroom/demo.
  - A note about exposing a Sheets-backed admin write endpoint publicly.

### 3.5 Versioning / backward compatibility
- Status: ❌ Missing
- Still needed:
  - Explicit API versioning or contract stability statement (even if “no guarantees, prototype”).

---

## 4) Data model (Google Sheets)

### 4.1 Schema is documented and consistent with code
- Status: ⚠️ Partial
- High-impact inconsistency to resolve:
  - The original spec text claims *IntersectionID must match cycles.ID*.  
    In code, **`CycleID` references `cycles.ID`** and `IntersectionID` is used to select the intersection.
- Still needed:
  - One authoritative schema definition and one vocabulary (“IntersectionID” vs “CycleID”).
  - Clarify whether each direction can have a different CycleID (code supports it; UI effectively uses the first row’s CycleData).

### 4.2 Meaning of `Length` (cycle duration)
- Status: ⚠️ Partial
- What exists (observed):
  - The current `cycles` sheet header appears to be spelled **`Length`** (typo) and the firmware parses `cycle["Length"]`.
  - The virtual UI uses `kestus` from the “konf” endpoint for the overall cycle duration.
  - Clarify precedence: if both `kestus` and `cycles.Length` exist, which one is authoritative for each subsystem.
  - Align the admin UI: `main.js` currently expects `NightStart`/`NightEnd`, while backend + firmware use `BlinkStart`/`BlinkEnd`.

### 4.3 Ratio normalization and validation
- Status: ❌ Missing
- What was observed:
  - Some cycle rows contain ratio values that do **not** sum to 1.0 (and may even exceed 1.0).
- Still needed:
  - Define whether these fields are true fractions (must sum to 1.0) or “weights” (can be any non-negative values that get normalized).
  - Define validation behavior for negatives, NaN, blanks, and sums of 0.
  - Document how rounding is handled (important for short cycles).

### 4.4 “Tile” coordinate system definition
- Status: ⚠️ Partial
- Still needed:
  - Define the allowed set of tile names (e.g., `a1..l10`), and what happens on invalid values.
  - Provide a diagram of the 12×10 grid or a mapping reference.

---

### 4.5 Intersection-level constraints (important for correctness)
- Status: ⚠️ Partial
- What was observed:
  - Some intersections have **multiple** rows with `IsMainTrafficLight=TRUE`.
  - At least one intersection appears to have only **one** configured direction row.
- Still needed:
  - Define and enforce: “exactly one master per intersection” vs “multiple allowed”.
  - Define minimum supported lights per intersection (code supports only 2/3/4).
  - If single-light intersections must be supported, add a one-way state machine and document it.
  - Define how missing directions are handled (fallback tiles + state mapping).

---

## 5) Frontend (virtual UI) behavior and assumptions

### 5.1 Time synchronization endpoints are documented
- Status: ❌ Missing (code uses endpoints not documented/provided)
- Still needed:
  - Where the time sync endpoint lives (Apps Script? different project?) and its response type (plain text ms).
  - Where the “konf” endpoint lives and what it returns (array of seconds).

### 5.2 State machine + phase mapping is documented at a “debuggable” level
- Status: ⚠️ Partial
- Still needed:
  - A truth table: master color → intersection state → per-direction colors.
  - Clarify the difference between:
    - “phase within cycle” (ratios)
    - “intersection state machine” (2/3/4-way)
  - Note that `statemachines.js` also has a background `setInterval(transition, 10000)` which may confuse readers.

### 5.3 Known limitations and failure modes
- Status: ⚠️ Partial
- Still needed:
  - If backend returns no data, UI goes ALL_YELLOW (documented) — but also call out:
    - missing headers → silent misbehavior (no explicit validation)
    - invalid Tile → lights may render at default/invalid location
    - multiple masters → first wins

---

## 6) Firmware (NodeMCU/ESP8266) documentation

### 6.1 Hardware wiring / BOM
- Status: ❌ Missing
- Still needed:
  - Wiring diagram or table: which GPIO to which LED, required resistors, photoresistor divider.
  - Power requirements and safety notes (especially if connected to real lamps/relays).

### 6.2 Firmware configuration steps match the code
- Status: ⚠️ Partial
- Still needed:
  - Code uses `STASSID`/`STAPSK` compile-time macros (with defaults), not the documented `secrets.h` constants.
  - `certs.h` is included but not present here; code uses `setInsecure()` anyway. Clarify whether you expect certificate pinning or not.

### 6.3 Firmware runtime behavior
- Status: ⚠️ Partial
- Still needed:
  - Describe the 4 system modes (RUNNING / WAIT_FOR_CYCLE_END / UPDATING / SAFETY).
  - Update interval (5 min) and that updates occur only at cycle boundaries.
  - Safety mode: darkness detection thresholds + confirmation time.
  - Blink window: time-based override that supersedes everything else.

### 6.4 Debug/diagnostics (serial menu)
- Status: ❌ Missing
- Still needed:
  - Document the serial diagnostic menu (keys 1–9, 0) and what each test does.
  - Include a few example serial outputs and what “good” looks like.

---

## 7) Contribution, governance, and community health

### 7.1 CONTRIBUTING
- Status: ✅ Present (basic)
- Still needed:
  - Optional: add local dev “known issues” section (Apps Script deployment gotchas, Live Server CORS).

### 7.2 SECURITY policy
- Status: ✅ Present (basic)
- Still needed:
  - A real contact method (email, private issue process) once this is beyond a class project.

### 7.3 Code of Conduct
- Status: ✅ Present
- Still needed:
  - Optional: add a short “reporting” section if this project will accept external contributions.
---

## 8) Legal and licensing

### 8.1 LICENSE file
- Status: ✅ Present
- Still needed:
  - Ensure the chosen license matches your intended use (open-source vs restricted).
### 8.2 Third-party notices
- Status: ❌ Missing
- Still needed:
  - List of major third-party libs (ArduinoJson, ESP8266 core, etc.) and their licenses (optional but recommended).

---

## 9) Testing, CI, and release process

### 9.1 Tests
- Status: ❌ Missing
- Still needed:
  - At minimum, tests for state machine mapping and stage build logic (can be simple JS unit tests).

### 9.2 Continuous Integration
- Status: ❌ Missing
- Still needed:
  - GitHub Actions workflow for lint/tests.

### 9.3 Release/versioning policy
- Status: ⚠️ Partial
- Still needed:
  - How versions are assigned (SemVer?) and how releases map to deployed Apps Script versions / firmware.

---

## 10) Missing files / referenced-but-absent items (highest priority to resolve)

1. **Time sync + konf Apps Script code**: the virtual UI calls dedicated endpoints for server time and `(kestus, foorinihe)` but the Apps Script implementation is not included here.
2. **Firmware dependency**: `certs.h` is included by firmware but not present here.
3. **Golden dataset**: a minimal example of the `lights` and `cycles` tables (copy/paste ready).
4. **Hardware wiring**: pinout + resistor/photoresistor circuit details.
5. **Security hardening**: `adminWrite` is unauthenticated in the code shown; document risk and add protection if needed.

---

## 11) Questions to answer (information still needed)

These are the concrete unknowns that a maintainer/stakeholder must supply to make the docs fully “best practice” complete:

### A) Operational intent
- Is this strictly a demo/simulation, or intended to control real hardware in the field?
- What safety guarantees (if any) are claimed? If none, add an explicit disclaimer.

### B) Backend/time authority
- Should there be **one** Apps Script deployment that serves:
  - `action=read/adminRead/adminWrite`
  - time endpoint (ms)
  - konf endpoint (kestus + foorinihe)
  …or are these separate services by design?
- What is the canonical definition of `kestus` and `foorinihe` and where do they live (Sheets? hardcoded? computed)?

### C) Data model clarity
- Is each intersection supposed to have exactly one cycle shared by all directions?
- Should a “master” light always exist? If yes, how is it chosen and enforced?

### D) Firmware/hardware
- Exact wiring, LED type (voltage/current), resistor values, photoresistor part + divider.
- Confirm whether TLS should be insecure (current code) or pinned (needs `certs.h`).

### E) Internationalization
- Should the canonical documentation be in Estonian, English, or both?
- If both: what is the translation workflow and which file is authoritative?

---



---

## Update: new evidence added (time/config backends)

New repo artifacts reviewed:
- `externaltimesync.gs` (time sync web app)
- `configapi.gs` (cycle timing config web app)
- config sheet screenshot (layout: `nihe` row, `kestus` in B5)
- `certs.h` + `certUpdate` (certificate generation tooling)

### What this resolves
- ✅ We now have server-side code that explains the **time sync** and **config (`kestus` + `nihe`)** endpoints.

### What is still missing / partial (still required for best-practice docs)
1. **Define mapping:** how does `foorinr` map to UI `intersectionID`?
   - Current UI code always requests `foorinr=1`.
   - For 4 intersections, we need a documented rule and implementation.

2. **Config sheet scaling:** current script reads a fixed `A1:E5` range.
   - If you need `foor3`, `foor4`, etc., the code/range must be updated.

3. **Single-source config:** endpoints are hard-coded across multiple files.
   - Best practice: centralize URLs in one config module or environment file.

4. **Cycle duration inconsistency:** virtual UI uses config `kestus`, firmware uses cycles `Length`.
   - Docs must explicitly declare which is canonical (or document why they differ).

5. **Cert tooling mismatch:** `certUpdate` generates certs for `jigsaw.w3.org`, while firmware fetches from `script.google.com`.
   - Either document that TLS validation is disabled (`setInsecure()`), or update cert tooling to match the real host.
