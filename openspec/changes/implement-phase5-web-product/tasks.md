## 1. Space API 后端

- [ ] 1.1 扩展 `packages/vitamin/src/space.ts` — Space CRUD：`create(input)` / `list(filter)` / `get(id)` / `update(id, patch)` / `remove(id)`，SpaceInfo 持久化到 Storage
- [ ] 1.2 实现 SpaceRepository — 关联代码仓库（localPath / gitUrl / branch），初始化 Grounding
- [ ] 1.3 实现 SpaceDocument — 文档 CRUD（Space 级文档中心），Markdown 存储
- [ ] 1.4 实现 SpaceIteration — 迭代管理（id, spaceId, title, status[planning/active/completed], tasks[], startDate, endDate）
- [ ] 1.5 实现 SpaceGrounding — 知识源绑定（关联 code_repo / data_store / 文档到 Space）
- [ ] 1.6 实现 Space API 路由：
  - `POST /space` — 创建 Space
  - `GET /space` — 列表
  - `GET /space/:id` — 详情
  - `PATCH /space/:id` — 更新
  - `DELETE /space/:id` — 删除
  - `POST /space/:id/repository` / `GET /space/:id/repository`
  - `POST /space/:id/document` / `GET /space/:id/document`
  - `POST /space/:id/iteration` / `GET /space/:id/iteration`
- [ ] 1.7 为 Space API 编写 Vitest 测试

## 2. Chat API

- [ ] 2.1 实现 `POST /space/:spaceId/chat` — Space 级 Chat 端点：创建/复用 Session → 发送消息 → Session Prompt 处理 → SSE 流式响应（text/reasoning/tool-call/snapshot 分片推送）
- [ ] 2.2 实现 Plan/Execute 模式切换 — Chat 请求参数 `mode: "plan" | "execute"`：
  - Plan 模式：使用 Planner Agent，返回计划内容
  - Execute 模式：使用 Coder/Orchestrator Agent，执行任务
- [ ] 2.3 实现 Chat 历史 API — `GET /space/:spaceId/session` / `GET /session/:id/message`
- [ ] 2.4 为 Chat API 编写 Vitest 测试

## 3. Web 前端脚手架

- [ ] 3.1 初始化 `packages/web/` — `pnpm create vite` → React 19 + TypeScript + Vite
- [ ] 3.2 安装核心依赖 — `@mantine/core`, `@mantine/hooks`, `@mantine/notifications`, `react-router`, `@tanstack/react-query`, `@xyflow/react`, `@monaco-editor/react`
- [ ] 3.3 配置 Mantine Provider — 主题定制（颜色、字体、组件默认值）、Dark/Light 模式切换
- [ ] 3.4 配置 React Router — 路由布局：
  - `/` — 空间列表
  - `/spaces/:id` — 空间详情（嵌套路由）
  - `/spaces/:id/chat` — AI 对话
  - `/spaces/:id/iterations` — 迭代看板
  - `/spaces/:id/repos` — 仓库浏览
  - `/spaces/:id/docs` — 文档中心
  - `/admin` — 管理端入口
  - `/admin/agents` — Agent 管理
  - `/admin/tools` — Tool 管理
  - `/admin/workflows` — Workflow 管理
  - `/admin/swarm` — Swarm 监控
  - `/admin/config` — 配置管理
- [ ] 3.5 实现 API 客户端层 — `packages/web/src/api/client.ts`：基于 fetch 的类型安全 API 客户端，SSE 流读取工具函数
- [ ] 3.6 实现 TanStack Query hooks — 封装所有 API 为 `useQuery` / `useMutation` hooks
- [ ] 3.7 实现 SSE 连接 hook — `useSSE(url)`: 连接 `/event` 端点，解析事件，自动重连

## 4. 用户端：空间与对话

- [ ] 4.1 实现空间列表页 — 卡片布局展示 Space 列表，创建新 Space 弹窗
- [ ] 4.2 实现空间详情布局 — 侧边栏导航（对话/看板/仓库/文档）+ 主内容区
- [ ] 4.3 实现 AI 对话面板 — 消息列表（支持 Text/Reasoning/ToolCall/Snapshot Part 渲染）、输入框（支持 @ 命令、文件附件）、流式消息渲染（SSE 实时更新）
- [ ] 4.4 实现工具调用展示 — 可折叠的工具调用卡片（工具名、参数、结果、耗时）
- [ ] 4.5 实现 Plan 模式面板 — 计划预览（Markdown 渲染）、步骤状态（✅/🔄/⏳）、审批按钮（Approve → 切换到 Execute）
- [ ] 4.6 实现 Execute 模式面板 — 实时日志流、文件变更 Diff 视图（Monaco diff editor）、进度条
- [ ] 4.7 实现模式切换组件 — Plan ⇄ Execute 切换按钮，视觉状态指示

## 5. 用户端：迭代与仓库

- [ ] 5.1 实现迭代看板 — 三种视图：
  - 看板视图（Kanban：Todo / In Progress / Done 列）
  - 列表视图（表格形式）
  - 甘特图视图（时间轴）
- [ ] 5.2 实现仓库浏览器 — 文件树组件 + Monaco Editor 代码预览（只读）
- [ ] 5.3 实现文档中心 — 文档列表 + Markdown 编辑器/预览

## 6. 管理端

- [ ] 6.1 实现 Dashboard — 统计卡片（活跃 Session 数、Agent 数、工具调用次数、LLM token 使用量），最近活动列表
- [ ] 6.2 实现 Agent Builder — Agent 配置表单（domain/category/capabilities/tools/skills/model/temperature/systemPrompt），测试对话面板，权限矩阵编辑
- [ ] 6.3 实现 Tool Builder — 工具参数 JSON Schema 编辑器（Monaco），测试执行面板（输入参数 → 执行 → 查看结果）
- [ ] 6.4 实现 Workflow Builder — 基于 React Flow 的拖拽式流程编辑器：
  - 节点类型：AgentNode / ToolNode / ConditionNode / ParallelNode / LoopNode / HumanNode
  - 连线自动生成步骤依赖
  - 节点属性面板（点击节点编辑参数）
  - 导出为 WorkflowDefinition JSON
- [ ] 6.5 实现 Swarm Graph — 基于 React Flow 的实时拓扑可视化：
  - SSE 驱动实时更新（agent 创建/销毁/状态变更 → 节点增删/样式变更）
  - 点击 Agent 节点 → 侧面板显示 LLM 历史、消息记录
  - 消息流动画（边上的流动粒子效果）
- [ ] 6.6 实现 Template 管理 — 模板列表、模板详情/编辑、从模板创建 Session
- [ ] 6.7 实现配置管理 — Provider 配置（API Key、默认模型）、MCP 配置（服务器列表）、权限规则编辑

## 7. CLI 扩展

- [ ] 7.1 完善 `vitamin web` 命令 — 开发模式启动 Vite dev server（HMR）、生产模式服务静态文件
- [ ] 7.2 实现 Web 构建集成 — `vitamin web build` 构建前端资源

## 8. 集成验证

- [ ] 8.1 端到端测试 — 创建 Space → 发起 Chat → 流式响应 → 工具调用展示 → Plan/Execute 切换
- [ ] 8.2 管理端测试 — Agent Builder 创建 Agent → Tool Builder 测试工具 → Workflow Builder 保存流程
- [ ] 8.3 Swarm Graph 测试 — 提交 Task → 实时拓扑可视化 → Agent 消息流
- [ ] 8.4 响应式测试 — 桌面/平板/移动端布局验证
- [ ] 8.5 TypeScript 编译零错误
