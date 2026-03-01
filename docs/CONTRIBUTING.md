# Contributing

Thanks for helping improve the Traffic Light System.

## Ways to contribute
- Report bugs and edge cases (especially timing/state-machine issues).
- Improve documentation (README, installation steps, architecture notes).
- Add tests (state machines, time sync, phase mapping).
- Improve admin UI (CRUD UX, log visualization).

## Quick dev setup
1. Fork the repo and create a feature branch:
   - `feat/<short-name>` or `fix/<short-name>`
2. Run the virtual UI via a static server:
   - VS Code Live Server **or** `python -m http.server`
3. Point the frontend to your Apps Script web app URL via `BACKEND_BASE_URL`.

## Coding standards
- Keep modules small and single-purpose (e.g., fetch vs time sync vs UI).
- Prefer pure functions for logic (state machines, phase mapping).
- Handle invalid backend data defensively (safe fallbacks).
- Avoid “magic numbers”; centralize configuration.

### JavaScript
- Use `const` / `let` (no implicit globals).
- Prefer clear names over short names.
- Keep DOM changes in one place (UI update functions).
- When adding new states: update tests (if present) + docs.

## Commit messages
Use a conventional-ish style:
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`

## Pull request checklist
- [ ] Clear description of the change and why it’s needed
- [ ] Screenshots/GIFs for UI changes (if relevant)
- [ ] Updated docs (README/docs) if behavior/config changed
- [ ] Added/updated tests (if applicable)
- [ ] No secrets committed (WiFi passwords, API keys)

## Reporting issues
Please include:
- What you expected vs what happened
- Steps to reproduce
- Browser + OS (for virtual UI)
- Apps Script deployment mode and access level
- Sample payload from backend (sanitize sensitive data)
