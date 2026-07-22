# VS Code Extension 0.2.6 — ~/.axline home directory + AxGate login fix

> Track: `vscode`  
> Version: `0.2.6`  
> Previous stable: `0.2.5`  
> Canonical version source: `apps/vscode/package.json`  
> Release tag: `vscode/v0.2.6`  
> Rollback tag: `vscode/v0.2.5`

---

## 1. Release Summary

- Extension version: `0.2.6`
- Version track: `vscode`
- Artifact: `apps/vscode/dist/axline-enterprise.vsix` (public `endpoints.json` baked in)
- Extension ID: `axline.axline`
- Release date: `2026-07-15`
- AuthNexus release: `1fc3d06f-e4fc-418b-a2b0-f181fe0124bb`
- SHA256 (enterprise VSIX): `d8f4d8e173c9a8b736f27ed219fbcdf5b437b95264931bd97ff5ab3634683f0b`

**主题：** 用户数据目录统一写入 `~/.axline`（不再新建 `~/.cline/data`）；首次启动自动迁移 legacy 数据；修复 AxGate 凭据登录在 VSIX 未内置 `axgateBaseUrl` 时无法读取用户配置的问题。

---

## 2. Scope Included

| Area | Change |
|------|--------|
| Home dir | `createStorageContext` 与 SDK 默认主目录改为 `~/.axline` |
| Migration | 首次运行自动复制 `~/.cline/data` → `~/.axline/data` |
| Endpoints merge | VSIX 内置 endpoints 缺少 AxGate 字段时，合并 `~/.axline/endpoints.json` |
| Paths | disk、skills、MCP、remote-config、legacy-state-reader 等统一走 axline 路径 |

---

## 3. Scope Excluded / Deferred

- 工作区内的 `.cline/` 项目目录（skills/workflows）仍保留 Cline 兼容路径
- Marketplace / Open VSX 公开发布
- 删除 legacy `~/.cline` 目录（只读回退，不主动清理）

---

## 4. Validation Checklist

- [x] `node scripts/verify-versions.mjs` — `0.2.6` aligned
- [x] `bun apps/vscode/scripts/publish-private-vsix.mjs` — `dist/axline.vsix`
- [x] `add-endpoints-to-vsix.mjs` — `dist/axline-enterprise.vsix`
- [x] AuthNexus STABLE upload + `verify-private-update.mjs`
- [ ] Fresh install → `~/.axline/data` 生成，不再新建 `~/.cline/data`
- [ ] AxGate 账号密码登录成功

---

## 5. Risks

- 已有 `~/.cline/data` 用户：自动迁移后两端目录并存，写入仅走 `~/.axline`
- 仅升级 VSIX 未配置 `~/.axline/endpoints.json` 的用户：企业包内置 `axgateBaseUrl` 可缓解

---

## 6. Rollback

- Rollback tag: `vscode/v0.2.5`
- Re-install VSIX `0.2.5` from AuthNexus or local artifact

---

## 7. Traceability

- Canonical source: `apps/vscode/package.json`
- Build: `bun apps/vscode/scripts/publish-private-vsix.mjs`
- Enterprise repack: `bun apps/vscode/scripts/add-endpoints-to-vsix.mjs`
- Journal: `.agent/project/journal.d/2026-07-15-axline-home-dir-fix.md`
