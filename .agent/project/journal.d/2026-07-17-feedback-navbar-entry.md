# Journal: Feedback navbar entry

- Date: 2026-07-17
- Scope: webview Navbar primary entry for Feedback Hub client

## Done

- Added first-class **Feedback** tab in `apps/vscode/webview-ui/src/components/menu/Navbar.tsx` (lucide `MessageSquarePlus`), between Account and Settings; opens Feedback list via `navigateToFeedback("list")`.
- Updated entry docs: `design/feedback-client-ui.md`, `sop/feedback-user-guide.md`.
- Secondary entries unchanged: command palette + Settings → About → Send Feedback.
