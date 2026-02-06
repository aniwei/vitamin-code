## 1. Shared 基础库

- [ ] 1.1 实现 `packages/shared/src/id.ts` — `createId(prefix)` 函数（时间戳+随机，带前缀），参考 OpenCode `src/id/`
- [ ] 1.2 重写 `packages/shared/src/log.ts` — `Log` 命名空间，支持 DEBUG/INFO/WARN/ERROR 级别、前缀标签、颜色输出、级别过滤
- [ ] 1.3 实现 `packages/shared/src/global.ts` — `Global` 命名空间，基于 XDG 规范的路径管理（`$XDG_DATA_HOME/vitamin/`、`$XDG_CONFIG_HOME/vitamin/`），参考 OpenCode `src/global/`
- [ ] 1.4 实现 `packages/shared/src/env.ts` — `Env` 命名空间，环境变量读取与校验
- [ ] 1.5 重写 `packages/shared/src/index.ts` — 统一导出所有模块
- [ ] 1.6 为 Shared 编写 Vitest 测试（id 唯一性、log 级别过滤、global 路径生成）

## 2. Instance 上下文容器

- [ ] 2.1 实现 `packages/vitamin/src/instance.ts` — 基于 `AsyncLocalStorage` 的 Instance 模式：`provide({ directory, init, fn })`、`state(factory, dispose?)`、`directory`/`worktree`/`project` 访问器，参考 OpenCode `src/project/instance.ts`
- [ ] 2.2 重构 `packages/vitamin/src/space.ts` — 移除 Bun 依赖（`Bun.Glob` → `fast-glob`，`Bun.file` → `fs/promises`，Bun shell → `child_process`），保持 Space.detect() / Space.info() API 不变
- [ ] 2.3 实现 `packages/vitamin/src/vcs.ts` — Git VCS 抽象（status/diff/log/branch），参考 OpenCode `src/project/vcs.ts`
- [ ] 2.4 实现 `packages/vitamin/src/bootstrap.ts` — Instance 初始化链（Plugin → Config → File → Vcs → Snapshot），参考 OpenCode `src/project/bootstrap.ts`
- [ ] 2.5 为 Instance 编写 Vitest 测试（provide/state 生命周期、dispose 清理、嵌套 provide）

## 3. Storage 持久化引擎

- [ ] 3.1 实现 `packages/vitamin/src/storage.ts` — `Storage` 命名空间：`read<T>(key[])`、`write(key[], data)`、`update<T>(key[], fn)`、`remove(key[])`、`list(prefix[])` API，基于文件系统 JSON 存储（`$XDG_DATA_HOME/vitamin/storage/`），参考 OpenCode `src/storage/storage.ts`
- [ ] 3.2 实现读写锁机制 — `acquireRead(key)` / `acquireWrite(key)` 确保并发安全
- [ ] 3.3 实现迁移系统 — `Migration[]` 数组，自动执行并记录版本号
- [ ] 3.4 为 Storage 编写 Vitest 测试（CRUD、并发读写、迁移执行、key 路径映射）

## 4. 双层事件总线

- [ ] 4.1 重写 `packages/vitamin/src/bus.ts` — 双层架构：Instance 级 `Bus`（发布/订阅，支持通配符 `*`）+ 全局 `GlobalBus`（Node.js EventEmitter 跨实例广播），参考 OpenCode `src/bus/`
- [ ] 4.2 实现 `BusEvent.define(type, zodSchema)` — 类型安全的事件定义，自动推导 payload 类型
- [ ] 4.3 预置核心事件定义 — `session.created`、`session.updated`、`message.created`、`message.updated`、`provider.configured`、`config.changed` 等
- [ ] 4.4 为 Bus 编写 Vitest 测试（publish/subscribe、GlobalBus 广播、事件类型安全、通配符匹配）

## 5. Config 配置系统

- [ ] 5.1 实现 `packages/vitamin/src/config.ts` — `Config` 命名空间：多层合并（远程 → 全局 `$XDG_CONFIG_HOME/vitamin/vitamin.jsonc` → 项目 `.vitamin/config.jsonc` → 环境变量 `VITAMIN_CONFIG` → inline），JSONC 解析（strip-json-comments），Zod schema 校验，参考 OpenCode `src/config/config.ts`
- [ ] 5.2 定义配置 Zod Schema — provider 设置、模型覆盖、权限默认值、MCP 服务器列表、工具/Agent 覆盖
- [ ] 5.3 实现配置文件监听 — 文件变更时自动重载，通过 Bus 发布 `config.changed` 事件
- [ ] 5.4 扫描 `.vitamin/` 目录加载附加配置 — instructions（AGENTS.md）、skills、tools、commands 发现
- [ ] 5.5 为 Config 编写 Vitest 测试（多层合并优先级、JSONC 解析、schema 校验失败处理、热重载）

## 6. Provider LLM 抽象层

- [ ] 6.1 实现 `packages/vitamin/src/provider.ts` — `Provider` 命名空间：统一 LLM 提供者接口，基于 Vercel AI SDK（`ai` 包），参考 OpenCode `src/provider/provider.ts`
- [ ] 6.2 实现 `BUNDLED_PROVIDERS` 映射 — Anthropic（`@ai-sdk/anthropic`）、OpenAI（`@ai-sdk/openai`）、Google（`@ai-sdk/google`）、xAI、DeepSeek 等
- [ ] 6.3 实现 `Provider.getModel(providerID, modelID)` — 返回 AI SDK `LanguageModel` 实例
- [ ] 6.4 实现 `Provider.transform(provider, params)` — 针对不同提供者的参数转换（如 Anthropic beta headers、bedrock 区域认证）
- [ ] 6.5 实现 `Provider.auth(providerID)` — 认证管理（API Key、OAuth），参考 OpenCode `src/provider/auth.ts`
- [ ] 6.6 实现模型注册表 — 模型 ID → 元数据（上下文窗口、支持特性、定价），参考 OpenCode `src/provider/models.ts`
- [ ] 6.7 为 Provider 编写 Vitest 测试（mock provider 注册、model 获取、transform 参数转换）

## 7. Server HTTP/SSE

- [ ] 7.1 重写 `packages/vitamin/src/server.ts` — 基于 Hono 的 HTTP 服务器框架，参考 OpenCode `src/server/`
- [ ] 7.2 实现 SSE 事件流端点 — `GET /event`：订阅 GlobalBus 所有事件 → 推送到 SSE 客户端，支持 `Last-Event-ID` 断线重连
- [ ] 7.3 实现 Instance 切换中间件 — 通过 `x-vitamin-directory` header 或 `directory` query 切换 Instance 上下文
- [ ] 7.4 实现 CORS 中间件 — 允许 localhost、tauri://、*.vitamin.ai 域名
- [ ] 7.5 实现可选 BasicAuth 保护 — 通过配置启用/禁用
- [ ] 7.6 实现基础路由 — `GET /health`、`GET /info`（版本/项目信息）、`GET /config`
- [ ] 7.7 为 Server 编写 Vitest 测试（路由匹配、SSE 连接、中间件链、CORS）

## 8. CLI 引导链

- [ ] 8.1 重写 `packages/cli/src/index.ts` — yargs 入口，注册所有命令
- [ ] 8.2 实现 `packages/cli/src/bootstrap.ts` — `bootstrap()` 函数：解析 directory → Instance.provide() → init 链 → 执行回调 → 清理，参考 OpenCode `src/cli/bootstrap.ts`
- [ ] 8.3 重写 `packages/cli/src/serve.ts` — `vitamin serve` 命令：启动 headless HTTP 服务器，`--port`/`--host` 选项
- [ ] 8.4 实现 `packages/cli/src/cmd/run.ts` — `vitamin run <message>` 命令：非交互式发送消息给 AI（本阶段仅搭建骨架，P2 实现 Session 后完善）
- [ ] 8.5 实现 `packages/cli/src/cmd/web.ts` — `vitamin web` 命令：启动 Web UI（本阶段仅搭建骨架，P5 实现前端后完善）
- [ ] 8.6 实现 `packages/cli/bin/vitamin` — 可执行入口文件
- [ ] 8.7 为 CLI 编写 Vitest 测试（bootstrap 流程、命令注册、参数解析）

## 9. 集成验证

- [ ] 9.1 编写端到端集成测试 — 启动 Instance → 读写 Storage → 发布/订阅 Bus 事件 → 加载 Config → 启动 Server → SSE 事件接收
- [ ] 9.2 确认所有 package.json 依赖声明正确，pnpm workspace 链接正常
- [ ] 9.3 确认 TypeScript 编译零错误
- [ ] 9.4 确认 `vitamin serve` 可成功启动并响应 `/health` 端点
