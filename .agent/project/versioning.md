# Versioning Policy

> Authoritative version-governance policy for this project. Keep this file human-readable; machine-readable state belongs in `project/version-state.toml`.

---

## Governance Principles

Document the project's version-governance rules here.

Recommended principles:

1. Each releasable product line has an explicit **track**.
2. Each track has exactly one **canonical version source**.
3. Human-readable policy and machine-readable state are separated:
   - policy: `project/versioning.md`
   - state: `project/version-state.toml`
4. Release notes are **handoff contracts**, not just marketing summaries.
5. Tags and rollback baselines follow one documented rule per track.

---

## Version Tracks

List every track that can be released independently.

| Track | Scope | Canonical source | Notes |
|------|-------|------------------|-------|
| `primary` | `[Describe the main artifact or product line]` | `[path/to/version-source]` | `[Optional notes]` |

If your project has multiple product lines in one repository, add one row per track.

---

## Current State Source

The machine-readable state should live in:

- `project/version-state.toml`

This file should answer, per track:

- latest stable release
- current working version
- release status
- release-note path
- release tag
- rollback baseline
- compatibility notes if applicable

If this project does not use machine-readable version state yet, describe that explicitly here and add it before automating releases.

---

## SemVer / Version Policy

Describe how version numbers are interpreted.

Recommended structure:

- `MAJOR`: `[breaking-change rule]`
- `MINOR`: `[feature-expansion rule]`
- `PATCH`: `[bugfix or packaging-fix rule]`

If protocol/API/schema versions are separate from product versions, document that separation here.

---

## Derived Files

For each track, list files that derive their version from the canonical source.

### `primary`

Derived from `[path/to/version-source]`:

- `[derived/file-1]`
- `[derived/file-2]`

Rules:

- Never treat derived files as the primary edit point.
- Synchronize derived files from the canonical source using project-local scripts where possible.

---

## Release Documentation Refresh

This project follows the generic Release Documentation Refresh workflow:

- engine rule: `core/workflows/release-doc-refresh-workflow.md`
- project SOP: `project/sop/release-doc-refresh.md`
- CLI gate: `co release-docs check [--track <name>] [--allow-draft]`
- agent entry point: `co release-docs refresh --mode audit|apply`

A formal release MUST NOT be cut until `co release-docs check` passes for the target track without `--allow-draft`. Project-specific doc indexes and generated assets are declared per track in `project/version-state.toml` under `[tracks.<name>.release_docs]` (`index_files`, `manifest_files`, `manifest_pattern_template`, optional `allowed_versions` / `version_regex`).

---

## Release Notes Policy

Document what every release note must contain.

Recommended fields:

- version
- previous stable version
- release tag
- rollback tag
- compatibility notes
- included scope
- excluded/deferred scope
- validation checklist
- risks
- traceability (`canonical source`, scripts, tag)

If multiple tracks exist, keep release notes track-specific.

---

## Tagging Policy

Document the project's release-tag format.

Recommended rules:

- use annotated tags
- keep the format unambiguous per track
- multi-track monorepos should prefer track-prefixed tags such as `client/vX.Y.Z`
- never delete and recreate the same released tag

Write your project's concrete formats here:

- primary track tag: `[example: vX.Y.Z or primary/vX.Y.Z]`
- secondary track tag (if any): `[example]`

---

## Rollback Policy

Document rollback rules for this project.

Recommended split:

- **Artifact rollback**: revert to a previous released artifact/deployment
- **Git rollback**: use the previous stable tag as the recovery baseline, then publish a new hotfix version

Important rule:

- Never reuse the same released version number after content changes.

---

## Drift Guard (canonical source ↔ version-state.toml)

> Mandatory once any runtime change has been committed for `working_version`.
> Backed by `core/workflows/version-governance-workflow.md` §4 "Drift guard".

### Invariants

1. During `developing` / `frozen`: `<canonical-source>.version == version-state.toml::tracks.<track>.working_version`.
2. The first runtime commit for a new `working_version` MUST bump the canonical source in the same commit (or via the project bump script). Do not accumulate runtime changes against an outdated canonical version.
3. `status = "released"` is the only state where `working_version == current_release == canonical` is allowed; entering the next iteration restores invariant 1 immediately.
4. Derived files (e.g. mirrored `__version__`, packaging manifests, bundled copies) are written only by the bump/sync script — never by hand without the canonical change.

### Required tooling (project layer)

| Tool | Role |
|------|------|
| `[scripts/verify-versions.*]` | Local validator: reads canonical source + `version-state.toml`, asserts invariants 1–2; non-zero exit on drift. |
| `[scripts/bump-version.*]` | The only sanctioned writer for canonical + state + release-note draft (atomic). |
| **CI gate `QG-0: version-drift`** | First job in release/CI pipeline; runs the validator; failure blocks build/publish. |
| `co lint --rule version-state` | Protocol-layer schema/consistency check (complementary to drift guard). |
| `project/known-issues.md` drift entry | Records why this guard exists and the remediation playbook. |

If any of the four project-layer assets above is missing, do not land the first non-doc runtime change for the new `working_version`; add the drift guard first.

### Operator checklist

- [ ] Runtime change in this commit? → ran the bump script; canonical source, `version-state.toml`, and release-note draft all changed together.
- [ ] Local validator passes (`exit 0`).
- [ ] `co lint --rule version-state` passes.
- [ ] CI `QG-0: version-drift` is green.
- [ ] No `--no-verify` / `--skip-checks` bypass was used.
- [ ] If drift was detected and corrected, an entry was added or updated in `project/known-issues.md`.

This checklist is intentionally IDE-agnostic: AI agents reach it via `start-here.md → AGENTS.md → versioning.md` regardless of editor or chat-memory state.

---

## Release Ownership

List the project-local scripts or commands that own release execution.

Example structure:

- track: `primary`
  - version sync: `[script or command]`
  - build/package: `[script or command]`
  - deploy/publish: `[script or command]`

The generic protocol layer should orchestrate these scripts, not replace them.

---

## Workflow Summary

Each track should normally move through these states:

1. `planning`
2. `developing`
3. `frozen`
4. `released`
5. `hotfix` (when needed)

Detailed release execution steps live in:

- `project/sop/release.md`

If the protocol provides helper commands, use them for explicit state transitions. For example:

- `co start-next-version --track <name> --version <x.y.z>`
- `co prepare-release --track <name>`
- `co cut-release --track <name>`

---

## Automation Integration

Recommended automation split:

1. **Iteration open**
   - run `co start-next-version --track <name> --version <x.y.z> --apply`
   - then open or update the release-note draft for that track
2. **Pre-release freeze**
   - run project-local test/build checks
   - run `co prepare-release --track <name> --apply`
3. **Release cut**
   - update the canonical version source
   - run project-local derived sync, packaging, deployment, and tag creation
   - run `co cut-release --track <name> --apply`

Recommended CI/CD usage:

- PR / branch gate: run `co lint --rule version-state`
- release candidate gate: run project-local version sync/build validation before `co prepare-release`
- release job: finish project-local release flow first, then run `co cut-release`

Keep the project-specific shell commands in:

- `project/commands.md`
- `project/deploy.md`

The helper commands record governance state. They should not replace the project's own sync/build/deploy scripts.

---

## Operator Checklist

When releasing a track:

1. Confirm the track and working version from `project/version-state.toml`
2. Update the canonical version source only
3. Sync derived files
4. Finalize the release note
5. Run the track-specific build/package/deploy flow
6. Create the release tag
7. Record the rollback baseline
8. Refresh `project/status.md`

---

*Template seeded by `co init` / `co scaffold`; safe to customize for your team.*
