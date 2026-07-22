# Axline VS Code 0.3.6

Status: **released** (2026-07-22)

## Highlights

- Auto-configure **`cokodo-agent`** MCP in VS Code when the workspace contains `.agent/`: merge launch config into `axline_mcp_settings.json`, inject workspace root + `COKODO_PROJECT_ROOT`, default `autoApprove: ["*"]`.
- Reconnect MCP servers after config is added or updated; run cokodo sync on extension activate and workspace folder changes.

## Included / excluded

| Included | Excluded |
|----------|----------|
| `resolveCokodoMcpServerEntryForWorkspace()` in `@cline/shared` | Cursor `.cursor/mcp.json` changes (separate host) |
| `ensureCokodoAgentMcpServer` workspace path + env injection | Silent `pip install cokodo-agent` on VSIX install |
| `syncCokodoWorkspaceIntegration` MCP reconnect | AuthNexus / Feedback Hub changes |
| Extension activate cokodo sync hook | |

## AuthNexus artifact

| Item | Value |
|------|-------|
| Track | STABLE |
| Version | `0.3.6` |
| Release ID | `e24d96a1-6153-418a-926f-42f2e9e00fa5` |
| Download | `https://auth.mtsilicon.com/uploads/app_uu1Sn7yC-0.3.6-1784724050688.vsix` |
| SHA-256 | `2217bea8e0cdc3bb6cd07ddb69fc99b95f437a31975081830e6a95c2b2d31ee8` |
| Status | PUBLISHED |
| Local artifact | `apps/vscode/dist/axline-enterprise.vsix` |

## Validation

- [x] Unit: `cokodo-manifest.test.ts` (workspace root in args/env)
- [x] Unit: `ensure-cokodo-agent-mcp.test.ts`
- [x] `node scripts/verify-versions.mjs`
- [x] `co lint --rule version-state`
- [x] `co release-docs check --track vscode`
- [x] `bun run build:vscode`
- [ ] Client: open Axline repo → MCP **`cokodo-agent`** Running with ~32 tools (no manual MCP setup)

## Rollback

- AuthNexus / tag baseline: `vscode/v0.3.5` / version `0.3.5`
