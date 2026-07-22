# Cokodo plan mirror workflow

Use this when a plan started in Cursor Plan Mode or under `.cursor/plans/`.

## Canonical locations
- `.agent/project/plan/` is the canonical plan store.
- `.cursor/plans/` is an optional IDE-local draft or review artifact.
- `.agent/project/changes/<name>/tasks.md` remains the active execution checklist when SDD is in use.

## When to mirror
1. Keep the Cursor-native plan local only if it is exploratory or private.
2. If the plan is approved, long-lived, or needed by other agents, mirror it into `.agent/project/plan/<kebab-name>.md`.
3. Update `.agent/project/plan/plan-index.md` with the file, summary, and status.
4. If an SDD change is active, keep implementation progress in `project/changes/<name>/tasks.md` rather than inside the plan file.

## Notes
- In this repo, `.cursor/plans/` is git-ignored to avoid duplicate plan sources.
- The mirrored `.agent/project/plan/` file is the versionable record that MCP and other IDE adapters can discover.
