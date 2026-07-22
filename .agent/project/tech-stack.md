# Tech Stack

> **Instance file**: Axline monorepo technology choices.

---

## Core Technologies

| Technology | Choice | Version / note | Purpose |
|------------|--------|----------------|---------|
| **Language** | TypeScript | ES2022 | Extension, SDK, webview |
| **Runtime / package** | Bun | PATH required on Windows | Install, scripts, tests |
| **IDE host** | VS Code Extension API | engines `^1.84.0` | Product shell |
| **UI** | React + Vite | webview-ui | Side panel chat / settings |
| **RPC** | protobuf / gRPC-web | generated under apps/vscode | Extension ↔ webview |
| **Agent runtime** | `@cline/core` / `@cline/agents` / `@cline/llms` / `@cline/shared` | workspace packages in `sdk/` | Session, tools, providers |
| **Protocol** | cokodo-agent `.agent` | protocol 3.3.0 | AI project memory / MCP |

---

## Monorepo layout

| Path | Role |
|------|------|
| `apps/vscode` | Extension host + packaging (VSIX) |
| `apps/vscode/webview-ui` | Browser-bundled React UI (**must not** import `@cline/core`) |
| `sdk/packages/*` | Shared SDK (`@cline/*`); build emits `dist/` |
| `scripts/` | Root helpers (`axline-vscode-build.mjs`, `verify-versions.mjs`) |

---

## Build / typecheck chains (critical)

Axline has **multiple independent** compile targets. F5 or unit tests alone do **not** cover publish:

| Chain | Command | Notes |
|-------|---------|-------|
| SDK | `bun run build:sdk` | `@cline/core` **no DOM** |
| Extension types | `cd apps/vscode; bun run check-types` | host + webview types |
| Full package | `cd apps/vscode; bun run package` | matches VSIX path |
| Webview boundary | `cd apps/vscode; bun run check-webview-boundary` | no `@cline/core` in webview |

Details: `.agent/project/sop/vscode-typescript-build-pitfalls.md`

---

## Development Environment

### Prerequisites

- Bun on PATH (Windows: `%USERPROFILE%\.bun\bin`)
- Node compatible with VS Code extension tooling
- VS Code / Cursor for F5 debug
- `co` (cokodo-agent) for protocol / MCP
- Optional: `gh` for PR workflow

### Setup Commands

```powershell
cd c:\ai_work\axline
bun install --frozen-lockfile
bun run build:sdk
bun run build:vscode          # or: bun run install:vscode
```

F5: `.vscode/launch.json` → `Run Extension (production)` (no VSIX required).

---

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Windows | ✅ | Primary internal env; PowerShell: use `;` not `&&` |
| Linux | ✅ | Standard bun/node |
| macOS | ✅ | Standard bun/node |

---

## External services

| Service | Role |
|---------|------|
| **AxGate** | Account / device / agent API |
| **AuthNexus** | Auth app + software update (VSIX) |
| Config | `apps/vscode/endpoints.example.json` → `endpoints.json` (local, not committed) |

---

*Last updated: 2026-07-14*
