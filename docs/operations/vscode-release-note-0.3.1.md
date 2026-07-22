# Axline VS Code 0.3.1

Status: **released** to AuthNexus STABLE (2026-07-18)

## Highlights

- Feedback as first-class Navbar entry (`MessageSquarePlus`, between Account and Settings).
- Submit form shows **Submitting as** (signed-in account); 8-field `clientContext` is **required** (host-enforced).
- Attachments: images + logs/docs (`pdf` / `txt` / `md` / `log` / `json` / `csv` / `xml` / `docx`); max **5 × 10 MB**.
- Detail view: image previews + download links for non-image attachments.

## Dependencies

- AuthNexus Feedback Hub with matching MIME whitelist + **10 MB** per-file limit (deploy Hub before relying on large logs / new types in production).
- Active `axline` app membership for the signed-in user.
- HTTPS AuthNexus / AxGate endpoints (same as 0.3.0).

## Included / excluded

| Included | Excluded |
|----------|----------|
| Feedback Navbar + required context + account display | AuthNexus Hub server deploy (separate project) |
| Attachment MIME / 10 MB client + docs | Unrelated WIP outside Feedback / private-update path |
| Private update publish to STABLE | Marketplace publish |

## AuthNexus artifact

| Item | Value |
|------|-------|
| Track | STABLE |
| Version | `0.3.1` |
| Release ID | `55781a8c-13ee-4f85-afd1-7450be2770f8` |
| Download | `https://auth.mtsilicon.com:3443/uploads/app_uu1Sn7yC-0.3.1-1784305670996.vsix` |
| SHA-256 | `f5f10ea87e47010a16b42c6d73b94f09742a5d42b1213e1e6e737cd44a6c0e82` |
| Status | PUBLISHED |
| Local artifact | `apps/vscode/dist/axline-enterprise.vsix` |

## Validation

- [x] `node scripts/verify-versions.mjs` — canonical 0.3.1
- [x] Upload + enroll + latest + download ZIP/SHA via HTTPS `:3443`
- [ ] Client E2E: **Axline: Check for Updates** → install → Reload

## Risks

- If Hub is still on the old 5 MB / image-only whitelist, new attachment types or files &gt; 5 MB will fail with 413/415 until Hub is redeployed.

## Rollback

- Tag / baseline: `vscode/v0.3.0` (AuthNexus published 0.3.0)
