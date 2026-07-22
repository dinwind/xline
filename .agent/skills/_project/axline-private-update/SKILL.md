---
name: axline-private-update
description: >
  Build, hash, publish, and verify Axline VSIX private updates via AuthNexus.
  Use when shipping a private update, configuring endpoints/enrollment, running
  publish-private-vsix, upload-private-vsix, or verify-private-update, or
  debugging Check for Updates.
---

# Axline Private Update (AuthNexus)

## Critical Rules

1. **Never commit** `apps/vscode/endpoints.json`, `secrets.json`, enrollment codes, or AuthNexus admin passwords.
2. **Never package secrets into VSIX** — `updateEnrollmentCode` belongs in `~/.axline/secrets.json` only.
3. **Public endpoints** may be bundled via `add-endpoints-to-vsix.mjs` (no enrollment code in that file).
4. **User config home** is `~/.axline/` (legacy `~/.cline/` still read for transition).
5. **Version must match** `apps/vscode/package.json` ↔ AuthNexus release ↔ `version-state.toml`.
6. **Full build chain**: `build:sdk` → `package` → enterprise repack → upload (use `release-private-vsix.mjs`).
7. **Upload artifact**: AuthNexus STABLE receives **`axline-enterprise.vsix`** (ZIP with public endpoints), not raw `axline.vsix`.
8. **ZIP gate**: enterprise repack, upload, verify, and client download all assert `PK` magic — tar archives cannot install.
9. **Upload API**: send only `file` + version/track/changelog/isMandatory. Server computes `fileHash`; do **not** send `fileSize`/`status` (causes Prisma 500).
10. **Admin login** for upload: `username` + `password` + `appId: authnexus-console` (not email-only).
11. **Two credential types**: enrollment code + admin account — both in `~/.axline/secrets.json` (gitignored).
12. **AI agents**: run `release-private-vsix.mjs` or `upload-private-vsix.mjs` directly; do **not** ask the user for admin password if `secrets.json` already has credentials.
13. **Client E2E is mandatory** after publish: Check for Updates → install → Reload (API-only verify is insufficient).
14. Prefer SOP: `.agent/project/sop/axline-private-update.md` and pitfalls: `sop/enterprise-vsix-repack-pitfalls.md`

## Decision Tree

```
What do you need?
+-- Configure update endpoints
|   +-- Public: ~/.axline/endpoints.json (or endpoints.example.json template)
|   +-- Secret: ~/.axline/secrets.json (updateEnrollmentCode)
|   +-- Or set AXLINE_AUTHNEXUS_* / AXLINE_UPDATE_* env vars
+-- Enterprise VSIX with baked-in AxGate URL
|   +-- publish-private-vsix → add-endpoints-to-vsix.mjs (public fields only)
+-- Cut a new private build
|   +-- release-private-vsix.mjs (canonical)
|   +-- or: verify-versions → publish → add-endpoints → upload → verify
+-- Verify an existing release
|   +-- bun apps/vscode/scripts/verify-private-update.mjs (includes download ZIP check)
+-- Debug client not updating
|   +-- Check enrollment, app id, PUBLISHED status, semver, ZIP magic, hash mismatch
```

## Prerequisites

```powershell
node scripts/verify-versions.mjs
bun --version
```

Local config (gitignored):

`~/.axline/endpoints.json` (public):

```json
{
  "axgateBaseUrl": "https://auth.mtsilicon.com:6343",
  "authNexusBaseUrl": "https://auth.mtsilicon.com",
  "updateAppId": "app_<software_app_id>"
}
```

`~/.axline/secrets.json` (client secret + upload admin):

```json
{
  "updateEnrollmentCode": "<permanent_code>",
  "authNexusAdminUser": "admin",
  "authNexusAdminPassword": "<console_password>"
}
```

Upload credentials are read from `secrets.json` by default. Env vars are optional overrides for CI.

## Steps — ship an update

```powershell
cd c:\ai_work\axline
bun apps/vscode/scripts/release-private-vsix.mjs
```

Fast rebuild (SDK unchanged): `release-private-vsix.mjs --skip-sdk`

Expected verify output:

- `Enroll: OK`
- `Latest: OK`
- `Download: OK (valid VSIX zip)`
- `Integrity: OK (SHA-256 matches)`

Client gate (required): **Axline: Check for Updates** → install → Reload.

## Upload script behavior

`upload-private-vsix.mjs`:

1. Login with `username`/`password`/`appId` (`authnexus-console` default)
2. POST multipart to `/api/software/:updateAppId/releases` (STABLE)
3. Auto-promote `PENDING` → `PUBLISHED`

## Troubleshooting

| Symptom | Check |
|---------|--------|
| `appId is required` | Login missing `appId`; use upload script |
| Upload 500 | Extra `fileSize` in form; use upload script only |
| Latest shows old version | Release still `PENDING` |
| Enrollment / 401 | Permanent code, app id, base URL |
| Hash reject (client) | Rebuild VSIX; server hash is lowercase |
| `extension/package.json not found inside zip` | `./extension/...` zip paths | Re-run `release-private-vsix.mjs`; see pitfalls SOP |
| Version not offered | Semver not newer; wrong track |
| TS errors at publish | Skill `vscode-typescript-build` |
| Secrets in VSIX | Remove `endpoints.json` before package |

## References

- `.agent/project/sop/axline-private-update.md`
- `.agent/project/sop/enterprise-vsix-repack-pitfalls.md`
- `.agent/project/specs/axline-private-update.md`
- `.agent/project/deploy.md`
- `.agent/project/sop/vscode-typescript-build-pitfalls.md`
