# Change: 实现 Phase 5 — Web 产品系统

## Why

P1-P4 构建了完整的后端运行时（Instance/Storage/Bus/Provider + Agent/Tool/Session + Orchestration/Workflow + Swarm/Task API）。现在需要实现设计文档 §8 定义的 Web 产品系统：以 Space（项目空间）为核心组织单元，提供用户端（AI 对话 + Plan/Execute 双模式 + 迭代看板）和管理端（Agent/Tool/Workflow Builder + Swarm 监控 + Dashboard），对标 Kimi 2.5 + GitHub Copilot Web 的产品体验。

## What Changes

- **Space 项目空间 API** — 实现 Space CRUD（创建/列表/获取/更新/删除），SpaceRepository（关联代码仓库）、SpaceDocument（文档中心）、SpaceIteration（迭代管理）、SpaceGrounding（知识源绑定），对应设计文档 §8.2
- **Chat API** — 实现 `POST /space/:spaceId/chat`：Space 级会话管理，消息发送 → Session Prompt → SSE 流式响应，支持 Plan/Execute 双模式切换，对应设计文档 §8.6
- **Web 前端脚手架** — 初始化 `packages/web/`：React 19 + Mantine 7 + React Router v7 + TanStack Query v5 + Vite，统一 API 客户端层（fetch + SSE），对应设计文档 §8.5
- **用户端** — 实现用户端页面：
  - 空间列表 / 空间详情
  - AI 对话面板（消息流、流式渲染、工具调用展示、快照预览）
  - Plan 模式面板（计划预览、步骤状态、审批操作）
  - Execute 模式面板（实时日志、文件变更差异、进度追踪）
  - 迭代看板（看板视图 / 列表视图 / 甘特图视图）
  - 仓库浏览器（文件树 + Monaco 代码预览）
  - 文档中心
  对应设计文档 §8.3
- **管理端** — 实现管理端页面：
  - Dashboard（活跃 Session/Agent/Tool 统计、资源使用）
  - Agent Builder（可视化 Agent 配置、测试、权限设置）
  - Tool Builder（工具参数编辑、测试执行）
  - Workflow Builder（React Flow 拖拽式流程编辑器）
  - Swarm Graph（React Flow 实时拓扑可视化、Agent 消息/LLM 历史查看）
  - Template 管理（模板列表、创建、编辑）
  - 配置管理（Provider 设置、MCP 配置、权限规则）
  对应设计文档 §8.4
- **SSE 集成** — 前端通过 EventSource 连接 `/event`，实时接收 Session/Swarm/Task 事件更新 UI
- **CLI 扩展** — `vitamin web` 命令启动 Web UI 开发/生产服务器

## Impact

- Affected specs: `agent-platform` (add web product capabilities)
- Affected code:
  - `packages/web/` — 完整前端应用（从空目录开始）
    - `src/app/` — 路由布局
    - `src/pages/` — 页面组件
    - `src/components/` — 通用组件
    - `src/hooks/` — React hooks（SSE、API、状态）
    - `src/api/` — API 客户端层
    - `src/store/` — 全局状态管理
  - `packages/vitamin/src/server.ts` — 新增 Space API + Chat API 路由
  - `packages/vitamin/src/space.ts` — 扩展 Space CRUD
  - `packages/cli/src/cmd/web.ts` — 完善 vitamin web 命令
- Dependencies added (packages/web): `react`, `react-dom`, `@mantine/core`, `@mantine/hooks`, `@tanstack/react-query`, `react-router`, `@xyflow/react` (React Flow), `@monaco-editor/react`, `vite`, `@vitejs/plugin-react`
- Depends on: P1-P4（全部后端功能）
