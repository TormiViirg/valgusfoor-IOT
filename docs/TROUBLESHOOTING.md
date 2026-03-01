# Troubleshooting

## Virtual UI shows ALL_YELLOW
Likely causes:
- Backend unreachable (wrong URL / deployment not active)
- Payload missing required fields or has invalid types
- Intersection light count is not 2, 3, or 4 (state machine not selected)

What to check:
- Apps Script Web App URL is correct and accessible in your browser.
- `BACKEND_BASE_URL` matches exactly.
- Sheets tabs are named `lights` and `cycles`.
- Headers match the expected schema.
- Intersection has valid `CardinalDirection` values (`N/E/S/W`).
- Exactly one row is marked `IsMainTrafficLight=true` (recommended).

## Lights render in wrong location
- `Tile` values must match the grid-area names in `styles.css`.
- Confirm `fetch.js` sets CSS variables for each direction.

## Phases look wrong (timing drift)
- Confirm server time sync is working (externaltimesync).
- Re-deploy Apps Script if you changed code.
- Check duration/offset values returned by backend.

## Night blink doesn’t activate
- Confirm `BlinkStart` and `BlinkEnd` are set and are in 0..1439.
- Confirm the local notion of “midnight” aligns with the server-corrected timezone.
- For overnight windows, ensure `BlinkStart > BlinkEnd` is handled as intended.

## Admin page can read but cannot write
- Your deployment access may not allow writes.
- Admin endpoints may require different Apps Script variant (admin-enabled).
- Check Apps Script execution permissions and sheet ownership.

## NodeMCU/ESP8266 can’t connect
- WiFi SSID/password wrong
- Captive portal / enterprise WiFi not supported
- TLS/cert handling missing if you use HTTPS with strict verification

Tip:
- Start with plain HTTP (if possible) for debugging, then add TLS hardening.


## Virtual UI: lights not animating / NaN timing / stuck output
Common cause: `kestus` (cycle duration) is 0 because the config API call failed.

Symptoms:
- cycle position becomes NaN (modulo by 0)
- phases never advance correctly
- console may show repeated safety-mode logs

Fix:
- Deploy `configapi.gs` and ensure it returns `[kestusSeconds, niheSeconds]`.
- Update the config API URL in `externaltimesync.js` (`kysiKonf()`).
- Ensure the config sheet has `kestus` in cell **B5** and `nihe` values in row 2.

## Firmware: HTTPS fetch FAIL (code=0 len=0)
In the boot self-test, `code=0` often indicates the request never reached `GET()` success:
- `https.begin()` failed (bad URL / DNS / TLS handshake / redirect limit)
- WiFi is connected but outbound HTTPS is blocked (captive portal / firewall)

Checks:
- Verify `apiurl` is correct and not truncated.
- Print `g_lastHttpsError` and `g_lastFinalUrl` (the firmware already tracks these).
- Try a simpler endpoint first (no redirects).
- If using certificate validation, ensure your trust anchors match `script.google.com` (currently the code uses `setInsecure()`).
