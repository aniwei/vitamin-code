## Context

P4 构建 Swarm 蜂群系统和 Task API。这是一个全新的分布式 Agent 协作架构，在 P2 Session 单 Agent 对话和 P3 编排多 Agent 委派的基础上，引入动态 Agent 创建/销毁、液态拓扑、消息路由等新范式。参考设计文档 §7。

### 约束

- 依赖 P1（Instance, Storage, Bus, Config, Provider, Server）
- 依赖 P2（Agent, Tool, Session, Permission）
- 依赖 P3（Orchestration, Workflow, Background Agent）
- AgentRunner 必须复用 P2 的 LLM 调用基础设施（Provider, Tool 执行, Permission 检查）
- 所有状态通过 Storage 持久化
- 所有事件通过 Bus 发布，SSE 推送

### 相关方

- `packages/vitamin/src/swarm/` — Swarm 核心运行时
- `packages/vitamin/src/task.ts` — Task API
- `packages/vitamin/src/session/` — P2 Session（被 AgentRunner 复用）
- `packages/vitamin/src/background.ts` — P3 BackgroundManager（被 RunnerPool 扩展）

## Goals / Non-Goals

**Goals:**
- 实现 SwarmWorkspace 蜂群工作空间（Agent 集合 + 消息系统 + 拓扑图）
- 实现 `create + send` 两个极简协作原语
- 实现 AgentRunner 主循环（复用 P2 SessionProcessor 的 LLM 调用能力）
- 实现 MessageHub 消息路由（点对点/广播/组播）
- 实现 Topology 拓扑管理（关系图 + 角色索引）
- 实现 Runner Pool 并发管理
- 实现 Task API 异步任务链路 + SSE 事件流
- 实现可配置鉴权（none / jwt / oauth2）

**Non-Goals:**
- 不实现弹性自动扩缩容（P6 范围，§7.7）
- 不实现多机分布式部署（P6 范围，§7.10）
- 不实现可视化调试断点（P6 范围，§12）
- 不实现前端 Swarm Graph 可视化（P5 范围）

## Decisions

### Decision 1: AgentRunner 复用 SessionProcessor

AgentRunner 的 LLM Loop **复用** P2 的 `SessionProcessor`，而非独立实现。

```
AgentRunner.loop(agent)
  → 检查 inbox 未读消息
  → 合并消息到 LLM 上下文
  → SessionProcessor.process(messages, tools, model)  ← 复用 P2
    → LLM.stream() → tool calls → loop
  → 处理结果（包括 create/send 原语工具调用）
  → 持久化状态
  → 回到主循环
```

AgentRunner 在 SessionProcessor 之上增加的能力：
- **inbox 消息管理**：从 MessageHub 接收消息 → 合并到 LLM 上下文
- **原语工具注入**：自动注入 `create`/`send` 两个原语工具
- **生命周期管理**：idle/active/suspended/terminated 状态机
- **拓扑集成**：Agent 创建/销毁时更新 Topology

**理由：** 避免重复实现 LLM 调用、流式处理、工具执行、权限检查等核心逻辑。保持 DRY 原则。

**替代方案：** 完全独立实现 → 大量重复代码，维护成本高。

### Decision 2: RunnerPool 扩展 P3 BackgroundManager

P3 的 `BackgroundManager` 管理后台 Agent 任务（submit → running → completed）。P4 的 `RunnerPool` **扩展**（而非替代）BackgroundManager：

```
RunnerPool extends BackgroundManager 的概念：
  - BackgroundManager.submit(task) → 在后台运行单个 Agent 任务
  - RunnerPool.allocate(agent) → 管理 AgentRunner 实例的创建/复用/回收
  - RunnerPool 增加：并发限制、空闲回收、排队机制
```

**关系：** BackgroundManager 用于 P3 编排场景中的简单后台任务。RunnerPool 用于 P4 Swarm 场景中的复杂 Agent 生命周期管理。两者共存，RunnerPool 可内部使用 BackgroundManager 的任务调度能力。

**理由：** 保持 P3 BackgroundManager 的简洁性（用于编排场景），RunnerPool 增加 Swarm 特有的池化和生命周期管理。

### Decision 3: Topology 路径格式统一为索引格式

Topology 路径采用**索引格式** `1-3-2`（第 1 个根 Agent 创建的第 3 个子 Agent 创建的第 2 个孙 Agent），而非 `A-B-C` Agent ID 格式。

**理由：**
- 索引格式短小、可读性高，适合 CLI 和 API 引用
- 与设计文档 §7 的 `architect-1-3` 角色命名方案对齐
- Agent ID 可能很长（如 `sess_1234567890`），不适合路径表示
- `chatWith(workspaceId, "1-3-2", message)` 比 `chatWith(workspaceId, "sess_abc_def_ghi", message)` 更友好

### Decision 4: 消息持久化策略

所有 Swarm 消息持久化到 Storage（`message/{workspaceId}/{messageId}.json`），而非仅保存在内存中。

**理由：**
- 支持断线重连（Task SSE 的 `Last-Event-ID`）
- 支持 P6 轨迹回放
- 支持 Agent 重启后恢复 inbox 状态
- Storage 读写锁保证并发安全

**Trade-off：** 高频消息场景下 I/O 开销较大。可通过批量写入优化。

### Decision 5: JWT 鉴权使用 `jose` 而非 `jsonwebtoken`

Task API 的 JWT 鉴权使用 `jose` 库（纯 JavaScript，无 native addon）而非 `jsonwebtoken`（依赖 native crypto）。

**理由：** 与 P1 "零 native addon 依赖"的设计原则一致（P1 选择文件系统存储而非 SQLite 也是同样理由）。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| AgentRunner 复用 SessionProcessor 耦合风险 | 通过清晰的接口抽象（SessionProcessor 只暴露 `process()` 方法） |
| 消息持久化 I/O 开销 | 批量写入 + 异步写入（Bus 事件先发，Storage 写入异步） |
| RunnerPool 并发限制可能导致任务饥饿 | 优先级队列（高优先级 Agent 优先分配 Runner） |
| Topology 索引在 Agent 销毁后可能产生空洞 | 索引只增不减，销毁标记为 terminated 但保留索引 |
| `jose` JWT 验证性能 | 缓存已验证 token（TTL = token 剩余有效期） |

## Open Questions

- [ ] Swarm 消息是否需要 TTL（过期清理）？（建议 Yes，默认 24h）
- [ ] 是否需要消息优先级（urgent/normal/low）？（建议 P4 不实现，P6 扩展）
- [ ] RunnerPool 最大并发默认值？（建议 10，可配置）
