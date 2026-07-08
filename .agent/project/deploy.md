# Deployment

> **Instance file**: This file contains project-specific deployment information.

---

## Environments

| Environment | URL / Host | Purpose |
|-------------|-----------|---------|
| Development | `localhost:[PORT]` | Local development |
| Staging | [host] | Pre-production testing |
| Production | [host] | Live service |

---

## Deployment Commands

### Build for Production

```bash
[command]
```

### Deploy

```bash
[command]
```

### Rollback

```bash
[command]
```

---

## Verification Checklist

After each deployment, complete the following checks:

- [ ] Application starts without errors
- [ ] Health check endpoint responds (if applicable)
- [ ] Core user flow works (smoke test)
- [ ] No new errors in logs
- [ ] Performance is within acceptable range

### Smoke Test Script (if available)

```bash
[command or script path]
```

---

## Release State Handoff

If this project uses structured version governance, keep deployment and governance state in sync:

1. Freeze the selected track with `co prepare-release --track [track-name] --apply`
2. Update the canonical version source and sync derived files
3. Run the production build/deploy flow in this document
4. Create and push the release tag according to `project/sop/release.md`
5. Record the final released state with `co cut-release --track [track-name] --apply`

CI/CD pipelines should treat `co cut-release` as the last state-recording step, not as a replacement for deployment logic.

---

## Infrastructure

### Services

| Service | Technology | Port | Notes |
|---------|-----------|------|-------|
| [Service 1] | [Tech] | [Port] | [Notes] |

### Configuration Files

| File | Purpose |
|------|---------|
| [config file] | [Purpose] |

---

## Access Information

| Item | Value |
|------|-------|
| SSH | `[user@host]` |
| Deploy Path | `[path]` |
| Log Path | `[path]` |

> **Security Note**: Do not store credentials in this file. Use environment variables or secret management.

---

## Troubleshooting

### Common Issues

| Symptom | Likely Cause | Resolution |
|---------|-------------|------------|
| [Symptom] | [Cause] | [Fix] |

---

*Last updated: [DATE]*
