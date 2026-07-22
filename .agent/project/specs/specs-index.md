# Specs index

> **Role**: `.agent/project/specs/` holds **living specifications by domain** (functional specs, UI spec, API spec, etc.).
> **Entry point for AI/MCP**: Always update this file when adding a new spec so agents can discover it.

## How to use

1. **Write** new specs as `specs/<domain>/spec.md` or `specs/<name>.md` (e.g. `*-ui*.md` for UI spec).
2. **Register** each spec in the table below (path relative to `project/specs/`).
3. **Read** this index before implementing or when answering "what specs exist".

## Index

| Spec | Path | Domain / Purpose | Updated |
|------|------|------------------|---------|
| **AxGate Account 集成** | `axgate-account-integration.md` | v0.3.3：Account/LLM 经 BFF；Feedback Hub 直连 AuthNexus 为 AUTH-02 已决议例外（生产 HTTPS）；含跨 app canonical subject | 2026-07-17 |
| **Axline 私有更新** | `axline-private-update.md` | 方案 A：AuthNexus 软件发布 + 扩展内 VSIX 下载安装 | 2026-07-10 |
| **AxGate Account 集成 · 评审** | `reviews/axgate-account-integration-review.md` | 第三方评审报告：Approve with changes（F-1~F-9）；rev.2 含独立 `axline` appId 权限方案（OQ-01 决议） | 2026-07-09 |

---

*Generated/maintained by cokodo-agent — run `co scaffold` to create missing dirs.*
