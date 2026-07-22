# VS Code Extension 0.2.4 — ~/.axline config + enterprise VSIX endpoints

> Track: `vscode`  
> Version: `0.2.4`  
> Previous stable: `0.2.3`  
> Canonical version source: `apps/vscode/package.json`  
> Release tag: `vscode/v0.2.4`  
> Rollback tag: `vscode/v0.2.3`

---

## 1. Release Summary

- Extension version: `0.2.4`
- Version track: `vscode`
- Artifact: `apps/vscode/dist/axline-enterprise.vsix` (public `endpoints.json` baked in)
- Extension ID: `axline.axline`
- Release date: `2026-07-15`
- AuthNexus release: `2ffb14a2-3560-43ea-a363-f6e189a48471`
- SHA256 (enterprise VSIX): `f66de3e9b4b6eb753eb92eef718cdcd37a9ab7064d48e799190215a2b3989e6b`

**主题：** 用户配置目录迁移至 `~/.axline`，公开配置与 `secrets.json` 拆分；企业 VSIX 可内置 AxGate 地址，修复未配置 `axgateBaseUrl` 时无法账号密码登录的问题。

---

## 2. Scope Included

| Area | Change |
|------|--------|
| Config home | `~/.axline/endpoints.json` 为主路径，兼容 `~/.cline` 回退 |
| Secrets split | `updateEnrollmentCode` 迁至 `~/.axline/secrets.json` |
| Update cache | AuthNexus token 缓存迁至 `~/.axline/update/` |
| Enterprise VSIX | `add-endpoints-to-vsix.mjs` 注入仅公开字段的 `endpoints.json` |
| Login UX | AxGate 未配置时错误提示指向 `~/.axline/endpoints.json` |
| Publish scripts | `load-axline-config.mjs` 统一读取 `~/.axline` 配置 |

---

## 3. Scope Excluded / Deferred

- 全量 `~/.cline` 数据目录迁移（skills/MCP 等仍用 Cline 路径）
- Marketplace / Open VSX 公开发布
- 扩展内首次配置向导 UI

---

## 4. Validation Checklist

- [x] `node scripts/verify-versions.mjs` — `0.2.4` aligned
- [x] `bun apps/vscode/scripts/publish-private-vsix.mjs` — `dist/axline.vsix`
- [x] `add-endpoints-to-vsix.mjs` — `dist/axline-enterprise.vsix`
- [x] AuthNexus STABLE upload + `verify-private-update.mjs`
- [ ] Install VSIX → AxGate 账号密码登录
- [ ] **Axline: Check for Updates** 检测到 `0.2.4`

---

## 5. Risks

- 仅升级 VSIX 且未配置 `~/.axline` 的用户：企业包内置 `axgateBaseUrl` 可缓解；私有更新仍需 `secrets.json`
- 旧版 `~/.cline/endpoints.json` 仍可读，但应迁移到 `~/.axline`

---

## 6. Rollback

- Rollback tag: `vscode/v0.2.3`
- Re-install VSIX `0.2.3` from AuthNexus or local artifact

---

## 7. Traceability

- Canonical source: `apps/vscode/package.json`
- Build: `bun apps/vscode/scripts/publish-private-vsix.mjs`
- Enterprise repack: `bun apps/vscode/scripts/add-endpoints-to-vsix.mjs`
- Specs: `.agent/project/specs/axline-private-update.md`, `.agent/project/specs/axgate-account-integration.md`
