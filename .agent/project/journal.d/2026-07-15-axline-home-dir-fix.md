# Fix: persist user data under ~/.axline instead of ~/.cline

**Date:** 2026-07-15

## Problem

After Reload Window, extension still created `~/.cline/data` instead of `~/.axline/data`. AxGate login failed when endpoints existed only under `~/.axline/endpoints.json` but runtime state still used legacy home paths.

## Fix

- Extended `shared/axline-dir.ts` with `resolveAxlineDataDir`, `resolveStorageHomeDir`, `migrateLegacyClineDataDirIfNeeded`
- `createStorageContext()` now writes to `~/.axline/data` and auto-migrates legacy `~/.cline/data` on first run
- Replaced hardcoded `~/.cline` home usage in disk, skill-directories, legacy-state-reader, marketplace, MCP migration, env capture, standalone context, remote-config refresh
- SDK `resolveClineDir()` default home is now `~/.axline` (AXLINE_DIR / CLINE_DIR overrides preserved)
- Bundled `endpoints.json` now merges missing AxGate fields from user `~/.axline/endpoints.json`

## User machine

Migrated `C:\Users\atlas_rm01\.cline\data` → `C:\Users\atlas_rm01\.axline\data`.
