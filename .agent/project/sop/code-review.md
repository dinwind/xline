# SOP: Code and Design Review Strategy

> Scope: [PROJECT_NAME] full codebase.  
> AI Agent MUST read this file before executing any "review", "strict check", or "correctness check" request.  
> For generic review process (tiers, dimensions, PR template), see `core/workflows/review-process.md`.

---

## §1 Review Trigger Map

Map each scenario to the appropriate review level from `core/workflows/review-process.md`:

| Scenario | Review Level |
|----------|-------------|
| Feature / bug fix before PR merge | Standard |
| Before cutting a new release | Pre-Release |
| After a production incident | Post-Incident |
| [Domain-specific scenario, e.g. "Modifying auth flow"] | Domain Deep-Dive (§6.A) |

> **Customize**: Add project-specific triggers and map them to levels above.

---

## §2 Pre-checks (Project-specific)

```bash
# Replace with actual commands for this project's stack
<compile-check>    # e.g. cargo check --workspace / python -m py_compile / tsc
<test-command>     # e.g. cargo test --workspace / pytest / npm test
<lint-command>     # e.g. cargo clippy / ruff check / eslint
```

---

## §3 Standard Review — Project-Specific Additions

In addition to the five generic dimensions in `core/workflows/review-process.md §3.2`, check:

### Project-Specific Checklist

- [ ] [TODO: Add project-specific item, e.g. "All DB migrations are reversible"]
- [ ] [TODO: Add project-specific item, e.g. "Configuration values have documented defaults"]
- [ ] [TODO: Add project-specific item, e.g. "Public API changes are backward-compatible or versioned"]

---

## §4 Pre-Release Review (Project-Specific)

Supplement `core/workflows/review-process.md §4` with:

### Version Files to Verify

```
# Replace with actual version-bearing files in this project
[file path]: [what to check]
[file path]: [what to check]
```

### Artifact Integrity Check

```bash
# Replace with actual artifact size/hash check
# Example: check installer is within expected size range
```

---

## §5 Known High-Risk Patterns

> Keep updated after each Post-Incident Review. These are project-specific historical bug patterns.

| Incident / Date | Root Cause Pattern | Prevention |
|-----------------|-------------------|-----------|
| [TODO: add entry after first post-incident review] | | |

---

## §6 Domain Deep-Dive Catalog

Define the domains in this project that warrant dedicated deep-dive reviews. For each domain, list the key files and the most important review points per function/handler.

> **Template for each domain below. Duplicate this block for each domain.**

---

### A. [Domain Name, e.g. Authentication]

**Files**:
- `src/[module]/[file].[ext]`

**Key Functions / Handlers**:

| Function | Review Points |
|----------|---------------|
| `[fn_name]` | [What to check, e.g. token expiry validation, timing-safe comparison] |
| `[fn_name]` | [What to check] |

**Domain Checklist**:

- [ ] [Domain-specific check, e.g. "JWT signature verified before claims read"]
- [ ] [Domain-specific check]

---

### B. [Domain Name, e.g. Data Transfer]

**Files**:
- `src/[module]/[file].[ext]`

**Key Functions / Handlers**:

| Function | Review Points |
|----------|---------------|
| `[fn_name]` | [What to check, e.g. checksum verified before writing to disk] |

**Domain Checklist**:

- [ ] [Domain-specific check]

---

## §7 Review Report Format

After each Domain Deep-Dive, output a structured report:

```
## Review Report: [Domain Name]
File(s): [relative paths]
Reviewed: YYYY-MM-DD
Functions covered: [list]

### Bugs Found
| # | Function | Description | Severity | Status |
|---|----------|-------------|----------|--------|
| 1 | [fn]     | [description] | Critical/High/Medium/Low | Fixed/Pending |

### Observations (non-bugs)
- [description]: [design trade-off explanation]

### Uncovered Areas (TODO-REVIEW)
- [function or section]: [reason not covered]
```

---

## §8 AI Agent Execution Notes

> Project-specific additions to `core/workflows/review-process.md §10`.

- [TODO: Note any project-specific conventions the AI should know, e.g. "The `runtime/` module owns all state; UI modules must not bypass it"]
- [TODO: Note any patterns that look suspicious but are intentional, e.g. "The double-check in `apply_update` is intentional — it guards against concurrent calls"]

---

## §9 Version History

| Version | Date | Change |
|---------|------|--------|
| v0.1 | [DATE] | Initial template — fill in project domains |
