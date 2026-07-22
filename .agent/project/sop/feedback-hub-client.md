# SOP: Axline Feedback Hub 客户端联调

> Date: 2026-07-17 · Plan: `plan/authnexus-feedback-client.md` v0.2.0+

## 配置

- `authNexusBaseUrl`：**唯一**基址（与私有更新同源），见 `endpoints.example.json`。
- Feedback 业务 appId 固定为 `axline`（可用 `AXLINE_FEEDBACK_APP_ID` 覆盖，默认勿改）。
- 开发 UI：`AXLINE_FEEDBACK_MOCK=1`（不得对真实用户开放假成功提交）。
- Hub **仅 HTTPS**（`https://auth.mtsilicon.com`，:443）；远程 plain HTTP 已被客户端拒绝。

## 入口

- Command：`Axline: Open Feedback` / `Axline: Report Issue`
- Settings → About → **Send Feedback**

## 手工 E2E（Hub Phase A 就绪后）

1. 登录 AxGate Account（`appId=axline`）。
2. Report Issue：标题 + 正文 + 粘贴截图 + 确认 context checklist → 提交。
3. Mine 列表可见新单；打开详情。
4. 控制台人工改状态 `OPEN→ACCEPTED`（无 Cobyte）→ 扩展内 Refresh 可见。
5. Public 单：ACTIVE 成员发表评论。
6. 抓包：webview 无 `Authorization`；附件路径无 `/uploads`。

## 冒烟清单

| 用例 | VS Code | Cursor | 代理环境 |
|------|---------|--------|----------|
| Open Feedback 门闸（未登录） | ☐ | ☐ | ☐ |
| 登录后 Mine 列表 | ☐ | ☐ | ☐ |
| 提交带图（或 mock） | ☐ | ☐ | ☐ |
| 403 就地提示不登出 | ☐ | ☐ | ☐ |
| NEEDS_INFO banner | ☐ | ☐ | ☐ |

## 构建验收

```powershell
cd c:\ai_work\axline
bun run build:sdk
cd apps\vscode
bun run check-types
bun run check-webview-boundary
bun run package
```
