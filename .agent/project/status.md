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
- [ ] Optional: declare local collaborations (axgate / AuthNexus / wsync) in manifest

### Pending
- [ ] Client E2E: Check for Updates → install **0.3.5** → Reload → Feedback Mine empty state (no error banner)
- [ ] Deploy AuthNexus Feedback Hub MIME whitelist + 10 MB limit
- [ ] Fresh-install E2E: Auto-approve defaults + cokodo all-tools
- [ ] Optional: fix Cursor MCP current-project cwd (see known-issues)

### Recently Completed
- [x] **Branch governance**: 4 PRs merged to `main` (protocol / product / release / agent-status); tag `vscode/v0.3.5` pushed
- [x] Released Axline VSIX **0.3.5** (Feedback empty list UX)
- [x] Released Axline VSIX **0.3.4** (Feedback view/title entry)
- [x] Released Axline VSIX **0.3.3** (Feedback Navbar chrome fix)
- [x] Released Axline VSIX **0.3.1** (Feedback attachments + required context)

## Blockers

None.

## Active change (SDD)

*(none — run `co change apply <name>` to set)*

## Session Context

- **Git trunk synced** (2026-07-22): PRs [#1](https://github.com/dinwind/xline/pull/1)–[#4](https://github.com/dinwind/xline/pull/4) merged; annotated tag **`vscode/v0.3.5`** on `main`.
- AuthNexus production HTTPS **3443 → 443**; default `https://auth.mtsilicon.com`.
- Do not commit `apps/vscode/endpoints.json`, `secrets.json`, or `tsc-trace.txt`.
- Next version work: `co start-next-version --track vscode --version 0.3.6 --apply` when opening a new product change.
- Journal: `project/journal.d/2026-07-21-authnexus-https-443.md`

## Version Cycle

| Item | Value |
|------|-------|
| Track | `vscode` |
| Current release | `0.3.5` |
| Working version | `0.3.5` |
| Status | `released` |
| Canonical | `apps/vscode/package.json` |
| Tag | `vscode/v0.3.5` |
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
