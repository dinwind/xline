# Event: Feedback attachment MIME — documents & logs

- Date: 2026-07-17
- Kind: api-schema
- Status: open
- Targets: project:AuthNexus

## Summary

Axline Feedback client uploads **images, logs, and documents**. Hub constraints:

### MIME whitelist

- Images: `image/png`, `image/jpeg`, `image/webp`, `image/gif`
- Docs/logs: `application/pdf`, `text/plain` (incl. `.log`), `text/markdown`, `text/csv`, `text/xml`, `application/xml`, `application/json`, `application/x-ndjson`, docx MIME

### Limits

- max **5** files
- max **10 MB** per file → 413 / 415

## Axline

- Shared allowlist + size: `apps/vscode/src/shared/feedback-attachments.ts`

## AuthNexus

- `feedback.service.ts` MIME + `MAX_FILE_BYTES = 10MB`
- `FilesInterceptor` multer `fileSize: 10MB`
- Resolve MIME from filename for `.log` / `.jsonl` when multer sends empty/octet-stream
- Redeploy Hub before production clients send large logs
