# SOP: Axline VS Code TypeScript 构建陷阱（2026-07-10）

> 记录在 AxGate 设备身份 + 0.2.0 发布过程中**反复出现**的 TypeScript / 打包错误，以及如何避免。

## 背景：为什么同一类错误会出现多次？

Axline VS Code 扩展不是单一 `tsc` 目标，而是 **至少 4 条独立编译/打包链路**：

| 链路 | 命令 / 入口 | `lib` / 运行时 | 典型失败阶段 |
|------|-------------|----------------|--------------|
| `@cline/core` SDK | `bun run build:sdk` | `ES2022`，**无 DOM**，`types: node` | SDK `tsc` emit |
| Extension host | `apps/vscode` → `tsc --noEmit` | `ES2022` + **DOM** | `check-types` |
| Webview UI | `webview-ui` → `tsc -b` + **Vite bundle** | `ES2022` + DOM | Vite 解析依赖 |
| 发布 VSIX | `publish-private-vsix.mjs` → `package` | 以上全部 | 发布前最后一刻 |

开发时若只跑 `bun test` 或 F5（不跑完整 `package`），**SDK 与 webview 链路不会被触发**，错误会堆积到发布时才集中爆发。

---

## 错误清单（2026-07-10 AxGate 集成）

### 1. `null` 不能赋给 `undefined` 可选参数

**文件：** `sdk/packages/core/src/auth/axgate-errors.ts`

**现象：**
```text
Argument of type 'AxgateStructuredError | null' is not assignable to
parameter of type 'AxgateStructuredError | undefined'.
```

**原因：** `parseAxgateStructuredError` 返回 `null`，而 `getAxgateDeviceErrorMessage` 第二参数类型为 `details?: AxgateStructuredError`（即 `undefined`，不含 `null`）。`strict` 下二者不兼容。

**修复：**
```typescript
getAxgateDeviceErrorMessage(structured?.code, structured ?? undefined)
```

**预防：**
- SDK 层 optional 参数统一用 `T | undefined`，不用 `T | null`。
- 从 JSON/解析函数得到 `null` 时，传给 optional 参数前写 `?? undefined`。
- `@cline/core` 新增 auth 工具函数时，在 `src/auth/*.test.ts` 覆盖「解析结果为 null」分支。

---

### 2. `HeadersInit` / `RequestInit.headers` 在 SDK 中类型不兼容

**文件：** `sdk/packages/core/src/auth/axgate.ts`

**现象：** `buildAxgateClientHeaders(identity, init?.headers)` 在 SDK `tsc` 中报 headers 类型不匹配（`HeadersInit` 与 Node/undici 的 `Headers` 构造参数不一致）。

**原因：** `@cline/core` 的 `tsconfig` **没有 DOM lib**；`HeadersInit` 来自 DOM 类型定义，与 Node 18+ `fetch`/`Headers` 的 typings 在 strict 下不完全一致。

**修复：** 使用与运行时一致的构造参数类型：
```typescript
base?: ConstructorParameters<typeof Headers>[0]
```

**预防：**
- **在 `@cline/core` 中禁止**在公开 API 上使用 `HeadersInit`；统一用 `ConstructorParameters<typeof Headers>[0]`。
- Extension host（`apps/vscode`）有 DOM lib，局部仍可用 `HeadersInit`，但从 SDK 复制的 helper 应跟 SDK 保持一致。
- 改 AxGate header 逻辑后必须跑：`cd sdk && bun run build:sdk`（或根目录 `bun run build:sdk`）。

---

### 3. `Headers.entries()` 迭代器不可用

**文件：** `apps/vscode/src/sdk/cline-session-factory.ts`

**现象：**
```text
Property 'entries' does not exist on type 'Headers' ...
```
或需要 `--downlevelIteration` / `DOM.Iterable`。

**原因：** 扩展 host `tsconfig` 含 `DOM` 但**未含 `DOM.Iterable`**；`for..of` / `.entries()` 依赖 iterable 类型。

**修复：** 用 `headers.forEach((value, key) => { ... })` 转为 plain object。

**预防：**
- 在 extension host 需要把 `Headers` 转成 `Record<string, string>` 时，**优先 `forEach`**，不用 `entries()` / `for..of`。
- 若项目广泛需要 iterable DOM API，再考虑在 `apps/vscode/tsconfig.json` 的 `lib` 中加入 `DOM.Iterable`（当前未启用，避免扩大范围）。

---

### 4. Webview 间接依赖 `@cline/core` 导致 Vite 打包失败

**文件：** `apps/vscode/src/services/error/ClineError.ts`（被 `webview-ui/.../ErrorRow.tsx` 直接 import）

**现象：** `bun run package` 在 `vite build` 阶段失败——Vite 试图打包 `@cline/core`，牵出 Node-only 模块（fs、子进程、大量 SDK 运行时）。

**原因：** Webview 通过相对路径引用 extension `src/` 下的模块：
```typescript
import { ClineError } from "../../../../src/services/error/ClineError"
```
若在 `ClineError.ts` 中 `import { ... } from "@cline/core"`，该依赖会进入 **浏览器 bundle**。

**修复：** 在 `ClineError.ts` 内**本地内联** AxGate 设备错误码常量与判断；仅保留 `@cline/llms` 等同 webview 可接受的依赖。

**预防（强制）：**
- Webview **不得**直接 `import "@cline/core"`。
- 经 `../../../../src/` 或 `@shared/*` 进入 webview 的模块也**不得** import `@cline/core`。
- 共享常量放 `@shared/*` 或 webview 本地；SDK 逻辑放 extension host，经 gRPC/proto 传给 webview。
- CI/发布前运行：`bun run check-webview-boundary`（见 `apps/vscode/scripts/check-webview-import-boundary.mjs`）。

**Webview 当前「桥接」extension 的文件（变更时需审查）：**
- `webview-ui/src/components/chat/ErrorRow.tsx` → `src/services/error/ClineError.ts`
- `webview-ui/src/components/chat/ErrorBlockTitle.tsx` → 同上
- `webview-ui/src/components/common/ViewHeader.tsx` → `src/shared/config-types.ts`
- `webview-ui/src/components/chat/ErrorRow.tsx` → `src/shared/utils/cline.ts`

---

## 推荐开发 / 发布检查顺序

避免「多次修同一类错」的最小流程：

```powershell
# 1. SDK 有改动时（axgate、auth、core 任意路径）
cd c:\ai_work\axline
bun run build:sdk

# 2. 扩展 + webview 全量类型与打包（发布前必跑）
cd apps\vscode
bun run check-types          # 含 check-webview-boundary
bun run package              # = check-types + webview vite + esbuild

# 3. 打 VSIX（与 CI/AuthNexus 发布一致）
cd c:\ai_work\axline
bun apps/vscode/scripts/publish-private-vsix.mjs
```

**不要**仅依赖：`bun test`、F5 `Run Extension`、或只改 webview 时跳过 `build:sdk`。

---

## 代码放置速查

| 内容 | 应放在 | 不要放在 |
|------|--------|----------|
| AxGate HTTP / 设备 enroll | `@cline/core` + `apps/vscode/src/sdk/axgate/` | webview-ui |
| 设备错误码（UI 分类用） | `@shared/constants` 或 `ClineError.ts` 内联 | `@cline/core` import 进 ClineError |
| Header 合并工具 | `@cline/core/auth/axgate.ts` | 复制三份不同 Headers 类型 |
| Account 设备状态 UI | webview-ui + proto RPC | 直接 fetch AxGate |

---

## 相关命令

见 `.agent/project/commands.md` →「TypeScript 构建验证」。

---

*Recorded after Axline 0.2.0 / AxGate device identity release, 2026-07-10.*
