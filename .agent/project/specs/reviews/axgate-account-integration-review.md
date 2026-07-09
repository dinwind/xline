# 评审报告：Axline × AxGate 定制 Account 集成方案

> **Reviewed spec**: [`axgate-account-integration.md`](../axgate-account-integration.md) v0.1.0（2026-07-08）
> **Reviewer**: 第三方 AI 审核（Claude）
> **Review date**: 2026-07-09（rev.2：OQ-01 决议为独立 `axline` appId，新增 §4 权限管理方案）
> **Verdict**: **Approve with changes**

---

## 1. 总体结论

整体架构合理，修订 F-1 / F-2 / F-3 并按 §4 落实独立 appId 方案后即可进入实施：

1. **BFF 路由正确**：经 AxGate BFF 而非直连 AuthNexus 是正确选择——与 AxGate Console 同源、appId 服务端校验、客户端不感知 AuthNexus 拓扑（回应 spec §13.1）。
2. **Fork 隔离策略成立**：已核验仓库代码，`sdk/packages/core/src/auth/provider-auth-registry.ts` 中现有 cline / codex / oca handler 注册模式与方案一致，新增 `axgate` handler 侵入性低；`account.proto`、Account UI 组件等引用路径均真实存在。
3. **MVP 降级策略可接受**：console summary 代替完整 usage API（ACC-05 / R-01）合理；推动 AxGate 补充 `/api/usage/me` 的建议成立。
4. **权限管理**（OQ-01 决议）：按行业实践采用**客户端身份拆分、用户权限合并**——在 AuthNexus 注册独立 `axline` 应用与 AppRole，provider/quota 策略仍由 AxGate 集中裁决。方案见 §4。

无遗漏的架构性问题。

---

## 2. Findings

### F-1 · P0 — AUTH-07 的 403 处理有误

403 是权限不足，不是凭证失效。caller 角色访问 `/api/quota`、`/api/metrics/*` 本来就会 403（spec §4.4 自己已列出）；独立 appId 方案下，用户未在 AuthNexus 开通 `axline` app 时也会"登录成功但 403"（见 §4.5）。按现规则会把合法用户登出。

**要求修改**：401 → refresh / deauth；403 → 展示权限提示（区分"权限不足"与"未开通 Axline 访问"），保留会话。

### F-2 · P0 — 401 应先 refresh 重试一次再 deauth；refresh 需 single-flight

长 agent loop 中 token 过期竞态（请求发出时刚好过期）产生的瞬时 401 会直接登出用户。

**要求修改**：

- 401 → 单次 refresh + 重放请求 → 仍 401 才 deauth。
- refresh 必须 single-flight（互斥），否则并发请求临近过期时触发 refresh 风暴。

### F-3 · P0 — AuthState 内容未约束

SEC-02 禁止 JWT 经 postMessage 广播，但 VS Code webview 的 gRPC 底层就是 postMessage，且 `subscribeToAuthStatusUpdate` 会推送 `AuthState` 到 webview。

**要求修改**：明确规定 `AuthState` / `UserInfo` 仅含展示字段（subject、roles 等），SHALL NOT 含 token。

### F-4 · P1 — 登录响应契约含糊；会话模型 UX 后果未声明

响应同时返回 `access_token` 和 `token`，未指定 canonical 字段；且无 refresh token，refresh 依赖仍有效的 access token——意味着 VS Code 关闭超过 token 生命周期（3600s）后必须重新输入密码。

**要求修改**：指定 canonical 字段；在文档中显式声明滑动会话模型及其 UX 后果（影响 AUTH-05 与 R-04 的实际效果）。

### F-5 · P1 — appId 传递规则不一致（已按独立 appId 方案修订建议）

原 spec 中登录由 BFF 注入 appId、refresh 由客户端在 body 传 appId，规则不一致。引入独立 `axline` appId 后，同一 AxGate BFF 需服务 Console（`axgate`）与 Axline（`axline`）两类客户端，纯服务端注入无法区分来源。

**修订建议**：统一为"**客户端声明 + BFF 白名单校验**"——login 与 refresh 请求 body 均携带 `appId`，BFF 校验其在允许列表（`axgate`、`axline`）内后转发，拒绝任意值透传。

### F-6 · P1 — 过期时间来源应为 JWT `exp`

应以 JWT `exp` claim 为准而非响应 `expires_in`（避免客户端时钟计算漂移），§5.5 应明确优先级。

### F-7 · P2 — Cline 遗留组件清理缺失

§5.2 文件清单未包含删除/替换 `CreditBalance.tsx`、`CreditsHistoryTable.tsx`、`StyledCreditDisplay.tsx` 等 Cline credits 组件。ACC-04 要求不展示，但留下死代码会增加 upstream 合并噪音，与 R-03 缓解目标矛盾。

### F-8 · P2 — 登录端点防爆破缺失

未提及 429 / 限流处理与登录表单防自动重试。**建议**：补充一条 SEC 项。

### F-9 · nit — 文档细节

- §4.1 示例 `authnexus_base_url` 为 `http://...:3000` 明文 HTTP，虽属服务端内部链路，建议标注为示例值以免误导。
- §5.2 中 `ClineAuthContext.tsx` 实际位于 `webview-ui/src/context/`，非 account 组件目录。

---

## 3. 开放问题回应（OQ-01–05）

| ID | 回应 |
|----|------|
| OQ-01 | **已决议**：注册独立 `axline` appId，不复用 `axgate`。方案见 §4。 |
| OQ-02 | providers.json 明文 JWT 在 MVP 可容忍（token 短生命周期）；但若 F-4 的会话模型改为长效凭证，SecretStorage 迁移应提前到 MVP。 |
| OQ-03 | 同意由 AxGate 团队 Phase D 并行交付 `/api/usage/me`。 |
| OQ-04 | 无补充，待法务。 |
| OQ-05 | 建议保留 BYOK，作为 AxGate 故障时的逃生通道，与 "Fail closed" 原则不冲突（Fail closed 针对未授权推理，非可用性）。 |

未发现遗漏的开放问题。

---

## 4. 独立 appId 权限管理方案（OQ-01 决议）

### 4.1 设计原则

行业通行的多客户端 + 网关模式（OAuth2/OIDC 标准实践，参照 GitHub 多客户端、Copilot 等）：

- **客户端身份拆分**：每个客户端应用在 IdP 注册独立 app（appId ≈ client_id）。token 的 appId/audience 标识签发来源，实现 audience 隔离、按客户端角色封顶、独立吊销、可信审计归因。
- **用户权限合并**：provider 可见性、模型白名单、quota 等授权策略挂在**用户（`sub`）+ 角色**上，由资源服务器（AxGate）集中裁决，不按客户端各维护一套。用户从哪个客户端进来，AxGate 都用同一份策略按 claims 现场裁决。

### 4.2 AuthNexus 侧配置

| 项 | 内容 |
|----|------|
| 应用注册 | 新建 `axline` 应用（独立于 `axgate`） |
| AppRole 设置 | `user`（默认档）；预留 `power-user`（可选，用于未来模型/quota 分档） |
| 用户开通 | 需将用户添加为 `axline` 应用成员并赋予 AppRole（**部署前提**，见 §4.5） |

同一用户在两个 app 的角色相互独立：如某管理员在 `axgate` app 为 `admin`，在 `axline` app 仅为 `user`。

### 4.3 AxGate 侧配置（`config/authnexus-role-map.yaml`）

新增 `axline` 段，**所有 AppRole 封顶为 caller**，绝不映射 admin / operator：

| appId | AuthNexus AppRole | AxGate roles |
|-------|-------------------|--------------|
| `axline` | `user`（及其余任意角色） | `ax_gate_caller` |
| `axline` | `power-user`（预留） | `ax_gate_caller`（+ 未来分档角色） |

效果：即使用户本身是 `axgate` app 的 admin，经 Axline 登录获得的 JWT 也只有 caller 能力——IDE token 泄露不会波及 Console 管理面。

### 4.4 登录与权限关联链路

1. 用户在 Axline 输入用户名/密码 → AxGate BFF 校验 `appId=axline` 在白名单内（见 F-5）→ 转发 AuthNexus。
2. AuthNexus 签发 JWT：`sub=<用户主体>`、`app_ids=["axline"]`、AppRole 为该用户在 `axline` app 的角色。
3. AxGate 按 role-map 解析 → `ax_gate_caller`。
4. 数据面**不变**：`/api/providers`、`/api/console/summary`、`/v1/*` 按 `roles`（能见哪些 provider / 调哪些模型）+ `sub`（quota 归属，`project_id: ide-{subject}`）裁决。Axline 侧零权限配置。
5. 按用户差异化 provider 权限时：优先用 `axline` AppRole 分档 + role-map 映射（粗粒度）；不建议 AxGate 侧按 `sub` 建 ACL（运维成本高，仅在分档不满足时考虑）。

### 4.5 部署前提与失败模式

- **前提**：用户必须先在 AuthNexus 开通 `axline` app。未开通用户的表现为**登录成功但无有效角色 → 数据面 403**，必须由 F-1 修订后的 403 处理承接（提示"未开通 Axline 访问，请联系管理员"，不登出）。
- 该前提须写入主 spec 的部署/运维章节。

### 4.6 主 spec 需同步修订点

| Spec 位置 | 修改 |
|-----------|------|
| §2.3 决策表 | Auth appId：`axline`（独立注册） |
| §4.1 | login / refresh 契约统一为客户端声明 `appId` + BFF 白名单校验（F-5） |
| §4.5 AppRole 映射 | 增加 `axline` 段（本报告 §4.3） |
| §5.4 配置 | `authAppId` 默认值改为 `"axline"` |
| §9 风险 R-05 | 更新为"axline app / role-map 未按期配置"，缓解 = 部署前提检查清单 |
| §10 OQ-01 | 关闭，记录决议 |
| 新增 | 部署前提章节（§4.5） |

---

## 5. 处置要求

| 优先级 | Findings | 要求 |
|--------|----------|------|
| P0 | F-1, F-2, F-3 | 实施前必须修订 spec |
| P1 | F-4, F-5, F-6；§4.6 同步修订 | 实施前应修订，或在 spec 中显式接受风险 |
| P2 / nit | F-7, F-8, F-9 | 建议修订，可随实施更新 |

---

*本评审基于 spec v0.1.0 与 Axline 仓库当前代码；spec 修订后如需复审请更新本文件。*
