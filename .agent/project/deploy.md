# Deployment

> Axline phase-1 distribution: private VSIX (local install + AuthNexus software update).

---

## Environments

| Environment | URL / Host | Purpose |
|-------------|-----------|---------|
| Local F5 | VS Code Extension Host | Day-to-day debug (no VSIX) |
| Local VSIX | `apps/vscode/dist/axline.vsix` | Manual install / smoke |
| AuthNexus (example) | `https://auth.mtsilicon.com` | Private update control plane (HTTPS :443) |
| AxGate (example) | `https://auth.mtsilicon.com:6343` | Account / device API (HTTPS) |

Exact hosts come from `endpoints.json` / env — do not hardcode secrets in git.

---

## Build artifacts

| Artifact | Path | Notes |
|----------|------|-------|
| Base VSIX | `apps/vscode/dist/axline.vsix` | vsce output (standard ZIP) |
| Enterprise VSIX | `apps/vscode/dist/axline-enterprise.vsix` | AuthNexus STABLE upload target (public endpoints baked in) |
| SHA256 | from upload/verify scripts | Server computes hash; verify downloads and checks ZIP + SHA-256 |

---

## Deployment Commands

### Build VSIX (local)

```powershell
cd c:\ai_work\axline
bun run build:vscode
# or install into VS Code:
bun run install:vscode
```

### Publish to AuthNexus (private update)

```powershell
# Standard private release (recommended)
bun apps/vscode/scripts/release-private-vsix.mjs
```

**Important:** Do not package secrets into VSIX; AuthNexus uploads **enterprise** VSIX (valid ZIP). Do not send `fileSize`/`status` in upload API.

Full SOP: `.agent/project/sop/axline-private-update.md`  
Pitfalls: `.agent/project/sop/enterprise-vsix-repack-pitfalls.md`  
Spec: `.agent/project/specs/axline-private-update.md`

### Verify update chain

```powershell
bun apps/vscode/scripts/verify-private-update.mjs
```

### Rollback

- Reinstall previous VSIX / AuthNexus prior release
- Tag baseline: see `version-state.toml` → `rollback_tag` (e.g. `vscode/v0.2.2`)

---

## Verification Checklist

- [ ] `node scripts/verify-versions.mjs` (package.json ↔ version-state)
- [ ] `bun run build:sdk` then `apps/vscode` `package` (or `build:vscode`)
- [ ] `check-webview-boundary` clean
- [ ] VSIX installs; Activity Bar shows Axline
- [ ] `release-private-vsix.mjs` or equivalent: base + enterprise VSIX layout OK
- [ ] `verify-private-update.mjs`: `Download: OK (valid VSIX layout)` + `Integrity: OK`
- [ ] Client E2E: **Check for Updates** → install → Reload
- [ ] VSIX does **not** contain enrollment secrets (`preflight-publish` blocks `apps/vscode/endpoints.json`)
- [ ] No `endpoints.json` / enrollment codes in git

---

## Related

- Commands: `project/commands.md`
- Versioning: `project/versioning.md`
- Release SOP: `project/sop/release.md`

---

*Last updated: 2026-07-15*
