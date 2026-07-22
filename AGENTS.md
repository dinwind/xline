# Axline

**Authority**: For this project, rules under `.agent/` and this file are the single source of truth; user/global IDE rules are for editor behavior only. If they conflict, follow this repository's `.agent` protocol.

## Current Status

Read `.agent/project/status.md` for current development state before starting work.

If status contains **Active change (SDD)** or `.agent/project/changes/.active` exists, read `project/changes/<name>/tasks.md` next before coding (see `.agent/core/instructions.md` §1).

## Protocol

This project uses AI Agent Collaboration Protocol.
Read `.agent/start-here.md` to establish the full collaboration context.

## Essential Files

- `.agent/project/status.md` — Current state (read FIRST every session)
- `.agent/start-here.md` — Protocol entry point
- `.agent/project/context.md` — Project business context
- `.agent/project/tech-stack.md` — Technology stack decisions
- `.agent/project/deploy.md` — Deployment environments and infrastructure
- `.agent/project/commands.md` — Common project commands
- `.agent/core/core-rules.md` — Non-negotiable core principles

## Project directory roles (.agent/project/)

| Directory / file | Role |
|------------------|------|
| `status.md` | Session state — read first every session; update at checkpoints (product PRs: journal.d only). |
| `AGENT-GIT-PR-WORKFLOW.md` | Git/PR/collaboration entry — three hard rules + read order. |
| `context.md` | Business context and project name. |
| `tech-stack.md` | Stack and tooling decisions. |
| `commands.md` | Build/test/run commands. |
| `deploy.md` | Deployment and infra. |
| `known-issues.md` | Pitfalls and workarounds. |
| `sop/` | Release / debug / git SOPs. |
| `changes/` | SDD change units (`co change`); active scope in `tasks.md`. |
| **`events/`** | **Local linkage events** — machine-discoverable cross-project change notices for same-machine coordination. **Index:** `events/events-index.md` — register each event file; MCP resource `agent://events-index`. |
| `specs/` | Living specs by domain. |
| **`plan/`** | **Canonical plans** — shareable roadmaps, milestones, approved execution plans. **Index:** `plan/plan-index.md` — register each plan file; MCP resource `agent://plan-index`. Cursor native plans under `.cursor/plans/` stay draft IDE artifacts until mirrored here. |
| **`research/`** | **Research** — surveys, comparisons. **Index:** `research/research-index.md` — register each report; MCP resource `agent://research-index`. |
| **`specs/`** | **Living specs** — by domain (functional, UI, API). **Index:** `specs/specs-index.md` — register each spec; MCP resource `agent://specs-index`. |
| **`versioning.md`** | **Version policy** — human-readable rules for tracks, canonical sources, tags, release notes, and rollback. |
| **`version-state.toml`** | **Version state** — machine-readable version facts (`current_release`, `working_version`, `status`, release note, tag, rollback baseline). |

**Workflow**: When planning → write approved or long-lived plans to `project/plan/<name>.md` and **update `plan-index.md`**. Cursor native plans under `.cursor/plans/` are optional IDE drafts and are **not** the project source of truth unless mirrored into `project/plan/`. When researching → write `project/research/<name>.md` and **update `research-index.md`**. When adding a spec → write under `project/specs/` and **update `specs-index.md`**. When a local change may affect another same-machine project → add an event file under `project/events/` and **update `events-index.md`** so MCP can surface linkage hints. When enabling structured release governance → keep `project/versioning.md`, `project/version-state.toml`, and `project/sop/release.md` aligned. Run `co scaffold` if dirs are missing.

## Plan governance

- `.agent/project/plan/` is the canonical team/project plan store.
- `.cursor/plans/` is an IDE-local draft or review artifact; keep it optional and do not treat it as authoritative.
- If a plan is created or approved in Cursor Plan Mode and should survive the session, copy or summarize it into `.agent/project/plan/<kebab-name>.md` and update `.agent/project/plan/plan-index.md`.
- When SDD is active, `.agent/project/changes/<name>/tasks.md` remains the implementation checklist; plan files do not replace it.

## Cross-project context (Cokodo MCP)

When a task involves **another project** (integration, API docking, migration, referencing external docs), use these MCP tools **before** falling back to file-system search (Grep/Glob/Read on other directories):

1. `list_global_projects` — discover all registered projects on this machine.
2. `get_global_project_context(project)` — read any project's `.agent/` context (status, tech-stack, etc.).
3. `get_global_project_status(project)` — read any project's `status.md`.
4. `global_search(keyword)` — search across all projects by keyword.
5. `list_relations` — discover declared cross-project references and collaborations.
6. `get_related_context(relation)` / `get_collaboration_context(collaboration)` — read shared cross-project content.
7. `list_project_events(project)` / `get_related_events()` / `get_local_linkage_status()` — inspect same-machine event linkage and affected projects.

**Workflow**: When you need info from project X → `list_global_projects` → `get_global_project_context("X")` → use the returned context. Only fall back to direct file-system access if MCP tools do not cover your need.

**Auto-loading**: References declared with `use_when: session_start` or `always` are automatically included in `get_project_context` output. Collaborations are always auto-loaded with drift detection. On-demand references appear as actionable hints.

**Setup (for recurring cross-project work)**:
- `co ref add <path> --name <name> --use-when session_start` — auto-loaded every session via `get_project_context`
- `co ref add <path> --name <name>` — on-demand via `get_related_context(relation="<name>")`
- `co collab add <partner> --name <name> --role replica` — shared files auto-loaded + sync tracking
- Maintain `project/events/events-index.md` for local-machine change notices that other projects should react to

When you detect repeated cross-project access patterns (e.g., frequently reading another project's API docs), suggest the user declare a relation with `co ref add` or `co collab add` to automate future sessions.

## Key Rules

- Encoding: UTF-8 (explicit declaration required)
- Paths: always use forward slash `/`
- Test data: must use `autotest_` prefix
- No external CDN links
- Update session state at checkpoints; product PRs use `journal.d` — see `project/AGENT-GIT-PR-WORKFLOW.md`
- `Recently Completed` in `status.md` is capped at **5 items**; drop a fragment to `project/journal.d/` and run `co journal-flush` to sync.
- **Agent Git/PR (three hard rules)** — see `project/AGENT-GIT-PR-WORKFLOW.md` and `project/sop/agent-git-pr-collaboration.md`:
  1. One PR per branch; delete the remote head after merge.
  2. Product PRs must not edit `status.md`; write `project/journal.d/` fragments; sync via `chore/agent-status-*` + `co journal-flush`.
  3. Before merge: integrate the latest default branch; PR must be mergeable; re-approve after new pushes if required.

- For UI/frontend tasks: read `.agent/core/workflows/ui-design-workflow.md` and project UI spec (`.agent/project/specs/*-ui*.md`) before implementing.
- For release/version governance tasks: read `.agent/core/workflows/version-governance-workflow.md`, `.agent/project/versioning.md`, `.agent/project/version-state.toml`, and `.agent/project/sop/release.md` before making release/version changes.
- Git commit on Windows/PowerShell: use `-F .git/COMMIT_MSG_TMP` (heredoc `<<'EOF'` not supported); see `.agent/core/conventions.md` §3.4

## Before Coding

1. Read `.agent/project/status.md` for current state
2. Read `.agent/project/context.md` for business context
3. Check `.agent/project/tech-stack.md` for tech decisions
4. Check `.agent/project/deploy.md` for deployment environments
5. Check `.agent/project/known-issues.md` for known pitfalls
