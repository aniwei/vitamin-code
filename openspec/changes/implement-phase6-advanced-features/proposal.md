# Change: 实现 Phase 6 — 动态规划 / 可视化调试 / 弹性扩容 / 评估 / 安全

## Why

P1-P5 实现了完整的 Agent 平台核心功能和 Web 产品。Phase 6 是"高级功能层"，将平台从"可用"提升到"强大"：
1. **动态规划器**（§6.5）— 基于 AIME 论文的实时重规划能力，让 Agent 在执行中根据反馈调整策略
2. **可视化调试系统**（§12）— 断点机制贯穿 LLM Loop/工具调用/消息传递全链路，Agent 不再是黑箱
3. **弹性扩缩容**（§7.7, §7.10）— 根据负载自动扩容 Agent Runner，支持多机部署
4. **评估体系**（§11）— 系统化 Agent 评估，CI/CD 集成质量防线
5. **权限与安全**（§10）— 沙箱执行、审计日志、细粒度权限

## What Changes

- **AIME 动态规划器** — 实现 DomainAnalyzer（领域分析）、DynamicPlannerCore（战略+战术双层计划）、ActorFactory（动态 Agent 实例化）、ProgressManager（进展追踪 + 依赖图），Bypass 机制（简单任务跳过规划），Replanning Triggers（任务失败/关键证据/依赖阻塞/进度停滞/Token 预算不足），频率控制（最大 3 次/冷却 60s），参考 oh-my-opencode `src/progress/` + 设计文档 §6.5
- **可视化调试系统** — 实现 16 种断点位置（LLM Loop/Tool/Agent 生命周期/消息/Workflow/Orchestration）、DebugSession（checkpoint/resume 暂停恢复机制）、DebugContext（完整上下文快照）、Resume 动作（continue/step_over/step_into/step_out/run_to_cursor）、结构化日志（DebugLogEntry）、Web 调试面板（Log Panel/Agent Inspector/SubAgent Tree/Context Inspector/Tool Call Inspector/LLM Loop Timeline）、轨迹回放系统，对应设计文档 §12
- **弹性扩缩容** — 实现 Runner 级自动扩容策略（metrics 采集 → 策略评估 → 扩缩执行）、多机扩容方案（服务发现 + 负载均衡 + Runner 分布式调度），对应设计文档 §7.7, §7.10
- **Agent 评估体系** — 实现评估框架：Grader 类型（精确匹配/模式匹配/LLM 评分/人工评分/复合评分）、能力评估（针对特定能力的测试集）、回归评估（CI/CD 集成）、不同 Agent 类型的评估策略，对应设计文档 §11
- **权限与安全增强** — 沙箱执行环境（隔离 Shell/文件系统访问）、审计日志（所有 Agent 操作记录到 Storage）、安全策略扩展（IP 白名单、Rate Limiting、敏感数据脱敏），对应设计文档 §10
- **高级记忆系统** — 实现 longTerm（跨 session 长期记忆 → Storage 持久化）、episodic（情景记忆 → 关键操作快照）+ 可选 semantic（语义记忆 → 向量存储），对应设计文档 §3.5 Phase 2-3
- **可观测性** — 结构化日志导出（OpenTelemetry 格式）、Metrics 采集（Agent/LLM/Tool 性能指标）、分布式 Trace（跨 Agent 调用链追踪）
- **Web 调试面板** — 在管理端新增 Debug 页面：Log Panel + Agent Inspector + SubAgent Tree + Context Inspector + Tool Call Inspector + LLM Loop Timeline + Trace Replay

## Impact

- Affected specs: `agent-platform` (add planner/debug/scaling/eval/security capabilities)
- Affected code:
  - `packages/vitamin/src/planner/` — 新目录（core.ts, domain-analyzer.ts, actor-factory.ts, progress.ts, bypass.ts, replan.ts）
  - `packages/vitamin/src/debug/` — 新目录（session.ts, breakpoint.ts, context.ts, log.ts, replay.ts）
  - `packages/vitamin/src/scaling/` — 新目录（metrics.ts, strategy.ts, discovery.ts, distributed.ts）
  - `packages/vitamin/src/eval/` — 新目录（framework.ts, grader.ts, runner.ts, report.ts）
  - `packages/vitamin/src/security/` — 新目录（sandbox.ts, audit.ts, policy.ts）
  - `packages/vitamin/src/memory.ts` — 扩展 longTerm + episodic
  - `packages/vitamin/src/observability.ts` — 新文件
  - `packages/web/src/pages/admin/debug/` — 调试面板页面
- Dependencies added: `@opentelemetry/api`（可观测性，可选）, `isolated-vm`（沙箱，可选）
- Depends on: P1-P5（全部功能）
