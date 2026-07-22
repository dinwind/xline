# Plan index

> **Role**: `.agent/project/plan/` holds **planning artifacts** (roadmaps, milestones, execution plans).
> **Entry point for AI/MCP**: Always update this file when adding a new plan markdown so agents can discover it.
> **Authority**: This directory is the canonical, shareable project plan store. Cursor-native plans under `.cursor/plans/` are drafts unless mirrored here.

## How to use

1. **Write** new plans as `plan/<name>.md` (kebab-case name).
2. **Mirror** any approved or long-lived Cursor Plan Mode output into `plan/<name>.md` instead of treating `.cursor/plans/` as the source of truth.
3. **Register** each plan in the table below (path relative to `project/plan/`).
4. **Read** this index first when scoping work or answering "what's planned".

## Scope boundaries

- `.agent/project/plan/` = canonical roadmap / milestone / approved execution plans.
- `.cursor/plans/` = optional IDE-local drafts or review copies.
- `project/changes/<name>/tasks.md` = active implementation checklist when SDD is in use.

## Index

| Plan | File | Summary | Status |
|------|------|---------|--------|
| cokodo-agent 改进提案（Axline 反馈） | `cokodo-agent-improvements-from-axline.md` | 半初始化 sync/manifest、诊断、pycache、MCP cwd、skill 模板与双根约定；供合入 agent_protocol 评审 | Proposed |
| AuthNexus Feedback Hub 客户端 | `authnexus-feedback-client.md` | v0.2.1：A0/A1 实施中（FeedbackClient + Webview + 命令入口）；HTTPS 可达性见 A0 报告 | Implementing |

---

*Generated/maintained by cokodo-agent — run `co scaffold` to create missing dirs.*
