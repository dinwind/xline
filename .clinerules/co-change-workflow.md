# Cokodo SDD change workflow

Use the terminal to manage spec-driven change units under `.agent/project/changes/`.

## When starting a feature
1. Run `co change new <kebab-name>` (or `--schema minimal` for small fixes).
2. Edit `proposal.md` / `specs.md` / `design.md` as needed.
3. Run `co change apply <name>` so `status.md` and `.active` point AI at the right folder.
4. Implement using `tasks.md` checkboxes; run `co change status <name>` to re-read tasks.

## When finishing
1. Run `co change archive <name>` (add `--merge-specs` to copy specs delta into `project/specs/_archive/`).
2. Run `co change clear` if needed.

## List changes
`co change list` — active change marked with *.
