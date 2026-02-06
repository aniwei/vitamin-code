## 1. Capability 能力抽象

- [ ] 1.1 实现 `packages/agent/src/capability.ts` — `Capability` 类型定义（file/code/document/api/data/search/reasoning/communication），`CapabilitySet` 集合操作，`matchCapability()` 匹配函数
- [ ] 1.2 为 Capability 编写 Vitest 测试

## 2. Agent 注册系统增强

- [ ] 2.1 重写 `packages/agent/src/agent-registry.ts` — 扩展 `AgentDefinition`（增加 domain, role[orchestrator/specialist/advisor/executor/utility], capabilities, tools, skills, mode[primary/subagent], model, temperature, maxTokens, systemPrompt, permissions, metadata），参考设计文档 §4。注意：此处 `role` 表示 Agent 角色类型，与 P3 的 `Category`（模型+温度+prompt 路由预设）不同
- [ ] 2.2 实现 Agent 三种定义方式加载器 — YAML（`agent.yaml`）、Markdown（`agent.md` frontmatter）、TypeScript（`defineAgent()` 导出），参考设计文档 §4.2
- [ ] 2.3 实现 `packages/agent/src/agent-loader.ts` — `scanAndRegister(directory)` 扫描目录发现 Agent 定义文件并自动注册
- [ ] 2.4 实现 `AgentRegistry.byDomain(domain)` — 按领域查询 Agent 列表
- [ ] 2.5 实现 `AgentRegistry.byCapability(cap)` — 按能力查询 Agent 列表
- [ ] 2.6 实现 `AgentRegistry.instantiate(id, context)` — 创建 Agent 运行实例
- [ ] 2.7 实现 `AgentRegistry.resolve(input)` — 根据用户输入解析应使用哪个 Agent（参考 OpenCode `src/agent/agent.ts` 的 resolve 机制）
- [ ] 2.8 为 Agent 注册系统编写 Vitest 测试（注册/查询/实例化/扫描加载/resolve）

## 3. Tool 注册系统增强

- [ ] 3.1 重写 `packages/agent/src/tool-registry.ts` — 扩展 `ToolDefinition`（增加 category[file/code/document/search/api/data/shell/communication/utility], parameters(zod), execute(args, ctx), description, metadata），参考设计文档 §5
- [ ] 3.2 实现 `Tool.define(id, factory)` — 工具定义接口（参考 OpenCode `src/tool/` 的 `Tool.define` 模式）：`factory(initCtx) => { description, parameters, execute }`
- [ ] 3.3 实现 `ToolRegistry.forAgent(agentId)` — 按 Agent 权限和声明过滤可用工具
- [ ] 3.4 实现 `ToolRegistry.toAISDKTools()` — 将注册工具转为 Vercel AI SDK `tools` 格式
- [ ] 3.5 实现 `ToolRegistry.scanAndRegister(directory)` — 扫描 `.vitamin/tools/` 目录加载自定义工具
- [ ] 3.6 为 Tool 注册系统编写 Vitest 测试

## 4. 内置工具集

- [ ] 4.1 实现 `packages/vitamin/src/tool/read.ts` — 文件读取工具，参数: path/line range，参考 OpenCode `src/tool/read.ts`
- [ ] 4.2 实现 `packages/vitamin/src/tool/write.ts` — 文件写入工具，参数: path/content，参考 OpenCode `src/tool/write.ts`
- [ ] 4.3 实现 `packages/vitamin/src/tool/edit.ts` — 文件编辑工具，参数: path/oldText/newText，参考 OpenCode `src/tool/edit.ts`
- [ ] 4.4 实现 `packages/vitamin/src/tool/bash.ts` — Shell 执行工具，参数: command/timeout，参考 OpenCode `src/tool/bash.ts`
- [ ] 4.5 实现 `packages/vitamin/src/tool/glob.ts` — 文件搜索工具，参数: pattern/cwd，参考 OpenCode `src/tool/glob.ts`
- [ ] 4.6 实现 `packages/vitamin/src/tool/grep.ts` — 文本搜索工具，参数: pattern/path/regex，参考 OpenCode `src/tool/grep.ts`
- [ ] 4.7 实现 `packages/vitamin/src/tool/ls.ts` — 列目录工具，参数: path/depth，参考 OpenCode `src/tool/list.ts`
- [ ] 4.8 实现 `packages/vitamin/src/tool/subtask.ts` — 子 Agent 调用工具（启动子 session 执行任务），参考 OpenCode `src/tool/task.ts`
- [ ] 4.9 实现 `packages/vitamin/src/tool/fetch.ts` — 网页抓取工具，参数: url，参考 OpenCode `src/tool/fetch.ts`
- [ ] 4.10 实现 `packages/vitamin/src/tool/todo.ts` — 待办管理工具（read/write todo list），参考 OpenCode `src/tool/todo.ts`
- [ ] 4.11 为所有内置工具编写 Vitest 测试

## 5. MCP 客户端

- [ ] 5.1 实现 `packages/vitamin/src/mcp.ts` — MCP 客户端管理器：从 `.vitamin/mcp.json` 加载配置、连接/断开 MCP 服务器、发现并注册远程工具，参考 OpenCode `src/mcp/`
- [ ] 5.2 实现 `ToolRegistry.loadFromMCP(server)` — 将 MCP 服务器暴露的工具转为 ToolDefinition 并注册
- [ ] 5.3 为 MCP 编写 Vitest 测试（配置加载、工具发现）

## 6. Session 会话系统

- [ ] 6.1 实现 `packages/vitamin/src/session/index.ts` — Session CRUD：create（支持指定 agent/template）、list（按 project 过滤）、get、remove、fork（从任意消息点分叉），Session 数据持久化到 Storage，参考 OpenCode `src/session/index.ts`
- [ ] 6.2 实现 `packages/vitamin/src/session/message.ts` — 消息模型（MessageV2）：UserMessage / AssistantMessage / Parts（TextPart, ReasoningPart, ToolPart, SnapshotPart, PatchPart），Zod schema 定义，参考 OpenCode `src/session/message-v2.ts`
- [ ] 6.3 实现 `packages/vitamin/src/session/prompt.ts` — Session Prompt 主循环：接收用户输入 → Agent.resolve() → Provider.getModel() → ToolRegistry.tools() + MCP.tools() → 创建 SessionProcessor → processor.process() → 循环直到无 tool call，参考 OpenCode `src/session/prompt.ts`
- [ ] 6.4 实现 `packages/vitamin/src/session/processor.ts` — 流式处理器：调用 LLM.stream() → 解析 text/reasoning/tool-call 流 → 执行工具 → 写入 Part → Bus 发布事件 → 判断是否继续循环，参考 OpenCode `src/session/processor.ts`
- [ ] 6.5 实现 `packages/vitamin/src/session/llm.ts` — LLM 调用封装：构建 `streamText` 参数（system prompt + messages + tools + maxTokens），provider 参数转换，参考 OpenCode `src/session/llm.ts`
- [ ] 6.6 实现 `packages/vitamin/src/session/system.ts` — System Prompt 选择器：按模型类型选择最优 system prompt（Anthropic/Gemini/GPT 各有差异），参考 OpenCode `src/session/system.ts`
- [ ] 6.7 实现 `packages/vitamin/src/session/instruction.ts` — 指令收集器：从 AGENTS.md、`.vitamin/instructions/` 收集附加指令注入 system prompt，参考 OpenCode `src/session/instruction.ts`
- [ ] 6.8 实现 `packages/vitamin/src/session/compaction.ts` — 上下文压缩：当 token 超过模型上下文窗口时，压缩历史消息，参考 OpenCode `src/session/compaction.ts`
- [ ] 6.9 实现 `packages/vitamin/src/session/summary.ts` — 会话摘要生成（用于压缩后的上下文保留）
- [ ] 6.10 实现 `packages/vitamin/src/session/status.ts` — 会话状态追踪（busy/idle），防止并发 prompt
- [ ] 6.11 为 Session 编写 Vitest 测试（CRUD、消息持久化、prompt 循环 mock、compaction）

## 7. 权限系统

- [ ] 7.1 实现 `packages/vitamin/src/permission.ts` — 基于规则集的权限控制：`Rule { permission, pattern, action: allow|deny|ask }`，通配符匹配，规则叠加（defaults → agent → user → session），参考 OpenCode `src/permission/next.ts`
- [ ] 7.2 权限类型定义 — file.read、file.write、file.edit、bash.execute、mcp.call、network.fetch 等
- [ ] 7.3 为权限系统编写 Vitest 测试

## 8. Skill 加载器重构

- [ ] 8.1 重构 `packages/vitamin/src/skill.ts` — 移除 Bun 依赖（Bun.Glob → fast-glob，Bun.file → fs/promises），保持功能：扫描 `.vitamin/skills/` 和项目 `skills/` 目录，解析 Skill.md frontmatter（name + description + MCP 配置）
- [ ] 8.2 为 Skill 编写 Vitest 测试

## 9. Git Snapshot

- [ ] 9.1 实现 `packages/vitamin/src/snapshot.ts` — 在工具执行前（特别是 write/edit/bash）记录目标文件的 Git 状态快照，支持 revert 回滚到指定快照点，参考 OpenCode `src/snapshot/`
- [ ] 9.2 为 Snapshot 编写 Vitest 测试

## 10. Grounding 知识接地 MVP

- [ ] 10.1 实现 `packages/vitamin/src/grounding.ts` — Grounding 命名空间：`code_repo` 数据源（基于 grep/glob 的代码索引）+ `data_store` 数据源（Storage 层文件查询），对应设计文档 §3.4 MVP 范围
- [ ] 10.2 为 Grounding 编写 Vitest 测试

## 11. Memory 短期记忆

- [ ] 11.1 实现 `packages/vitamin/src/memory.ts` — Memory 命名空间：`shortTerm`（会话内消息历史管理）+ `working`（当前任务上下文），对应设计文档 §3.5 Phase 1
- [ ] 11.2 为 Memory 编写 Vitest 测试

## 12. Server 路由扩展

- [ ] 12.1 实现 Session API 路由 — `POST /session`（创建）、`GET /session`（列表）、`GET /session/:id`（详情）、`POST /session/:id/message`（发送消息）、`DELETE /session/:id`、`POST /session/:id/fork`
- [ ] 12.2 实现 Agent API 路由 — `GET /agent`（列表）、`GET /agent/:id`
- [ ] 12.3 实现 Tool API 路由 — `GET /tool`（列表）、`GET /tool/:id`
- [ ] 12.4 实现 MCP API 路由 — `GET /mcp`（列表）、`POST /mcp/:id/connect`、`POST /mcp/:id/disconnect`
- [ ] 12.5 实现 Permission API 路由 — `GET /permission/pending`、`POST /permission/:id/respond`
- [ ] 12.6 实现 Skill API 路由 — `GET /skill`（列表）

## 13. CLI 命令扩展

- [ ] 13.1 实现 `vitamin agent list` — 列出已注册 Agent
- [ ] 13.2 实现 `vitamin tool list` — 列出已注册 Tool（含 MCP 工具）
- [ ] 13.3 实现 `vitamin session list/create/delete` — Session 管理
- [ ] 13.4 实现 `vitamin mcp list/connect/disconnect` — MCP 服务器管理
- [ ] 13.5 完善 `vitamin run <message>` — 连接 Session Prompt 主循环，非交互式执行

## 14. 集成验证

- [ ] 14.1 编写端到端测试 — 创建 Session → 发送消息 → Agent 选择 → LLM 调用（mock provider）→ 工具执行 → 消息持久化 → 事件发布
- [ ] 14.2 确认 `vitamin run "Hello"` 可完成完整会话循环
- [ ] 14.3 确认 Server 所有新增 API 路由正常响应
- [ ] 14.4 TypeScript 编译零错误，所有测试通过
