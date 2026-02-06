## Context

P5 构建完整的 Web 产品系统，包括用户端（AI 对话 + Plan/Execute + 迭代看板）和管理端（Agent/Tool/Workflow Builder + Swarm 监控 + Dashboard）。这是代码量最大的阶段，从空目录 `packages/web/` 构建完整的 React 前端应用。

### 约束

- 依赖 P1-P4 的全部后端 API
- 前端技术栈：React 19 + Mantine 7 + React Router v7 + TanStack Query v5 + Vite
- 可视化组件：React Flow（@xyflow/react）用于 Workflow/Swarm 拓扑、Monaco Editor 用于代码预览
- API 通信：REST + SSE（无 WebSocket）
- 响应式设计：桌面优先，兼顾平板和移动端
- 遵循设计文档 §8 定义的全部产品功能

### 相关方

- `packages/web/` — 前端应用（新建）
- `packages/vitamin/src/server.ts` — 后端 API 路由（扩展）
- `packages/vitamin/src/space.ts` — Space 模型（扩展）
- `packages/cli/src/cmd/web.ts` — CLI 命令（完善）

## Goals / Non-Goals

**Goals:**
- 完整的 React 前端应用（用户端 + 管理端）
- Space 项目空间 API（CRUD + Repository + Document + Iteration + Grounding）
- Chat API（Plan/Execute 双模式 + SSE 流式响应）
- 实时 SSE 驱动的 UI 更新
- Workflow Builder（React Flow 拖拽式编辑器）
- Swarm Graph（React Flow 实时拓扑可视化）
- Monaco Editor 代码预览和 Diff 查看

**Non-Goals:**
- 不实现 PWA/离线支持
- 不实现国际化 i18n（首版仅中文/英文）
- 不实现移动端原生 App
- 不实现用户注册/登录系统（本地开发为主，认证由 P4 Task API 的 JWT/OAuth2 处理）
- 不实现调试面板（P6 范围）

## Decisions

### Decision 1: 状态管理方案

采用 **TanStack Query v5 + React Context** 组合，不引入额外状态管理库（Zustand/Redux）。

**分工：**
- **TanStack Query** — 管理所有服务器状态（API 数据获取、缓存、乐观更新）
- **React Context** — 管理少量全局 UI 状态（主题、侧边栏展开/收起、当前 Space）
- **SSE Hook** — 管理实时事件状态（通过 `useSSE` hook 接收事件，invalidate TanStack Query 缓存触发 UI 更新）

**理由：** TanStack Query 已经覆盖了绝大部分状态管理需求（服务器状态占 90%+）。额外引入 Zustand/Redux 增加复杂度但收益有限。

**替代方案：**
- Zustand — 简洁但引入额外依赖，且 TanStack Query 已足够
- Redux Toolkit — 过重，不符合"简单起步"原则

### Decision 2: SSE 重连策略

前端通过 `EventSource` API 连接 `/event` 端点，实现自动重连：

```
连接策略：
1. 首次连接 → EventSource 自动重连（浏览器内置）
2. 自定义重连 → 指数退避（1s → 2s → 4s → 8s → 最大 30s）
3. Last-Event-ID → 断线期间事件补发
4. 心跳检测 → 30s 无事件则发 ping → 无响应则重连
```

**实现：** 自定义 `useSSE(url)` hook 封装 EventSource + 重连逻辑 + 事件解析 + TanStack Query cache invalidation。

### Decision 3: API 路径统一规范

全项目 API 路径统一采用 **无 `/api/` 前缀** 格式，与 P1-P4 保持一致：

```
P5 路由调整：
  /api/spaces → /space
  /api/spaces/:id → /space/:id
  /api/spaces/:id/chat → /space/:id/chat
  /api/spaces/:id/iterations → /space/:id/iteration
  /api/spaces/:id/repositories → /space/:id/repository
  /api/spaces/:id/documents → /space/:id/document
  /api/sessions/:id/messages → /session/:id/message
```

**理由：** 与 P1 的 `/health`、P2 的 `/session`、P3 的 `/workflow`、P4 的 `/swarm` 保持一致。

### Decision 4: 构建/部署策略

Web 前端采用 **嵌入式构建** 策略：

```
开发模式：vitamin web → 启动 Vite dev server（HMR，独立端口）→ 代理 API 到 vitamin serve
生产模式：vitamin web build → Vite 构建静态文件到 packages/web/dist/ → vitamin serve 中间件直接服务静态文件
```

**理由：**
- 开发体验：Vite HMR 极快
- 部署简化：单进程（vitamin serve）同时服务 API + 前端
- 分发简化：npm 包包含预构建的前端资源

### Decision 5: React Flow 自定义节点方案

Workflow Builder 和 Swarm Graph 使用 React Flow（@xyflow/react）的自定义节点（Custom Nodes）：

**Workflow Builder 节点类型：**
- `AgentNode` — Agent 步骤（图标 + Agent 名 + 状态颜色）
- `ToolNode` — Tool 步骤（工具图标 + 名称）
- `ConditionNode` — 条件分支（菱形 + 表达式）
- `ParallelNode` — 并行容器（虚线框）
- `LoopNode` — 循环容器（带循环图标）
- `HumanNode` — 人工审批（人形图标 + 状态）

**Swarm Graph 节点类型：**
- `SwarmAgentNode` — Agent 节点（角色图标 + 状态颜色编码 + idle/active/terminated）
- 消息边动画：边上的流动粒子效果，使用 React Flow 的 animated edges

**理由：** React Flow 是 React 生态中最成熟的流程图/拓扑图库，支持自定义节点、拖拽、缩放、minimap。

### Decision 6: Monaco Editor 集成

使用 `@monaco-editor/react` 包装 Monaco Editor：

**用途：**
- 仓库浏览器：只读代码预览
- Execute 模式：文件变更 Diff 视图（Monaco DiffEditor）
- Tool Builder：JSON Schema 编辑
- Agent Builder：System Prompt 编辑

**优化：** 按需加载 Monaco（lazy import），避免首屏加载过大。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Monaco Editor 体积大（~5MB） | 按需加载 + CDN 加载 worker |
| React Flow 大量节点性能 | 虚拟化（viewport 外节点不渲染）+ 节点数量限制 |
| SSE 连接数限制（浏览器 6 连接/域名） | 单一 `/event` 端点复用，事件通过 type 字段区分 |
| TanStack Query 缓存一致性 | SSE 事件驱动 invalidation，确保实时性 |
| Vite 开发模式 CORS | 配置 Vite proxy，开发模式代理 API 请求 |

## Open Questions

- [ ] Dark/Light 主题切换是否跟随系统？（建议 Yes + 手动覆盖）
- [ ] 是否需要 WebSocket 作为 SSE 的备选方案？（建议 No，SSE 已足够）
- [ ] 管理端是否需要独立的认证？（建议 No，本地开发无需认证；生产环境复用 P4 JWT）
