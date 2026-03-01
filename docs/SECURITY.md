# Security Policy

## Reporting a vulnerability
If you believe you’ve found a security issue, **do not** open a public issue with details.

Instead:
1. Create a minimal report that explains the impact and reproduction steps.
2. Contact the maintainers privately (recommended: email or private channel used by your team).

If you do not have a private channel set up yet, open a GitHub issue that only says:
> “Security issue reported; details shared privately.”

…and share details out-of-band.

## Security considerations for this project

### Google Sheets as a “database”
- Making the Sheet “Anyone with link” can expose configuration data.
- Consider restricting access and adding authentication (Apps Script Session / OAuth / token checks).

### Apps Script Web App deployment
- “Anyone” access is convenient but risky.
- Prefer least privilege and protect admin endpoints (`adminWrite`) with auth.

### Secrets in firmware
- Never commit WiFi SSID/passwords or tokens.
- Use a `secrets.h` that is **gitignored** and provide a `secrets.example.h`.

### Logging and PII
- If you add logs, avoid storing personal data.
- For physical deployments, assume logs can be accessed by operators.

## Supported versions
This is a prototype. Security fixes will be handled on the `main` branch.
