# Change: 实现 Phase 2 — Agent / Tool / Session 核心

## Why

P1 建立了运行时基座（Instance、Storage、Bus、Config、Provider、Server、CLI）。现在需要实现 Agent 平台的核心业务实体：增强的 Agent 注册系统（Domain/Category/Capability）、Tool 注册系统（MCP 适配）、Session 会话系统（消息处理主循环、LLM 流式响应、工具调用循环），以及基础权限、Skill 加载、Git 快照。这些是所有后续功能（Workflow 编排、Swarm 蜂群、Web 产品）的业务基础。

## What Changes

- **Agent 注册系统增强** — 在现有 `AgentRegistry` 基础上，扩展 `AgentDefinition` 支持 domain/role/capabilities/tools/skills/mode/model/temperature/systemPrompt/permissions，支持三种定义方式（YAML/Markdown/TypeScript），实现 `scanAndRegister()`、`byDomain()`、`byCapability()`、`instantiate()` 方法（对应设计文档 §4）。注意：`role` 表示 Agent 角色类型（orchestrator/specialist/advisor/executor/utility），与 P3 引入的 `Category`（模型+温度+prompt 预设组合）是不同概念
- **Tool 注册系统增强** — 扩展 `ToolDefinition` 支持 `ToolCategory`（file/code/document/search/api/data/shell/communication/utility），实现 MCP 工具适配器（`loadFromMCP()`）、`forAgent()` 按 Agent 权限过滤、`toAISDKTools()` 转 AI SDK 格式（对应设计文档 §5）
- **内置工具集** — 实现核心工具：`read`（读文件）、`write`（写文件）、`edit`（编辑文件）、`bash`（Shell 执行）、`glob`（文件搜索）、`grep`（文本搜索）、`ls`（列目录）、`subtask`（子 Agent 调用）、`fetch`（网页抓取）、`todo`（待办管理），参考 OpenCode `src/tool/`
- **Session 会话系统** — 实现 Session CRUD（创建/列表/获取/删除/fork）、消息模型（User/Assistant/Part）、Session Prompt 主循环（用户输入 → Agent 解析 → Provider 获取 → 工具集构建 → LLM 流式调用 → 工具执行循环 → 持久化），参考 OpenCode `src/session/`
- **MCP 客户端** — Model Context Protocol 客户端实现，支持从 `.vitamin/mcp.json` 配置连接 MCP 服务器，加载远程工具（对应设计文档 §5.3）
- **权限系统基础** — 基于规则集的权限控制（allow/deny/ask），支持通配符匹配，规则优先级叠加（defaults → agent → user → session），参考 OpenCode `src/permission/`
- **Skill 加载器** — 重构现有 `skill.ts` 移除 Bun 依赖，支持 `.vitamin/skills/`、项目 `skills/` 目录的 Skill.md 发现与解析（对应设计文档 §1.5.2）
- **Git Snapshot** — 文件快照/回滚系统，在工具执行前记录文件状态，支持回滚到任意快照点（参考 OpenCode `src/snapshot/`）
- **Grounding 知识接地 MVP** — 实现 `code_repo`（代码仓库索引）+ `data_store`（数据存储）两种 MVP 数据源（对应设计文档 §3.4）
- **Memory 短期记忆** — 实现 shortTerm（会话内消息历史）+ working（当前任务上下文），Phase 1 记忆层（对应设计文档 §3.5）
- **Capability 能力抽象** — `Capability` 类型定义（file/code/document/api/data/search/reasoning/communication），Agent 声明能力 → 注册表按能力查询（对应设计文档 §3.2）
- **CLI 命令扩展** — `vitamin agent list`、`vitamin tool list`、`vitamin session list`、`vitamin mcp list` 管理命令

## Impact

- Affected specs: `agent-platform` (add agent/tool/session/mcp/permission/skill capabilities)
- Affected code:
  - `packages/agent/src/` — agent-registry.ts(重写增强), tool-registry.ts(重写增强), capability.ts(新), agent-loader.ts(新)
  - `packages/vitamin/src/` — session/(新目录), mcp.ts(新), permission.ts(新), skill.ts(重构), snapshot.ts(新), grounding.ts(新), memory.ts(新)
  - `packages/vitamin/src/tool/` — 新目录，10+ 内置工具
  - `packages/cli/src/cmd/` — agent.ts(新), tool.ts(新), session.ts(新), mcp.ts(新)
- Dependencies added: `@modelcontextprotocol/sdk`, `gray-matter`（frontmatter 解析）, `diff`（patch 生成）
- Depends on: P1（Instance, Storage, Bus, Config, Provider, Server）
