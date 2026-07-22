# Axline skills layout

> How skills are discovered in this repo.

## Two roots

| Root | Audience | When used |
|------|----------|-----------|
| `.agent/skills/` | Protocol-bundled skills (`guardian`, …) | Synced by `co upgrade` |
| `.agent/skills/_project/` | **Axline-owned** skills | cokodo lint `skills-placement`; default create path |
| `.agents/skills/` | Agents Skills convention | Cross-tool / upstream (`cline-sdk`, `opentui`, …) |

Axline extension setting `instructionSystem`:

- `cokodo` (default) → scan `.agent/skills` **and** `.agent/skills/_project`
- `cline` → scan `.agents/skills` (+ legacy dirs, `~/.agents/skills`, …)
- `both` → union of the above

## Axline-owned skills (`_project/`)

| Skill | Purpose |
|-------|---------|
| `axline-private-update` | AuthNexus VSIX private update |
| `vscode-typescript-build` | Multi-chain TS / package failures |
| `create-pull-request` | Mirror of Agents Skills PR workflow |

Upstream capability docs that stay under `.agents/skills/` (optional to enable `both`): `cline-sdk`, `opentui`, `publish-cli`.

## Authoring

Follow `.agent/skills/skill-interface.md` and prefer Cline-style Critical Rules + decision trees for new skills.
Put **project-specific** skills under `_project/` only.
