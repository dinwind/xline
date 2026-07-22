# Update prompt missing on pre-HTTPS clients — investigation

## Root cause (this machine)

- After publishing 0.3.0 we had already `code --install-extension` **0.3.0**.
- Startup check: `current >= latest` → `up_to_date` → **no prompt** (silent).
- User perception: “old client didn’t get update” while installed version was already 0.3.0.

## Server path (old HTTP clients)

- `http://…:3000` and `https://…:3443` both return latest **0.3.0**.
- `downloadUrl` is always HTTPS (`https://…:3443/uploads/...`); download OK (ZIP/PK).
- Semver `0.2.8 < 0.3.0` → update available. **AuthNexus is not the blocker.**

## UX gap in client

- Startup used `runCheck(true)` — errors never shown; only logs (and previously almost none).
- Fixed in tree: log check status; defer first check 2.5s; show warning once on startup error.

## E2E repro prep (done locally)

- Reinstalled **0.2.8** VSIX.
- Restored HTTP `~/.axline/endpoints.json` (`:3000` / `:6100`).
- Next: VS Code Reload → expect “Axline 0.3.0 is available”.
