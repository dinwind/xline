# SOP: Git Workflow

> Standard git operations for this project.
>
> **Trigger**: When performing commits, branches, merges, or any git operations.

---

## Commit Convention

Format: `type(scope): description`

| Type | When |
|------|------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `chore` | Maintenance, dependency updates, version bumps |
| `docs` | Documentation only |
| `refactor` | Code restructuring without behavior change |
| `test` | Test additions or fixes |
| `ci` | CI/CD workflow changes |

Update `scope` values to match your project's components.

---

## Branch Strategy

Simple trunk-based strategy:

- `main` is always releasable
- Work directly on `main` for small changes
- Use short-lived feature branches for larger changes: `feat/description`
- Never force-push to `main`

---

## Before Committing

1. Run lint / tests — ensure they pass
2. **Product PRs:** write completion to `project/journal.d/` (new fragment file); do **not** edit `status.md`. Batch status via `chore/agent-status-*` + `co journal-flush`. See [AGENT-GIT-PR-WORKFLOW.md](../AGENT-GIT-PR-WORKFLOW.md) and [agent-git-pr-collaboration.md](agent-git-pr-collaboration.md).
3. Stage only what belongs to this change — avoid `git add .` blindly

---

## Commit Message via File (Windows PowerShell)

PowerShell does not support bash heredoc syntax. Use a temp file:

```powershell
Set-Content "_msg.txt" "type(scope): brief title

- detail line 1
- detail line 2
"
git commit -F _msg.txt
Remove-Item _msg.txt
```

**Do NOT** use `git commit -m "$(cat <<'EOF'...EOF)"` — this fails in PowerShell.

---

## Release Tagging

See `project/sop/release.md` for the full release process.

Critical rules:
- Use a consistent tag format (e.g. `vX.Y.Z`)
- Always push branch before tag
- Always use explicit SHA for tag target
- Never delete and re-push same tag

---

## Useful Commands

```bash
# View recent history
git log --oneline -10

# Check what will be committed
git diff --staged

# Undo last commit (keep changes staged)
git reset --soft HEAD~1

# Check remote state
git remote -v
git fetch --dry-run

# List tags
git tag -l "v*" --sort=-version:refname | head -10
```

---

*Customize this SOP with project-specific scopes, branch naming conventions, and remote details.*
