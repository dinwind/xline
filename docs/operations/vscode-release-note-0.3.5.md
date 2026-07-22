# Axline VS Code 0.3.5

Status: **released** to AuthNexus STABLE (2026-07-20)

## Highlights

- Fix Feedback Mine/Public list: Hub HTTP 404 / `not_found` on list maps to empty page so UI shows empty state (“No feedback yet…”) instead of red “Feedback not found. Retry”.
- 404 error mapping preserves Hub body message (e.g. `App not found`); detail `getByNumber` still surfaces `not_found`.

## Included / excluded

| Included | Excluded |
|----------|----------|
| `RestFeedbackClient.list` empty-on-404 | AuthNexus PermissionGuard / membership changes |
| Feedback error mapping + unit tests | Unrelated protocol-only scaffolding |

## AuthNexus artifact

| Item | Value |
|------|-------|
| Track | STABLE |
| Version | `0.3.5` |
| Release ID | `c7337fe3-d7b0-413c-a742-c8b87ecbf4fa` |
| Download | `https://auth.mtsilicon.com:3443/uploads/app_uu1Sn7yC-0.3.5-1784514048337.vsix` |
| SHA-256 | `1ba3f875914450956c66c4a0afb1db684103683727ad853efe81dd7033086034` |
| Status | PUBLISHED |
| Local artifact | `apps/vscode/dist/axline-enterprise.vsix` |

## Validation

- [x] Unit: `rest-client-list.test.ts` + `urls-and-errors.test.ts`
- [x] `node scripts/verify-versions.mjs`
- [x] `bun apps/vscode/scripts/release-private-vsix.mjs` (enroll / latest / download / SHA)
- [ ] Client: Check for Updates → 0.3.5 → Reload → Feedback Mine empty state (no error banner)

## Rollback

- AuthNexus / tag baseline: `vscode/v0.3.4` / version `0.3.4`
