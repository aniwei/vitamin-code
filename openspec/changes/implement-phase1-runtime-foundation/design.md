## Context

Vitamin-Code 运行时基座层的技术设计，参考 OpenCode (`refs/opencode/`) 核心架构，适配 Vitamin-Code 的 TypeScript + Node.js + pnpm monorepo 技术栈。

### 约束

- 运行时：Node.js >= 20（不依赖 Bun，保持跨平台兼容）
- 包管理：pnpm@10.22 workspace
- 语言：TypeScript 5.x，strict mode
- 风格：Namespace-as-Module 模式（`export namespace X {}`），不使用 class（除非必要）
- 测试：Vitest，避免 mock

### 相关方

- `@vitamin-ai/shared` — 零依赖基础库
- `@vitamin-ai/vitamin` — 核心运行时
- `@vitamin-ai/cli` — CLI 入口
- `@vitamin-ai/agent` — Agent/Tool 注册（P2 增强，本阶段不改）

## Goals / Non-Goals

**Goals:**
- 建立与 OpenCode 一致的 Instance 上下文模式，所有模块通过 `Instance.state()` 管理生命周期
- 实现零外部依赖的文件系统 JSON 存储引擎
- 实现类型安全的双层事件总线
- 支持 20+ LLM 提供者的统一接口
- 提供 Hono HTTP 服务器 + SSE 实时事件流
- CLI 可启动 headless 服务器

**Non-Goals:**
- 本阶段不实现 Session/Agent/Tool 的业务逻辑（P2 范围）
- 本阶段不实现 Web 前端（P5 范围）
- 不支持分布式存储（P6 扩展）
- 不实现 TUI 终端界面（产品定位为 CLI + Web）

## Decisions

### Decision 1: AsyncLocalStorage 作为 DI 容器

采用 OpenCode 的 `Instance` 模式（`AsyncLocalStorage` + `state()` 工厂），而非传统 DI 框架（如 tsyringe）。

**理由：**
- 与 OpenCode 保持架构一致，降低参考迁移成本
- 零依赖，无需 reflect-metadata
- 天然支持异步上下文传播
- `Instance.state()` 提供实例级单例 + 自动 dispose

**替代方案：**
- tsyringe/inversify — 过重，引入 decorator 和 reflect-metadata
- 手动 context 传递 — 参数爆炸，难以维护

### Decision 2: 文件系统 JSON 存储

采用 OpenCode 的 `Storage` 模式（`$XDG_DATA_HOME/vitamin/storage/` 下嵌套 JSON 文件），而非 SQLite。

**理由：**
- 零外部依赖（无 better-sqlite3 编译问题）
- 人类可读可调试（直接查看 JSON 文件）
- 与 OpenCode 一致
- P6 可通过 `StorageAdapter` 接口扩展到 SQLite/PostgreSQL

**替代方案：**
- SQLite (better-sqlite3) — 编译依赖，跨平台问题
- LevelDB — 非人类可读

### Decision 3: 移除 Bun 依赖

现有 `space.ts` 和 `skill.ts` 从 oh-my-opencode 移植，依赖 `Bun.Glob`、`Bun.file`、Bun shell。重构为纯 Node.js 实现。

**替换映射：**
- `Bun.Glob` → `fast-glob` 或 `node:fs` + `minimatch`
- `Bun.file().text()` → `fs/promises.readFile()`
- Bun shell `$\`cmd\`` → `child_process.execSync()` 或 `execa`

### Decision 4: Hono 作为 HTTP 框架

保持现有选择（hono），与 OpenCode 一致。Hono 轻量、类型安全、支持 SSE。

### Decision 5: Namespace-as-Module 模式

所有模块使用 `export namespace X {}` 组织，不使用 class。与 OpenCode 代码风格一致。

```typescript
// ✅ 推荐
export namespace Storage {
  export function read<T>(key: string[]): Promise<T | undefined> { ... }
  export function write(key: string[], data: unknown): Promise<void> { ... }
}

// ❌ 避免
export class StorageService {
  read<T>(key: string[]): Promise<T | undefined> { ... }
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 文件系统存储性能 | 读写锁 + 增量写入；P6 扩展 adapter |
| AsyncLocalStorage 性能开销 | Node.js 20+ 已优化；benchmark 验证 |
| AI SDK 版本锁定 | 使用 `ai@^4` 大版本兼容 |
| 移除 Bun 后 skill/space 兼容性 | 逐行重构 + 测试覆盖 |

## Open Questions

- [ ] 是否需要支持 `$VITAMIN_HOME` 自定义数据目录？（建议 Yes）
- [ ] Server 默认端口号？（建议 3141，避免与常见端口冲突）
- [ ] 是否需要 mDNS 服务发现？（建议 P6 再考虑）
