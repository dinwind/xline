# Startup optimization (2026-07-15)

## Changes

- **P0**: Fixed `cleanupLegacyVSCodeStorage` guard — dedicated VS Code memento sentinel `__axlineLegacyVscodeCleanupDone` (was incorrectly checking file-backed `lastShownAnnouncementId`). `cleanupOldApiKey` moved inside one-time migration path.
- **P1**: `StateManager.initialize` — parallel `distinctId` + `installationId`, parallel storage reads, early `AgentConfigLoader` kickoff; sub-phase `[Axline][startup] stateManager.*` marks.
- **P3**: Dev HMR probe cache (5s TTL, 300ms timeout) in `WebviewProvider.getHMRHtmlContent`.
- Tooling: `scripts/profile-startup.mjs` + `__axlineStartupMarks` harness collector.

## Expected impact

- Warm activate: ~208ms → ~70ms (skip ~140ms legacy migration loop).
- stateManager: modest gain from parallel I/O + overlapped agent config scan.

## Verify

```powershell
cd apps/vscode
bun scripts/profile-startup.mjs --runs 2
# F5 → Output: Axline → [Axline][startup] lines
```

## Confirmation (2026-07-15 local profiling, 3 runs)

| Phase | Pre-opt (warm) | Post-opt cold | Post-opt warm |
|-------|----------------|---------------|---------------|
| `cleanupLegacyStorage` | ~141 ms (every launch) | ~141 ms (once) | **~0.1 ms** |
| `stateManager.readStorage` | n/a | ~0.4–0.6 ms | ~0.4 ms |
| `stateManager.identity` | n/a | ~40–51 ms | ~39–44 ms |
| `activate` total | ~208 ms | ~193 ms | ~53 ms typical* |

\*Warm `activate` can spike when `endpoints` I/O is slow (~136–155 ms) under rapid back-to-back VS Code launches; with normal single launch, warm path matches cold minus migration (~50–65 ms).

Sentinel `__axlineLegacyVscodeCleanupDone` verified in built `dist/extension.js`; warm skip confirmed on runs 2–3.

## Round 2 (2026-07-15)

- Shared `getSharedMachineId()` cache — distinctId + installationId read OS machine ID at most once.
- `HostRegistryInfo.init` deferred (background); `ensureHostRegistryInfoReady()` before BannerService path.
- `ClineEndpoint.initialize` ∥ `StateManager.initialize` (`coreInit` mark).
- `AgentConfigLoader.ready()` non-blocking background load.

Cold `coreInit`: ~59 ms → **~39 ms**. Warm `cleanupLegacyStorage` remains **~0.1 ms**.
