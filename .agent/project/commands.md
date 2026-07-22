# Project Commands

> Agent quick reference — run these instead of rediscovering build steps.

---

## Axline VS Code（本地 VSIX）

| Task | Command |
|------|---------|
| **一键构建 VSIX** | `bun run build:vscode` |
| **构建并安装到 VS Code** | `bun run install:vscode` |
| **仅重打扩展（跳过 install + SDK）** | `bun run package:vscode` |
| **AuthNexus 标准发布** | `bun apps/vscode/scripts/release-private-vsix.mjs` |
| 验证私有更新链路（含下载 ZIP 校验） | `bun apps/vscode/scripts/verify-private-update.mjs` |
| 仅构建 base VSIX + SHA256 | `bun apps/vscode/scripts/publish-private-vsix.mjs` |

**输出：** `apps/vscode/dist/axline.vsix`（base）、`dist/axline-enterprise.vsix`（AuthNexus 上传目标）  
**扩展 ID：** `axline.axline`

### 私有更新（AuthNexus）

配置 `endpoints.json` 或环境变量后，扩展会自动检查 AuthNexus 上的 VSIX 发布；也可命令面板执行 **Axline: Check for Updates**。详见 `.agent/project/specs/axline-private-update.md`。

### 常见选项（底层脚本）

```bash
bun scripts/axline-vscode-build.mjs              # 完整构建
bun scripts/axline-vscode-build.mjs --install    # 构建 + code --install-extension
bun scripts/axline-vscode-build.mjs --skip-deps  # 跳过 bun install
bun scripts/axline-vscode-build.mjs --skip-sdk     # 跳过 build:sdk（仅改扩展/UI 时）
```

### TypeScript 构建验证（发布前必跑）

Axline 有 **SDK / extension host / webview Vite** 三条独立类型与打包链路；只跑单测或 F5 无法覆盖全部错误。详见 `.agent/project/sop/vscode-typescript-build-pitfalls.md`。

| 场景 | 命令 |
|------|------|
| SDK（`@cline/core` auth/axgate 等）有改动 | `bun run build:sdk` |
| 扩展 + webview 全量类型检查 | `cd apps/vscode; bun run check-types` |
| 与 VSIX 发布一致的完整构建 | `cd apps/vscode; bun run package` |
| Webview 不得间接依赖 `@cline/core` | `cd apps/vscode; bun run check-webview-boundary` |

**AuthNexus 发布：** `bun apps/vscode/scripts/release-private-vsix.mjs`（build → enterprise → upload → verify）。SDK 未改时加 `--skip-sdk`。

### 已知前提

- **bun** 必须在 PATH；Windows 上脚本会自动追加 `%USERPROFILE%\.bun\bin`
- **PowerShell** 不支持 `&&`，用 `;` 或上述脚本
- **`code --install-extension` 的 DEP0169 警告**：来自 VS Code CLI 查询扩展市场元数据，与 Axline 无关；`install:vscode` 已用 `NODE_OPTIONS=--disable-warning=DEP0169` 抑制
- **F5 调试** 不需要 VSIX：用 `.vscode/launch.json` → `Run Extension (production)`
- SDK 变更后必须先 `build:sdk`（`build:vscode` 默认包含）

### 安装后验证

1. VS Code → `Developer: Reload Window`
2. Activity Bar 出现 **Axline** 图标
3. 设置中配置 API Key，测试 BYOK 对话

---

## 版本治理（Cokodo / wsync 同款）

| Task | Command |
|------|---------|
| 查看版本状态 | 读 `.agent/project/version-state.toml` 与 `status.md` → **Version Cycle** |
| 校验 canonical ↔ state | `node scripts/verify-versions.mjs` |
| 协议 lint | `co lint --rule version-state` |
| 发版 SOP | `.agent/project/sop/release.md`（track = `vscode`） |
| 政策 | `.agent/project/versioning.md` |

**Track：** `vscode` · **Canonical：** `apps/vscode/package.json` · **Tag：** `vscode/vX.Y.Z`

---

## SDK / Monorepo

| Task | Command |
|------|---------|
| 安装依赖 | `bun install --frozen-lockfile` |
| 构建 SDK | `bun run build:sdk` |
| 类型检查 | `bun run types` |
| 全量检查 | `bun run check` |

---

## 发布（阶段二，暂未启用）

Marketplace 发布见 `project/axline-vscode-publish.md`。当前阶段一只分发 VSIX：

```powershell
# GitHub Release 手动上传（示例）
gh release upload v0.1.0 apps/vscode/dist/axline.vsix --clobber
```

---

*Last updated: 2026-07-14*
