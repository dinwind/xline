# 任务：实施 Axline × AuthNexus Feedback Hub 客户端（Phase A0 + A1）

> 使用方式：将本文全文作为提示词交给 Axline 开发 AI。Date: 2026-07-17。

## 1. 角色与目标

你是 Axline 仓库（`C:/ai_work/axline`，Cline fork 的 VS Code/Cursor 扩展）的开发 AI。
本次任务：按已评审定稿的方案，完成 Feedback 客户端的 **Phase A0（契约对齐）与 Phase A1（MVP 狗粮）**。A2/A3 本次不做。

Axline 在此系统中只是**客户端壳**：提交、列表、详情、评论、状态只读展示。不做 AI triage、不下达实施指令（dispatch）、不碰 PR/CI、不内嵌 LLM。

## 2. 必读文档（按序完整阅读，允许跨项目访问）

| # | 文档 | 路径 | 权威级别 |
|---|------|------|----------|
| 1 | Axline 客户端方案 **v0.2.0** | `C:/ai_work/axline/.agent/project/plan/authnexus-feedback-client.md` | **本次实施的需求权威**（AX-F-01..12、§6 架构、§8 分期、§9 验收） |
| 2 | AuthNexus Hub 平台方案 **v0.2.0** | `D:/ai_workspace/AuthNexus/.agent/project/plan/user-feedback-hub.md` | **服务端契约权威**（§3：字段/状态转移表/路由/错误码/附件/分页） |
| 3 | Axline Feedback UI 设计 | `C:/ai_work/axline/.agent/project/design/feedback-client-ui.md` | UI 实现权威（四屏结构、徽章映射、组件落点） |
| 4 | Account 集成规格 **v0.3.3+** | `C:/ai_work/axline/.agent/project/specs/axgate-account-integration.md` | 鉴权复用权威（401/403 语义、single-flight refresh、SEC-01..08、AUTH-02 的 Feedback 直连例外） |
| 5 | 第三方评审与修订对照（背景） | `D:/ai_workspace/AuthNexus/.agent/project/reviews/feedback-hub-axline-third-party-review-2026-07-17.md`、同目录 `feedback-hub-axline-review-remediation-0.2.0.md` | 理解各约束的 why，不作为需求源 |

冲突裁决：客户端行为以文档 1 为准；API 契约以文档 2 §3（及其冻结的 OpenAPI）为准；两者冲突时**停下来向人类报告**，不要自行取舍。

## 3. 方案摘要（已锁定，不得偏离）

- **形态**：扩展内 Webview（React + Vite webview-ui，侧栏子视图），入口 = 命令 `Axline: Open Feedback` / `Axline: Report Issue` + Settings→About。
- **鉴权路径**：登录复用既有 AxGate Account BFF（`appId=axline`）；Feedback CRUD 由 **extension host 直连 AuthNexus** `/api/apps/axline/feedback*`（User JWT）。此直连是 Account AUTH-02 的**已决议例外**。
- **安全红线**：JWT 只存在于 extension host，**永不进入 webview**（webview 经 gRPC/本地消息与 host 通信，无 Authorization 头）；生产 `authnexusBaseUrl` 必须 HTTPS；基址与私有更新配置**单源**（R-7），禁止新立第二套配置键。
- **状态只读**：客户端不提供任何改状态入口；状态徽章文案按客户端方案 §7 映射；`NEEDS_INFO` 详情页顶置「请补充评论」banner。
- **附件**：仅 png/jpeg/webp/gif，multipart 经 host 上传；展示时**只**经 Hub 鉴权下载 API（`GET .../attachments/:attachmentId`）加载，任何 `/uploads/*` 公开 URL 出现即为 bug。
- **client context**（§6.4）：8 个非敏感字段，默认勾选、逐项可取消、提交前可预览；**禁止**采集 workspace 路径、文件内容、终端输出、JWT/API Key、`.env`、PII。
- **错误语义**：401 → 既有 single-flight refresh→单次重放→仍 401 才 deauth；**403 不登出**（就地提示）；404（不可见 PRIVATE）按「不存在」渲染；413/415/429 就地可读提示。

## 4. 实施需求（工作包）

### WP-0 · Phase A0 — 契约对齐（先做，不发版）

1. 读取 Hub plan §3，冻结 `FeedbackClient` TypeScript 接口（类型对齐 §3.1 字段、§3.3 端点、`page/limit` 分页、结构化错误码）+ 完整 mock 实现。
2. 联调前提核验并输出报告：AuthNexus 对客户端 HTTPS 可达；`axline` app 存在、测试用户 ACTIVE；用 `axline` 登录 token 实测打通一个 GET（R-3）。**若 HTTPS 不可达：停止，报告人类**（决议是切 AxGate 反代为默认，属另一变更）。
3. Cursor + VS Code 冒烟用例、企业代理用例（R-6）写入联调清单。

### WP-1 · Host 层（`apps/vscode/src/services/feedback/` + `core/controller/feedback/`）

`FeedbackService`：REST client（复用 Account 的凭证获取/refresh 编排）、multipart 上传、鉴权附件拉取（转 bytes/临时资源给 webview）、错误映射、分页。Controller：webview 消息处理 + 登录门闸。

### WP-2 · Webview UI（`apps/vscode/webview-ui/src/components/feedback/`）

按 UI 设计文档四屏实现：`FeedbackListView`（Mine/Public Tab）、`FeedbackNewForm`（type 分段/标题/正文/附件粘贴区/context checklist/「默认私密」固定提示）、`FeedbackDetailView`（状态徽章、NEEDS_INFO banner、评论时间线、`externalPrUrl`/`releaseVersion` 外链、PUBLIC 单允许 ACTIVE 成员评论 = AX-F-06）、`LoginGate`。复用现有 webview 设计 tokens，遵守 `check-webview-boundary`（webview 不 import `@cline/core`）。

### WP-3 · 入口与配置

`package.json` contributes.commands 两条命令 + About 入口；`endpoints.example.json` 增补说明（复用既有 AuthNexus 基址键，单源）。

### WP-4 · 测试与文档（AX-F-11/12）

单测（FeedbackClient：URL 构造、错误映射、context 序列化）；组件测试（表单校验、门闸、空态）；用户文档 + 联调手册。

## 5. 验收（全部满足才算完成）

1. 客户端方案 §9 全表通过：`bun run build:sdk`、`check-types`、`check-webview-boundary`、`package` 全绿。
2. 手工 E2E：登录 → 提交带图 → Mine 可见 → 控制台改状态（无 Cobyte：人工 OPEN→ACCEPTED）→ 扩展刷新可见 → 评论 PUBLIC 单。
3. 安全验证：抓包 webview 无 Authorization 头；附件请求无 `/uploads`；context 无路径/密钥。
4. VS Code 与 Cursor 各一次冒烟。
5. Hub 未就绪时 mock 可跑通全 UI，但**不得**对真实用户呈现「假成功」提交（AX-F-01..10 的真实路径仅在 Hub Phase A 就绪后开放）。

## 6. 工作纪律

- 不要臆造 Hub API 字段：契约以 Hub plan §3 / 冻结 OpenAPI 为准，缺失处先查 `D:/ai_workspace/AuthNexus` 仓（OpenAPI 草案、`backend/src/modules/feedback/`），仍无则停下来问。
- 定制代码集中在隔离目录（`services/feedback` + `components/feedback`），降低 Cline upstream 合并冲突（R-5）。
- 实施中做出的任何决策/偏差，回写到 `plan/authnexus-feedback-client.md`（版本号递增）；完成后更新 `.agent/project/plan/plan-index.md`。
- 禁止实现：dispatch 调用、状态修改 API、本地 LLM triage、投票/路线图、匿名提交。
