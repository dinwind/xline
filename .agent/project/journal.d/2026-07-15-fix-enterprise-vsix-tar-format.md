# Fix: enterprise VSIX tar format broke private update install

**Date:** 2026-07-15

## Symptom

Client update prompt → Update now → `End of central directory record signature not found`.

## Root cause

`add-endpoints-to-vsix.mjs` used `tar -a -cf file.vsix` on Windows. `tar -a` only auto-selects zip for `.zip` suffix; `.vsix` became an uncompressed **tar** archive (magic `./`), not a ZIP. AuthNexus stored it with matching SHA-256, so hash check passed but VS Code could not install.

## Fix

- Repack via `tar -acf temp.zip` then rename to `.vsix`; assert PK zip magic.
- Upload/verify scripts and client download now reject non-ZIP artifacts.
- Re-published AuthNexus STABLE **0.2.7** with valid `axline-enterprise.vsix` (release `0c11752d-0c77-4c5f-8597-5a6bd7ff289f`).

## User action

Command palette → **Axline: Check for Updates** → install → Reload.
