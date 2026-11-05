---
title: "AgentJax"
name: "AgentJax"
slug: "agentjax"
owner: "mozi1924"
pinned: false
pinnedOrder: -1
description: "基于 Tauri + React 构建的现代化桌面 AI 助手，支持多模型配置与本地 MCP 协议工具联动"
repoUrl: "https://github.com/mozi1924/AgentJax"
homepage: ""
stars: 0
forks: 0
language: "Rust"
topics: ["ai-assistant","desktop-app","mcp","model-context-protocol","react","tauri"]
license: "GPL-3.0"
createdAt: "2026-05-23T16:02:35Z"
pushedAt: "2026-06-08T08:03:47Z"
defaultBranch: "main"
archived: false
---
# AgentJax

AgentJax is a desktop AI assistant built with React, Vite, and Tauri. It focuses on configurable providers, reusable model profiles, and local MCP tool integration.

## Documentation

- [Documentation home](https://github.com/mozi1924/AgentJax/blob/main/docs/README.md)
- [Configuration reference](https://github.com/mozi1924/AgentJax/blob/main/docs/configuration.md)
- [Calculator engine status](https://github.com/mozi1924/AgentJax/blob/main/docs/dev/calculator-fend-core.md)
- [Development plan](https://github.com/mozi1924/AgentJax/blob/main/docs/dev/PLAN.md)
- [Provider abstraction notes](https://github.com/mozi1924/AgentJax/blob/main/docs/dev/agent-provider-abstraction.md)

## Quick Start

```bash
pnpm install
pnpm dev
```

For the desktop app:

```bash
pnpm dev:desktop
```

Desktop builds currently target Rust `1.95.0` for the `src-tauri` workspace.

To produce a build:

```bash
pnpm build
pnpm build:desktop
```

## Configuration

AgentJax creates its configuration on first launch under `AGENTJAX_HOME`:

- `AGENTJAX_HOME` default: `~/.agentjax`
- Config file: `$AGENTJAX_HOME/config.yaml`
- Sessions directory: `$AGENTJAX_HOME/sessions/`

The full configuration layout, field descriptions, and generated cache files are documented in [docs/configuration.md](https://github.com/mozi1924/AgentJax/blob/main/docs/configuration.md).
