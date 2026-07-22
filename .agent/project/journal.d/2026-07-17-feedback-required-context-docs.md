# Journal: Feedback required context + document attachments

- Date: 2026-07-17

## Done

- Forced 8-field `clientContext` on create (`mergeRequiredFeedbackClientContext`); checklist checkboxes locked required.
- New form shows **Submitting as** from `FeedbackAuthState.account_display` / `account_email`.
- Attachment allowlist: images + logs/docs (`pdf` / `txt` / `md` / `log` / `json` / `csv` / `xml` / `docx`); per-file limit **10 MB**.
- Linked AuthNexus Hub MIME + multer 10 MB + OpenAPI/plan docs; event `events/2026-07-17-feedback-attachment-mime-docs.md`.
