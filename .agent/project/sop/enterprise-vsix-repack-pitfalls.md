# SOP: Enterprise VSIX 重打包陷阱（Windows）

> **Audience**: 发布/运维、AI Agent  
> **Related**: `sop/axline-private-update.md`, `scripts/lib/vsix-zip.mjs`, `scripts/release-private-vsix.mjs`

Axline AuthNexus STABLE 上传 **`axline-enterprise.vsix`**（在 `axline.vsix` 内注入公开 `endpoints.json`）。  
自 0.2.4 起使用 `add-endpoints-to-vsix.mjs`；在 Windows 上曾连续踩两个 **tar** 相关陷阱，导致「API 验证全绿、客户端安装失败」。

---

## 背景

| 阶段 | 现象 | 运维侧判断 |
|------|------|------------|
| 上传成功 | Login / Upload / Publish OK | 「发布成功」 |
| `verify-private-update`（旧） | Enroll / Latest OK | 「链路就绪」 |
| 客户端 Update now | 安装失败 | 用户第一次 E2E 才发现 |

**教训**：AuthNexus API 成功 ≠ VSIX 可被 VS Code 安装。必须用 `verify-private-update.mjs`（含下载 + 布局校验）+ 客户端 E2E。

---

## 陷阱 1：`.vsix` 后缀打成 tar 归档

### 错误写法（Windows）

```powershell
tar -a -cf axline-enterprise.vsix -C $tempDir .
```

### 原因

`tar -a` 仅对 **`.zip`** 自动选 ZIP 压缩；**`.vsix` 会打成未压缩 tar**。

### 客户端报错

```
End of central directory record signature not found. Either not a zip file, or file is truncated.
```

### 特征

| 项 | tar 假 VSIX | 正确 ZIP VSIX |
|----|-------------|---------------|
| 文件头 | `./`（0x2E 0x2F） | `PK`（0x50 0x4B） |
| 典型大小 | ~30 MB | ~8 MB |
| SHA-256 | 与 tar 内容一致（仍会通过 hash 校验） | 与 zip 内容一致 |

### 修复

1. 先写 `.zip`：`tar -acf temp.zip -C $dir <entries...>`
2. 再改名为 `.vsix`
3. `assertValidVsixZip` 检查 `PK` 魔数

---

## 陷阱 2：`tar -acf ... -C dir .` 产生 `./` 路径前缀

### 错误写法（Windows）

```powershell
tar -acf temp.zip -C $tempDir .
```

### 原因

Windows BSD tar 在 zip 内写入 **`./extension/package.json`**，而 VS Code / vsce 要求 **`extension/package.json`**（无 `./` 前缀）。

### 客户端报错

```
extension/package.json not found inside zip.
```

### 特征

| zip 内路径 | VS Code |
|------------|---------|
| `extension/package.json` | 可安装 |
| `./extension/package.json` | 失败 |

### 修复

显式列出顶层条目打包（**不要用 `.`**）：

```javascript
const entries = await readdir(sourceDir)
tar -acf out.zip -C sourceDir "extension" "extension.vsixmanifest" "[Content_Types].xml"
```

脚本实现：`scripts/lib/vsix-zip.mjs` → `createZipVsixFromDir()`。

---

## 脚本防线（当前）

| 检查点 | 模块 | 断言 |
|--------|------|------|
| 企业重打包后 | `add-endpoints-to-vsix.mjs` | `assertValidVsixLayout` |
| base 构建后 | `publish-private-vsix.mjs` | `assertValidVsixLayout` |
| 上传前 | `upload-private-vsix.mjs` | `assertValidVsixLayout` |
| 发布后 | `verify-private-update.mjs` | 下载 + `assertValidVsixLayout` + SHA-256 |
| 客户端下载后 | `authnexus-client.ts` | ZIP 魔数 + `extension/package.json` 布局 |

---

## 标准发布命令

```powershell
cd c:\ai_work\axline
bun apps/vscode/scripts/release-private-vsix.mjs
# SDK 未改：--skip-sdk
```

**不要**手动分步上传 enterprise 包，除非调试；分步时也必须跑完整 `verify-private-update.mjs`。

---

## 受影响版本（AuthNexus 历史制品）

| 版本 | 初始上传问题 | 处理 |
|------|--------------|------|
| 0.2.4 – 0.2.7（初版） | tar 或 `./` 前缀 | 0.2.7 已用修复脚本重传；更早版本勿从 AuthNexus 拉取安装 |
| ≤ 0.2.2 | 裸 `axline.vsix`（vsce） | 格式正确，但无内置 endpoints |

---

## 参考

- Linux 正确范例：`add-endpoints-to-vsix.sh`（`unzip` + `zip`）
- 问题记录：`project/journal.d/2026-07-15-enterprise-vsix-windows-pitfalls.md`
- Known issues：`project/known-issues.md`

---

*Last updated: 2026-07-15*
