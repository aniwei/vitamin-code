## Context
- 依据《AGENT-PLATFORM-DESIGN》将 Vitamin 打造成通用 Agent 平台。
- 核心理念：极简原语（create/send）、Swarm 动态拓扑、规划与执行分离、Grounding/Memory 支撑决策。
- 现状：无现成平台规格，需先确立基础能力。

## Goals / Non-Goals
- Goals: 建立注册、编排、Grounding/Memory、可观测的基础能力定义；明确接口与职责；为后续实现提供约束。
- Non-Goals: 现阶段不交付生产级持久化、权限细节或 UI；不绑定特定模型/向量库供应商。

## Decisions
- 使用 create/send 作为多 Agent 协作最小原语；Planner 负责根据任务动态生成/拆解 Agent。
- Registry 分为 Agent Registry 与 Tool Registry，支持版本、标签、工具绑定与查询。
- Grounding 通过统一接口注入（搜索/向量库/结构化/代码仓），输入包含 query/embedding、dataSourceId、topK、filters，输出含来源与置信度；抽象数据源，避免供应商耦合。
- 可观测性依赖事件总线，事件至少包含 timestamp、traceId、actor、action、target、status、latency、error、payloadSummary，供审计/调试订阅。
- 代码实现参考 refs/opencode 与 refs/oh-my-opencode 的模式/抽象，不直接复制代码，以减少样板但保持兼容性。

## 参考模式（不直接复用代码）
- refs/opencode：client/server 架构、plan/build 分工的内置 Agent、提供多模型/多工具的可插拔层，可借鉴“provider 无关 + 角色分级”做法。
- refs/oh-my-opencode：预置专家矩阵（Oracle/Librarian/Frontend 等）、背景任务与 Hook 机制、“ultrawork” 一键全力模式，可借鉴为 Planner 的任务强度/并行策略及可插拔技能集。
- refs/swarm-ide：极简 create/send 原语、液态拓扑与人类随时介入的可观测图视角，可用于 Planner/事件总线的最小原语与可视化/订阅接口设计。

## Risks / Trade-offs
- 规范过宽：保持抽象但提供清晰场景；通过示例和必需字段约束。
- 供应商差异：以接口抽象 RAG/搜索，避免耦合。
- 动态拓扑复杂度：先以单工作流/单任务上下文描述，后续扩展并行和优先级。

## Migration Plan
- 先交付规格与示例；后续实现时可用内存/文件存储起步，再替换为持久化方案。

## Open Questions
- 首选的模型与向量库供应商？
- 是否需要内置权限/安全策略的最小集合？
- CLI/SDK 的首个对外接口优先级（注册、运行工作流、观测？）。
