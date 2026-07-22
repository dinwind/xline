---
name: vscode-typescript-build
description: >
  Diagnose and prevent Axline VS Code / SDK / webview TypeScript and packaging
  failures. Use when tsc, Vite, package, or publish-private-vsix fails, or before
  cutting a VSIX after SDK or webview changes.
---

# Axline VS Code TypeScript Build

## Critical Rules

1. Axline has **≥4 independent compile chains**. Passing unit tests or F5 does **not** prove publishability.
2. `@cline/core` is built **without DOM**. Do not use `HeadersInit` in SDK public APIs.
3. Webview must **never** import `@cline/core` (direct or transitive). Run `check-webview-boundary`.
4. Prefer `?? undefined` when passing parsed `null` into optional `T | undefined` parameters under `strict`.
5. Authoritative pitfalls SOP: `.agent/project/sop/vscode-typescript-build-pitfalls.md`

## Decision Tree

```
Where did it fail?
+-- sdk build / @cline/core tsc
|   +-- Fix SDK types (no DOM); bun run build:sdk
+-- apps/vscode check-types (extension host)
|   +-- Host has DOM; avoid copying DOM-only types into SDK
+-- webview tsc / Vite
|   +-- Fix UI imports; check-webview-boundary
+-- publish-private-vsix / package
|   +-- Run full chain from clean tree; then private-update skill
```

## Required commands

```powershell
cd c:\ai_work\axline
bun run build:sdk

cd apps\vscode
bun run check-types
bun run check-webview-boundary
bun run package
```

Root one-shot VSIX path:

```powershell
bun run build:vscode
```

Skip SDK only when you are sure SDK `dist/` is current:

```powershell
bun scripts/axline-vscode-build.mjs --skip-sdk
```

## Common fixes (summary)

| Failure | Fix pattern |
|---------|-------------|
| `null` vs optional `undefined` | `value ?? undefined` |
| `HeadersInit` in SDK | `ConstructorParameters<typeof Headers>[0]` |
| `Headers.entries()` on host | `headers.forEach(...)` |
| Webview pulls `@cline/core` | Move shared types to `@cline/shared` or extension-only modules |

## Pre-publish checklist

- [ ] `node scripts/verify-versions.mjs`
- [ ] `bun run build:sdk`
- [ ] `apps/vscode`: `check-types` + `check-webview-boundary` + `package`
- [ ] VSIX exists under `apps/vscode/dist/axline.vsix`

## References

- `.agent/project/sop/vscode-typescript-build-pitfalls.md`
- `.agent/project/commands.md`
- Skill: `axline-private-update` (after green build)
