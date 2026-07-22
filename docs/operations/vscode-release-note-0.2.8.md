# VS Code Extension 0.2.8 — default auto-approve + cokodo MCP all-tools

> Track: `vscode`  
> Version: `0.2.8`  
> Previous stable: `0.2.7`  
> Canonical version source: `apps/vscode/package.json`  
> Release tag: `vscode/v0.2.8`  
> Rollback tag: `vscode/v0.2.7`

---

## 1. Release Summary

- Extension version: `0.2.8`
- Version track: `vscode`
- Artifact: `apps/vscode/dist/axline-enterprise.vsix` (public `endpoints.json` baked in, **valid ZIP**)
- Extension ID: `axline.axline`
- Release date: `2026-07-15`
- AuthNexus release ID: `23051051-6271-4fc1-a64c-2a8f013bcb1b`
- Download: http://auth.mtsilicon.com:3000/uploads/app_uu1Sn7yC-0.2.8-1784100576486.vsix
- SHA256 (enterprise VSIX): `c14151ea5f08f0a3617b50c526bb9a29ec35396a22ea3cfdb30dd640777bb68f`
- fileSize: 16,443,800 bytes

**主题：** 默认开启 Auto-approve 各大类（含 Execute commands）；cokodo-agent MCP 默认 `autoApprove: ["*"]`（Auto-approve all tools），减少会话门禁反复人工 Approve。

---

## 2. Scope Included

| Area | Change |
|------|--------|
| Auto-approve defaults | `executeSafeCommands: true`（Read/Edit/Commands/Web Fetch/MCP 默认全开） |
| cokodo MCP | `autoApprove: ["*"]` in snippet + `getDefaultCokodoMcpServerEntry()` |
| MCP hub | Recognize `"*"` sentinel; toggle expands/collapses correctly |
| Ensure sync | Empty cokodo `autoApprove` upgraded to `["*"]` on workspace sync |

---

## 3. Scope Excluded / Deferred

- Marketplace / Open VSX 公开发布
- 强制覆盖用户已自定义的非空 MCP autoApprove 列表
- 已有用户全局 `autoApprovalSettings` 的迁移（仅影响默认值 / 新配置）

---

## 4. Validation Checklist

- [x] `node scripts/verify-versions.mjs` — `0.2.8` aligned
- [x] `release-private-vsix.mjs` — build + enterprise repack + upload + verify
- [x] `verify-private-update.mjs` — `Download: OK (valid VSIX layout)` + `Integrity: OK`
- [ ] Fresh / updated install: Auto-approve 默认含 Commands
- [ ] cokodo-agent Tools → **Auto-approve all tools** 默认勾选
- [ ] **Axline: Check for Updates** → Update now → Reload（客户端 E2E）

---

## 5. Risks

- Commands 默认自动批准会提高误执行风险；仍可用 Auto-approve 栏关闭
- cokodo 空 `autoApprove` 会在同步时升为 `["*"]`；用户若清空全部勾选，下次 sync 可能再次开启

---

## 6. Rollback

- Rollback tag: `vscode/v0.2.7`
- AuthNexus STABLE 上一版：`0.2.7`（修复后的 ZIP enterprise 制品）

---

## 7. Traceability

- Canonical source: `apps/vscode/package.json`
- **Standard release:** `bun apps/vscode/scripts/release-private-vsix.mjs`
- SOP: `.agent/project/sop/axline-private-update.md`
- Related: Auto-approve defaults + cokodo MCP `*` sentinel
