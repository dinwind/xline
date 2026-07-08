# journal.d — Fragment drop directory

Each AI task writes a small fragment file here instead of editing `status.md` directly.
Run `co journal-flush` to collect fragments → update `status.md Recently Completed` → archive overflow.

## Fragment format

Filename: `YYYYMMDD-HHMMSS-<slug>.md`

Content — one or more `- [x]` lines:

```markdown
- [x] Description of what was accomplished
- [x] Another completed item
```

## Rules

- Create one file per task / session.
- Do NOT edit existing fragments.
- Run `co journal-flush` after finishing a batch of tasks to sync status.md.
- Run `co journal-flush --for-release vX.Y.Z` just before cutting a release.
