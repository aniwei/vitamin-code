## 1. AIME 动态规划器

- [ ] 1.1 实现 `packages/vitamin/src/planner/domain-analyzer.ts` — DomainAnalyzer：分析用户输入 → 识别涉及的 Domain/Capability → 估算复杂度 → 决定是否需要规划（Bypass 判断），对应设计文档 §6.5
- [ ] 1.2 实现 `packages/vitamin/src/planner/bypass.ts` — Bypass 机制：
  - 短请求（< 50 tokens）→ 直接执行
  - 单文件操作 → 直接执行
  - 明确 Category 匹配 → 直接路由
  - 用户显式 `/no-plan` → 跳过规划
- [ ] 1.3 实现 `packages/vitamin/src/planner/core.ts` — DynamicPlannerCore：
  - 战略计划（Strategic Plan）：高层目标分解为子目标
  - 战术计划（Tactical Plan）：子目标拆解为具体任务，分配 Actor
  - 计划输出格式：`PlanNode { id, goal, tasks[], dependencies[], status, assignedActor }`
- [ ] 1.4 实现 `packages/vitamin/src/planner/actor-factory.ts` — ActorFactory：
  - `selectBaseAgent(task)` — 按 domain/capability/complexity 匹配最优 Agent
  - `createActor(spec)` — 基于 ActorSpec（baseAgent + tools + skills + model）动态实例化专用 Agent
  - 与 Category+Skill 路由系统集成
- [ ] 1.5 实现 `packages/vitamin/src/planner/progress.ts` — ProgressManager：
  - 集中式状态管理（单一事实来源）
  - 任务状态：`pending → assigned → running → completed/failed/blocked`
  - 依赖图追踪 + 阻塞检测
  - JSON 持久化到 `.vitamin/progress/{planId}.json`
  参考 oh-my-opencode `src/progress/`
- [ ] 1.6 实现 `packages/vitamin/src/planner/replan.ts` — 重规划触发器：
  - 事件触发：任务失败、关键证据发现、依赖阻塞
  - 阈值触发：进度停滞超时、Token 预算剩余不足 20%
  - 频率控制：最大重规划 3 次 / 冷却 60 秒
- [ ] 1.7 实现 Planner Hook 集成 — 通过 `prompt.before` Hook 介入 Session Prompt 流程：
  - 配置策略：`always`（总是规划）/ `adaptive`（复杂任务规划）/ `never`（禁用）
  - 修改 `delegate_task` 支持 `plan_id` / `task_id` / `use_actor_factory` 参数
- [ ] 1.8 为动态规划器编写 Vitest 测试（Bypass 判断、计划生成、Actor 创建、Progress 追踪、重规划触发）

## 2. 可视化调试系统

- [ ] 2.1 实现 `packages/vitamin/src/debug/breakpoint.ts` — 断点定义（16 种位置）：
  - LLM Loop：`llm.before_call` / `llm.after_response` / `llm.on_tool_decision` / `llm.on_stream_chunk`
  - Tool：`tool.before_execute` / `tool.after_execute` / `tool.on_error` / `tool.on_permission`
  - Agent 生命周期：`agent.on_create` / `agent.on_terminate` / `agent.on_idle_timeout`
  - 消息：`message.on_send` / `message.on_receive`
  - Workflow：`workflow.on_step_start` / `workflow.on_step_end`
  - Orchestration：`orchestration.on_delegate`
  - 断点条件（`when` 表达式）+ 命中次数过滤（`hitCount`）
- [ ] 2.2 实现 `packages/vitamin/src/debug/session.ts` — DebugSession：
  - `enable()` / `disable()` — 开启/关闭调试
  - `addBreakpoint(bp)` / `removeBreakpoint(bpId)` — 断点管理
  - `checkpoint(location, context)` — 检查是否命中断点 → 暂停执行 → 发布 `debug.paused` 事件 → 等待 resume
  - `resume(action)` — 恢复执行（continue / step_over / step_into / step_out / run_to_cursor）
- [ ] 2.3 实现 `packages/vitamin/src/debug/context.ts` — DebugContext：完整上下文快照（agent 状态、swarm 拓扑、LLM 参数、工具结果、workflow 进度、memory 内容）
- [ ] 2.4 实现 `packages/vitamin/src/debug/log.ts` — 结构化日志：DebugLogEntry（timestamp, level, source, category, traceId, spanId, message, data），与 Bus 事件集成
- [ ] 2.5 实现 `packages/vitamin/src/debug/replay.ts` — 轨迹回放系统：
  - 记录完整执行轨迹（事件序列 + 上下文快照链）
  - 回放：按时间轴逐步重放事件 → 恢复上下文 → 可视化展示
  - 支持 2x/4x 倍速 + 跳转到断点
- [ ] 2.6 实现 Debug API 路由：
  - `POST /debug/session` — 创建调试会话
  - `POST /debug/breakpoint` / `DELETE /debug/breakpoint/:id` — 断点管理
  - `POST /debug/resume` — 恢复执行
  - `GET /debug/context` — 获取当前调试上下文
  - `GET /debug/trace/:sessionId` — 获取执行轨迹
  - `GET /debug/events` — 调试事件 SSE 流
- [ ] 2.7 在 AgentRunner.loop() 和 SessionProcessor.process() 中插入 checkpoint 调用
- [ ] 2.8 为调试系统编写 Vitest 测试（断点匹配、暂停/恢复、上下文快照、轨迹记录）

## 3. 弹性扩缩容

- [ ] 3.1 实现 `packages/vitamin/src/scaling/metrics.ts` — Metrics 采集器：
  - Runner 级指标：活跃 Runner 数、队列等待数、平均处理时间、LLM 调用延迟
  - 系统级指标：CPU/Memory 使用率、事件处理速率
  - 采集间隔：10 秒
- [ ] 3.2 实现 `packages/vitamin/src/scaling/strategy.ts` — 自动扩缩容策略：
  - 扩容触发：队列等待 > 阈值 || 活跃 Runner 占比 > 80%
  - 缩容触发：空闲 Runner > 总数 50% && 持续 > 5 分钟
  - 扩缩步长：每次 +/- 25% 容量
  - 最大/最小 Runner 数限制
- [ ] 3.3 实现 `packages/vitamin/src/scaling/discovery.ts` — 服务发现（为多机部署预留）：
  - 本地模式：单机所有 Runner
  - 多机模式：mDNS / 注册中心（API endpoint）发现其他节点
  - 节点心跳 + 健康检查
- [ ] 3.4 实现 `packages/vitamin/src/scaling/distributed.ts` — 分布式调度（为多机部署预留）：
  - 任务分配策略：round-robin / least-loaded / affinity
  - 跨节点消息路由（MessageHub 扩展）
- [ ] 3.5 为扩缩容编写 Vitest 测试

## 4. Agent 评估体系

- [ ] 4.1 实现 `packages/vitamin/src/eval/framework.ts` — 评估框架核心：
  - `EvalSuite`（id, name, agentId, cases[]）— 评估套件
  - `EvalCase`（id, input, expectedOutput?, graders[]）— 评估用例
  - `EvalResult`（caseId, score, details, duration）— 评估结果
  - `EvalReport`（suiteId, results[], summary, timestamp）— 评估报告
- [ ] 4.2 实现 `packages/vitamin/src/eval/grader.ts` — 评分器类型：
  - `ExactMatch` — 精确匹配
  - `PatternMatch` — 正则/模式匹配
  - `LLMGrader` — LLM 评分（提供 rubric → LLM 打分）
  - `HumanGrader` — 人工评分（暂停等待人工评分）
  - `CompositeGrader` — 复合评分（多个 Grader 加权平均）
  参考设计文档 §11
- [ ] 4.3 实现 `packages/vitamin/src/eval/runner.ts` — 评估执行器：
  - `run(suite)` — 执行评估套件（创建 Session → 发送 input → 收集 output → 评分）
  - 支持并行执行多个 Case
  - 处理非确定性（多次运行取统计值）
- [ ] 4.4 实现 `packages/vitamin/src/eval/report.ts` — 评估报告生成（JSON + Markdown 格式），能力雷达图数据
- [ ] 4.5 实现 CLI 命令 — `vitamin eval run <suite>` / `vitamin eval report <suite>`
- [ ] 4.6 为评估体系编写 Vitest 测试

## 5. 权限与安全增强

- [ ] 5.1 实现 `packages/vitamin/src/security/sandbox.ts` — 沙箱执行环境：
  - Shell 沙箱：限制可执行命令白名单、文件系统访问范围、网络访问控制
  - 超时保护：工具执行超时强制终止
  - 资源限制：内存/CPU 使用上限
- [ ] 5.2 实现 `packages/vitamin/src/security/audit.ts` — 审计日志：
  - 记录所有 Agent 操作（工具调用、文件修改、Shell 执行、LLM 调用）
  - 日志格式：AuditEntry（timestamp, agent, action, target, result, metadata）
  - 持久化到 Storage（`audit/{date}/{entryId}.json`）
- [ ] 5.3 实现 `packages/vitamin/src/security/policy.ts` — 安全策略扩展：
  - IP 白名单（Server 中间件）
  - Rate Limiting（API 请求频率限制）
  - 敏感数据脱敏（LLM 调用前过滤 API Key/密码等）
- [ ] 5.4 为安全模块编写 Vitest 测试

## 6. 高级记忆系统

- [ ] 6.1 扩展 `packages/vitamin/src/memory.ts` — 新增：
  - `longTerm` — 跨 session 长期记忆：关键决策/模式/偏好持久化到 Storage
  - `episodic` — 情景记忆：关键操作快照（成功/失败的任务执行轨迹）
  - 可选 `semantic` — 语义记忆接口（预留向量存储集成点）
- [ ] 6.2 为高级记忆编写 Vitest 测试

## 7. 可观测性

- [ ] 7.1 实现 `packages/vitamin/src/observability.ts` — Observability 命名空间：
  - 结构化日志导出（OpenTelemetry 日志格式）
  - Metrics 采集 + 导出（Prometheus 格式端点 `GET /metrics`）
  - 分布式 Trace（跨 Agent 调用链 traceId/spanId 传播）
- [ ] 7.2 为可观测性编写 Vitest 测试

## 8. Web 调试面板

- [ ] 8.1 实现 Log Panel 页面 — 实时结构化日志流（可过滤 level/source/category）
- [ ] 8.2 实现 Agent Inspector — 选定 Agent 的完整状态查看（配置、当前上下文、工具列表、权限规则、LLM 参数）
- [ ] 8.3 实现 SubAgent Tree — 子 Agent 树形视图，展示委派链路
- [ ] 8.4 实现 Context Inspector — 当前断点处的完整上下文快照查看/编辑
- [ ] 8.5 实现 Tool Call Inspector — 工具调用详情（参数、结果、耗时、权限状态）
- [ ] 8.6 实现 LLM Loop Timeline — 时间轴视图展示 LLM 推理循环（每轮调用、token 消耗、工具决策）
- [ ] 8.7 实现 Trace Replay — 轨迹回放播放器（时间轴 + 播放/暂停/倍速 + 上下文同步展示）
- [ ] 8.8 实现断点管理界面 — 断点列表（启用/禁用/条件编辑）、一键设置常用断点组合

## 9. CLI 扩展

- [ ] 9.1 实现 `vitamin eval run <suite>` — 执行评估套件
- [ ] 9.2 实现 `vitamin eval report <suite>` — 生成评估报告
- [ ] 9.3 实现 `vitamin debug enable/disable` — 开启/关闭调试模式
- [ ] 9.4 实现 `vitamin audit list` — 查看审计日志

## 10. 集成验证

- [ ] 10.1 动态规划端到端测试 — 复杂任务 → DomainAnalyzer → DynamicPlanner → ActorFactory → 并行执行 → ProgressManager 追踪 → 重规划触发
- [ ] 10.2 调试系统端到端测试 — 设置断点 → 执行任务 → 命中断点 → 暂停 → 查看上下文 → Resume → 完成
- [ ] 10.3 评估体系端到端测试 — 创建 EvalSuite → 运行 → 评分 → 生成报告
- [ ] 10.4 安全测试 — 沙箱隔离验证、审计日志记录验证、权限规则生效验证
- [ ] 10.5 TypeScript 编译零错误，所有测试通过
