# Axline 反馈：cokodo-agent 协议改进提案

> **Status**: Proposed（待 agent_protocol / cokodo-agent 评审是否合入）  
> **Source**: Axline 仓库落地 cokodo 协议时的对比与踩坑（2026-07-14）  
> **Target**: cokodo-agent（建议批次见 §5；目标版本待定，如 1.12.x / 1.13.0）  
> **Owner**: agent_protocol maintainers（提案方：Axline）  
> **Last updated**: 2026-07-14  
> **Related**: Axline `.agent` bootstrap；Cline `.agents/skills` 机制；现有 `plan/cline-adapter-integration.md`

---

## Summary（可贴 Issue 标题区）

**Title suggestion:** `feat(protocol): harden half-init sync, skill templates, and MCP project resolution (Axline feedback)`

从 Axline（Cline fork）接入 cokodo `.agent` 的实践中，整理出可合入 cokodo-agent 的协议/CLI/MCP 改进项。Axline 侧已做完项目实例与宿主 workaround；下列项应在 **agent_protocol / cokodo-agent** 合入，避免每个宿主重复踩坑。

---

## 1. 背景与动机

### 1.1 发生了什么

Axline 曾只有半初始化的 `.agent/project/`（scaffold 模板），无 `manifest.json` / `core/`。结果：

- `co diff` 显示 Local version **unknown**
- `co sync` 能拉 59 个协议文件，但**仍不落盘 `manifest.json`**
- Cursor MCP `session_gate` / `get_project_context` 报 “No `.agent/` directory”
- 同时 `list_global_projects` 在 CLI 注册成功后能看到项目；`get_global_project_context(project=axline)` 可用

另外，对照上游 Cline `.agents/skills` 与 cokodo `skills/skill-interface.md`，协议侧 skill 写作模板与双根目录约定可加强。

### 1.2 目标

| 目标 | 说明 |
|------|------|
| 半初始化可自愈 | 只有 `project/` 时 `upgrade`/`sync` 能补齐完整协议含 manifest |
| 诊断可操作 | 错误信息区分缺目录 / 缺 manifest / 缺 core，并给出命令 |
| 锁定文件干净 | 不再把 `__pycache__` 写进 checksum |
| Skill 规范可落地 | 对齐 Agents Skills 渐进披露与写作结构；明确 `_project/` |
| MCP 当前项目可靠 | Cursor 工作区下 `session_gate` / `get_project_context` 稳定 |

### 1.3 非目标

| 不在范围内 |
|------------|
| 把 `.agent` 退化成纯 markdown skill 仓 |
| 强制所有宿主只认 `.agents/skills` |
| Axline 业务（私有更新、AxGate 账号）合入 cokodo |
| 重写现有 core workflows 正文 |

---

## 2. 提案清单（评估用）

### 2.1 P0 — 建议合入（有现场复现）

#### C1 — `co sync` / `co upgrade` 必须补齐 `manifest.json`

- **问题**: 半初始化仓库 sync 后仍无 manifest → version unknown、lint/MCP 异常。
- **建议**:
  1. sync 源/目标始终包含 bundled `manifest.json`
  2. 若本地无 manifest：upgrade/sync 从 bundled 写入后再 `update-checksums`
  3. 回归测试：fixture「仅有 project/」→ `co upgrade -y` → 有 manifest 且 `co lint` 可通过 required-files
- **验收**: 半初始化目录一键 upgrade 后 `manifest.version ==` bundled protocol version

#### C2 — 不完整 `.agent` 的分级诊断

- **问题**: 笼统 “No `.agent/` directory” 误导（目录已存在但不完整）。
- **建议**: 区分三种状态并给出动作：
  - 无 `.agent/` → `co init`
  - 有 `.agent/` 无 `manifest.json` → `co upgrade -y`（或 sync + 补 manifest）
  - 有 manifest 缺 core/skills → `co sync -y` / `co upgrade -y`
- **触及**: `session_gate`、`get_project_context`、CLI `session-init`、可选 linter 规则
- **验收**: 半初始化时文案含「缺 manifest」+ 推荐命令，而非「无目录」

#### C3 — locked files 排除 `__pycache__` / `*.pyc`

- **问题**: sync 把 `adapters/**/__pycache__/*.pyc`、`scripts/__pycache__` 写入 checksum；删除后 integrity FAIL。
- **建议**:
  - sync/bundled 源不包含 bytecode
  - `update-checksums` / integrity 忽略 `__pycache__`、`*.pyc`
- **验收**: 干净树 `co lint --rule integrity-violation` 通过且无 pycache 条目

#### C4 — MCP「当前项目」cwd / workspace 解析

- **问题**: Cursor 中 `session_gate` / `get_project_context` 可能 miss；`get_global_project_context` + registry 正常。
- **建议**:
  1. 解析 IDE workspace roots / 打开文件夹，而非仅进程 cwd
  2. 失败时回退：registry 路径匹配 + 明确提示改用 `get_global_project_context`
  3. 联调：Cursor + shared launcher + 已注册项目
- **验收**: 在已打开的 Axline 工作区，无参数 `get_project_context` / `session_gate` 成功

---

### 2.2 P1 — 建议合入（规范与体验）

#### C5 — Skill 写作模板对齐 Cline / Agents Skills

- **建议**（更新 `skills/skill-interface.md` + scaffold 模板）:
  - 顶部 **Critical Rules**
  - **Decision trees**
  - 可选 `references/`：`REFERENCE.md` / `api.md` / `patterns.md` / `gotchas.md`
  - 保持现有渐进披露 Level 1–3 与 `SKILL.md` 入口约定
- **验收**: `co` 新建 skill（或文档示例）含上述骨架；与 agentskills.io 兼容

#### C6 — 文档化双根技能目录

- **约定**:
  - `.agent/skills/`：协议/可移植能力（cokodo）
  - `.agents/skills/`：Agents Skills 跨工具约定（Cursor / Codex / 上游 Cline）
- **建议**: 写入 Cline + Cursor adapter 文档与 usage-guide；可引用 Axline `instructionSystem=cokodo|cline|both` 作为宿主参考实现（不强制 cokodo 实现 both）
- **验收**: adapter README 有一节「Skills roots」

#### C7 — `skills/_project` 发现约定写清

- **现状**: lint `skills-placement` 要求项目 skill 在 `skills/_project/`；宿主需扫描两层（Axline 已改 `resolveManifestSkillDirectories`）。
- **建议**: skill-interface + adapter 明确：
  - 协议 skill → `skills/<name>/SKILL.md`
  - 项目 skill → `skills/_project/<name>/SKILL.md`
  - 推荐宿主扫描路径列表（文档或常量导出，供扩展实现）
- **验收**: 文档与 lint 文案一致；示例项目 skill 放在 `_project/`

---

### 2.3 P2 — 可选（Backlog）

| ID | 项 | 简述 |
|----|-----|------|
| **C8** | skills 互操作 CLI | `co skills import-agents` / export，减少 `.agents` ↔ `_project` 手工镜像 |
| **C9** | `co detect` 软提示 | 仅有 `.agents/skills`、无 `.agent/skills(_project)` 时提示 |
| **C10** | 示例目录 | `examples/`：cokodo MCP + `_project` skills + 可选 `.agents/skills` |
| **C11** | stack-spec | 新增 `core/stack-specs/typescript.md`（或 `nodejs.md`）服务 TS monorepo |

---

## 3. 明确不改

- 不把协议核心（manifest 分层、SOP、scripts、MCP）换成纯 skill 文档仓
- 不强制废弃 `.agent/skills` 或强制唯一 `.agents/skills`
- Axline 私有更新 / AxGate 业务留在 Axline 仓

---

## 4. Axline 已完成的 workaround（避免重复开发）

| Axline 已做 | cokodo 是否仍需 |
|-------------|-----------------|
| 手工补 manifest + checksums + 填 project 实例 | **仍需 C1**（根因在 sync） |
| 项目 skill 放 `_project/` + 宿主扫两层 | **仍需 C7 文档**；宿主代码各自维护 |
| MCP 改用 `get_global_project_context` | **仍需 C4** |
| 专用 skill：`axline-private-update`、`vscode-typescript-build` | 不需要 cokodo |

---

## 5. 建议合入批次

| Batch | 内容 | 风险 | 建议版本形态 |
|-------|------|------|----------------|
| **A — Patch** | C1 + C2 + C3 | 低 | 1.12.x patch |
| **B — Minor** | C5 + C6 + C7 | 低（文档/模板为主） | 1.13.0 或同 patch 若范围可控 |
| **C — Follow-up** | C4 | 中（需 Cursor MCP 联调） | 单独 PR |
| **D — Backlog** | C8–C11 | 低 | 按需 |

---

## 6. 测试计划（合入方）

- [ ] Fixture：仅 `.agent/project/` → `co upgrade -y` → 有 manifest、`co lint` 绿
- [ ] Fixture：含 `__pycache__` 的旧 checksum → 升级后 integrity 不再要求 pyc
- [ ] 半初始化时 `session_gate` / `session-init` 文案含正确动作
- [ ] Cursor：打开已注册项目，无参 `get_project_context` 成功（C4）
- [ ] 文档：skill-interface + cline/cursor adapter 含双根与 `_project`（C5–C7）
- [ ] 现有 `co lint` / adapter / sync 回归全绿

---

## 7. 参考

- Axline 本地镜像（提案副本）：可从 Axline 仓 `.agent/project/plan/cokodo-agent-improvements-from-axline.md` 同步
- Axline journal：`.agent/project/journal.d/2026-07-14-protocol-skills-bootstrap.md`
- 既有计划：`plan/cline-adapter-integration.md`（v1.12.0 Cline adapter）
- 上游对照：Agents Skills（`.agents/skills`）、Cline `skills` 工具渐进披露

---

## 8. 决策栏（评审填写）

| 项 | 合入？ | 备注 |
|----|--------|------|
| C1 | ⬜ Yes / ⬜ No / ⬜ Later | |
| C2 | ⬜ Yes / ⬜ No / ⬜ Later | |
| C3 | ⬜ Yes / ⬜ No / ⬜ Later | |
| C4 | ⬜ Yes / ⬜ No / ⬜ Later | |
| C5 | ⬜ Yes / ⬜ No / ⬜ Later | |
| C6 | ⬜ Yes / ⬜ No / ⬜ Later | |
| C7 | ⬜ Yes / ⬜ No / ⬜ Later | |
| C8–C11 | ⬜ cherry-pick | 列出选用 ID： |

**决议**:  
**目标版本**:  
**负责人**:  
**日期**:  
