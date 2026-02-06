## 1. Domain 领域抽象

- [ ] 1.1 实现 `packages/vitamin/src/domain.ts` — `Domain` 命名空间：DomainDefinition（id, name, agents, tools, workflows, skills）、DomainRegistry（register, get, list, match），内置 Domain 定义（coding/analysis/documentation/testing/operations/management），对应设计文档 §3.1
- [ ] 1.2 实现 `Domain.match(input)` — 根据用户输入推断最匹配的领域
- [ ] 1.3 为 Domain 编写 Vitest 测试

## 2. Category + Skill 路由系统

- [ ] 2.1 实现 `packages/vitamin/src/orchestration/category.ts` — Category 定义（id, model, temperature, systemPromptTemplate, maxTokens, thinkingBudget），内置 Category（visual-engineering[gemini-2.5-pro], ultrabrain[o3], autonomous[claude-opus-4], creative[gemini-2.5-flash], quick[claude-haiku], documentation[gemini-2.5-flash], unspecified-low[claude-sonnet-4], unspecified-high[claude-opus-4]），**所有内置模型均可通过用户配置覆盖**，参考 oh-my-opencode `src/tools/delegate-task/constants.ts`
- [ ] 2.2 实现 `packages/vitamin/src/orchestration/skill-router.ts` — Skill 路由器：根据任务描述匹配已加载 Skill，注入 Skill prompt + 绑定 MCP 工具，支持 Combo（category + skill 组合策略），参考 oh-my-opencode `src/features/builtin-skills/skills.ts`
- [ ] 2.3 实现内置 Skill 集 — `playwright`（浏览器自动化 + @playwright/mcp）、`frontend-ui-ux`（设计思维 prompt）、`git-master`（Git 专家 prompt）
- [ ] 2.4 实现 `packages/vitamin/src/orchestration/delegate.ts` — `delegate_task` 工具核心实现：接收 category + skills + task 参数 → 解析 Category 获取 model/temperature → 加载 Skill 注入 prompt → 创建子 Session 执行 → 返回结果，参考 oh-my-opencode `src/tools/delegate-task/tools.ts`（1141 行）
- [ ] 2.5 为 Category/Skill 路由编写 Vitest 测试（Category 匹配、Skill 注入、delegate_task 执行流程）

## 3. 规划/执行分离

- [ ] 3.1 实现 `packages/vitamin/src/orchestration/plan-exec.ts` — 三层角色分离机制：
  - **Planner 模式**：READ-ONLY，只能写 `.vitamin/plans/*.md`，不能执行代码/工具
  - **Orchestrator 模式**：不能直接写代码，必须通过 `delegate_task` 委派
  - **Specialist 模式**：可执行代码和工具，但不能再委派（防止无限递归）
  参考 oh-my-opencode `src/agents/prometheus-prompt.ts` + `src/hooks/atlas/`
- [ ] 3.2 实现计划文件管理 — `.vitamin/plans/` 目录：计划创建、状态追踪（draft → approved → executing → completed）、任务拆解持久化
- [ ] 3.3 实现 `/plan` 命令触发 — 用户输入 `@plan` 或 `/plan` 切换到规划模式
- [ ] 3.4 实现 `/start-work` 命令 — 从计划文件启动执行，Orchestrator 逐步委派
- [ ] 3.5 为规划/执行分离编写 Vitest 测试

## 4. Agent 矩阵 & 动态 Prompt

- [ ] 4.1 实现 `packages/vitamin/src/agent-matrix/matrix.ts` — Agent 元数据体系：每个 Agent 声明 metadata（type[exploration/specialist/advisor/utility], cost[FREE/CHEAP/EXPENSIVE], delegationTrigger, whenToUse, whenNotToUse, quickMatch），参考 oh-my-opencode `src/agents/` 的 AgentInfo 模式
- [ ] 4.2 实现 `packages/vitamin/src/agent-matrix/prompt-builder.ts` — 动态 Prompt 构建器：遍历注册 Agent 元数据 → 自动生成主 Agent 的 system prompt（何时委派、委派给谁），添加/移除 Agent 无需手动修改 prompt，参考 oh-my-opencode `src/agents/dynamic-agent-prompt-builder.ts`（360 行）
- [ ] 4.3 实现 `packages/vitamin/src/orchestration/intent-gate.ts` — Phase 0 Intent Gate：每条用户消息 → 快速分类（Trivial → 直接工具 / Explicit → 直接执行 / Exploratory → 并行探索 / Open-ended → 深入评估 / Ambiguous → 澄清提问），参考 oh-my-opencode Sisyphus 决策流程
- [ ] 4.4 为动态 Prompt 和 Intent Gate 编写 Vitest 测试

## 5. 内置 Agent 矩阵

- [ ] 5.1 实现 `packages/vitamin/src/agent-matrix/agents/planner.ts` — Planner Agent（规划者）：高推理模型（claude-opus），READ-ONLY 权限，systemPrompt 包含规划方法论，参考 oh-my-opencode Prometheus
- [ ] 5.2 实现 `packages/vitamin/src/agent-matrix/agents/orchestrator.ts` — Orchestrator Agent（编排者）：高推理模型 + 高思考预算，不可直接写代码，只能 delegate_task，参考 oh-my-opencode Atlas
- [ ] 5.3 实现 `packages/vitamin/src/agent-matrix/agents/coder.ts` — Coder Agent（编码专家）：主 Agent，完整工具权限，动态 prompt 包含 Agent 矩阵信息，参考 oh-my-opencode Sisyphus
- [ ] 5.4 实现 `packages/vitamin/src/agent-matrix/agents/explorer.ts` — Explorer Agent（代码探索）：subagent 模式，只读工具（read/grep/glob/ls），用于代码库理解
- [ ] 5.5 实现 `packages/vitamin/src/agent-matrix/agents/analyst.ts` — Analyst Agent（分析师）：subagent 模式，数据分析和需求分析专用
- [ ] 5.6 实现 `packages/vitamin/src/agent-matrix/agents/reviewer.ts` — Reviewer Agent（审阅者）：subagent 模式，高精度验证模式，参考 oh-my-opencode Momus
- [ ] 5.7 为所有内置 Agent 编写 Vitest 测试

## 6. Hook 生命周期系统

- [ ] 6.1 实现 `packages/vitamin/src/hook.ts` — Hook 命名空间：`Hook.define(name, lifecycle, handler)` 注册 Hook，生命周期点包括：
  - `prompt.before` — 用户消息进入前
  - `prompt.after` — LLM 响应完成后
  - `tool.before` — 工具执行前
  - `tool.after` — 工具执行后
  - `session.create` — Session 创建时
  - `session.compaction` — 上下文压缩时
  - `context.inject` — 注入额外上下文
  - `agent.delegate` — Agent 委派前
  参考 oh-my-opencode 的 32 Hook 架构，但精简为核心集
- [ ] 6.2 实现 Hook 优先级和禁用机制 — 通过配置文件启用/禁用特定 Hook
- [ ] 6.3 实现核心 Hook 集：
  - `orchestration-enforcer` — 确保 Orchestrator 不直接写代码
  - `planner-readonly` — 确保 Planner 只写 plan 文件
  - `tool-output-truncator` — 工具输出截断
  - `context-injector` — 目录/README/规则注入
  - `delegate-retry` — 委派失败重试
- [ ] 6.4 为 Hook 系统编写 Vitest 测试

## 7. Workflow 编排引擎

- [ ] 7.1 实现 `packages/vitamin/src/workflow/definition.ts` — `WorkflowDefinition`（id, name, inputs(zod), outputs(zod), steps, metadata），步骤类型枚举（AgentStep/ToolStep/ConditionStep/ParallelStep/LoopStep/SubWorkflowStep/HumanStep），参考设计文档 §6
- [ ] 7.2 实现 `packages/vitamin/src/workflow/engine.ts` — `WorkflowEngine.execute(workflow, inputs)` 主执行器：按步骤类型分发 → 状态机管理（pending → running → completed/failed）→ 错误处理与恢复 → 模板变量渲染（`{{ steps.xxx.output }}`）
- [ ] 7.3 实现 `packages/vitamin/src/workflow/steps/agent-step.ts` — Agent 步骤执行器：创建 Session → 发送 input → 等待完成 → 提取 output
- [ ] 7.4 实现 `packages/vitamin/src/workflow/steps/tool-step.ts` — Tool 步骤执行器：直接调用注册工具
- [ ] 7.5 实现 `packages/vitamin/src/workflow/steps/condition-step.ts` — 条件分支：evaluate 表达式 → then/else 分支
- [ ] 7.6 实现 `packages/vitamin/src/workflow/steps/parallel-step.ts` — 并行执行：多分支 Promise.all 并发
- [ ] 7.7 实现 `packages/vitamin/src/workflow/steps/loop-step.ts` — 循环步骤：condition + maxIterations
- [ ] 7.8 实现 `packages/vitamin/src/workflow/steps/human-step.ts` — 人工审批步骤：暂停执行 → Bus 事件通知 → 等待用户响应
- [ ] 7.9 为 Workflow 引擎编写 Vitest 测试（各步骤类型、嵌套 workflow、错误恢复）

## 8. 场景模板系统

- [ ] 8.1 实现 `packages/vitamin/src/template/definition.ts` — `TemplateDefinition`（id, name, description, domain, inputs(zod), agents, tools, workflow, systemPromptOverrides）
- [ ] 8.2 实现 `packages/vitamin/src/template/registry.ts` — `TemplateRegistry`（register, get, list, scan），从 `.vitamin/templates/` 目录扫描加载
- [ ] 8.3 实现预置模板：
  - `requirement-analysis` — 需求分析模板（analyst + explorer + coder）
  - `bug-fix` — BUG 修复模板（explorer → analyst → coder → reviewer）
  - `feature-dev` — 特性开发模板（planner → orchestrator → coder → reviewer）
  - `doc-writing` — 文档撰写模板（explorer + analyst → documentation writer）
  - `code-review` — 代码审查模板（reviewer + explorer + coder）
- [ ] 8.4 实现 `packages/vitamin/src/template/synthesis.ts` — 动态模板捏合系统：根据用户描述 → LLM 推断所需 domain/agents/tools/workflow → 动态组装模板（对应设计文档 §9.3）
- [ ] 8.5 为模板系统编写 Vitest 测试

## 9. Background Agent 管理器

- [ ] 9.1 实现 `packages/vitamin/src/background.ts` — BackgroundManager 命名空间：并发管理（限制最大后台 Agent 数）、后台任务生命周期（submit → running → completed）、结果汇总，参考 oh-my-opencode `src/features/background-agent/manager.ts`
- [ ] 9.2 为 BackgroundManager 编写 Vitest 测试

## 10. Server 路由扩展

- [ ] 10.1 实现 Workflow API — `GET /workflow`、`POST /workflow/:id/execute`、`GET /workflow/:id/status`
- [ ] 10.2 实现 Template API — `GET /template`、`POST /template/:id/run`
- [ ] 10.3 实现 Domain API — `GET /domain`

## 11. CLI 命令扩展

- [ ] 11.1 实现 `vitamin plan <task>` — 进入规划模式，Planner Agent 生成计划
- [ ] 11.2 实现 `vitamin workflow list` / `vitamin workflow run <id>` — Workflow 管理
- [ ] 11.3 实现 `vitamin template list` / `vitamin template run <id>` — 模板管理

## 12. 集成验证

- [ ] 12.1 编写端到端测试 — 用户输入 → Intent Gate 分类 → delegate_task（Category+Skill）→ 子 Agent 执行 → 结果返回
- [ ] 12.2 编写 Workflow 端到端测试 — BUG 修复模板 → Workflow 自动执行 → 多步骤完成
- [ ] 12.3 编写规划/执行分离测试 — /plan → 生成计划 → /start-work → Orchestrator 委派 → Specialist 执行
- [ ] 12.4 TypeScript 编译零错误，所有测试通过
