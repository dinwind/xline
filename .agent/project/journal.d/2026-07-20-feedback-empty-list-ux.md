# 2026-07-20 — Feedback empty list no longer shown as error

- Mine/Public list: Hub HTTP 404 / `not_found` mapped to empty page in `RestFeedbackClient.list` so UI shows empty state instead of red “Feedback not found. Retry”.
- 404 error mapping preserves Hub body message (e.g. `App not found`); detail `getByNumber` still surfaces `not_found`.
- Tests: `urls-and-errors.test.ts`, `rest-client-list.test.ts`.
