# Versioning Policy

> Authoritative version governance for Axline product artifacts, release notes, tags, and rollback boundaries.

---

## Governance Principles

Axline uses **1 primary product track** (`vscode`) and applies the following rules:

1. The VS Code extension is the releasable product line for phase-1 VSIX distribution.
2. The track has **exactly one** canonical version source.
3. Human-readable policy and machine-readable state are separated:
   - policy: `.agent/project/versioning.md`
   - state: `.agent/project/version-state.toml`
4. Release tags must be **annotated**, **track-prefixed**, and **rollback-friendly**.
5. Release notes are **handoff contracts**, not marketing summaries.

---

## Version Tracks

| Track | Scope | Canonical source | Notes |
|------|-------|------------------|-------|
| `vscode` | Axline VS Code extension (`axline.axline`), VSIX, private AuthNexus updates | `apps/vscode/package.json` → `version` | SDK workspace packages (`@cline/*`) are build dependencies; do not invent a separate consumer-facing track until they are published independently. |

---

## Current State Source

The authoritative machine-readable state lives in:

- `.agent/project/version-state.toml`

This file must answer, per track:

- latest stable release (`current_release`)
- current working version (`working_version`)
- release status (`planning`, `developing`, `frozen`, `released`, `hotfix`)
- release note path
- release tag
- rollback baseline

If `versioning.md` and `version-state.toml` disagree, fix the state file first.

Important:

- opening the next development version does **not** require immediately bumping the canonical source **as long as no runtime-affecting code has been added on top of `current_release`**
- **as soon as the first code change that affects runtime behavior** lands, bump `apps/vscode/package.json` to `working_version` in the same change
- during `developing` / `frozen` the canonical source is expected to equal `working_version`
- pure documentation / protocol scaffolding does not by itself require an early bump

---

## Drift Guard (`package.json` ↔ `version-state.toml`)

**Invariant:**

> for the enabled `vscode` track, `apps/vscode/package.json.version == version-state.toml.tracks.vscode.working_version` once runtime work for that working version has started

| Layer | Asset | Behavior |
|-------|-------|----------|
| Local check | `scripts/verify-versions.mjs` | exit 1 on drift |
| Protocol lint | `co lint --rule version-state` | schema + canonical consistency |
| AI agent | This policy + `status.md` Version Cycle | read before release / bump work |

Operator checklist:

- before the first runtime commit on a new working version, bump `apps/vscode/package.json` and `version-state.toml` together
- before commit / VSIX cut, run `node scripts/verify-versions.mjs` and `co lint --rule version-state`
- never hand-edit only one of package.json / version-state working_version

---

## SemVer Policy

Product track uses **SemVer**:

- `MAJOR`: backward-incompatible extension behavior or install contract change
- `MINOR`: backward-compatible feature expansion (new settings, private-update, account features)
- `PATCH`: bug fix or packaging-only fix

---

## Derived Files

### `vscode`

Canonical: `apps/vscode/package.json`

Derived / produced by build (not hand-edited as version source):

- `apps/vscode/dist/axline.vsix`
- AuthNexus release metadata (when publishing private update)

---

## Tagging Policy

- Use annotated tags
- Format: `vscode/vX.Y.Z`
- Never delete and recreate a released tag

---

## Rollback Policy

- **Artifact rollback**: install the previous VSIX / AuthNexus release referenced by `rollback_tag`
- **Git rollback**: use `rollback_tag` as the recovery baseline, then publish a new hotfix version
- Never reuse the same released version number after content changes

---

## Release Execution

| Step | Command / asset |
|------|-----------------|
| Verify versions | `node scripts/verify-versions.mjs` |
| Lint version state | `co lint --rule version-state` |
| Build VSIX | `bun run build:vscode` |
| Private publish helper | `bun apps/vscode/scripts/publish-private-vsix.mjs` |
| Install locally | `bun run install:vscode` |
| SOP | `.agent/project/sop/release.md` |

Formal release MUST NOT be cut until `co release-docs check --track vscode` passes (or `--allow-draft` only for WIP notes).

---

## Workflow Summary

Each track normally moves:

1. `planning`
2. `developing`
3. `frozen`
4. `released`
5. `hotfix` (when needed)

Helper commands (when using cokodo CLI):

- `co start-next-version --track vscode --version <x.y.z>`
- `co prepare-release --track vscode`
- `co cut-release --track vscode`

These update governance state; they do not replace `build:vscode` / AuthNexus upload.

---

## Operator Checklist

When releasing the `vscode` track:

1. Confirm track and working version from `version-state.toml`
2. Update canonical `apps/vscode/package.json` only
3. Finalize `docs/operations/vscode-release-note-<ver>.md`
4. Run `node scripts/verify-versions.mjs` and `co lint --rule version-state`
5. Run `bun run build:vscode`
6. Publish / install VSIX as required
7. Create annotated tag `vscode/vX.Y.Z`
8. Refresh `project/status.md` Version Cycle + Quick Reference
