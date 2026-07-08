# Axline VS Code 扩展发布计划

> 从 Cline fork 重命名为 Axline，分两阶段发布。

## 开发策略（两阶段）

| | 阶段一：本地 VSIX | 阶段二：公开市场 |
|--|------------------|------------------|
| **目标** | 让用户尽快安装使用 | 通过扩展库搜索安装 |
| **分发方式** | `.vsix` 文件（GitHub Release、内网共享） | VS Code Marketplace + Open VSX |
| **是否需要 Publisher 账号** | 否（`vsce package` 无需账号） | 是 |
| **重命名范围** | 最小化（扩展身份 + 用户可见 UI） | 全面（monorepo、proto、数据目录） |
| **预估工期** | 1–3 天 | 5–12 天 |

## 阶段一：本地 VSIX 分发（当前进行中）

### 目标

用户通过下载 `.vsix` 文件安装 Axline，无需 Marketplace 账号、PAT 或 CI 发布流水线。

### 必须做的改动

- [ ] `apps/vscode/package.json`：扩展身份（`publisher: axline`, `name: axline`, `displayName: Axline`, `version: 0.1.0`）
- [ ] 命令/视图 ID：`cline.*` → `axline.*`，`claude-dev-*` → `axline-*`
- [ ] `registry.ts`：删除 `claude-dev` 特例
- [ ] `.vscode/launch.json`：禁用扩展 ID 更新
- [ ] 用户可见品牌化（侧边栏、欢迎页、walkthrough）
- [ ] 根 `README.md`：VSIX 安装说明
- [ ] 本地构建并打包 VSIX

### 可暂缓

- `@cline/*` → `@axline/*` monorepo 包重命名
- `proto/cline/` → `proto/axline/`
- `~/.cline` → `~/.axline` 数据目录迁移
- OAuth redirect URI（BYOK 模式下账号登录可暂不可用）
- `README.marketplace.md`、CI 发布 workflow

### 打包命令

```powershell
cd c:\ai_work\axline
bun install --frozen-lockfile
bun run build:sdk
cd apps\vscode
bun run package
npx @vscode/vsce package --no-dependencies --allow-package-secrets sendgrid --out dist/axline-0.1.0.vsix
code --install-extension dist/axline-0.1.0.vsix
```

### 检查清单

- [x] `package.json`：`publisher` + `name: axline` + `displayName: Axline`
- [x] 命令/视图 ID 已更新，扩展可正常激活
- [ ] 新 icon 已替换（暂用原 Cline 图标）
- [x] `bun run package` + `vsce package` 成功 → `apps/vscode/dist/axline.vsix`
- [ ] 本地安装 VSIX 后核心功能（BYOK 对话）可用
- [ ] GitHub Release 已上传 VSIX + 安装说明
- [x] 与已装 Cline 扩展不冲突（扩展 ID：`axline.axline`）

### 仓库信息

- Git remote: `https://github.com/dinwind/xline.git`
- 扩展 ID: `axline.axline`
- VSIX 输出: `apps/vscode/dist/axline.vsix`

---

## 阶段二：VS Code Marketplace 公开发布

### 全面重命名

- Monorepo 包：`@cline/*` → `@axline/*`
- Proto：`proto/cline/` → `proto/axline/`
- 数据目录：`~/.cline` → `~/.axline`，`CLINE_*` → `AXLINE_*`
- UI / 文档全面品牌化
- CI/CD 发布流水线更新

### Marketplace 注册

- VS Code Marketplace Publisher + `VSCE_PAT`
- Open VSX Namespace + `OVSX_PAT`
- OAuth / 后端策略落地

### 发布命令

```powershell
$env:VSCE_PAT = "<token>"
$env:OVSX_PAT = "<token>"
cd apps\vscode
bun run publish:marketplace
```

---

## 技术背景

- 扩展入口：`apps/vscode/package.json`
- 发布脚本：`apps/vscode/scripts/publish-marketplace.mjs`
- 许可证：Apache-2.0
- 扩展 ID：`axline.axline`（阶段一即确定，阶段二无需用户重装）

## 执行顺序

1. **阶段一（现在）**：最小身份 + UI 品牌化 → 打包 VSIX → GitHub Release 分发
2. **阶段二（迭代后）**：全面重命名 → 注册 Publisher → Marketplace 公开发布
