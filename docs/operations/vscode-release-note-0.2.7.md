# VS Code Extension 0.2.7 — auto endpoints.json + axline MCP settings

> Track: `vscode`  
> Version: `0.2.7`  
> Previous stable: `0.2.6`  
> Canonical version source: `apps/vscode/package.json`  
> Release tag: `vscode/v0.2.7`  
> Rollback tag: `vscode/v0.2.6`

---

## 1. Release Summary

- Extension version: `0.2.7`
- Version track: `vscode`
- Artifact: `apps/vscode/dist/axline-enterprise.vsix` (public `endpoints.json` baked in, **valid ZIP**)
- Extension ID: `axline.axline`
- Release date: `2026-07-15`
- AuthNexus release (current): `d2cbf619-741f-4bc6-adcc-20da0c456bb4`
- SHA256 (enterprise VSIX, current): `247c184e2019bcdcf5fffdab7f7d41fab35a5e30eb7250a826b19b29ddadd591`

**主题：** 首次启动自动创建 `~/.axline/endpoints.json`（无需用户手动配置即可 AxGate 登录）；MCP 设置文件重命名为 `axline_mcp_settings.json` 并自动迁移 legacy `cline_mcp_settings.json`。

---

## 2. Scope Included

| Area | Change |
|------|--------|
| Endpoints bootstrap | `ensureAxlineEndpointsFile()` — legacy 复制 → VSIX 内置 → 企业默认 |
| MCP settings | `~/.axline/data/settings/axline_mcp_settings.json`（自动 rename 旧文件） |
| Shared SDK | `AXLINE_MCP_SETTINGS_FILE_NAME` in `@cline/shared` paths |
| Release tooling | `release-private-vsix.mjs`；ZIP 校验贯穿 repack/upload/verify/client |

---

## 3. Scope Excluded / Deferred

- Marketplace / Open VSX 公开发布
- 删除 legacy `~/.cline` 目录

---

## 4. Validation Checklist

- [x] `node scripts/verify-versions.mjs` — `0.2.7` aligned
- [x] `release-private-vsix.mjs` — build + enterprise repack + upload + verify
- [x] `verify-private-update.mjs` — `Download: OK (valid VSIX zip)` + `Integrity: OK`
- [ ] Fresh install → `~/.axline/endpoints.json` 自动生成
- [ ] AxGate 账号密码登录成功
- [ ] **Axline: Check for Updates** → Update now → Reload（客户端 E2E）

---

## 5. Risks

- 自动写入的默认 `endpoints.json` 指向企业 AuthNexus/AxGate 地址；多租户环境需后续手动改文件
- 已有 `cline_mcp_settings.json` 用户：首次访问时 rename 迁移
- 0.2.4–0.2.7 初版 AuthNexus 制品为 tar 格式，**不可安装**；须使用重发布后的 0.2.7 或手动安装修复后的 enterprise VSIX

---

## 6. Rollback

- Rollback tag: `vscode/v0.2.6`
- 注意：AuthNexus 上 0.2.6 制品同为损坏 tar，回滚请使用本地有效 `axline.vsix`（≤0.2.2）或修复后重打的 enterprise 包

---

## 7. Traceability

- Canonical source: `apps/vscode/package.json`
- **Standard release:** `bun apps/vscode/scripts/release-private-vsix.mjs`
- SOP: `.agent/project/sop/axline-private-update.md`

---

## 8. Republication (2026-07-15)

| Item | Initial (broken) | Fixed (current) |
|------|------------------|-----------------|
| Format | tar（~30MB）→ ZIP 但路径 `./extension/...` | ZIP，`extension/package.json` 在根路径 |
| Root cause | `tar -cf *.vsix`；后 `tar -acf -C dir .` 产生 `./` 前缀 | 显式条目列表打包 + `assertValidVsixLayout` |
| Client symptom | `End of central directory…` 或 `extension/package.json not found inside zip` | Install succeeds |
| Release ID | `e5dbcb44…` / `238a8433…` | `d2cbf619-741f-4bc6-adcc-20da0c456bb4` |
| Download | 历次损坏上传 | `http://auth.mtsilicon.com:3000/uploads/app_uu1Sn7yC-0.2.7-1784082386473.vsix` |
| SHA256 | `3f61a748…` / `2894eb4f…` | `247c184e2019bcdcf5fffdab7f7d41fab35a5e30eb7250a826b19b29ddadd591` |
| fileSize | ~30 MB / ~8.2 MB | 8,203,134 bytes |

Re-publish command:

```powershell
bun apps/vscode/scripts/release-private-vsix.mjs --skip-sdk
```
