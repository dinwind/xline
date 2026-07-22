# Axline VS Code 0.3.7

Status: **released** (2026-07-23)

## Highlights

- Auto-migrate retired AxGate hostname `https://axgate.mtsilicon.com:6343` → `https://auth.mtsilicon.com:6343` when loading `~/.axline/endpoints.json` (runtime + publish scripts).
- Fixes AxGate credential login TLS failure when users had `axgateBaseUrl` pointing at `axgate.mtsilicon.com` (cert SAN is `auth.mtsilicon.com` only).

## Included / excluded

| Included | Excluded |
|----------|----------|
| `AXLINE_ENDPOINT_URL_MIGRATIONS` for `axgate.mtsilicon.com:6343` | AuthNexus / Feedback Hub changes |
| Config unit test for hostname rewrite | New AxGate auth features |
| `load-axline-config.mjs` migration parity | |

## AuthNexus artifact

| Item | Value |
|------|-------|
| Track | STABLE |
| Version | `0.3.7` |
| Release ID | `ef4ae4b8-1c23-46ca-a250-eee97310da29` |
| Download | `https://auth.mtsilicon.com/uploads/app_uu1Sn7yC-0.3.7-1784740200023.vsix` |
| SHA-256 | `fa27e104620ba1a421ffbf7b95cce875d45343b4a0584e0e35fc4eda9157c6e8` |
| Status | PUBLISHED |
| Local artifact | `apps/vscode/dist/axline-enterprise.vsix` |

## Validation

- [x] Unit: config test `rewrite retired axgate.mtsilicon.com`
- [x] Manual TLS probe: `auth.mtsilicon.com:6343/healthz` OK; `axgate.mtsilicon.com:6343` cert mismatch
- [x] `node scripts/verify-versions.mjs`
- [x] `bun apps/vscode/scripts/verify-private-update.mjs` (enroll / latest / download / SHA)
- [ ] Client: misconfigured `axgate.mtsilicon.com` endpoints.json auto-migrates → AxGate login succeeds

## Rollback

- AuthNexus / tag baseline: `vscode/v0.3.6` / version `0.3.6`
