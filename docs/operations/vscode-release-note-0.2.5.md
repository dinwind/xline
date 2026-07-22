# VS Code Extension 0.2.5 — Skip Get Started onboarding, login first

> Track: `vscode`  
> Version: `0.2.5`  
> Previous stable: `0.2.4`  
> Canonical version source: `apps/vscode/package.json`  
> Release tag: `vscode/v0.2.5`  
> Rollback tag: `vscode/v0.2.4`

---

## 1. Release Summary

- Extension version: `0.2.5`
- Version track: `vscode`
- Artifact: `apps/vscode/dist/axline-enterprise.vsix` (public `endpoints.json` baked in)
- Extension ID: `axline.axline`
- Release date: `2026-07-15`
- AuthNexus release: `dbd613d6-5856-4ccf-ab7c-ea2782703916`
- SHA256 (enterprise VSIX): `b56a2badbf3951acb9ca7971696ffdb4f5702fc73fc3a06a28f74ca2996d3afb`

**主题：** 移除首次启动的 Get Started 引导流程（用户类型选择、模型选择、BYOK 配置向导），安装后直接进入 Axline 登录页。

---

## 2. Scope Included

| Area | Change |
|------|--------|
| First launch UX | `showWelcome` 时始终显示 `AccountWelcomeView`（Sign in to Axline） |
| Onboarding removal | 不再渲染 `OnboardingView`（How will you use Axline? 等） |
| Welcome header | 首次登录前隐藏 Account 页头 Done 按钮 |
| Post-login | 登录成功后自动完成 welcome 并进入聊天界面 |

---

## 3. Scope Excluded / Deferred

- 删除 `components/onboarding/` 遗留代码（当前仅停用路由）
- Marketplace / Open VSX 公开发布
- 强制登录前不可关闭欢迎页（仍可通过 Done 跳过，聊天区有 login gate）

---

## 4. Validation Checklist

- [x] `node scripts/verify-versions.mjs` — `0.2.5` aligned
- [x] `bun apps/vscode/scripts/publish-private-vsix.mjs` — `dist/axline.vsix`
- [x] `add-endpoints-to-vsix.mjs` — `dist/axline-enterprise.vsix`
- [x] AuthNexus STABLE upload + `verify-private-update.mjs`
- [ ] Fresh install → 直接显示登录页，无 Get Started 向导
- [ ] 登录成功 → 进入主界面
- [ ] **Axline: Check for Updates** 检测到 `0.2.5`

---

## 5. Risks

- 未配置 AxGate 的开发环境：登录表单可见但凭据登录不可用（需 `~/.axline/endpoints.json` 或企业 VSIX 内置地址）
- 从 0.2.4 升级的用户若已完成 welcome，行为不变

---

## 6. Rollback

- Rollback tag: `vscode/v0.2.4`
- Re-install VSIX `0.2.4` from AuthNexus or local artifact

---

## 7. Traceability

- Canonical source: `apps/vscode/package.json`
- Build: `bun apps/vscode/scripts/publish-private-vsix.mjs`
- Journal: `.agent/project/journal.d/2026-07-15-skip-onboarding-login-first.md`
