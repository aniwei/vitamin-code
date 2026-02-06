## Context

P2 构建 Agent 平台的核心业务实体层。参考 OpenCode `src/session/`、`src/agent/`、`src/tool/`、`src/permission/`、`src/mcp/`、`src/snapshot/` 的实现模式，在 P1 基座之上实现完整的 Agent/Tool 注册 + Session 会话处理。

### 约束

- 依赖 P1 的 Instance、Storage、Bus、Config、Provider、Server
- Session Prompt 主循环是核心：必须支持完整的 LLM 流式调用 → 工具执行循环
- 工具执行必须经过权限检查
- 所有状态通过 Storage 持久化
- 事件通过 Bus 发布，Server SSE 推送

## Goals / Non-Goals

**Goals:**
- 完整的 Agent 注册系统（定义、加载、查询、实例化）
- 完整的 Tool 注册系统（定义、MCP 适配、权限过滤、AI SDK 转换）
- 10+ 内置工具（文件操作、Shell、搜索、子 Agent、网页抓取、待办）
- Session 会话主循环（用户输入 → LLM → 工具调用 → 循环 → 持久化）
- 流式处理（streaming text/reasoning/tool-call）
- 上下文压缩（token 超限时）
- MCP 客户端集成
- 基础权限控制

**Non-Goals:**
- 不实现 Workflow 编排（P3）
- 不实现 Category+Skill 路由（P3）
- 不实现 Planning/Execution 分离（P3）
- 不实现 Swarm 蜂群（P4）
- 不实现 Web 前端（P5）

## Decisions

### Decision 1: Session Prompt 主循环模式

采用 OpenCode 的 agentic loop 模式：

```
prompt(input)
  → assertNotBusy(sessionId)
  → Agent.resolve() — 确定使用哪个 agent
  → Provider.getModel() — 获取 LLM 模型
  → tools = ToolRegistry.forAgent() + MCP.tools()
  → processor = SessionProcessor.create()
  → processor.process(messages, tools, model)
    → LLM.stream(streamText params)
    → 解析 reasoning/text/tool-call 流
    → 执行 tool → Permission.check() → tool.execute()
    → 写入 Part (Storage) → Bus.publish 事件
    → hasToolCalls? → 继续循环 : 完成
  → Snapshot.track() — 记录文件快照
```

**理由：** 与 OpenCode 一致的成熟模式，支持流式处理和工具调用循环。

### Decision 2: 消息模型 — Part-based

采用 OpenCode 的 `MessageV2` Part 模型（而非单一 content string）：

- `TextPart` — 文本内容
- `ReasoningPart` — 推理过程
- `ToolPart` — 工具调用（参数 + 结果）
- `SnapshotPart` — 快照引用
- `PatchPart` — 文件变更 patch

**理由：** 支持细粒度的消息流式处理、UI 渲染和回滚操作。

### Decision 3: 工具定义接口

采用 OpenCode 的 `Tool.define(id, factory)` 模式：

```typescript
export const ReadTool = Tool.define("read", async (init) => ({
  description: "Read file contents",
  parameters: z.object({ path: z.string(), startLine: z.number().optional() }),
  async execute(args, ctx) {
    await ctx.permission.check("file.read", args.path)
    const content = await fs.readFile(args.path, "utf8")
    return { title: `Read ${args.path}`, output: content }
  }
}))
```

**理由：** 工厂模式支持延迟初始化和上下文注入。

### Decision 4: MCP 工具适配

MCP 工具通过 `@modelcontextprotocol/sdk` 连接服务器，自动转为 `ToolDefinition` 注册到 `ToolRegistry`：

```
MCP Server → mcp.listTools() → 转为 ToolDefinition[] → ToolRegistry.register()
```

**理由：** 统一工具接口，上层代码无需区分内置工具和 MCP 工具。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Session 并发安全 | assertNotBusy 锁 + Storage 写锁 |
| 工具执行超时 | AbortController + 超时配置 |
| LLM 流式错误 | 重试机制 + 错误 Part 记录 |
| MCP 服务器连接失败 | 优雅降级（跳过不可用 MCP 工具） |

## Open Questions

- [ ] subtask 工具是否应该创建子 session 还是复用当前 session？（建议子 session）
- [ ] 上下文压缩策略：摘要 vs 滑动窗口？（建议先摘要，与 OpenCode 一致）
