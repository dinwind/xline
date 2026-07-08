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
| *(add rows as you create plans)* | | | |

---

*Generated/maintained by cokodo-agent — run `co scaffold` to create missing dirs.*
