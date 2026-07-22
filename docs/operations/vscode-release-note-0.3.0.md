# Axline VS Code 0.3.0

Status: **released** to AuthNexus STABLE (2026-07-17)

## Highlights

- Feedback Hub client (Phase A1): Open Feedback / Report Issue, Mine & Public lists, detail + comments, image attachments, client context checklist.
- Auth: login via AxGate Account; Feedback REST via extension host → AuthNexus (`authNexusBaseUrl` single source). JWT never enters the webview.
- **HTTPS cutover**: AxGate `https://auth.mtsilicon.com:6343`, AuthNexus `https://auth.mtsilicon.com:3443`. Remote plain HTTP rejected; known old bases auto-migrated.

## Dependencies

- AuthNexus Feedback Hub API (plan v0.2.0+). Requires HTTPS (`https://auth.mtsilicon.com:3443`).
- Active `axline` app membership for the signed-in user.

## AuthNexus artifact

| Item | Value |
|------|-------|
| Track | STABLE |
| Version | `0.3.0` |
| Release ID | `15e3c3d5-a3f7-4d13-8618-c2bbc5a6b1e6` |
| Download | `https://auth.mtsilicon.com:3443/uploads/app_uu1Sn7yC-0.3.0-1784280144476.vsix` |
| SHA-256 | `8e7d4bd3672d276b51206f91a766f62ee9b316726b8b94c3808c6cfb4c03b1f7` |
| Status | PUBLISHED |
| Local artifact | `apps/vscode/dist/axline-enterprise.vsix` |

## Validation

- [x] `verify-versions.mjs` — canonical 0.3.0
- [x] Upload + enroll + latest + download ZIP/SHA via **HTTPS** `:3443`
- [ ] Client E2E: **Axline: Check for Updates** → install → Reload (from 0.2.8)

## Ops notes

- See `.agent/project/sop/feedback-hub-client.md` and `feedback-hub-a0-connectivity.md`.
- Rollback: `vscode/v0.2.8` / AuthNexus 0.2.8.
