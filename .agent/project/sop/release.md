# SOP: Release Process

> Authoritative release SOP. Follow every step in order.
> AI agents MUST read this file before executing any release task.
>
> **Trigger**: When the user asks to release, publish, bump version, create a tag, or cut a deliverable.

---

## Scope

This SOP assumes the project may have one or more release tracks.

Critical rules:

- Every release action must explicitly declare a **track**
- Track definitions live in `project/versioning.md`
- Track state lives in `project/version-state.toml`

If this project has only one releasable track, keep using `track = primary` explicitly instead of assuming "whole repo release".

---

## Required Inputs

Before doing anything, confirm all of the following:

- target `track`
- `working_version` from `project/version-state.toml`
- track-specific `release_note` path from `project/version-state.toml`
- canonical version source for that track
- rollback baseline tag or migration note

If any of these are unclear, stop and clarify before releasing.

---

## Phase 1 — Freeze Scope

Before bumping the version:

- confirm the release scope for the selected track
- stop adding unrelated non-blocker changes to that release
- finalize included/excluded scope in the release note
- mark the track as `frozen` in `project/version-state.toml` if this is a formal release cut

If your protocol layer provides a helper such as `co prepare-release`, prefer using it for the explicit `frozen` state transition.

Release blockers may still be fixed while frozen, but new unrelated scope must not be added.

---

## Phase 2 — Sync Version Sources

For the selected track:

1. Update the **canonical version source only**
2. Run the project-local sync/build/package/deploy flow declared in `project/versioning.md`
3. Ensure derived version files match the canonical source

Rules:

- never hand-edit derived version files as the primary source
- if runtime-visible versions disagree, treat the release as incomplete
- keep project-specific commands in the project layer, not in this generic SOP

Project-local execution commands should be documented in:

- `project/versioning.md`
- `project/commands.md`

---

## Phase 3 — Finalize Release Note

Before tagging, update the release note for the selected track.

The release note should include:

- release summary
- included scope
- excluded/deferred scope
- artifacts or deployment inputs
- compatibility notes
- validation checklist
- known risks
- rollback guidance
- traceability (`canonical source`, script path, tag, rollback tag)

If multiple tracks exist, keep release notes track-specific.

---

## Phase 4 — Build / Package / Deploy

Run the selected track's project-local execution flow.

Minimum expectations:

- produced artifacts or deployments match the intended version
- runtime-visible version output is correct
- release note reflects the actual delivered content
- smoke checks pass for the project-defined environment

---

## Phase 5 — Commit and Push

Commit release changes only after:

- canonical source is correct
- derived files are synchronized
- release note is finalized
- `project/version-state.toml` is updated as needed
- `project/status.md` is refreshed

Push the branch successfully before creating the tag.

---

## Phase 6 — Create and Push Tag

### Tag rules

Required rules:

1. Use the project's declared release-tag format
2. Prefer annotated tags
3. The tag must point to the final release commit
4. Always use explicit SHA, not symbolic `HEAD`, in examples
5. Push the tag in a separate `git push` call
6. Never delete and recreate the same release tag

### PowerShell example

```powershell
$SHA = git rev-parse HEAD
git tag -a "<track/vX.Y.Z>" "$SHA" -m "Track: <track>
Version: <X.Y.Z>
Canonical source: <path/to/version-source>
Release note: <path/to/release-note>
Rollback baseline: <track/vX.Y.(Z-1)>"
git push origin "<track/vX.Y.Z>"
```

Adjust the tag name, release note path, and baseline according to your project policy.

---

## Phase 7 — Mark Released

After tag creation succeeds:

- update `project/version-state.toml`
- set `current_release` to the released version
- set the track `status` to `released`
- keep the previous stable release in `rollback_tag`, if applicable
- refresh `project/status.md`

If your protocol layer provides a helper such as `co cut-release`, prefer using it to record the explicit `released` state transition after the project-local release flow is done.

If the next iteration starts immediately, prepare it separately. Do not silently reuse the released version for ongoing new work.

---

## Phase 8 — Open Next Iteration

When starting the next cycle for a track:

- choose the next `working_version`
- create or initialize the next release-note draft
- set the track status to `planning` or `developing`
- keep `current_release` on the latest stable version until the next release is cut

---

## Rollback SOP

### Artifact rollback

Rollback the released artifact/deployment to the previous stable baseline defined in the project policy/state.

### Git rollback

Use the previous stable tag as a recovery baseline, then create a new fix branch and publish a new hotfix version.

Never modify the contents of an already released version while keeping the same version number/tag.

---

## Known Pitfalls

| # | Pitfall | Rule |
|---|---------|------|
| 1 | Ambiguous release scope | Always declare the target track |
| 2 | Derived files drift from canonical source | Edit canonical source first, then sync |
| 3 | Delete and re-push same tag | Never; bump a new version instead |
| 4 | Tag points to wrong commit | Use explicit SHA after branch push |
| 5 | Release note missing rollback traceability | Record rollback baseline or migration note |

---

*Customize this SOP with project-specific tracks, scripts, CI provider, artifact names, and deployment environments.*
