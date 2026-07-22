# Project Business Context

> **Instance file**: Project-specific information. **Vision** is loaded every session.

---

## Project Name

Axline

---

## Vision (项目愿景)

- **总目标愿景**: 在 IDE / 终端内提供可私有部署的自主编码 Agent（Cline fork），对接企业身份与更新基础设施（AxGate / AuthNexus），而不是依赖公共扩展市场作为唯一分发渠道。
- **应用场景**: 内部开发者在 VS Code 中用 Axline 写代码、跑终端、改仓库；管理员通过 AuthNexus 推送 VSIX 私有更新；账号与设备策略走 AxGate。
- **目标用户**: 需要私有更新、企业登录/设备管控的团队开发者与平台运维。

---

## Project Overview

**Axline** 是 [Cline](https://github.com/cline/cline) 的 fork，当前以本地 / AuthNexus 私有 **VSIX** 分发（阶段一）。产品形态包括 VS Code 扩展、共享 SDK（`@cline/*`）、以及 CLI / TUI 相关能力（上游保留）。

| Attribute | Value |
|-----------|-------|
| **Name** | Axline |
| **Type** | IDE coding agent (VS Code extension + SDK monorepo) |
| **Tech Stack** | TypeScript, Bun, VS Code Extension API, React (webview), protobuf/gRPC |
| **Status** | Active |
| **Publisher / ID** | `axline` / `axline.axline` |

---

## Goals

1. 稳定的私有 VSIX 构建、发布与 AuthNexus 自动更新
2. AxGate Account / 设备身份替代 Cline Account 主路径
3. cokodo `.agent` 协议可用：会话连续性、SOP、skills 按需加载
4. 保持与上游 Cline SDK / Agents Skills（`.agents/skills`）兼容

---

## Current Status

### Completed
- VS Code 扩展打包与安装脚本（`build:vscode` / `install:vscode`）
- 私有更新规格与 SOP、AxGate account 规格与评审
- 版本治理（`version-state.toml` + `verify-versions.mjs`）

### In Progress
- `.agent` 协议实例化与 Axline 专用 skills
- `0.2.3` developing（设备身份 / 私有更新等）

### Planned
- 跨项目 collaboration 声明与端到端验收
- 更广的分发渠道（若需要）

---

## Directory Structure

```
axline/
├── apps/vscode/          # VS Code extension + webview-ui
├── sdk/                  # @cline/shared|llms|agents|core packages
├── scripts/              # monorepo build / verify helpers
├── .agent/               # cokodo protocol (project truth + skills)
├── .agents/skills/       # Agents Skills (upstream / cross-tool)
└── .clinerules/          # Cline-native rules (Axline / upstream)
```

---

## Related Projects

| Project | Relationship |
|---------|----------------|
| **AxGate** | 账号 / 设备 / Agent API 网关；Axline 登录与设备策略上游 |
| **AuthNexus** | 身份与软件更新（VSIX private update） |
| **wsync** | 同生态工具链；版本治理参考 |
| **agent_protocol / cokodo-agent** | `.agent` 协议与 MCP / CLI |

---

## Key Documents

- [README.md](../../README.md) — 安装与概览
- [tech-stack.md](tech-stack.md) — 技术栈
- [commands.md](commands.md) — 常用命令
- [specs/specs-index.md](specs/specs-index.md) — 规格索引
- [known-issues.md](known-issues.md) — 已知问题

---

*Last updated: 2026-07-14*
