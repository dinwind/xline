# Axline config: ~/.axline migration + secrets split

**Date:** 2026-07-15

## Summary

Migrated Axline user configuration from legacy `~/.cline/` to `~/.axline/` with backward-compatible fallbacks. Split public endpoints from client secrets (`updateEnrollmentCode`).

## Changes

- `apps/vscode/src/shared/axline-dir.ts` — home dir resolution (`AXLINE_DIR`, legacy `CLINE_DIR`)
- `apps/vscode/src/shared/axline-secrets.ts` — `~/.axline/secrets.json` loader
- `config.ts` — read order: bundled → `~/.axline/endpoints.json` → `~/.cline/endpoints.json`
- `services/update/config.ts` — enrollment: env → secrets.json → legacy endpoints field
- `axline-update-service.ts` — token cache under `~/.axline/update/`
- `scripts/add-endpoints-to-vsix.mjs` — enterprise VSIX with public-only endpoints
- `scripts/lib/load-axline-config.mjs` — shared loader for publish/verify scripts
- Templates: `endpoints.example.json` (public), `secrets.example.json` (enrollment code)
- Docs/SOP/specs/skill updated

## Tests

65 unit tests pass (`config.test.ts`, update config/service tests).

## User machine

Copied existing `~/.cline/endpoints.json` → `~/.axline/endpoints.json`.
