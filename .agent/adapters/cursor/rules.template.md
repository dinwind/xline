# Cursor Rules Template

> Copy this content to `.cursor/rules/agent-protocol.mdc` in your project root.

---

**Authority**: For this project, rules under `$AGENT_DIR/` and this file are the single source of truth; user/global Cursor rules are for editor behavior only. If they conflict, follow this repository's `.agent` protocol.

---

## Current Status

Read `$AGENT_DIR/project/status.md` for current development state before starting work.

## Protocol Reference

**Main protocol entry**: `$AGENT_DIR/start-here.md`

### Essential Files
1. `$AGENT_DIR/project/status.md` — Current state (read FIRST every session)
2. `$AGENT_DIR/start-here.md` — Protocol entry point
3. `$AGENT_DIR/project/context.md` — Project business context
4. `$AGENT_DIR/project/tech-stack.md` — Technology stack decisions
5. `$AGENT_DIR/project/deploy.md` — Deployment environments and infrastructure
6. `$AGENT_DIR/project/commands.md` — Common project commands
7. `$AGENT_DIR/core/core-rules.md` — Non-negotiable core principles

---

## Key Rules

- **Encoding**: Always `encoding='utf-8'`
- **Paths**: Use forward slashes `/`
- **Test data**: Must use `autotest_` prefix
- No external CDN links
- Check `$AGENT_DIR/project/known-issues.md` before starting work
- Check `$AGENT_DIR/project/deploy.md` for deployment info before infra-related tasks
- Update `$AGENT_DIR/project/status.md` at checkpoints (after tasks, before commits, on blockers)

---

## Skills Reference

| Skill | Path |
|-------|------|
| Code quality | `$AGENT_DIR/skills/guardian/` |
| AI integration | `$AGENT_DIR/skills/ai-integration/` |
| Protocol maintenance | `$AGENT_DIR/skills/agent-governance/` |
| Project-specific | `$AGENT_DIR/skills/_project/<name>/` |

### Skills roots

- `.agent/skills/` — protocol / portable skills (cokodo)
- `.agent/skills/_project/` — project-only skills (do not place custom skills at skills root)
- `.agents/skills/` — optional Agents Skills layout used by some hosts

See `$AGENT_DIR/skills/skill-interface.md` §2.1 for host scan paths.

### MCP (Cursor)

`.cursor/mcp.json` must pass the workspace root explicitly so parameterless
`session_gate` / `get_project_context` work when the MCP process cwd ≠ project:

```json
{
  "mcpServers": {
    "cokodo": {
      "command": "co",
      "args": ["serve", "--shared-launcher", "${workspaceFolder}"],
      "env": { "COKODO_PROJECT_ROOT": "${workspaceFolder}" }
    }
  }
}
```

Regenerate with `co adapt cursor`. Relies on Cursor config interpolation
(https://cursor.com/docs/mcp).

---

*Adapt $AGENT_DIR to your actual directory name*
