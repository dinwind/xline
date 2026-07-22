# AuthNexus upload credentials in ~/.axline/secrets.json

**Date:** 2026-07-15

## Change

- `upload-private-vsix.mjs` reads `authNexusAdminUser` / `authNexusAdminPassword` from `~/.axline/secrets.json` (env vars still override).
- Updated `secrets.example.json`, SOP, skill, spec, deploy, axline-vscode-publish with **AI agent rule: do not re-ask user** when secrets are configured.
- Release machine `secrets.json` populated with same console admin as 0.2.4–0.2.6 uploads.
- Fixed UTF-8 BOM on Windows `secrets.json`; loader strips BOM if present.

## Why

New IDE shell sessions do not inherit `AUTHNEXUS_ADMIN_*` env vars; agents were repeatedly prompting the operator despite prior successful publishes.
