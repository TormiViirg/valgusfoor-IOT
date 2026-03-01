# Cycle timing config sheet (kestus + nihe)

This project uses a small Google Sheet to configure **cycle duration** and **per-foor time offsets** for the virtual UI.

## What it controls
- `kestus` — cycle duration (seconds)
- `nihe` — per-foor offset (seconds)

These values are fetched by `externaltimesync.js` from the `configapi.gs` Apps Script endpoint.

## Observed layout (minimum working)
Create a sheet like:

foor	foor1	foor2
nihe	0	    7
		
		
kestus	15	

### Meaning
- `foor1`, `foor2` … are columns for different traffic light instances.
- Row 2 (`nihe`) values are offsets in seconds.
- Cell **B5** contains the cycle duration (`kestus`) in seconds.

## How the script reads it (`configapi.gs`)
- Reads range `A1:E5` (fixed size).
- Returns: `[B5, row2[foorinr]]` as JSON.

## Still needed (to make this robust)
- Decide how `foorinr` maps to the UI’s `intersectionID` selection.
- Expand the script range if you need more than 2 foors.
- Validate values (ensure kestus > 0, offsets are numeric).
