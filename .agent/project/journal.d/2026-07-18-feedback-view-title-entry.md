# Journal: Feedback entry is view/title (not webview Navbar)

- Date: 2026-07-18
- Bug: User on 0.3.3 still saw Account adjacent to Settings — expected Feedback between them.
- Root cause: Those icons are VS Code `contributes.menus.view/title` (`navigation@N`), not the webview `Navbar`. VS Code builds set `showNavbar: false`, so App-level Navbar never mounts in the webview.
- Fix: Register `axline.openFeedback` with `$(feedback)` in `view/title` as `navigation@5`; Account `@4`, Settings `@6`.
- Verify: `bun apps/vscode/scripts/verify-view-title-feedback.mjs`
- Local check: F5 `Run Extension (production)` or reload installed build after republish.
