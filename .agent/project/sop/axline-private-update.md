# SOP: Axline 私有更新（AuthNexus + VSIX）

> 运维与发布人员按此流程构建 VSIX、发布到 AuthNexus STABLE 轨道并验证自动更新。
> 扩展实现见 `project/specs/axline-private-update.md`。  
> Windows 企业重打包陷阱见 `project/sop/enterprise-vsix-repack-pitfalls.md`。

---

## 前提

| 项 | 要求 |
|----|------|
| AuthNexus | 可达（例：`https://auth.mtsilicon.com`，HTTPS :443） |
| 权限 | AuthNexus 控制台管理员账号（上传/发布 STABLE 版本） |
| 客户端配置 | 已创建软件应用 + Permanent enrollment code（写入本地 `endpoints.json`，勿提交 Git） |
| 本机工具 | `bun`、Node.js |
| 版本源 | `apps/vscode/package.json` 与 `.agent/project/version-state.toml` 一致 |

---

## 发布前检查清单

1. **版本对齐**

```powershell
cd c:\ai_work\axline
node scripts/verify-versions.mjs
```

确认 `package.json` 的 `version` 等于 `version-state.toml` 的 `working_version`。

2. **确认无敏感文件进 Git**

- 不要提交 `apps/vscode/endpoints.json`
- 不要提交 enrollment code、AuthNexus 管理员密码

3. **确认 VSIX 不会打包 `endpoints.json`**

`endpoints.json` 仅用于本机脚本（上传/验证），**打包前必须不存在于 `apps/vscode/` 目录**。若存在，会被 `vsce package` 打进 VSIX，泄露 enrollment code。

4. **（可选）更新 release note**

`docs/operations/vscode-release-note-<version>.md`

---

## 推荐：一键发布流程

以下为本机 PowerShell **标准发布流程**（版本检查 → 构建 → 企业重打包 → 上传 → 全链路验证）：

```powershell
cd c:\ai_work\axline

# 完整发布（推荐）
bun apps/vscode/scripts/release-private-vsix.mjs

# SDK 未改动时加速
bun apps/vscode/scripts/release-private-vsix.mjs --skip-sdk

# 仅构建 + 企业重打包，不上传
bun apps/vscode/scripts/release-private-vsix.mjs --skip-upload
```

脚本依次执行：

1. `node scripts/verify-versions.mjs`
2. `publish-private-vsix.mjs` → `dist/axline.vsix`（vsce 标准 ZIP）
3. `add-endpoints-to-vsix.mjs` → `dist/axline-enterprise.vsix`（注入 `~/.axline/endpoints.json` 公开字段）
4. `upload-private-vsix.mjs`（默认上传 **enterprise** 制品）
5. `verify-private-update.mjs`（enroll + latest + **下载并校验 ZIP/SHA-256**）

### 分步发布（调试时）

```powershell
cd c:\ai_work\axline
node scripts/verify-versions.mjs
bun apps/vscode/scripts/publish-private-vsix.mjs
bun apps/vscode/scripts/add-endpoints-to-vsix.mjs apps/vscode/dist/axline.vsix apps/vscode/dist/axline-enterprise.vsix $env:USERPROFILE\.axline\endpoints.json
bun apps/vscode/scripts/upload-private-vsix.mjs
bun apps/vscode/scripts/verify-private-update.mjs
```

**期望输出：**

| 步骤 | 成功标志 |
|------|----------|
| `publish-private-vsix.mjs` | `dist/axline.vsix`，`fileHash` 已打印 |
| `add-endpoints-to-vsix.mjs` | `Created enterprise VSIX`；`extension/package.json` 在 zip 根路径 |
| `upload-private-vsix.mjs` | `Login: OK` → `Upload: OK` → `Publish: OK`（上传 `axline-enterprise.vsix`） |
| `verify-private-update.mjs` | `Enroll: OK`、`Latest: OK`、`Download: OK (valid VSIX layout)`、`Integrity: OK` |

---

## 分步说明

### 1. 创建 AuthNexus 软件应用（首次）

1. 登录 AuthNexus 控制台 → **Applications** → 新建应用（类型：软件/客户端更新）。
2. 记录可读 **App ID**（形如 `app_xxxx`），即 `updateAppId`。
3. 打开该应用的 **Updater** 页 → 生成 **Permanent** enrollment code → 即 `updateEnrollmentCode`（勿写入 Git）。

### 2. 配置本机（不上传 Git）

**公开配置** — `%USERPROFILE%\.axline\endpoints.json`（或开发机 `apps/vscode/endpoints.json`）：

```json
{
  "axgateBaseUrl": "https://auth.mtsilicon.com:6343",
  "authAppId": "app_uu1Sn7yC",
  "authNexusBaseUrl": "https://auth.mtsilicon.com",
  "updateAppId": "app_<你的软件应用ID>"
}
```

模板：`apps/vscode/endpoints.example.json`

**客户端密钥** — `%USERPROFILE%\.axline\secrets.json`（勿打进 VSIX、勿提交 Git）：

```json
{
  "updateEnrollmentCode": "<Permanent码>",
  "authNexusAdminUser": "admin",
  "authNexusAdminPassword": "<AuthNexus 控制台密码>"
}
```

| 字段 | 用途 |
|------|------|
| `updateEnrollmentCode` | 客户端 **Check for Updates**（`verify-private-update.mjs`） |
| `authNexusAdminUser` | 运维 **upload-private-vsix.mjs** 登录 AuthNexus 控制台 |
| `authNexusAdminPassword` | 同上 |

模板：`apps/vscode/secrets.example.json`

**一次性本机配置（推荐）**：在发布机上写好 `~/.axline/secrets.json` 后，后续 `upload-private-vsix.mjs` **无需**再设 `AUTHNEXUS_ADMIN_*` 环境变量。0.2.4 / 0.2.5 / 0.2.6 均使用同一 AuthNexus 控制台管理员账号（`authnexus-console` 应用）。

**Windows 写入注意**：勿用 `Out-File` / `Set-Content` 默认编码（会带 UTF-8 BOM，导致 JSON 解析失败）。可用 `[System.IO.File]::WriteAllText($path, $json, (New-Object System.Text.UTF8Encoding $false))`，或 VS Code 保存为 UTF-8（无 BOM）。

**AI Agent 发布规则（勿反复询问用户）**：

1. 先直接执行 `bun apps/vscode/scripts/upload-private-vsix.mjs`（脚本自动读 `~/.axline/endpoints.json` + `secrets.json`）。
2. 仅当脚本报缺 `authNexusAdminUser` / `authNexusAdminPassword` 时，再提示运维补全 `secrets.json`——**不要**在凭据已落盘时询问用户用户名密码。
3. 环境变量 `AUTHNEXUS_ADMIN_*` 仅作临时覆盖（CI 或单 shell 会话），不是常规路径。

过渡期仍可读 legacy `~/.cline/endpoints.json` / `~/.cline/secrets.json`。

也可用环境变量（适合 CI，避免落盘）：

| 变量 | 用途 |
|------|------|
| `AXLINE_AUTHNEXUS_BASE_URL` | AuthNexus 基址 |
| `AXLINE_UPDATE_APP_ID` | 软件发布 App ID |
| `AXLINE_UPDATE_ENROLLMENT_CODE` | Permanent enrollment code（验证脚本） |
| `AUTHNEXUS_ADMIN_USER` / `AUTHNEXUS_ADMIN_PASS` | 控制台管理员（**可选**；默认读 `secrets.json`） |
| `AUTHNEXUS_CONSOLE_APP_ID` | 登录 appId，默认 `authnexus-console` |
| `AXLINE_RELEASE_CHANGELOG` | 发布 changelog（可选） |
| `AXLINE_VSIX_PATH` | 自定义 VSIX 路径（可选） |

### 3. 构建 VSIX

```powershell
bun apps/vscode/scripts/publish-private-vsix.mjs
```

脚本依次执行：

1. `bun run build:sdk`（可用 `--skip-sdk` 跳过）
2. `apps/vscode` 下 `bun run package`（typecheck + webview + lint + esbuild）
3. `bun run package:vsix`（`vsce package` → `dist/axline.vsix`）

输出制品：

| 字段 | 说明 |
|------|------|
| 路径 | `apps/vscode/dist/axline.vsix` |
| version | 与 `package.json` 一致 |
| fileSize | VSIX 字节数 |
| fileHash | SHA256 大写十六进制（供核对；**上传 API 由服务端自行计算**） |

### 3b. 企业 VSIX 重打包（AuthNexus 发布必做）

自 **0.2.4** 起，AuthNexus STABLE 上传的是 **`axline-enterprise.vsix`**（内置公开 `endpoints.json`），不是裸 `axline.vsix`。

```powershell
bun apps/vscode/scripts/add-endpoints-to-vsix.mjs `
  apps/vscode/dist/axline.vsix `
  apps/vscode/dist/axline-enterprise.vsix `
  $env:USERPROFILE\.axline\endpoints.json
```

| 规则 | 说明 |
|------|------|
| 输入 | `dist/axline.vsix`（vsce 产出的标准 ZIP） |
| 输出 | `dist/axline-enterprise.vsix`（必须为 ZIP，文件头 `PK`） |
| Windows | 脚本先打 `.zip` 再改名为 `.vsix`；**禁止** `tar -cf *.vsix`（会生成 tar） |
| 路径前缀 | **禁止** `tar -acf ... -C dir .`（zip 内为 `./extension/...`，VS Code 找不到 `extension/package.json`）；须用显式条目列表 |
| 校验 | 脚本结束、`upload`/`verify` 断言 ZIP 魔数 + `extension/package.json` 布局 |

推荐用 `release-private-vsix.mjs` 自动串联本步骤。

### 4. 上传到 AuthNexus（CLI，推荐）

```powershell
# 默认上传 dist/axline-enterprise.vsix（若存在）；否则 dist/axline.vsix
bun apps/vscode/scripts/upload-private-vsix.mjs
```

脚本行为：

1. 读取 `~/.axline/endpoints.json` 的 `authNexusBaseUrl`、`updateAppId`
2. 读取 `~/.axline/secrets.json` 的 `authNexusAdminUser`、`authNexusAdminPassword`（或环境变量覆盖）
3. 用管理员账号登录 `POST /api/auth/login`（body 含 `username`、`password`、`appId: authnexus-console`）
4. `POST /api/software/:updateAppId/releases` 上传 VSIX（track=`STABLE`）
5. 若返回 `status: PENDING`，自动 `PATCH .../releases/:id/status` → `PUBLISHED`

**注意：** 上传表单只提交 `version`、`track`、`changelog`、`isMandatory`、`file`。不要手动附加 `fileHash`、`fileSize`、`status`——AuthNexus 服务端会计算 hash；多传 `fileSize` 会导致 Prisma 500。

### 5. 控制台手动上传（备选）

若 CLI 不可用，在 AuthNexus 控制台 → 软件应用 → **STABLE** → 新建发布：

| 字段 | 值 |
|------|------|
| version | 与 `package.json` 一致 |
| 制品 | 上传 `axline-enterprise.vsix`（企业分发）或 `axline.vsix`（仅开发调试） |
| track | STABLE |
| 状态 | 发布为 PUBLISHED |

控制台上传后，服务端同样会计算 `fileHash`。可用 `publish-private-vsix.mjs` 输出的 hash 做人工核对。

### 6. 验证更新链路

```powershell
bun apps/vscode/scripts/verify-private-update.mjs
```

检查 `POST /api/auth/app/enroll`、`GET /api/software/:updateAppId/latest`，并 **下载 latest 制品** 校验 ZIP 魔数与 SHA-256。

### 7. 客户端验证（发布门禁，必做）

1. 本机安装低于目标版本的 Axline（或保留旧版）
2. 部署 `~/.axline/secrets.json`（含 enrollment code）
3. 命令面板 → **Axline: Check for Updates**
4. **Update now** → 安装成功 → **Reload now**
5. 扩展版本与 AuthNexus `latest.version` 一致

仅 API 验证（`Enroll`/`Latest` OK）**不能**代替本步骤。0.2.4–0.2.7 初版曾因跳过此步而未发现 enterprise VSIX 格式错误。

### 8. 发布后治理（可选）

按 `project/versioning.md` 与 `project/sop/release.md`：

- 更新 `version-state.toml`：`current_release`、`status: released`
- 打 tag：`vscode/v<version>`
- 填写 `docs/operations/vscode-release-note-<version>.md`

---

## 重要注意事项

### 密钥与配置

| 规则 | 说明 |
|------|------|
| 勿提交 Git | `endpoints.json`、`secrets.json`、enrollment code、管理员密码 |
| 勿打进 VSIX | 打包前删除 `apps/vscode/endpoints.json`；`updateEnrollmentCode` 仅放 `~/.axline/secrets.json` |
| 企业 VSIX | 可用 `add-endpoints-to-vsix.mjs` 注入**仅公开字段**的 `endpoints.json` |
| 两套凭据 | **enrollment code** → 客户端检查更新；**管理员账号** → 运维上传发布（均放 `~/.axline/secrets.json`） |

### 构建

| 规则 | 说明 |
|------|------|
| 完整链路 | 必须 `build:sdk` → `package`（或 `build:vscode`），不能只跑单元测试 |
| TypeScript | 发布前 `check-types` 必须通过；见 `sop/vscode-typescript-build-pitfalls.md` |
| Webview 边界 | `check-webview-import-boundary` 必须通过 |
| 版本一致 | `package.json` ↔ AuthNexus release version ↔ `version-state.toml` |

### AuthNexus API

| 规则 | 说明 |
|------|------|
| 登录 | `POST /api/auth/login` 需要 `username` + `password` + `appId`（控制台默认 `authnexus-console`） |
| 上传 | 仅 multipart `file` + 元数据；hash 由服务端计算 |
| 状态 | 新上传默认为 `PENDING`，须 `PUBLISHED` 后客户端 `latest` 才返回 |
| 轨道 | Axline 私有更新使用 **STABLE**；App JWT CLI 发布默认 ALPHA，不适用本流程 |
| fileHash 格式 | 服务端存小写 hex；`publish-private-vsix.mjs` 打印大写，仅用于人工核对 |

### 回滚

- AuthNexus 保留旧版本；客户端 semver 不会降级
- 紧急回滚：重新发布旧 VSIX 或指导用户手动安装旧 `.vsix`
- 基线 tag：见 `version-state.toml` → `rollback_tag`

---

## 故障排查

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| `appId is required`（登录） | 登录 body 缺 `appId` | 使用最新 `upload-private-vsix.mjs`；或手动传 `appId: authnexus-console` |
| `Internal server error`（上传） | 表单多传 `fileSize`/`status` | 仅用 CLI 脚本上传；不要手填 hash/size 字段 |
| 上传成功但 `Latest` 仍是旧版 | 状态为 `PENDING` | 控制台改为 PUBLISHED，或重跑 upload 脚本（会自动 promote） |
| `Enroll failed` | code 错误或已撤销 | 控制台重新生成 Permanent code |
| `Latest release check failed` | 未发布 STABLE 或 App ID 错误 | 核对 `updateAppId` 与发布状态 |
| `SHA-256 integrity check`（客户端） | 下载文件损坏或 hash 不匹配 | 重新构建并上传 VSIX |
| `End of central directory record signature not found`（安装） | 上传了非 ZIP 的 VSIX（Windows `tar -cf *.vsix`） | 用修复后的脚本重打并重新上传 |
| `extension/package.json not found inside zip`（安装） | ZIP 内路径为 `./extension/...` 而非 `extension/...`（`tar -acf -C dir .`） | 用显式条目列表重打 enterprise VSIX；`verify` 现校验布局 |
| 扩展无检查 | 缺配置或 `IS_DEV=true` | 填全 endpoints；正式 VSIX 非 F5 调试 |
| TS 错误导致 package 失败 | SDK/webview 类型链 | 见 skill `vscode-typescript-build` |
| VSIX 含 `endpoints.json` | 打包前未删除本地文件 | 删除后 `publish-private-vsix.mjs --skip-sdk` 重打 |

---

## 相关脚本

| 脚本 | 用途 |
|------|------|
| **`bun apps/vscode/scripts/release-private-vsix.mjs`** | **标准一键发布**（build → enterprise → upload → verify） |
| `release-private-vsix.mjs --skip-sdk` | 跳过 SDK 重建 |
| `release-private-vsix.mjs --skip-upload` | 仅 build + enterprise repack |
| `bun apps/vscode/scripts/publish-private-vsix.mjs` | 仅构建 `dist/axline.vsix` |
| `bun apps/vscode/scripts/add-endpoints-to-vsix.mjs` | 企业重打包 → `dist/axline-enterprise.vsix` |
| `bun apps/vscode/scripts/upload-private-vsix.mjs` | 上传 AuthNexus STABLE（默认 enterprise） |
| `bun apps/vscode/scripts/verify-private-update.mjs` | enroll + latest + 下载 ZIP/SHA 校验 |
| `bun scripts/axline-vscode-build.mjs --install` | 本地构建并安装扩展 |
| `node scripts/verify-versions.mjs` | 版本治理对齐检查 |

---

## 相关文档

- Spec：`project/specs/axline-private-update.md`
- 部署：`project/deploy.md`
- 版本：`project/versioning.md`、`project/version-state.toml`
- 构建陷阱：`project/sop/vscode-typescript-build-pitfalls.md`
- Pitfalls：`project/sop/enterprise-vsix-repack-pitfalls.md`
- Skill：`.agent/skills/_project/axline-private-update/SKILL.md`

---

*Last updated: 2026-07-15*
