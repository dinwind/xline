# Project Status

> Last updated: 2026-07-22 | Updated by: agent (branch/doc governance)

---

## Current Phase

**Axline 0.3.5 released** — Feedback empty list UX (no false “Feedback not found” on Mine/Public). AuthNexus STABLE PUBLISHED.

## Active Goals

| # | Goal | Priority | Status |
|---|------|----------|--------|
| 1 | Complete cokodo `.agent` protocol (manifest, core, skills, filled project files) | High | **Done** |
| 2 | Axline private update (AuthNexus VSIX) stable for internal users | High | Spec + SOP + skill; validate on target env |
| 3 | AxGate account / device identity integration | High | Spec + review exist; continue implementation |
| 4 | Keep VS Code publish path green (`build:sdk` → `package` → private publish) | High | SOP + `vscode-typescript-build` skill |

## Task Board

### In Progress
- [ ] **Branch governance**: split ~404 uncommitted files into PR tracks (see Session Context)
- [ ] Optional: declare local collaborations (axgate / AuthNexus / wsync) in manifest

### Pending
- [ ] Client E2E: Check for Updates → install **0.3.5** → Reload → Feedback Mine empty state (no error banner)
- [ ] Deploy AuthNexus Feedback Hub MIME whitelist + 10 MB limit
- [ ] Fresh-install E2E: Auto-approve defaults + cokodo all-tools
- [ ] Optional: fix Cursor MCP current-project cwd (see known-issues)

### Recently Completed
- [x] Released Axline VSIX **0.3.5** (Feedback empty list UX)
- [x] Released Axline VSIX **0.3.4** (Feedback view/title entry)
- [x] Released Axline VSIX **0.3.3** (Feedback Navbar chrome fix)
- [x] Released Axline VSIX **0.3.1** (Feedback attachments + required context)
- [x] Released Axline VSIX **0.3.0** (Feedback Hub client + HTTPS cutover)

## Blockers

None.

## Active change (SDD)

*(none — run `co change apply <name>` to set)*

## Session Context

### Git / PR state (2026-07-22)

| Item | State |
|------|-------|
| Branch | `main` (only branch); **ahead of `origin/main` by 3 commits** (unpushed) |
| Working tree | **179 modified + 225 untracked** (~404 files); no open PRs |
| Version lint | `verify-versions.mjs` OK · `co lint --rule version-state` OK |
| Protocol | `co upgrade -y` done; pending refresh **cleared** |

**Recommended PR merge order** (one PR per branch; delete remote head after merge):

1. `chore/agent-protocol-bootstrap` — `.agent/core`, `manifest.json`, adapters, `AGENTS.md`, `.cursor/`, `.clinerules/` protocol files (~63 + adapter outputs)
2. `feat/feedback-private-update-0.3.x` — `apps/`, `sdk/`, product scripts/tests (**no** `status.md` / `version-state.toml`) (~244)
3. `chore/release-vscode-0.3.5` — `version-state.toml`, `docs/operations/vscode-release-note-0.3.*.md`, annotated tag `vscode/v0.3.5`
4. `chore/agent-status-2026-07` — `status.md`, `journal.d/`, `events/`, indexes, living specs/SOPs under `.agent/project/` (~57)
5. `fix/authnexus-https-443` — after (2)+(3) on trunk; run `co start-next-version --track vscode --version 0.3.6 --apply` then bump `package.json` in same PR

**Do not** bundle product + `status.md` + `version-state.toml` in one PR (SOP §3).

### Product / infra notes

- AuthNexus production HTTPS moved **3443 → 443**; Axline default/migrate to `https://auth.mtsilicon.com`.
- Released **0.3.5** on AuthNexus STABLE; git trunk still lacks 0.3.x product commits — land PR (2)+(3) before next VSIX cut.
- Do not commit `apps/vscode/endpoints.json`, `secrets.json`, or `tsc-trace.txt`.
- Journal: `project/journal.d/2026-07-21-authnexus-https-443.md`

## Version Cycle

| Item | Value |
|------|-------|
| Track | `vscode` |
| Current release | `0.3.5` |
| Working version | `0.3.5` |
| Status | `released` |
| Canonical | `apps/vscode/package.json` |
| Tag (next) | `vscode/v0.3.5` |
| Rollback | `vscode/v0.3.4` |
| State file | `.agent/project/version-state.toml` |

## Roadmap Overview

| Phase | Focus | Status |
|------|-------|--------|
| 1 | Private VSIX + AuthNexus update | Active |
| 2 | AxGate account replaces Cline Account | In progress |
| 3 | Protocol / agent ergonomics (cokodo + skills) | **Done (bootstrap)** |
| 4 | Broader distribution / marketplace | Later |

## Quick Reference

| Item | Value |
|------|-------|
| Protocol | 3.3.0 |
| CLI (cokodo-agent) | 1.12.3 |
| Extension ID | `axline.axline` |
| Product version (working) | 0.3.5 |
| Repo | https://github.com/dinwind/xline |
| Related | AxGate, AuthNexus, wsync (local cokodo registry) |

---

*This file is the primary entry point for AI session continuity.*
*Update after each significant session: refresh tasks, goals, blockers, and session context.*
