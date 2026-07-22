# Enterprise VSIX Windows repack pitfalls (private update)

**Date:** 2026-07-15  
**Track:** vscode / AuthNexus STABLE

## Summary

AuthNexus private update for Axline 0.2.4–0.2.7 (initial uploads) passed API verification but failed VS Code install due to two Windows `tar` pitfalls in `add-endpoints-to-vsix.mjs`.

## Pitfall A — tar disguised as .vsix

- **Cause**: `tar -a -cf file.vsix` on Windows (`.vsix` not mapped to zip)
- **Symptom**: `End of central directory record signature not found`
- **Artifact**: ~30 MB, magic `./` (tar), not `PK`

## Pitfall B — ZIP with `./` path prefix

- **Cause**: `tar -acf zip -C dir .` writes `./extension/package.json`
- **Symptom**: `extension/package.json not found inside zip`
- **Artifact**: ~8 MB valid ZIP but wrong entry paths

## Why undetected earlier

- Release checklist marked API upload + old verify as done
- Client E2E (Check for Updates → install → Reload) was pending
- Old `verify-private-update.mjs` did not download or inspect zip layout

## Remediation

| Layer | Change |
|-------|--------|
| `lib/vsix-zip.mjs` | ZIP magic + layout asserts; `createZipVsixFromDir` |
| `release-private-vsix.mjs` | Canonical one-shot publish |
| `upload` / `verify` / client | Layout gates before install |
| Docs | `sop/enterprise-vsix-repack-pitfalls.md`, SOP/skill/spec/deploy |
| AuthNexus 0.2.7 | Re-published (`d2cbf619-741f-4bc6-adcc-20da0c456bb4`) |

## Follow-up

- [ ] Client E2E on user machine after re-publish
- [ ] Consider re-uploading 0.2.4–0.2.6 if users still on those tracks
