# Project Conventions

> Axline-specific conventions that sit on top of `.agent/core/conventions.md`.

## Language / repo

- Prefer TypeScript; Bun for scripts and package management.
- PowerShell: chain with `;`, not `&&`.
- Do not commit `apps/vscode/endpoints.json` or AuthNexus enrollment secrets.

## Agent instructions

- Session truth: `.agent/project/status.md`
- Product SOPs: `.agent/project/sop/`
- Project skills: `.agent/skills/_project/`
- Cross-tool / upstream skills: `.agents/skills/`

## Code boundaries

- Webview must not import `@cline/core` (see `check-webview-boundary`).
- SDK (`@cline/core`) builds without DOM — avoid `HeadersInit` in SDK APIs.

## Git / PR

Follow `AGENT-GIT-PR-WORKFLOW.md` and `sop/agent-git-pr-collaboration.md`.

---

*Last updated: 2026-07-14*
