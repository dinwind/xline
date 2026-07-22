# Local HTTPS cutover verification (2026-07-17)

## Results

| Check | Result |
|-------|--------|
| `~/.axline/endpoints.json` | HTTPS `:6343` / `:3443` |
| AuthNexus `https://…:3443/api/health` | **200** |
| AxGate `https://…:6343/healthz` | **200** |
| `verify-private-update.mjs` | **PASS** — enroll + latest 0.2.8 + VSIX download/SHA256 via HTTPS |
| Config unit tests | **52 pass** |
| Old HTTP `:3000` / `:6100` | Still reachable from this host (**server-side not closed yet**) |
| AxGate device-identity script | Skipped — needs `AXLINE_AXGATE_USERNAME` / `PASSWORD` |

## Notes

- Download URL from AuthNexus latest API already returns `https://auth.mtsilicon.com:3443/uploads/...`.
- Client rejects remote plain HTTP; ops should disable old HTTP listeners when ready.
