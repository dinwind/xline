# Axline VS Code 0.3.2

Status: **frozen** (cut in progress) → AuthNexus STABLE

## Highlights

- Fix Feedback Navbar entry visibility: shared App-level Navbar (Account → **Feedback** → Settings).
- Feedback icon uses VS Code `codicon-feedback` for reliable sidebar chrome rendering.
- Overlay views (Settings / Account / Feedback / History / Worktrees) are scoped below the Navbar (`absolute` instead of full-viewport `fixed`).

## AuthNexus artifact

| Item | Value |
|------|-------|
| Track | STABLE |
| Version | `0.3.2` |
| Release ID | *(filled after upload)* |
| Download | *(filled after upload)* |
| SHA-256 | *(filled after upload)* |
| Status | *(filled after upload)* |
| Local artifact | `apps/vscode/dist/axline-enterprise.vsix` |

## Validation

- [ ] `node scripts/verify-versions.mjs`
- [ ] `release-private-vsix.mjs` enroll / latest / download / SHA
- [ ] Client: reload → Confirm Feedback icon between Account and Settings

## Rollback

- `vscode/v0.3.1` / AuthNexus 0.3.1
