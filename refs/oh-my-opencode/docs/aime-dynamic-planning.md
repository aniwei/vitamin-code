# AIME 动态规划架构设计

> 基于字节 AIME 框架（arXiv:2507.11988）的动态规划能力增强方案

## 概述

本文档描述了 oh-my-opencode 引入 AIME 动态规划架构的技术设计。通过 **Dynamic Planner + Actor Factory + Progress Management** 三大核心组件，解决当前静态路由分发模式的局限性。

### 解决的问题

| 问题 | 现状 | 目标 |
|------|------|------|
| **计划僵化** | 任务分发后无法根据执行结果动态调整 | 基于反馈实时重规划 |
| **能力静态** | Agent 配置固定，无法按需组装 | 动态实例化专用 Agent |
| **通信低效** | 子 Agent 间缺乏统一状态管理 | 集中式进展管理 |

### 核心理念

```
目标输入 → Dynamic Planner（分解）
    ↓
子任务列表 → Actor Factory（实例化专用 Agent）
    ↓
Dynamic Actor 执行 → Progress Manager 更新状态
    ↓
评估 → 是否需要重规划？
    ├─ 是 → 返回 Dynamic Planner
    └─ 否 → 继续下一任务 / 完成
```

---

## 架构设计

### 分层架构

在现有 Category+Skill 之上增加 Planner 层，保持向后兼容：

```
用户请求
    ↓
┌─────────────────────────────────────┐
│ Dynamic Planner Layer (新增)        │
│ - 任务分解                          │
│ - 重规划触发                        │
│ - 进展评估                          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Category+Skill Layer (现有)         │
│ - 快速路由（简单任务直通）          │
│ - Agent 选择                        │
│ - 模型配置                          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Agent Execution Layer (现有)        │
│ - Sisyphus, Atlas, Oracle...       │
│ - 工具调用                          │
│ - 结果返回                          │
└─────────────────────────────────────┘
```

**设计理由**：
- 保持现有代码路径有效（简单任务不经过 Planner）
- 降低引入风险，支持渐进式启用
- 可通过配置开关回退到传统模式

---

## 核心组件

### 1. Progress Management Module

集中式状态管理，作为"单一事实来源"驱动规划决策。

#### 数据结构

```typescript
interface ProgressState {
  planId: string
  goal: string
  tasks: TaskNode[]
  evidence: Evidence[]
  decisions: DecisionLog[]
  status: "planning" | "executing" | "replanning" | "completed" | "failed"
}

interface TaskNode {
  id: string
  description: string
  status: "pending" | "running" | "completed" | "failed" | "blocked"
  dependencies: string[]
  assignedAgent?: string
  result?: TaskResult
  retryCount: number
}

interface Evidence {
  id: string
  taskId: string
  type: "discovery" | "error" | "user_input" | "external"
  content: string
  significance: "low" | "medium" | "high" | "critical"
  timestamp: number
}

interface DecisionLog {
  id: string
  planVersion: number
  trigger: string
  reasoning: string
  changes: PlanChange[]
  timestamp: number
}
```

#### 存储策略

- **运行时状态**：内存 Map 结构，支持快速读写
- **持久化**：JSON 文件（可选），用于会话恢复
- **位置**：`/.sisyphus/progress/{planId}.json`

#### 模块结构

```
src/progress/
├── types.ts           # ProgressState, TaskNode, Evidence 等接口
├── store.ts           # 内存状态存储与 CRUD 操作
├── persistence.ts     # JSON 文件持久化
├── dependency-graph.ts # 依赖追踪与阻塞检测
├── index.ts           # ProgressManager 统一入口
└── progress.test.ts   # 单元测试
```

---

### 2. Actor Factory Module

按需实例化专用 Agent，根据任务需求动态组装能力。

#### 设计原则

复用现有 Agent 定义，通过动态组合实现能力定制：

```typescript
interface ActorSpec {
  id: string
  name: string
  description: string
  baseAgent: BuiltinAgentName  // sisyphus | oracle | librarian | explore | ...
  
  tools?: {
    include?: string[]   // 仅启用这些工具
    exclude?: string[]   // 排除这些工具
  }
  
  skills?: {
    names?: string[]     // 注入的 Skills
    content?: string     // 直接注入的 Prompt 内容
  }
  
  model?: {
    model?: string       // 覆盖模型
    temperature?: number
  }
  
  planId?: string        // 关联的计划 ID
  taskId?: string        // 关联的任务 ID
  createdAt: number
}
```

#### 基础 Agent 选择逻辑

```typescript
const AGENT_PROFILES = {
  sisyphus: {
    category: "general",
    domains: ["coding", "file-operations", "general-tasks"],
    capabilities: {
      codeExecution: true,
      fileAccess: true,
      webAccess: false,
      browserAutomation: false,
    },
    complexity: "high",
    defaultTools: ["Edit", "Read", "Write", "Bash", "Glob", "Grep"],
  },
  oracle: {
    category: "search",
    domains: ["web-search", "information-retrieval", "research"],
    capabilities: {
      webAccess: true,
      // ...
    },
    // ...
  },
  // ... 其他 Agent
}

function selectBaseAgent(requirements: ActorCapabilityRequirements): BaseAgentSelection {
  // 基于 domains、capabilities、complexity 匹配最佳 Agent
}
```

#### 模块结构

```
src/actor-factory/
├── types.ts              # ActorSpec, ActorCapabilityRequirements 等
├── base-selector.ts      # selectBaseAgent() 选择逻辑
├── capability-composer.ts # composeAgent() 能力组合
├── index.ts              # ActorFactory 工厂类
└── actor-factory.test.ts # 单元测试
```

---

### 3. Dynamic Planner Module

实时分解高层任务，输出战略+战术双层计划，基于反馈持续调整。

#### 计划结构

```typescript
interface Plan {
  id: string
  goal: string
  version: number
  
  strategic: StrategicPlan   // 高层战略
  tactical: TacticalPlan     // 具体战术
  
  metadata: {
    createdAt: number
    updatedAt: number
    estimatedEffort: string
    confidence: number
  }
}

interface StrategicPlan {
  approach: string           // 整体方法论
  phases: Phase[]            // 阶段划分
  risks: Risk[]              // 识别的风险
  successCriteria: string[]  // 成功标准
}

interface TacticalPlan {
  tasks: TaskDefinition[]    // 具体任务列表
  dependencies: Dependency[] // 任务依赖关系
  parallelGroups: string[][] // 可并行的任务组
}
```

#### 规划流程

1. **目标分析**：理解用户意图，提取约束条件
2. **分解策略**：选择分解方法（自顶向下/自底向上/混合）
3. **任务生成**：输出具体可执行的任务列表
4. **依赖分析**：建立任务间的依赖关系
5. **资源评估**：估算每个任务的复杂度和资源需求

#### Bypass 机制

简单任务直接走 Category 路由，跳过 Planner：

```typescript
function shouldBypassPlanner(input: string, context: PlanContext): boolean {
  // 短请求直接执行
  if (input.length < 100) return true
  
  // 单文件操作直接执行
  if (isSingleFileOperation(input)) return true
  
  // 已有明确 Category 匹配
  if (hasClearCategoryMatch(input)) return true
  
  return false
}
```

#### 模块结构

```
src/planner/
├── types.ts              # Plan, StrategicPlan, TacticalPlan 等
├── decomposer.ts         # 目标分解逻辑
├── prompt-templates.ts   # 规划 Prompt 模板
├── planner.ts            # plan() 和 replan() 核心方法
├── version-history.ts    # 计划版本管理
├── bypass-detector.ts    # 简单任务检测
└── planner.test.ts       # 单元测试
```

---

### 4. Replanning Triggers Module

事件驱动 + 阈值检测混合机制，决定何时需要重新规划。

#### 触发条件

```typescript
interface ReplanTriggers {
  // 事件触发
  onTaskFailed: { maxRetries: number }         // 任务失败超过阈值
  onNewEvidence: { significanceLevel: string } // 发现重要新信息
  onDependencyBlocked: boolean                 // 依赖任务阻塞
  
  // 阈值触发
  progressStalled: { minutes: number }         // 长时间无进展
  tokenBudgetLow: { remainingPercent: number } // Token 预算不足
}
```

#### 评估逻辑

```typescript
function shouldReplan(state: ProgressState, triggers: ReplanTriggers): ReplanDecision {
  const reasons: string[] = []
  
  // 检查失败任务
  const failedCount = state.tasks.filter(t => t.status === "failed").length
  if (failedCount >= triggers.onTaskFailed.maxRetries) {
    reasons.push(`${failedCount} tasks failed, exceeds threshold`)
  }
  
  // 检查高重要性证据
  const criticalEvidence = state.evidence.filter(e => 
    e.significance === "critical" && !e.processed
  )
  if (criticalEvidence.length > 0) {
    reasons.push(`Critical evidence discovered: ${criticalEvidence.length} items`)
  }
  
  // 检查阻塞任务
  if (triggers.onDependencyBlocked) {
    const blockedTasks = state.tasks.filter(t => t.status === "blocked")
    if (blockedTasks.length > 0) {
      reasons.push(`${blockedTasks.length} tasks blocked`)
    }
  }
  
  return {
    shouldReplan: reasons.length > 0,
    reasons,
    priority: calculatePriority(reasons),
  }
}
```

#### 频率控制

防止过度重规划：

```typescript
interface FrequencyControl {
  maxReplansPerPlan: number    // 单个计划最大重规划次数（默认 3）
  cooldownSeconds: number      // 两次重规划间隔（默认 60s）
  escalationThreshold: number  // 触发人工干预的阈值
}
```

#### 模块结构

```
src/planner/triggers/
├── types.ts              # ReplanTriggers, FrequencyControl 等
├── event-triggers.ts     # 事件触发器
├── threshold-triggers.ts # 阈值触发器
├── evaluator.ts          # shouldReplan() 决策逻辑
├── frequency-control.ts  # 频率控制
└── triggers.test.ts      # 单元测试
```

---

## 集成方案

### Hook 集成

通过 `session.prompt.before` Hook 介入请求流程：

```typescript
// src/hooks/dynamic-planning-hook.ts
export const dynamicPlanningHook: Hook<"session.prompt.before"> = {
  name: "dynamic-planning",
  async handler(input, output, context) {
    // 检查是否启用动态规划
    if (!isDynamicPlanningEnabled(context.config)) {
      return
    }
    
    // 检查是否需要规划（bypass 简单任务）
    if (shouldBypassPlanner(input.prompt, context)) {
      return
    }
    
    // 执行规划
    const planner = getPlanner()
    const plan = await planner.plan(input.prompt, {
      sessionId: context.sessionId,
      projectRoot: context.projectRoot,
    })
    
    // 注入计划到上下文
    output.planContext = {
      planId: plan.id,
      tasks: plan.tactical.tasks,
    }
  }
}
```

### Delegate Task 集成

修改 `delegate_task` 工具以支持动态规划：

```typescript
// 新增参数
interface DelegateTaskParams {
  // 现有参数...
  
  plan_id?: string      // 关联的计划 ID
  task_id?: string      // 关联的任务 ID
  use_actor_factory?: boolean  // 使用 Actor Factory 实例化
}

// 执行后上报
async function afterDelegateTask(result: TaskResult, params: DelegateTaskParams) {
  if (params.plan_id) {
    const progress = getProgressManager()
    await progress.updateTask(params.task_id, {
      status: result.success ? "completed" : "failed",
      result,
    })
    
    // 检查是否需要重规划
    const state = await progress.getState(params.plan_id)
    const triggers = getReplanTriggers()
    if (shouldReplan(state, triggers)) {
      await planner.replan(params.plan_id, {
        trigger: "task_completion",
        taskResult: result,
      })
    }
  }
}
```

---

## 配置

### 配置 Schema

```yaml
# .opencode/oh-my-opencode.yaml
dynamicPlanning:
  enabled: true
  strategy: "adaptive"  # "always" | "adaptive" | "never"
  
  # 触发器配置
  triggers:
    maxRetries: 2                  # 任务失败重试次数
    stallTimeout: 300              # 进度停滞超时（秒）
    tokenBudgetThreshold: 0.2      # Token 预算阈值
    evidenceSignificance: "high"   # 触发重规划的证据级别
  
  # 频率控制
  frequency:
    maxReplansPerPlan: 3           # 最大重规划次数
    cooldownSeconds: 60            # 冷却时间
  
  # 回退配置
  fallback: "category"             # 失败时回退到 Category 路由
  
  # Bypass 配置
  bypass:
    maxInputLength: 100            # 短请求阈值
    singleFileOperations: true     # 单文件操作跳过规划
```

### 策略说明

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `always` | 所有请求都经过 Planner | 需要最大程度的规划控制 |
| `adaptive` | 自动判断是否需要规划 | 推荐默认值，平衡效率与能力 |
| `never` | 禁用动态规划 | 回退到传统 Category 路由 |

---

## 风险与缓解

### Risk 1: Planner 增加延迟

- **风险**：每次请求增加一次 LLM 调用（规划）
- **缓解**：
  - 简单任务直接走 Category 路由（bypass Planner）
  - Planner 使用快速模型（如 claude-haiku）
  - 缓存相似任务的规划结果

### Risk 2: 重规划死循环

- **风险**：任务反复失败导致无限重规划
- **缓解**：
  - 设置最大重规划次数（默认 3 次）
  - 每次重规划降低任务粒度
  - 超限后回退到人工干预（question 工具）

### Risk 3: 状态一致性

- **风险**：Progress 状态与实际执行不同步
- **缓解**：
  - 每次工具调用后同步更新状态
  - 使用事务式更新（全成功或全回滚）
  - 定期状态校验

### Risk 4: 与现有 Atlas 编排冲突

- **风险**：Atlas 已有编排逻辑，可能与 Planner 冲突
- **缓解**：
  - Planner 优先级高于 Atlas 内部编排
  - 当 Planner 启用时，Atlas 降级为纯执行器
  - 提供配置选项选择使用哪种模式

---

## 开放问题

1. **Planner Prompt 设计**：如何设计高效的规划 Prompt？需要多少 few-shot 示例？

2. **任务粒度**：自动分解的任务粒度如何确定？过细导致开销大，过粗导致失败率高。

3. **跨会话状态**：是否需要支持跨会话的计划恢复？如果用户中断后继续，如何处理？

4. **评估指标**：如何衡量动态规划的效果？需要设计 benchmark 来对比静态路由。

5. **多 Planner 协同**：如果未来有多个 Planner 实例（如不同专业领域），如何协调？

---

## 参考

- [AIME: AI Agents by Meta-Evolution (arXiv:2507.11988)](https://arxiv.org/abs/2507.11988)
- [Oh-My-OpenCode Orchestration Guide](./orchestration-guide.md)
- [Category & Skill Guide](./category-skill-guide.md)
