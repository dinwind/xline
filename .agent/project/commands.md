# Project Commands

> **Instance file**: This file contains project-specific commands and scripts.

---

## Quick Reference

| Task | Command |
|------|---------|
| Build | `[command]` |
| Test | `[command]` |
| Run | `[command]` |
| Clean | `[command]` |

---

## Build Commands

### Development Build

```bash
[command]
```

### Release Build

```bash
[command]
```

---

## Test Commands

### Run All Tests

```bash
[command]
```

### Run Specific Test

```bash
[command] [test_name]
```

### Test Coverage

```bash
[command]
```

---

## Run Commands

### Start Application

```bash
[command]
```

### Start with Debug

```bash
[command]
```

---

## Code Quality

### Format Code

```bash
[command]
```

### Lint Check

```bash
[command]
```

---

## Deployment

### Build for Production

```bash
[command]
```

### Deploy

```bash
[command]
```

---

## Release Governance Commands

Document the commands that pair with `project/version-state.toml`.

### Open Next Iteration

```bash
co start-next-version --track [track-name] --version [x.y.z] --apply
```

### Freeze Release Scope

```bash
co prepare-release --track [track-name] --apply
```

### Sync Canonical Version / Derived Files

```bash
[project-local version sync command]
```

### Build / Package / Publish

```bash
[project-local release build or deploy command]
```

### Record Released State

```bash
co cut-release --track [track-name] --apply
```

### Suggested Automation Order

1. Run project-local tests and release-note updates
2. `co prepare-release --track [track-name] --apply`
3. Update canonical source and sync derived files
4. Run build/package/deploy commands
5. Create and push the release tag
6. `co cut-release --track [track-name] --apply`

---

## Agent Git / PR Collaboration

| Task | Entry |
|------|-------|
| Git/PR rules for AI agents | `project/AGENT-GIT-PR-WORKFLOW.md` |
| Full collaboration SOP | `project/sop/agent-git-pr-collaboration.md` |
| Flush journal fragments into status | `co journal-flush` |

---

## Utility Commands

### Clean Build Artifacts

```bash
[command]
```

### Update Dependencies

```bash
[command]
```

---

*Last updated: [DATE]*
