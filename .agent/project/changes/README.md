# Changes (Active Proposals)

Each subdirectory is one **change unit** with a full SDD artifact set:

- `proposal.md` — why and what scope
- `specs.md` — requirements delta for this change
- `design.md` — technical approach
- `tasks.md` — implementation checklist (AI-friendly checkboxes)

Create a new change:

```bash
co change new <kebab-case-name>
```

List and status:

```bash
co change list
co change status <name>
```

Set which change AI should focus on (writes `.active` + optional `status.md` section):

```bash
co change apply <name>
co change clear
```

Minimal schema (only specs + tasks):

```bash
co change new <name> --schema minimal
co change schema list
```

When a change is complete, run `co change archive <name>` to move it to
`.agent/archive/changes/<name>/` (optional `--merge-specs` copies specs delta into
`project/specs/_archive/` for traceability).
