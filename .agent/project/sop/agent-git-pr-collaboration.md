# SOP: AI Agent — Git / PR / Session-State Collaboration

> **Audience**: AI agents and maintainers using Cokodo Agent Protocol with trunk-based Git and hosted PRs (Gitea, GitHub, GitLab, etc.).
>
> **Purpose**: Unify branch lifecycle, PR scope, merge gates, and `.agent/project` write rules to avoid merge conflicts, re-approve loops, and parallel edits to `status.md`.
>
> **Authority**: For Git/PR operations, this SOP wins over generic reminders in adapters when they conflict. Protocol-wide rules remain in `core/`. See [AGENT-GIT-PR-WORKFLOW.md](../AGENT-GIT-PR-WORKFLOW.md) for the entry pointer.

---

## Customization (replace before use)

| Placeholder | Example | Description |
|-------------|---------|-------------|
| `{{TRUNK}}` | `main` | Default integration branch (PR base) |
| `{{REMOTE}}` | `origin` | Remote name for fetch/push |
| `{{GITEA_HOST}}` | *(optional)* | Host for PR UI links |
| `{{PRODUCT_GLOBS}}` | `src/`, `tests/`, `docs/` | Paths allowed in product PRs |
| `{{RELEASE_GLOBS}}` | `version-state.toml`, `docs/operations/primary-release-note-*` | Release-track paths |
| `{{TEST_PRE_PR}}` | `pytest` / `cargo test` | Pre-PR test command |
| `{{PR_CREATE_SCRIPT}}` | `scripts/push-and-pr.ps1` | Optional PR creation script |
| `{{MERGE_BOT_NOTE}}` | *(optional)* | Merge automation / branch protection notes |

---

## 1. Core principles (MUST)

| ID | Rule |
|----|------|
| P1 | **One open PR per remote head branch**; after merge, **delete the remote head branch** |
| P2 | **Product PRs MUST NOT** modify `project/status.md` or `project/version-state.toml` unless that PR's sole purpose is agent-status or release |
| P3 | Completed work **MUST** be recorded as **new** files under `project/journal.d/` (one file per task/session); **MUST NOT** edit existing fragment files |
| P4 | `Recently Completed` in `status.md` **MUST** be maintained via `co journal-flush` (default cap: 5) |
| P5 | **Before merge**: integrate latest `{{REMOTE}}/{{TRUNK}}` into the head branch; resolve conflicts; ensure mergeable |
| P6 | **MUST NOT** use `merge=union` on `status.md` |
| P7 | Shared docs (`status.md`, `known-issues.md`, `deploy.md`): prefer append-only edits; no cosmetic rewrites in product PRs |

---

## 2. Branch lifecycle

| Concept | Meaning |
|---------|---------|
| **Commit** | Immutable snapshot on a branch |
| **Branch** | Movable pointer (e.g. `fix/login-timeout`) |
| `{{REMOTE}}/{{TRUNK}}` | PR **base** — integration truth |
| **PR head** | Tip of the remote feature branch; new pushes update head and may require **re-approve** |

**Recommended lifecycle:**

```text
git fetch {{REMOTE}}
git checkout {{TRUNK}} && git pull {{REMOTE}} {{TRUNK}}
git checkout -b fix/<topic>          # new name — do not reuse merged branch names
# ... develop, test ...
git push -u {{REMOTE}} fix/<topic>
# open PR: head=fix/<topic>, base={{TRUNK}}
# after merge: delete {{REMOTE}}/fix/<topic>
```

**Anti-patterns:**

- Opening PR #2, #3 on a branch that already merged to `{{TRUNK}}`
- Bundling product code + `status.md` + bulk `.agent/core` upgrades in one PR

---

## 3. PR tracks — path scope

### 3.1 Product PR (`feat/`, `fix/`)

| Allowed | Denied (default) |
|---------|------------------|
| `{{PRODUCT_GLOBS}}` | `project/status.md` |
| Product tests and product docs | `project/version-state.toml` (release track) |
| | `.agent/core/` bulk protocol upgrades |

**Pre-PR:** run `{{TEST_PRE_PR}}`. Stage by path — avoid blind `git add -A` that pulls in `.agent` or temp files.

### 3.2 Release PR (`chore/release-*`)

| Allowed |
|---------|
| `{{RELEASE_GLOBS}}`, release SOP artifacts, version tags per [release.md](release.md) |

At most **one** open release PR per repository.

### 3.3 Agent status PR (`chore/agent-status-*`)

| Allowed |
|---------|
| `project/status.md` (after `co journal-flush`) |
| Cleanup of merged `project/journal.d/*.md` |
| `project/events/*.md` + one line in `events-index.md` |

At most **one** open agent-status PR. May run in parallel with product PRs if **only one** PR touches `status.md`.

### 3.4 Protocol upgrade PR (`chore/agent-protocol-*`)

| Allowed |
|---------|
| `.agent/core/`, `.agent/manifest.json`, adapter outputs (`AGENTS.md`, etc.) |

Low frequency; separate review from product features.

---

## 4. Session state — what goes where

| Information | Location |
|-------------|----------|
| Merged code facts | **Git** (`{{TRUNK}}`, tags) |
| Task completion summary | **`project/journal.d/<YYYYMMDD-HHMMSS>-<slug>.md`** (new file only) |
| SDD checkboxes | **`project/changes/<name>/tasks.md`** |
| Cross-project notice | **`project/events/<date>-<topic>.md`** + `events-index.md` |
| Blockers, WIP branches, phase one-liner | **`project/status.md`** (minimal; batch via agent-status PR) |
| Release facts | **`project/version-state.toml`** |

### 4.1 Journal fragment format

Path: `project/journal.d/YYYYMMDD-HHMMSS-<slug>.md`

```markdown
- [x] What was completed (one or two lines)
```

See `journal.d/README.md` — **add files only**; do not edit others' fragments.

### 4.2 Minimal `status.md` (recommended)

Product PRs **do not** edit status. When needed, use `chore/agent-status-*` after `co journal-flush`:

- **Keep:** Current Phase, Task Board (In Progress / Pending), Blockers, Session Context
- **Avoid:** Long `Recently Completed` lists — delegate to `journal.d` + flush

### 4.3 Session start read order (SHOULD)

1. `project/status.md`
2. Active SDD: `project/changes/<name>/tasks.md` if applicable
3. `project/events/events-index.md` if cross-project work
4. `git log {{REMOTE}}/{{TRUNK}} --oneline -5`

---

## 5. Standard workflows

### 5.1 Feature / fix (most common)

```text
1. fetch + checkout {{TRUNK}} + pull
2. git checkout -b fix/<kebab-topic>
3. implement + {{TEST_PRE_PR}}
4. write journal.d fragment for completed items
5. git add <product paths only>
6. git commit
7. git fetch && git rebase {{REMOTE}}/{{TRUNK}}   # or merge; resolve conflicts
8. git push -u {{REMOTE}} fix/<kebab-topic>
9. open PR ({{PR_CREATE_SCRIPT}} or host UI)
10. before merge: §6 gates
11. after merge: delete remote head; optional chore/agent-status for journal-flush
```

### 5.2 Multi-agent parallel work

| Order | Action |
|-------|--------|
| 1 | Each agent: **different branch**, **different journal.d file** |
| 2 | Merge **product** PRs first (no `status.md`) |
| 3 | Merge **one** `chore/agent-status-*` (flush + status) |
| 4 | Remaining branches: `git fetch` + rebase `{{REMOTE}}/{{TRUNK}}`, then push |

**Forbidden:** two open PRs both modifying `status.md` or `version-state.toml`.

### 5.3 Approved but not mergeable

```bash
git fetch {{REMOTE}}
git checkout <your-branch>
git rebase {{REMOTE}}/{{TRUNK}}    # or merge
# resolve, commit, push
# re-approve if required; merge when mergeable
```

For `status.md` / `version-state.toml` conflicts: take `{{TRUNK}}` as base, then apply the correct **track** content per §3 — never `merge=union` on status.

---

## 6. Merge gates (before Merge)

| Check | Method |
|-------|--------|
| Head contains latest trunk | `git fetch {{REMOTE}}` then `git merge-base --is-ancestor {{REMOTE}}/{{TRUNK}} HEAD` (exit 0) |
| No conflicts | Host shows mergeable; or local merge/rebase clean |
| Tests | `{{TEST_PRE_PR}}` (scope as needed) |
| Review | Approvals valid; **re-approve after new pushes** if required |
| PR scope | Matches §3; no stray temp/debug files |

```powershell
git fetch {{REMOTE}}
git merge-base --is-ancestor {{REMOTE}}/{{TRUNK}} HEAD
if ($LASTEXITCODE -ne 0) { Write-Error "Branch is behind {{TRUNK}}; integrate first." }
```

---

## 7. Host merge strategy (team convention)

| Recommendation | Notes |
|----------------|-------|
| Pick one strategy | Merge commit **or** squash — be consistent |
| After squash merge | **Delete head branch**; next PR uses a **new** branch name |
| Enable | "Delete branch after merge" on the host |

{{MERGE_BOT_NOTE}}

---

## 8. Cross-project events (optional)

When this repo's change affects another machine-local project:

1. Add `project/events/YYYY-MM-DD-<topic>.md`
2. Register one line in `project/events/events-index.md`
3. Do not rely on a long `status.md` narrative alone

---

## 9. Checklists

**Before opening a PR**

- [ ] New branch name (not a reused merged branch)
- [ ] Based on latest `{{REMOTE}}/{{TRUNK}}`
- [ ] Product PR excludes `status.md` / `version-state.toml` (unless track purpose)
- [ ] Completions in `journal.d`, not direct `Recently Completed` edits
- [ ] Tests pass

**Before merge**

- [ ] `{{REMOTE}}/{{TRUNK}}` is ancestor of HEAD
- [ ] PR mergeable; approvals current

**After merge**

- [ ] Remote head branch deleted
- [ ] If needed: `chore/agent-status-*` with `co journal-flush`
- [ ] Cross-project: events indexed

---

## 10. Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| Approved but cannot merge | Base moved or new push | Integrate trunk → push → re-approve |
| Large `.agent/project` conflicts | Parallel status PRs or branch reuse | §5.2; new branch per §2 |
| Only `status.md` conflicts | Multiple agents edited status | Keep trunk structure; merge journal content manually |
| Temptation to use `merge=union` | Parallel status edits | **Do not** — breaks structure (P6) |
| Local trunk behind | Infrequent fetch | Use `{{REMOTE}}/{{TRUNK}}` as truth during development |

---

## 11. Related files

| File | Role |
|------|------|
| [AGENT-GIT-PR-WORKFLOW.md](../AGENT-GIT-PR-WORKFLOW.md) | Entry + three hard rules |
| [git-workflow.md](git-workflow.md) | Commits, PowerShell `-F`, tagging |
| [release.md](release.md) | Release and tags |
| [code-review.md](code-review.md) | Review levels |
| [journal.d/README.md](../journal.d/README.md) | Fragment directory |
| [../../core/instructions.md](../../core/instructions.md) §7 | Checkpoints + journal model |

---

*Customize placeholders for your remote, trunk, globs, and test commands. Copy structure across sister repos; keep PR tracks and journal.d workflow consistent.*
