# GitHub Copilot Instructions Template

> Place as `AGENTS.md` at project root.

---

**Authority**: For this project, rules under `$AGENT_DIR/` and this file are the single source of truth; user/global IDE rules are for editor behavior only. If they conflict, follow this repository's `.agent` protocol.

## Current Status

Read `$AGENT_DIR/project/status.md` for current development state before starting work.

## Protocol

This project uses AI Agent Collaboration Protocol.
Read `$AGENT_DIR/start-here.md` to establish the full collaboration context.

## Essential Files

- `$AGENT_DIR/project/status.md` — Current state (read FIRST every session)
- `$AGENT_DIR/start-here.md` — Protocol entry point
- `$AGENT_DIR/project/context.md` — Project business context
- `$AGENT_DIR/project/tech-stack.md` — Technology stack decisions
- `$AGENT_DIR/project/deploy.md` — Deployment environments and infrastructure
- `$AGENT_DIR/project/commands.md` — Common project commands
- `$AGENT_DIR/core/core-rules.md` — Non-negotiable core principles

## Key Rules

- Encoding: UTF-8 (explicit declaration required)
- Paths: always use forward slash `/`
- Test data: must use `autotest_` prefix
- No external CDN links
- Update `$AGENT_DIR/project/status.md` at checkpoints (after tasks, before commits, on blockers)

## Before Coding

1. Read `$AGENT_DIR/project/status.md` for current state
2. Read `$AGENT_DIR/project/context.md` for business context
3. Check `$AGENT_DIR/project/tech-stack.md` for tech decisions
4. Check `$AGENT_DIR/project/deploy.md` for deployment environments
5. Check `$AGENT_DIR/project/known-issues.md` for known pitfalls

---

## Skills

| Skill | Purpose |
|-------|---------|
| `$AGENT_DIR/skills/guardian/SKILL.md` | Code quality check |
| `$AGENT_DIR/skills/ai-integration/` | AI integration dev |
| `$AGENT_DIR/skills/agent-governance/SKILL.md` | Protocol maintenance |

---

*Adapt $AGENT_DIR to your actual directory name*
