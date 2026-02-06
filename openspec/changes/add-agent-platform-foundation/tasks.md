## 1. 需求与规格
- [ ] 1.1 评审《AGENT-PLATFORM-DESIGN》关键章节，确认注册/编排/记忆范围
- [ ] 1.2 完成 agent-platform 规格（requirements + scenarios）
- [ ] 1.3 对照 refs/opencode 与 refs/oh-my-opencode 的模式/抽象，列出可复用点与差异

## 2. 技术方案
- [ ] 2.1 设计 Agent Registry 接口：字段校验（name/role/version/visibility/tags/entryTools/state），内存实现草案
- [ ] 2.2 设计 Tool Registry 接口：字段校验（name/type/version/visibility/schema/boundAgents/authn），内存实现草案
- [ ] 2.3 定义 create/send 原语的 Planner API 契约（输入：goal/context/constraints/maxParallelism/traceId 等；输出：计划+事件）
- [ ] 2.4 设计 Grounding 适配层接口（query/embedding/dataSourceId/topK/filters → hits+source+confidence），抽象数据源类型
- [ ] 2.5 设计可观测性事件模型与总线接口（事件字段、订阅/回放能力，含 error/retry 指示）

## 3. 实现与验证
- [ ] 3.1 实现内存版 Agent Registry/Tool Registry，覆盖校验与禁用/过滤
- [ ] 3.2 实现 Planner create/send API（并行度、超时、人类介入钩子），串联 Registry
- [ ] 3.3 实现 Grounding 适配 stub（可配置数据源，返回结构化命中），与 Planner/Agent 接口对接
- [ ] 3.4 打通事件总线：产生注册/规划/执行/工具调用/错误事件，支持订阅
- [ ] 3.5 为 CLI/SDK 暴露调用入口（注册、运行任务、订阅事件）
- [ ] 3.6 补充 Vitest 单测/集成测：注册与查询、禁用过滤、规划并行分发、Grounding 注入、事件追踪/失败上报
- [ ] 3.7 更新文档与示例（最小调用样例/事件示例）

## 4. 验证与交付
- [ ] 4.1 运行 `openspec validate add-agent-platform-foundation --strict --no-interactive`
- [ ] 4.2 评审并归档提案，准备后续实现分支
