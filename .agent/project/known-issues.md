# Known Issues



> Track known problems and technical debt for Axline.



---



## Active Issues



### Cursor MCP `get_project_context` cwd miss



**Status**: 🟡 Open | **Priority**: Low | **Since**: 2026-07-14



**Description**: Shared cokodo MCP reports “No .agent/ directory” for `session_gate` / `get_project_context` even though `C:/ai_work/axline/.agent/manifest.json` exists and `list_global_projects` shows Axline protocol 3.3.0. CLI `co session-init` / `get_global_project_context(project=axline)` work.



**Workaround**: Prefer `get_global_project_context` with `project=axline`, or `co session-init` from the repo root. Reloading MCP / restarting Cursor may help if launcher cwd is stale.



**Root Cause**: Likely MCP launcher “current project” path ≠ workspace root (cokodo-agent side / Cursor MCP cwd).



---



## Technical Debt



| Item | Priority | Effort | Description |

|------|----------|--------|-------------|

| Webview ↔ extension import boundary | Medium | S | Guard script: `check-webview-boundary`; keep in `check-types` |

| Multi-target TS validation | Medium | S | Publish path must run `build:sdk` + `package`, not tests alone |

| Incomplete protocol historically | Medium | S | Mitigated 2026-07-14: sync + manifest; keep `co upgrade` after cokodo bumps |

| Dual skill roots | Low | S | `.agents/skills` (Agents Skills) vs `.agent/skills` (cokodo); default instructionSystem is cokodo |

| AuthNexus 0.2.4–0.2.6 artifacts | Low | M | Historical STABLE uploads are tar or bad zip paths; re-upload if users still update from those versions |



---



## Resolved Issues



### Enterprise VSIX `./` zip path broke private update install



**Status**: 🟢 Resolved | **Resolved**: 2026-07-15



**Description**: After fixing tar→zip, Windows `tar -acf -C dir .` still wrote `./extension/package.json`. VS Code install failed with `extension/package.json not found inside zip`. AuthNexus 0.2.7 (2nd re-upload) and verify API still passed hash checks.



**Solution**: `createZipVsixFromDir()` uses explicit entry list; `assertValidVsixLayout` in scripts + client; 0.2.7 re-published (`d2cbf619-…`).



**Lessons**: See `project/sop/enterprise-vsix-repack-pitfalls.md`.



### Enterprise VSIX tar format broke private update install



**Status**: 🟢 Resolved | **Resolved**: 2026-07-15



**Description**: Windows `add-endpoints-to-vsix.mjs` used `tar -cf *.vsix`, producing tar archives (~30 MB, magic `./`). AuthNexus 0.2.4–0.2.7 (initial) passed API verify but VS Code install failed with `End of central directory record signature not found`.



**Solution**: Stage as `.zip` then rename; ZIP magic assert; `release-private-vsix.mjs` canonical flow.



**Lessons**: See `project/sop/enterprise-vsix-repack-pitfalls.md`, journal `2026-07-15-enterprise-vsix-windows-pitfalls.md`.



### Axline VS Code TypeScript 构建反复失败（0.2.0 发布）



**Status**: 🟢 Mitigated | **Resolved**: 2026-07-10



**Description**: AxGate 设备身份开发期间，同类 TypeScript 错误在 SDK `tsc`、extension `tsc`、Vite webview 打包阶段多次出现，直到 `publish-private-vsix` 才集中暴露。



**Root cause**: 四条独立编译链路验证不同步；开发时只跑单测/F5 未跑完整 `package`。



**Solution**: SOP + 发布前检查清单 + `check-webview-boundary`。



**Lessons Learned**: `.agent/project/sop/vscode-typescript-build-pitfalls.md`



### MCP / session_gate 找不到 `.agent`（半初始化）



**Status**: 🟢 Mitigated | **Resolved**: 2026-07-14



**Description**: 仓库仅有 `.agent/project/`，无 `manifest.json` / `core/`，cokodo MCP 报告 “No .agent/ directory”。



**Solution**: `co upgrade --no-scaffold -y` + 从 bundled 恢复 `manifest.json` + `co update-checksums`；填写 project 实例文件。



---



## Performance Issues



| Area | Current | Target | Notes |

|------|---------|--------|-------|

| VSIX build time | Full monorepo | Skip SDK when unchanged | `release-private-vsix.mjs --skip-sdk` |



---



*Last updated: 2026-07-15*

