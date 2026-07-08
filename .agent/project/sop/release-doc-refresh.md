# SOP: Release Documentation Refresh

> Authoritative workflow for refreshing public release/help documentation **before** any formal release. This SOP is intentionally IDE-neutral. Cokodo agents, the `co release-docs` CLI, MCP tools, Cursor commands, and human operators must treat this file as the source of truth.
>
> **Engine rule**: `core/workflows/release-doc-refresh-workflow.md`.
> **Trigger**: Whenever a release is about to be cut, a working version moves toward `released`, or new user-visible behavior has landed since the last note.

---

## Scope

Use this workflow for any track declared in `project/version-state.toml` whose release is being prepared. Replace `<track>` below with the actual track name (the bundled template uses `primary` as the default).

The workflow covers **public documentation only**:

- per-track release note: `docs/operations/<track>-release-note-<version>.md`
- public help / guide / API reference under `docs/`
- index pages that list current releases (e.g. `docs/operations/README.md`, `docs/help/README.md`)
- generated assets (manifests, sidebar configs, etc.) listed under `[tracks.<track>.release_docs] manifest_files` in `version-state.toml`

Internal design notes, research reports, and SDD task files may be **inputs** but never substitutes.

---

## Agent Entry Point

Canonical Cokodo-agent prompt (do not paraphrase when wrapping):

```text
Run Release Documentation Refresh.

Inputs:
- track: <track-name> | all
- version: <x.y.z> or read from .agent/project/version-state.toml
- mode: audit | apply

Follow .agent/project/sop/release-doc-refresh.md and
.agent/core/workflows/release-doc-refresh-workflow.md.
Use .agent/project/status.md, version-state.toml, the active change tasks (if any),
release notes, and git diff to determine what the public docs must say before release.
Do not rely on IDE-specific commands.
```

CLI shorthand:

```bash
co release-docs refresh --track <track> --mode audit
co release-docs refresh --track <track> --mode apply
co release-docs check    --track <track> [--allow-draft]
```

IDE-specific commands (Cursor slash commands, VS Code tasks, CI jobs) MAY wrap the prompt above, but MUST NOT become the authoritative workflow.

---

## Required Inputs

Before editing documentation, read:

1. `.agent/project/status.md`
2. `.agent/project/version-state.toml`
3. `.agent/project/sop/release.md`
4. `.agent/project/sop/release-doc-refresh.md` (this file)
5. active SDD task file when `.agent/project/changes/.active` exists
6. per-track release note path from `version-state.toml`
7. git diff for files changed since the previous release scope was cut

For UI/admin-visible changes, also read `.agent/core/workflows/ui-design-workflow.md` and the relevant UI / spec files. For deployment changes, also read `.agent/project/deploy.md`.

---

## Modes

### Audit (read-only)

Audit mode must report:

- release-note files that are missing, draft-only, or contain placeholders
- public help/guide pages that are stale against the implemented feature set
- version strings in index docs that disagree with `version-state.toml`
- missing validation, rollback, compatibility, or artifact details
- generated assets (`manifest_files`) that are out of date

### Apply (edits docs)

Apply mode must:

- update release notes with actual scope, validation, rollback, risks, and traceability
- update user-facing help/guide for new behavior
- refresh index links so they match `version-state.toml`
- regenerate or refresh project-specific assets per project commands
- run the deterministic checks below
- update `.agent/project/status.md` after completion

---

## Content Requirements

Release notes must include:

- summary of delivered behavior
- included scope and explicitly deferred scope
- artifacts or deployment inputs
- compatibility notes
- validation checklist and results
- known risks
- rollback guidance
- traceability (`canonical source`, scripts, tag, rollback tag)

Help and guide docs must answer what users, testers, and operators need:

- where the feature appears in the UI / CLI / API
- required version combinations
- required configuration
- normal operation steps
- failure behavior and visible diagnostics
- safety notes for destructive behavior

Do not copy implementation-only design text into help pages. Convert it into procedure, field reference, and validation language.

---

## Deterministic Checks

After Apply mode (and as a release gate), run from the repository root:

```bash
co release-docs check --track all
```

Add `--allow-draft` only for development checkpoints; do **not** use it to pass a formal release.

If your project provides additional execution-layer scripts (e.g. PowerShell wrappers, Node sync scripts, manifest generators), declare them in `.agent/project/commands.md` and run them after `co release-docs check` passes.

`co release-docs check` is a mechanical gate. Passing it does not prove the prose is complete; the agent still owns the content review above.

---

## Project-Specific Configuration

Declare per-track doc-refresh hooks in `version-state.toml`:

```toml
[tracks.primary]
# ... standard fields ...
release_note = "docs/operations/primary-release-note-0.1.1.md"

[tracks.primary.release_docs]
# Index files that should always link the current per-track release note and
# only contain version strings allowed by version-state.toml.
index_files = [
  "docs/operations/README.md",
  "docs/help/README.md",
]
# Optional: generated manifest files to verify the source path appears with
# the configured visibility flag (regex template; %SOURCE% is the source path).
manifest_files = [
  "server/admin/src/generated/helpManifest.ts",
]
manifest_pattern_template = '"sourcePath"\\s*:\\s*"%SOURCE%"[^}]*"sidebarHidden"\\s*:\\s*false'
# Optional: regex for in-scope version strings in index docs (defaults to SemVer).
version_regex = "0\\.\\d+\\.\\d+"
```

Minimum useful configuration is none of the above — the gate will still verify per-track release-note existence, placeholders, and version-state coherence.

---

## Exit Criteria

The workflow is complete when:

- the selected track's release note exists and contains no template placeholders for a formal release
- public help/guide docs describe all user-visible release behavior
- index docs point at the versions in `version-state.toml`
- generated assets declared under `[tracks.<track>.release_docs] manifest_files` are refreshed
- `co release-docs check` passes without `--allow-draft` for a formal release
- the project's version-governance gate (`co release plan` / drift-guard script) is consistent with the updated docs
- `.agent/project/status.md` records the documentation refresh result

---

## Optional Wrappers

Wrappers may be added for specific environments:

- Cursor slash command
- IDE task or launch entry
- MCP tool prompt
- CI job

All wrappers must delegate to this SOP and stay thin. Do not duplicate the checklist in IDE-specific files as the primary source.
