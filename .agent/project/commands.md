# Project Commands

> Agent quick reference — run these instead of rediscovering build steps.

---

## Axline VS Code（本地 VSIX）

| Task | Command |
|------|---------|
| **一键构建 VSIX** | `bun run build:vscode` |
| **构建并安装到 VS Code** | `bun run install:vscode` |
| **仅重打扩展（跳过 install + SDK）** | `bun run package:vscode` |
| Windows PowerShell | `.\scripts\axline-vscode-build.ps1 -Install` |

**输出：** `apps/vscode/dist/axline.vsix`  
**扩展 ID：** `axline.axline`

### 常见选项（底层脚本）

```bash
bun scripts/axline-vscode-build.mjs              # 完整构建
bun scripts/axline-vscode-build.mjs --install    # 构建 + code --install-extension
bun scripts/axline-vscode-build.mjs --skip-deps  # 跳过 bun install
bun scripts/axline-vscode-build.mjs --skip-sdk     # 跳过 build:sdk（仅改扩展/UI 时）
```

### 已知前提

- **bun** 必须在 PATH；Windows 上脚本会自动追加 `%USERPROFILE%\.bun\bin`
- **PowerShell** 不支持 `&&`，用 `;` 或上述脚本
- **F5 调试** 不需要 VSIX：用 `.vscode/launch.json` → `Run Extension (production)`
- SDK 变更后必须先 `build:sdk`（`build:vscode` 默认包含）

### 安装后验证

1. VS Code → `Developer: Reload Window`
2. Activity Bar 出现 **Axline** 图标
3. 设置中配置 API Key，测试 BYOK 对话

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

*Last updated: 2026-07-08*
