# Journal: cokodo-agent MCP auto-config (vscode 0.3.6)

**Date:** 2026-07-22  
**Track:** vscode / product

## Completed

- Auto-configure `cokodo-agent` MCP in Axline VS Code when workspace has `.agent/`.
- Inject workspace root + `COKODO_PROJECT_ROOT` via `resolveCokodoMcpServerEntryForWorkspace`.
- Reconnect MCP after ensure; sync on extension activate.
- Fix proto field name for `axline.axgateDeviceToken` (build blocker).

## Validation

- `@cline/shared` cokodo-manifest tests
- `ensure-cokodo-agent-mcp` tests
- `bun run build:vscode`
- AuthNexus STABLE 0.3.6 published
