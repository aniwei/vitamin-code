## ADDED Requirements

### Requirement: Agent Registry
系统 SHALL 提供 Agent Registry，用于注册/查询/禁用 Agent，至少支持字段：`name`、`role`、`description`、`version(semver)`、`visibility(public/internal/disabled)`、`tags[]`、`entryTools[]`（工具 ID 列表）、`state(active/disabled)`、`createdAt/updatedAt`。

#### Scenario: 注册并查询 Agent
- **WHEN** 客户端提交包含名称、角色、版本、可见性、工具绑定的 Agent 定义
- **THEN** 系统返回唯一 agentId 并可通过 agentId 查询完整元数据（含可用工具列表）

#### Scenario: 禁用 Agent
- **WHEN** 管理者对指定 agentId 发起禁用请求
- **THEN** 该 Agent 在 Registry 中标记为 disabled，Planner 不再调度它，查询时可见状态

#### Scenario: 按标签/可见性过滤
- **WHEN** 客户端按 `tags` 或 `visibility` 查询 Agent 列表
- **THEN** Registry 返回匹配的 Agent 元数据分页结果

### Requirement: Tool Registry
系统 SHALL 提供 Tool Registry，支持注册 Extension/Function/DataStore/CodeExec 工具，字段至少包含：`name`、`type`、`version(semver)`、`visibility(public/internal/hidden)`、`paramsSchema`（JSON Schema 或等价结构）、`description`、`boundAgents[]`、`authn` 提示信息（如需要凭证）。

#### Scenario: 注册工具并绑定 Agent
- **WHEN** 客户端提交工具元数据并绑定至已注册的 agentId
- **THEN** Registry 保存工具定义与绑定关系，Agent 查询时能获得可用工具清单

#### Scenario: 查询可用工具
- **WHEN** Planner 根据 agentId 请求可用工具列表
- **THEN** Registry 仅返回未禁用、匹配可见性的工具定义与参数 schema

### Requirement: Workflow Orchestrator (Dynamic Planner)
系统 SHALL 提供 Workflow/Dynamic Planner，基于 create/send 原语动态创建子 Agent、调度消息，支持并行与人类介入。Planner 请求至少包含：`goal`、`context[]`、`constraints`、`maxDepth`、`maxParallelism`、`allowHumanIntervention`、`timeout`、`traceId`。

#### Scenario: 动态规划与并行执行
- **WHEN** Planner 接收到包含目标、上下文、约束、并行度的任务请求
- **THEN** Planner 生成计划，按需 create 子 Agent，使用 send 分发子任务并并行收集结果，再汇总为最终输出

#### Scenario: 人类介入
- **WHEN** 任务开启 `allowHumanIntervention=true` 且 Planner 检测需要外部确认
- **THEN** Planner 暂停相关子任务并发出待确认事件，接收人类回复后继续规划/执行

### Requirement: Memory and Grounding Interface
系统 SHALL 暴露统一的 Grounding/Memory 接口，支持数据源类型（搜索、向量库、结构化数据源、代码仓库），输入至少包含 `query`/`embedding`、`dataSourceId`、`topK`、`filters`，输出包含命中内容、来源、置信度。

#### Scenario: 检索上下文注入
- **WHEN** Agent 在执行任务时请求外部上下文（查询词、数据源标识、topK）
- **THEN** 系统从配置的数据源检索结果，并以结构化形式注入 Planner/Agent 的上下文继续决策

### Requirement: Observability and Safety Controls
系统 SHALL 发出可观测事件（注册、规划、执行、工具调用、错误），事件至少包含：`timestamp`、`traceId`、`actor(agentId/userId)`、`action`、`target`、`status`、`latency`、`error`（可为空）、`payloadSummary`，并支持权限检查/审计钩子。

#### Scenario: 事件追踪与审计
- **WHEN** Planner 创建子 Agent 并触发工具调用
- **THEN** 系统记录事件（时间、主体、工具、参数摘要、结果状态），可供审计/调试订阅查看

#### Scenario: 失败事件上报
- **WHEN** 工具调用或规划节点失败
- **THEN** 系统产生 error 事件，包含 traceId、失败原因与可重试指示，供后续补偿或重试
