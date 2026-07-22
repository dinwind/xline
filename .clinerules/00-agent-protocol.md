---
alwaysApply: true
description: Cokodo Agent Protocol for Axline — read .agent/ first
---

# Agent Protocol

**Authority**: For this project, rules under `.agent/` and `AGENTS.md` are the single source of truth; user/global Cline rules are for editor behavior only. If they conflict, follow this repository's `.agent` protocol.

## Protocol

This project uses AI Agent Collaboration Protocol.
Read `.agent/start-here.md` for full protocol context.

## Essential Files

1. `.agent/project/status.md` — Current state (read FIRST every session)
2. `.agent/start-here.md` — Protocol entry point
3. `.agent/project/context.md` — Project business context
4. `.agent/project/tech-stack.md` — Technology stack decisions
5. `.agent/project/deploy.md` — Deployment environments and infrastructure
6. `.agent/project/commands.md` — Common project commands
7. `.agent/core/core-rules.md` — Non-negotiable core principles

## MCP (cokodo-agent)

When the **cokodo-agent** MCP server is enabled, prefer MCP tools over manual file search:

- `session_gate` — check protocol drift and pending refresh before work
- `get_project_context` — load status, stack, and project rules
- `lint_protocol` — run protocol compliance checks

Setup: see `.agent/adapters/cline/README.md` and merge `mcp-snippet.json` into Cline MCP settings.

## Key Rules

- Encoding: UTF-8 (explicit declaration required)
- Paths: always use forward slash `/`
- Test data: must use `autotest_` prefix
- No external CDN links
- Check `.agent/project/known-issues.md` before starting work
- Check `.agent/project/deploy.md` for deployment info before infra-related tasks
- Update session state at checkpoints; product PRs use `journal.d` — see `project/AGENT-GIT-PR-WORKFLOW.md`
- `Recently Completed` in `status.md` is capped at **5 items**; drop a fragment to `project/journal.d/` and run `co journal-flush` to sync.
- **Agent Git/PR (three hard rules)** — see `project/AGENT-GIT-PR-WORKFLOW.md` and `project/sop/agent-git-pr-collaboration.md`:
  1. One PR per branch; delete the remote head after merge.
  2. Product PRs must not edit `status.md`; write `project/journal.d/` fragments; sync via `chore/agent-status-*` + `co journal-flush`.
  3. Before merge: integrate the latest default branch; PR must be mergeable; re-approve after new pushes if required.

- For UI/frontend tasks: read `.agent/core/workflows/ui-design-workflow.md` and project UI spec (`.agent/project/specs/*-ui*.md`) before implementing.
- For release/version governance tasks: read `.agent/core/workflows/version-governance-workflow.md`, `.agent/project/versioning.md`, `.agent/project/version-state.toml`, and `.agent/project/sop/release.md` before making release/version changes.
- Git commit on Windows/PowerShell: use `-F .git/COMMIT_MSG_TMP` (heredoc `<<'EOF'` not supported); see `.agent/core/conventions.md` §3.4
