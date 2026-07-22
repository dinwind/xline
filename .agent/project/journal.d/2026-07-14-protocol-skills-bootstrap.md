# Protocol + skills bootstrap (2026-07-14)

Completed axline A1–A7 / B1–B4:

- Synced `.agent` core/adapters/skills from cokodo 3.3.0; restored `manifest.json` + checksums
- Filled `status`, `context`, `tech-stack`, `deploy`, `known-issues`, `conventions`, `adr/`
- Cursor + Cline adapt; session-gate rule; `co lint` 249/249
- Project skills under `.agent/skills/_project/` (`axline-private-update`, `vscode-typescript-build`, `create-pull-request`)
- Code: scan `_project` skills; createSkill path → `_project`

Note: Cursor MCP `get_project_context` may still miss workspace cwd; use `get_global_project_context(project=axline)` or `co session-init` until launcher cwd is fixed.
