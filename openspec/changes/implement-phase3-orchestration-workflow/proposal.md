# Change: 实现 Phase 3 — 编排 / Workflow / 技能路由

## Why

P2 实现了 Agent/Tool/Session 核心，能完成单 Agent 对话。但要实现 oh-my-opencode 的多 Agent 编排能力（规划/执行分离、Category+Skill 路由、Agent 矩阵、专业委派），以及设计文档 §6 的 Workflow 编排引擎和 §9 的场景模板系统，需要本阶段构建。这些编排能力是 Vitamin-Code 区别于简单 AI Chat 的核心竞争力。

## What Changes

- **Domain 领域抽象** — `Domain` 定义（coding/analysis/documentation/testing/operations/management），每个 Domain 包含 agents + tools + workflows + skills 集合，`DomainRegistry` 注册与查询（对应设计文档 §3.1）
- **Category + Skill 路由系统** — 实现 oh-my-opencode 的 Category（模型+温度+prompt 预设组合，如 `visual-engineering`/`ultrabrain`/`quick`）+ Skill（知识注入+MCP 工具绑定），实现 `delegate_task` 工具（category + skill → 选择最优 Agent 实例配置），参考 oh-my-opencode `src/tools/delegate-task/`（对应设计文档 §1.5.2）
- **规划/执行分离** — 实现 oh-my-opencode 的核心编排理念：Planner（只读规划，输出 `.vitamin/plans/*.md`）→ Orchestrator（编排委派，不直接写代码）→ Specialist（执行实现，不可再委派），三层角色严格分离，参考 oh-my-opencode `src/agents/prometheus-prompt.ts`、`src/hooks/atlas/`（对应设计文档 §1.5.1）
- **Agent 矩阵 & 动态 Prompt** — 实现 Agent 元数据驱动的动态 prompt 构建（添加/移除 Agent 无需手动修改主 prompt），Phase 0 Intent Gate 快速意图分类，参考 oh-my-opencode `src/agents/dynamic-agent-prompt-builder.ts`（对应设计文档 §1.5.3）
- **内置 Agent 矩阵** — 定义核心 Agent：Planner（规划者）、Orchestrator（编排者）、Coder（编码专家）、Analyst（分析师）、Explorer（代码探索，只读）、Reviewer（审阅者），参考 oh-my-opencode 的 Sisyphus/Atlas/Prometheus/Oracle/Explore/Momus
- **Hook 生命周期系统** — 实现可扩展的 Hook 系统，覆盖 prompt 前处理、工具调用后处理、session 事件、上下文注入等生命周期点，参考 oh-my-opencode 的 32 Hook 架构（对应设计文档 §1.5 的编排理念）
- **Workflow 编排引擎** — 实现 `WorkflowDefinition` 和步骤类型：AgentStep / ToolStep / ConditionStep / ParallelStep / LoopStep / SubWorkflowStep / HumanStep，`WorkflowEngine.execute()` 状态机执行器（对应设计文档 §6）
- **场景模板系统** — 模板定义规范、预置模板（需求分析/BUG修复/特性开发/文档撰写/代码审查），动态模板捏合接口（对应设计文档 §9）
- **Background Agent** — 后台 Agent 管理器（并发任务、后台执行、结果汇总），参考 oh-my-opencode `src/features/background-agent/`
- **CLI 命令扩展** — `vitamin plan`（规划模式）、`vitamin workflow list/run`、`vitamin template list/run`

## Impact

- Affected specs: `agent-platform` (add orchestration/workflow/template capabilities)
- Affected code:
  - `packages/vitamin/src/domain.ts` — 新文件
  - `packages/vitamin/src/orchestration/` — 新目录（category.ts, skill-router.ts, delegate.ts, intent-gate.ts, plan-exec.ts）
  - `packages/vitamin/src/agent-matrix/` — 新目录（matrix.ts, prompt-builder.ts, agents/*.ts）
  - `packages/vitamin/src/hook.ts` — 新文件
  - `packages/vitamin/src/workflow/` — 新目录（engine.ts, definition.ts, steps/*.ts）
  - `packages/vitamin/src/template/` — 新目录（registry.ts, definition.ts, presets/*.ts, synthesis.ts）
  - `packages/vitamin/src/background.ts` — 新文件
  - `packages/cli/src/cmd/` — plan.ts(新), workflow.ts(新), template.ts(新)
- Dependencies added: 无新外部依赖
- Depends on: P1（基座）、P2（Agent/Tool/Session）
