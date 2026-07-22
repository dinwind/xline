# VS Code Extension 0.2.2 — Private update + AxGate device identity

> Track: `vscode`  
> Version: `0.2.2`  
> Previous stable: `0.2.1`  
> Canonical version source: `apps/vscode/package.json`  
> Release tag: `vscode/v0.2.2`  
> Rollback tag: `vscode/v0.2.1`

---

## 1. Release Summary

- Extension version: `0.2.2`
- Version track: `vscode`
- Artifact: `apps/vscode/dist/axline.vsix`
- Extension ID: `axline.axline`
- Release date: `2026-07-14`

**主题：** 内网 AuthNexus 私有 VSIX 更新链路，以及 AxGate 设备身份 / Account 集成相关能力；Cokodo instruction 默认走 `.agent/` 协议。

---

## 2. Scope Included

| Area | Change |
|------|--------|
| Private update | AuthNexus software-release check / download / install VSIX |
| AxGate account | Device enroll, installation identity, account webview |
| Cokodo | Default instruction system `cokodo` → `.agent/` (not `.agents/`) |
| Packaging | `bun run build:vscode` → `apps/vscode/dist/axline.vsix` |

---

## 3. Scope Excluded / Deferred

- Marketplace / Open VSX public publish (phase 2)
- Full `@cline/*` → `@axline/*` package rename
- `~/.cline` → `~/.axline` data-directory migration

---

## 4. Validation Checklist

- [x] `bun run build:vscode` produces `apps/vscode/dist/axline.vsix`
- [ ] Install VSIX and verify BYOK chat
- [ ] Private update check against AuthNexus (when endpoints configured)
- [ ] `co lint --rule version-state` passes

---

## 5. Risks

- Private update requires valid `endpoints.json` / enrollment
- Mixing `.agents/` (Agents Skills) with `.agent/` (Cokodo) confuses skill discovery if instruction system is wrong

---

## 6. Traceability

- Canonical source: `apps/vscode/package.json`
- Build: `bun run build:vscode` / `scripts/axline-vscode-build.mjs`
- Publish helper: `bun apps/vscode/scripts/publish-private-vsix.mjs`
- Specs: `.agent/project/specs/axline-private-update.md`, `.agent/project/specs/axgate-account-integration.md`
