# Axline VS Code 0.3.4

Status: **released** to AuthNexus STABLE (2026-07-18)

## Highlights

- Fix Feedback entry: sidebar **view/title** icon between Account and Settings (`$(feedback)` → `axline.openFeedback`).
- Root cause: chrome icons are host `view/title`, not webview Navbar (`showNavbar: false` on vscode).

## AuthNexus artifact

| Item | Value |
|------|-------|
| Track | STABLE |
| Version | `0.3.4` |
| Release ID | `9eaa937c-8370-4ebb-a064-4ed9414dd056` |
| Download | `https://auth.mtsilicon.com:3443/uploads/app_uu1Sn7yC-0.3.4-1784308557232.vsix` |
| SHA-256 | `d7c756ce2a6132310e89cf2ca87216735b7ffa8b7273dfac32d09cc5a452dc47` |
| Status | PUBLISHED |

## Validation

- [x] `verify-view-title-feedback.mjs` — Account → Feedback → Settings
- [x] Local `code --install-extension` of enterprise VSIX
- [x] AuthNexus enroll / latest / download / SHA
- [ ] UI: Reload Window → confirm Feedback icon between Account and Settings
