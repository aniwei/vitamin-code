# Change: 建立 Agent 平台基础能力

## Why
- 按照《AGENT-PLATFORM-DESIGN》将现有工具链升级为通用 Agent 平台，支持多 Agent 协作、工具注册、Grounding 与动态规划。

## What Changes
- 建立 Agent Registry：注册/查询 Agent 元数据（角色、能力、工具绑定、版本）。
- 建立 Tool Registry：注册/查询工具（Extension/Function/DataStore/CodeExec），支持分配给 Agent。
- 引入 Workflow/Dynamic Planner 编排接口：以 create/send 最小原语驱动多 Agent 任务规划与执行。
- 提供 Memory/Grounding 接口：统一向检索/搜索/向量库等数据源注入上下文。
- 基础可观测性与安全约束：执行流程可追踪（事件流），约束受控调用和审计。
- 代码实现参考 refs/opencode 与 refs/oh-my-opencode 的模式/抽象，不直接复用代码，以减少样板。

## Impact
- Affected specs: agent-platform
- Affected code: packages/agent, packages/vitamin, packages/cli（后续实现时细化）
