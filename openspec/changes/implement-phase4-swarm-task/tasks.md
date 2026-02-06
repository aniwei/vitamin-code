## 1. Swarm 类型定义

- [ ] 1.1 实现 `packages/vitamin/src/swarm/types.ts` — 核心类型定义：
  - `SwarmWorkspaceInfo`（id, name, status, agents[], topology, createdAt）
  - `AgentInstance`（id, role, roleIndex, status[idle/active/suspended/terminated], inbox, tools, model, createdBy）
  - `SwarmMessage`（id, from, to, content, type[task/result/question/broadcast], timestamp）
  - `TopologyNode`（agentId, role, roleIndex, parent, children[], edges[]）
  - `TaskRecord`（id, workspaceId, input, status[queued/running/suspended/completed/failed/cancelled], result, events[], createdAt, updatedAt）

## 2. MessageHub 消息路由

- [ ] 2.1 实现 `packages/vitamin/src/swarm/message-hub.ts` — MessageHub 命名空间：
  - `send(from, to, message)` — 点对点消息投递到目标 Agent inbox
  - `broadcast(from, message)` — 广播消息到所有 Agent
  - `multicast(from, agentIds, message)` — 组播消息到指定 Agent 集合
  - 消息持久化到 Storage（`message/{workspaceId}/{messageId}.json`）
  - 消息投递触发 Bus 事件（`swarm.message.created`）
- [ ] 2.2 为 MessageHub 编写 Vitest 测试

## 3. AgentRunner 运行器

- [ ] 3.1 实现 `packages/vitamin/src/swarm/runner.ts` — AgentRunner 命名空间：
  - **主循环**：`loop(agent)` → 检查 inbox 未读消息 → 合并到 LLM 上下文 → 进入 LLM Loop → 处理结果（文本/工具调用/消息发送/Agent 创建）→ 持久化 → 回到主循环
  - **LLM Loop**：调用 `Provider.getModel()` → `LLM.stream()` → 解析 reasoning/text/tool-call → 工具调用（包括 `create`/`send` 原语工具）→ 判断是否继续
  - **生命周期**：idle（等待消息）→ active（处理中）→ suspended（人工暂停/等待）→ terminated（任务完成或销毁）
  - **Idle 超时**：超过配置时间无消息则自动 terminated
  参考设计文档 §7.5
- [ ] 3.2 实现 `create` 原语工具 — AgentRunner 内置工具，动态创建子 Agent：指定 role + tools + task → 创建 AgentInstance → 注册到 Topology → 启动子 Runner
- [ ] 3.3 实现 `send` 原语工具 — AgentRunner 内置工具，向指定 Agent 发送消息：指定 to + content → MessageHub.send()
- [ ] 3.4 为 AgentRunner 编写 Vitest 测试（主循环、LLM Loop、生命周期转换、原语工具）

## 4. Topology 拓扑管理

- [ ] 4.1 实现 `packages/vitamin/src/swarm/topology.ts` — Topology 命名空间：
  - `addNode(agent)` — 添加 Agent 到拓扑图
  - `removeNode(agentId)` — 移除 Agent（cascading 子 Agent 清理）
  - `addEdge(from, to, type)` — 添加关系边（created_by / messages_to）
  - `roleIndex(role)` — 为同角色 Agent 分配递增索引（coder-1, coder-2）
  - `getPath(agentId)` — 获取 Agent 在拓扑树中的路径（如 1-3-2）
  - `toGraph()` — 导出拓扑图结构（用于可视化）
  - `toASCII()` — ASCII 文本表示
  - 拓扑变更触发 Bus 事件（`swarm.topology.changed`）
- [ ] 4.2 为 Topology 编写 Vitest 测试

## 5. SwarmWorkspace 蜂群工作空间

- [ ] 5.1 实现 `packages/vitamin/src/swarm/workspace.ts` — SwarmWorkspace 命名空间：
  - `create(config)` — 创建蜂群工作空间（初始化 MessageHub + Topology + RunnerPool）
  - `get(id)` — 获取工作空间信息
  - `createAgent(workspace, config)` — 在工作空间中创建 Agent（`create` 原语的顶层入口）
  - `sendMessage(workspace, from, to, content)` — 发送消息（`send` 原语的顶层入口）
  - `chatWith(workspace, agentPath, content)` — 人类与指定 Agent 对话
  - `getTopology(workspace)` — 获取当前拓扑图
  - `getAgentHistory(workspace, agentId)` — 获取 Agent 的 LLM 历史
  - `terminate(workspace)` — 终止工作空间（清理所有 Runner）
- [ ] 5.2 为 SwarmWorkspace 编写 Vitest 测试

## 6. Runner Pool

- [ ] 6.1 实现 `packages/vitamin/src/swarm/pool.ts` — RunnerPool 命名空间：
  - `allocate(agent)` — 为 Agent 分配 Runner（如果有空闲 Runner 则复用，否则创建新 Runner）
  - `release(runner)` — 释放 Runner 回池
  - `setMaxConcurrency(n)` — 设置最大并发 Runner 数
  - `stats()` — 返回池状态（active/idle/total）
- [ ] 6.2 为 RunnerPool 编写 Vitest 测试

## 7. Swarm 事件定义

- [ ] 7.1 定义 Swarm Bus 事件 — 使用 `BusEvent.define()` 定义：
  - `swarm.agent.created` — Agent 创建事件（id, role, roleIndex, createdBy）
  - `swarm.agent.terminated` — Agent 终止事件
  - `swarm.agent.status` — Agent 状态变更（idle/active/suspended）
  - `swarm.message.created` — 消息创建事件
  - `swarm.llm.start` / `swarm.llm.end` — LLM 调用开始/结束
  - `swarm.llm.text` — LLM 流式文本
  - `swarm.tool.start` / `swarm.tool.end` — 工具调用开始/结束
  - `swarm.topology.changed` — 拓扑变更事件
  - `swarm.group.created` / `swarm.group.updated` — 消息组事件
- [ ] 7.2 为事件定义编写类型测试

## 8. Task API

- [ ] 8.1 实现 `packages/vitamin/src/task.ts` — Task 命名空间：
  - `submit(input)` — 异步提交任务 → 返回 TaskRecord（status: queued）→ 创建 SwarmWorkspace → 触发 Agent 执行
  - `get(taskId)` — 获取任务状态
  - `list(filter)` — 列出任务（按 workspace/status 过滤）
  - `cancel(taskId)` — 取消任务
  - `suspend(taskId)` / `resume(taskId)` — 暂停/恢复任务
  - TaskRecord 状态机：queued → running → suspended ⇄ running → completed/failed/cancelled
  - 每次状态变更持久化到 Storage + Bus 事件
- [ ] 8.2 实现 Task SSE 端点 — `GET /task/:id/events`：实时推送任务进度事件，支持 `Last-Event-ID` 断线重连
- [ ] 8.3 为 Task 编写 Vitest 测试

## 9. Task 鉴权中间件

- [ ] 9.1 实现 Task API 鉴权 — 通过配置选择模式：
  - `none` — 无鉴权（本地开发）
  - `jwt` — JWT token 验证
  - `oauth2` — OAuth2 流程
  参考设计文档 §7.11
- [ ] 9.2 为鉴权中间件编写 Vitest 测试

## 10. Server 路由扩展

- [ ] 10.1 实现 Swarm API 路由：
  - `POST /swarm` — 创建蜂群工作空间
  - `GET /swarm/:id` — 获取工作空间信息
  - `POST /swarm/:id/agent` — 创建 Agent
  - `POST /swarm/:id/message` — 发送消息
  - `POST /swarm/:id/chat/:agentPath` — 人类与 Agent 对话
  - `GET /swarm/:id/topology` — 获取拓扑图
  - `GET /swarm/:id/agent/:agentId/history` — 获取 Agent 历史
  - `DELETE /swarm/:id` — 终止工作空间
- [ ] 10.2 实现 Task API 路由：
  - `POST /task` — 提交任务（返回 202 Accepted）
  - `GET /task` — 列表任务
  - `GET /task/:id` — 获取任务详情
  - `POST /task/:id/cancel` — 取消任务
  - `POST /task/:id/suspend` / `POST /task/:id/resume` — 暂停/恢复
  - `GET /task/:id/events` — SSE 事件流

## 11. CLI 命令

- [ ] 11.1 实现 `vitamin swarm create` — 创建蜂群工作空间
- [ ] 11.2 实现 `vitamin swarm status <id>` — 查看工作空间状态和拓扑
- [ ] 11.3 实现 `vitamin task submit <message>` — 提交异步任务
- [ ] 11.4 实现 `vitamin task status <id>` — 查看任务状态
- [ ] 11.5 实现 `vitamin task list` — 列出任务

## 12. 集成验证

- [ ] 12.1 编写端到端测试 — 创建 SwarmWorkspace → 创建 Agent → 发送消息 → AgentRunner 处理 → LLM 调用（mock）→ 工具调用 → create 子 Agent → 拓扑变更 → 事件发布
- [ ] 12.2 编写 Task API 端到端测试 — POST /task → 202 → SSE 事件流 → 任务完成
- [ ] 12.3 确认拓扑图正确维护 parent-child 关系和 roleIndex
- [ ] 12.4 TypeScript 编译零错误，所有测试通过
