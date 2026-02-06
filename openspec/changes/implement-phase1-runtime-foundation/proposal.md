# Change: 实现 Phase 1 — 运行时基座

## Why

Vitamin-Code 目前仅有骨架代码（Agent/Tool 内存 Map、Bus EventEmitter、空 Server）。要构建完整的 Agent 平台，必须先建立与 OpenCode 核心一致的运行时基座层：Instance 上下文容器、文件系统持久化存储、双层事件总线、多层配置系统、LLM Provider 抽象、Hono HTTP/SSE 服务器、yargs CLI 引导链。所有后续功能（Session、Agent 注册、Workflow 编排、Swarm 蜂群、Web 产品）均依赖此基座。

## What Changes

- **Instance 上下文容器** — 基于 `AsyncLocalStorage` 的实例级 DI 容器（参考 OpenCode `src/project/instance.ts`），提供 `Instance.provide()`、`Instance.state()`、`Instance.directory`、`Instance.project` 等 API
- **Project/Space 检测** — 从目录推导项目信息（Git root commit ID → projectID），适配现有 `packages/vitamin/src/space.ts` 并移除 Bun 依赖
- **Storage 持久化** — 基于文件系统的 JSON 键值存储引擎（参考 OpenCode `src/storage/storage.ts`），支持读写锁、原子更新、迁移系统
- **双层事件总线** — Instance 级 Bus（订阅/发布）+ Global Bus（跨实例广播），事件使用 Zod schema 强类型定义（参考 OpenCode `src/bus/`）
- **Config 配置系统** — 多层合并（global → project → env → inline），支持 JSONC，Zod 校验（参考 OpenCode `src/config/config.ts`）
- **Provider 抽象** — 基于 Vercel AI SDK 的统一 LLM Provider 接口，支持 Anthropic/OpenAI/Google/xAI 等 20+ 提供者（参考 OpenCode `src/provider/`）
- **Server HTTP/SSE** — 基于 Hono 的 HTTP 服务器，SSE 事件流端点，CORS 支持，可选 BasicAuth（参考 OpenCode `src/server/`）
- **CLI 引导链** — yargs 入口 + `bootstrap()` 函数（Instance.provide → Init → 回调 → 清理），`serve`/`run`/`web` 命令（参考 OpenCode `src/cli/`）
- **Shared 基础库** — ID 生成器、Logger（带级别过滤）、Global 路径管理（XDG 规范）、Env 环境变量管理

## Impact

- Affected specs: `agent-platform` (new capability)
- Affected code:
  - `packages/vitamin/src/` — instance.ts, storage.ts, bus.ts(重写), config.ts, provider.ts, server.ts(重写), space.ts(重构去 Bun)
  - `packages/cli/src/` — index.ts(入口重写), bootstrap.ts, cmd/serve.ts(重写), cmd/run.ts, cmd/web.ts
  - `packages/shared/src/` — id.ts, log.ts(重写), global.ts, env.ts, index.ts(重写)
  - `packages/agent/` — 本阶段不修改，P2 增强
- Dependencies added: `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `ai` (Vercel AI SDK), `hono`, `zod`, `yargs`, `strip-json-comments`, `fast-glob`（替代 Bun.Glob）
