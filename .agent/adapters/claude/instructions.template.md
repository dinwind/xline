# Claude Instructions Template

> For Claude Code integration. Place as `CLAUDE.md` at project root.

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
- Check `$AGENT_DIR/project/known-issues.md` before starting work
- Check `$AGENT_DIR/project/deploy.md` for deployment info before infra-related tasks
- Update `$AGENT_DIR/project/status.md` at checkpoints (after tasks, before commits, on blockers)

---

## Claude Code Skills Compatibility

| Feature | This Protocol | Claude Code |
|---------|---------------|-------------|
| Directory | `$AGENT_DIR/skills/` | `.claude/skills/` |
| Entry file | `SKILL.md` | `SKILL.md` |
| Frontmatter | YAML supported | YAML supported |

### Setup: Symlink (Recommended)

```bash
ln -s $AGENT_DIR/skills .claude/skills
```

---

*Adapt $AGENT_DIR to your actual directory name*
