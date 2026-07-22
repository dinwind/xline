# SOP: Track-based Release Process

> Authoritative release SOP for Axline.
> AI agents MUST read this file before executing any release task.
>
> Trigger when the user asks to release, publish, bump version, create a tag, or cut a VSIX deliverable.

---

## Scope

This SOP applies to:

- `vscode` — Axline VS Code extension (`axline.axline`)

Critical rules:

- Every release action must explicitly declare **track = `vscode`**
- Track definitions live in `project/versioning.md`
- Track state lives in `project/version-state.toml`

---

## Required Inputs

Before doing anything, confirm:

- target `track` (`vscode`)
- `working_version` from `project/version-state.toml`
- `release_note` path from `project/version-state.toml`
- canonical source: `apps/vscode/package.json`
- rollback baseline tag

If unclear, stop and clarify before releasing.

---

## Track Summary

| Track | Canonical source | Main execution flow | Tag format |
|------|------------------|---------------------|-----------|
| `vscode` | `apps/vscode/package.json` | `bun run build:vscode` → VSIX; optional AuthNexus private publish | `vscode/vX.Y.Z` |

---

## Phase 1 — Freeze Scope

- confirm release scope for `vscode`
- stop adding unrelated non-blocker changes
- finalize included/excluded scope in the release note
- set track `status = "frozen"` in `version-state.toml` for a formal cut

---

## Phase 2 — Sync Version Sources

1. Update **only** `apps/vscode/package.json` `version`
2. Align `version-state.toml` `tracks.vscode.working_version` / `release_note` / `tag`
3. Run:
   - `node scripts/verify-versions.mjs`
   - `co lint --rule version-state`
4. Build:
   - `bun run build:vscode`
5. Optional private publish:
   - `bun apps/vscode/scripts/publish-private-vsix.mjs`

Never hand-edit the VSIX or AuthNexus metadata as the version source of truth.

---

## Phase 3 — Finalize Release Note

Update the note at the path in `version-state.toml` (`docs/operations/vscode-release-note-*.md`) with:

- release summary
- included / excluded scope
- validation checklist
- risks
- rollback tag
- artifact path (`apps/vscode/dist/axline.vsix`) and optional AuthNexus release id / sha256

---

## Phase 4 — Tag and Record

1. Create annotated tag `vscode/vX.Y.Z`
2. Set `status = "released"`, `current_release = working_version`
3. Set `rollback_tag` to the previous release tag
4. Update `project/status.md` **Version Cycle** and **Quick Reference**
5. Run `co release-docs check --track vscode` when docs gate is required

---

## Phase 5 — Open Next Working Version

When starting the next iteration:

- `co start-next-version --track vscode --version <next>` (or manually bump state + stub release note)
- keep `current_release` on the last stable until the next cut
- bump `apps/vscode/package.json` when the first runtime change lands

---

## Quick Commands

```powershell
node scripts/verify-versions.mjs
co lint --rule version-state
bun run build:vscode
bun run install:vscode
bun apps/vscode/scripts/publish-private-vsix.mjs
```

---

## Related Docs

- `project/versioning.md`
- `project/version-state.toml`
- `project/axline-vscode-publish.md`
- `project/sop/axline-private-update.md`
- `project/commands.md`
