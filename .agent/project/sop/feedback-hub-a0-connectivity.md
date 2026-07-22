# Feedback Hub A0 — 契约对齐与可达性报告

> Date: 2026-07-17 · Axline Phase A0  
> Updated: 2026-07-17 — AuthNexus / AxGate HTTPS cutover

## 1. 契约冻结（客户端）

| 产物 | 路径 |
|------|------|
| TypeScript 类型 / `FeedbackClient` | `apps/vscode/src/services/feedback/types.ts` |
| REST client | `apps/vscode/src/services/feedback/rest-client.ts` |
| Mock client（opt-in） | `apps/vscode/src/services/feedback/mock-client.ts` |
| 单测 | `apps/vscode/src/services/feedback/__tests__/` |
| Hub 权威 | AuthNexus `plan/user-feedback-hub.md` §3 + `doc/guide/feedback-hub-openapi-draft.md` |

对齐要点：`page/limit` 分页、`scope=mine|public`、`by-number`、multipart `files`、鉴权附件路径、`app_mismatch` / `not_member` / 413/415/429、状态只读。

## 2. HTTPS 可达性（R-3 / F-4）

| 检查项 | 结果 | 备注 |
|--------|------|------|
| `https://auth.mtsilicon.com/api/health` | **目标生产入口** | AuthNexus HTTPS（端口 443） |
| `https://auth.mtsilicon.com:6343` | **目标生产入口** | AxGate HTTPS（端口 6343） |
| 旧 `http://auth.mtsilicon.com:3000` / `:6100` | **已退役** | 客户端拒绝远程 plain HTTP |
| 生产 SEC-03 / 客户端 §6.1 要求 | **已对齐** | 默认与校验均为 HTTPS |
| 本机仓库 `endpoints.json` | 用户 `~/.axline/endpoints.json` | 启动时自动迁移已知旧 HTTP 基址 |

**结论**：AuthNexus / AxGate 已切换 HTTPS。AuthNexus 生产入口为 `https://auth.mtsilicon.com`（:443；旧 `:3443` 由客户端自动迁移）；AxGate 仍为 `:6343`。配置加载会拒绝远程 `http://`，并重写已知退役基址。已移除 `AXLINE_FEEDBACK_ALLOW_HTTP` 旁路。

## 3. 联调前置（待运维确认）

- [x] AuthNexus 对 IDE 客户端 **HTTPS** 可达（`:443`）
- [ ] `axline` app 存在且测试用户 ACTIVE
- [ ] 用 `axline` 登录 JWT 实测 `GET /api/apps/axline/feedback?scope=mine&page=1&limit=1`
- [ ] VS Code + Cursor 冒烟（见 `feedback-hub-client.md`）
- [ ] 企业代理环境提交/列表（R-6）

## 4. Mock 策略

`AXLINE_FEEDBACK_MOCK=1` 仅用于 UI/单测。未配置 Hub 且非 mock 时，提交返回 `hub_unavailable`，**不会**对真实用户显示假成功。
