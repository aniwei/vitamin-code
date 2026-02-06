# Change: 实现 Phase 4 — Swarm 蜂群系统 / Task API

## Why

P3 实现了多 Agent 编排（Category+Skill 路由 + 规划/执行分离 + Workflow 引擎）。但这些编排仍基于"一个主 Session + 子 Session 委派"模式。设计文档 §7 定义了更激进的 Swarm 蜂群系统：Agent 动态创建/销毁、液态拓扑自演化、`create + send` 两个极简原语、AgentRunner LLM 推理主循环、MessageHub 消息路由、弹性扩缩容基础。本阶段实现 Swarm 核心运行时和 Task API 异步任务链路。

## What Changes

- **SwarmWorkspace** — 蜂群工作空间：维护 Agent 实例集合、消息系统、拓扑图，`create + send` 两个核心原语（对应设计文档 §7.1-§7.2）
- **AgentRunner** — Agent 运行器：主循环（检查未读消息 → 处理 → LLM 推理循环 → 工具调用 → 持久化），LLM Loop（调用 LLM → 流式输出 → 判断结果 → 工具调用/完成），生命周期管理（idle → active → suspended → terminated），参考设计文档 §7.5
- **MessageHub** — 消息路由中枢：投递消息到目标 Agent 的 inbox、支持广播和组播、消息持久化，参考设计文档 §7.3
- **Topology** — 拓扑管理器：维护 Agent 关系图（谁创建了谁、谁给谁发消息）、角色索引编号（architect-1-3 = 第 1 个 architect 创建的第 3 个子 Agent）、拓扑变更事件
- **Runner Pool** — Runner 池：管理 AgentRunner 实例的创建/复用/回收，并发限制
- **UI 事件流** — 定义 Swarm 相关 UIEvent：Agent 创建/销毁、消息传递、LLM 开始/结束、工具调用、拓扑变更，通过 Bus → SSE 推送（对应设计文档 §7.8）
- **Task API** — 异步任务链路：`POST /task` 提交 → 202 Accepted → TaskRecord 状态机（queued → running → suspended → completed/failed/cancelled）→ SSE 进度事件流，支持 `Last-Event-ID` 断线重连（对应设计文档 §7.11）
- **Task 鉴权中间件** — 支持 none / jwt / oauth2 三种认证模式（对应设计文档 §7.11）
- **CLI 命令** — `vitamin swarm create`、`vitamin swarm status`、`vitamin task submit`、`vitamin task status`

## Impact

- Affected specs: `agent-platform` (add swarm/task capabilities)
- Affected code:
  - `packages/vitamin/src/swarm/` — 新目录（workspace.ts, runner.ts, message-hub.ts, topology.ts, pool.ts, types.ts）
  - `packages/vitamin/src/task.ts` — 新文件（Task API 实现）
  - `packages/vitamin/src/server.ts` — 新增 Swarm/Task 路由
  - `packages/vitamin/src/bus.ts` — 新增 Swarm 事件定义
  - `packages/cli/src/cmd/` — swarm.ts(新), task.ts(新)
- Dependencies added: `jose`（JWT 鉴权，纯 JS 无 native addon）
- Depends on: P1（基座）、P2（Agent/Tool/Session — AgentRunner 复用 SessionProcessor）、P3（编排/Workflow — RunnerPool 扩展 BackgroundManager 概念）
