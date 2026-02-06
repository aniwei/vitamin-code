## Context

Phase 6 是高级功能层，将 5 个独立但互补的子系统集成到已有平台中。这些功能在 oh-my-opencode 中部分实现（Progress Manager），在设计文档中全面定义（§6.5, §7.7, §10, §11, §12）。

### 子系统依赖关系

```
                    ┌──────────────┐
                    │   评估体系    │  ← 独立，可单独开发
                    │   (§11)      │
                    └──────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  动态规划器   │───→│  可视化调试   │←───│  弹性扩缩容   │
│  (§6.5)      │    │   (§12)      │    │  (§7.7)      │
└──────────────┘    └──────────────┘    └──────────────┘
       ↓                   ↓                   ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Category+Skill│    │   Bus 事件    │    │  RunnerPool   │
│  (P3 已实现)  │    │  (P1 已实现)  │    │  (P4 已实现)  │
└──────────────┘    └──────────────┘    └──────────────┘

┌──────────────┐
│  权限与安全   │  ← 可独立开发，集成到现有 Permission
│   (§10)      │
└──────────────┘
```

## Goals / Non-Goals

**Goals:**
- AIME 动态规划器完整实现（战略/战术双层计划 + Actor Factory + Progress Manager + Bypass + Replanning）
- 16 种断点位置的可视化调试系统 + Web 调试面板
- Runner 级自动扩缩容 + 多机部署预留接口
- 完整评估框架（5 种 Grader + CI/CD 集成）
- 沙箱执行 + 审计日志 + 安全策略

**Non-Goals:**
- 不实现完整的分布式系统（只预留接口，不实现 Kubernetes 调度）
- 不实现向量数据库（semantic memory 仅预留接口）
- 不实现 GPU 调度或模型推理优化

## Decisions

### Decision 1: 调试系统通过 Bus 事件集成

调试断点通过在关键执行路径（AgentRunner.loop、SessionProcessor.process、ToolRegistry.execute）中插入 `DebugSession.checkpoint()` 调用实现。checkpoint 检查是否命中断点 → 暂停（发布 `debug.paused` Bus 事件）→ 等待 resume。

**理由：** 最小侵入式集成，仅在关键路径添加 checkpoint 调用点，不改变核心执行逻辑。通过 Bus 事件与 Web UI 解耦。当调试未启用时，checkpoint 为空操作（零开销）。

### Decision 2: 动态规划器通过 Hook 集成

Planner 通过 `prompt.before` Hook 介入 Session Prompt 流程，而非修改 Session Prompt 核心代码。

**理由：** 可配置（always/adaptive/never），不影响不需要规划的简单任务。

### Decision 3: 评估框架独立于运行时

评估框架通过创建标准 Session 执行评估用例，而非使用特殊的评估模式。

**理由：** 评估结果反映真实运行行为，非确定性处理通过多次运行统计。

### Decision 4: 扩缩容渐进式实现

Phase 6 实现单机内的 Runner 弹性扩缩容。多机部署仅预留服务发现和分布式调度接口，不实现完整方案。

**理由：** 单机场景是 MVP，多机需要基础设施（Redis/NATS/Kubernetes）支持，复杂度高。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 调试暂停导致 LLM API 超时 | checkpoint 保存完整上下文，resume 时重建 LLM 调用 |
| 动态规划器增加延迟 | Bypass 机制跳过简单任务；adaptive 模式按需启用 |
| 沙箱隔离性能开销 | 可选启用；默认 off（开发模式），on（生产模式） |
| `isolated-vm` 是 native addon，可能有编译问题 | 作为可选依赖（optionalDependencies）；不可用时回退到基于 child_process 的轻量沙箱 |
| 评估成本（LLM 调用费用） | 支持 mock provider 用于 CI；采样运行降低成本 |

## Open Questions

- [ ] 多机部署的消息传递使用 Redis Pub/Sub 还是 NATS？（建议 P6 不实现，仅预留接口）
- [ ] 调试轨迹存储限制？（建议单 Session 最大 1000 个 checkpoint，FIFO 淘汰）
- [ ] 评估 LLM Grader 使用哪个模型？（建议可配置，默认 claude-sonnet）
