# Axline VS Code 0.3.3

Status: **released** to AuthNexus STABLE (2026-07-18)

## Highlights

- Fix Feedback Navbar: App-level shared chrome; Account → **Feedback** (`codicon-feedback`) → Settings.
- Overlay views scoped under Navbar (`absolute` content region).
- Packaging: `.vscodeignore` only ships `dist/extension.js` + `dist/axline.zip`. Supersedes oversized 0.3.2.

## AuthNexus artifact

| Item | Value |
|------|-------|
| Track | STABLE |
| Version | `0.3.3` |
| Release ID | `4a2f3dde-71ee-40db-ac7c-79c7c19a6768` |
| Download | `https://auth.mtsilicon.com:3443/uploads/app_uu1Sn7yC-0.3.3-1784306470213.vsix` |
| SHA-256 | `6acdcedc5cb89ed70ae5f8db0179728e2ee2cbbc382f67cb26bb1244f835828a` |
| Status | PUBLISHED |
| Local artifact | `apps/vscode/dist/axline-enterprise.vsix` |

## Validation

- [x] `verify-versions` + release script (enroll / latest / download / SHA)
- [ ] Client: Check for Updates → 0.3.3 → Reload → Feedback icon between Account and Settings

## Rollback

- AuthNexus / tag baseline: `0.3.1`
