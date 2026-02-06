## Context

P3 构建编排层，将单 Agent 对话升级为多 Agent 协作系统。核心参考 oh-my-opencode 的编排架构，同时实现设计文档 §6 Workflow 引擎和 §9 场景模板系统。

### 关键参考源码

| 组件 | oh-my-opencode 源文件 | 行数 |
|------|----------------------|------|
| Category 定义 | `src/tools/delegate-task/constants.ts` | 462 |
| delegate_task 实现 | `src/tools/delegate-task/tools.ts` | 1141 |
| Skill 定义 | `src/features/builtin-skills/skills.ts` | 1730 |
| Prometheus Prompt | `src/agents/prometheus-prompt.ts` | 1284 |
| Atlas 编排 Hook | `src/hooks/atlas/index.ts` | 758 |
| 动态 Prompt Builder | `src/agents/dynamic-agent-prompt-builder.ts` | 360 |
| Background Manager | `src/features/background-agent/manager.ts` | 1377 |

## Goals / Non-Goals

**Goals:**
- 实现 Category + Skill 路由（oh-my-opencode 核心创新）
- 实现规划/执行三层分离（Planner → Orchestrator → Specialist）
- 实现 Agent 元数据驱动的动态 prompt 构建
- 实现完整 Workflow 编排引擎（7 种步骤类型）
- 实现场景模板系统（5 个预置模板 + 动态捏合）
- 实现 Hook 生命周期系统
- 实现 Background Agent 并发管理

**Non-Goals:**
- 不实现 AIME 动态规划器（P6 范围，§6.5）
- 不实现 Swarm 蜂群动态扩容（P4 范围）
- 不实现重规划触发机制（P6 范围，§1.5.4）
- 不实现 Web 前端模板/Workflow 编辑器（P5 范围）

## Decisions

### Decision 1: 简化 oh-my-opencode 的 Agent 矩阵

oh-my-opencode 有 10 个 Agent（Sisyphus, Atlas, Oracle, Prometheus, Metis, Momus, Librarian, Explore, Multimodal-Looker, Sisyphus-Junior）。Vitamin-Code 精简为 6 个核心 Agent：

| Vitamin-Code | oh-my-opencode 对应 | 理由 |
|-------------|---------------------|------|
| Planner | Prometheus | 规划者 |
| Orchestrator | Atlas | 编排者 |
| Coder | Sisyphus + Sisyphus-Junior | 合并主执行者 |
| Explorer | Explore + Oracle | 合并探索类 |
| Analyst | Metis + Librarian | 合并分析类 |
| Reviewer | Momus | 审阅者 |

**理由：** 减少认知负担，保持核心编排理念不变。后续可通过 Plugin 扩展更多 Agent。

### Decision 2: Hook 精简

oh-my-opencode 有 32 个 Hook。Vitamin-Code 精简为 8 个核心生命周期点 + 5 个内置 Hook：

**生命周期点：** `prompt.before`, `prompt.after`, `tool.before`, `tool.after`, `session.create`, `session.compaction`, `context.inject`, `agent.delegate`

**内置 Hook：** `orchestration-enforcer`, `planner-readonly`, `tool-output-truncator`, `context-injector`, `delegate-retry`

**理由：** 保留最关键的编排控制，降低复杂度。通过 Plugin 机制可以添加更多 Hook。

### Decision 3: Workflow 步骤类型完整实现

保留设计文档 §6 定义的全部 7 种步骤类型。`HumanStep` 通过 Bus 事件暂停/恢复实现。

### Decision 4: 动态模板捏合

通过 LLM 分析用户描述，自动组装 agents + tools + workflow 的模板。利用已注册的 Agent/Tool/Domain 元数据作为候选池。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| delegate_task 无限递归 | Specialist 模式禁止再委派 + 最大深度限制 |
| Hook 执行顺序冲突 | 优先级机制 + 明确的执行顺序文档 |
| Workflow 状态丢失 | 每步完成后持久化到 Storage |
| 动态 prompt 过长 | 根据 Agent 数量和模型上下文窗口动态截断 |

## Open Questions

- [ ] Category 默认模型列表是否应该硬编码还是全部可配置？（建议核心 Category 内置 + 全部可配置覆盖）
- [ ] Workflow HumanStep 超时策略？（建议 24h 超时 + 可配置）
- [ ] 动态模板捏合使用哪个模型？（建议使用用户配置的默认 Provider + 低 temperature）
