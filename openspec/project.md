# 项目上下文

## 目标
- Vitamin AI 单仓库，涵盖 agent 运行时、CLI、薄 `vitamin` 入口，正演进为通用 Agent 平台。

## 技术栈
- TypeScript/Node.js
- 包管理：pnpm@10.22.x，默认分支 `dev`
- 测试：Vitest（各包 tsconfig.vitest.json 已配置）
- CLI：yargs；服务端/路由：hono（vitamin 包已引入）；校验：zod

## 项目约定

### 代码风格
- 2 空格缩进、LF、80 字符软换行（.editorconfig）
- 优先 `const`，避免 `let` 与 `else`；减少不必要的解构
- 避免 `any`，依赖类型推断；命名尽量单词化
- 非必要不写 `try/catch`；逻辑优先单函数内完成

### 架构模式
- 简单/单文件起步，复用或清晰度需要时再抽象
- 模块单一职责：agent 运行时、CLI 界面、薄包装/入口
- 面向 Agent 平台：Registry/Planner/Grounding/事件总线为核心能力

### 测试策略
- 优先真实实现，少用 mock
- 单测覆盖注册/编排/上下文注入等关键路径；Vitest 作为默认测试框架

### Git 工作流
- 默认分支 `dev`；特性分支 → PR → dev
- 提交小而聚焦；非必要不 amend
- 规格相关变更前跑 `openspec validate --strict --no-interactive`

## 领域背景
- 从编码助手演进到通用 Agent 平台，强调多 Agent 协作、工具注册、动态规划、Grounding/Memory、可观测性。

## 重要约束
- 依赖管理使用 pnpm；避免破坏性 git 命令
- 遵循 openspec/AGENTS.md 的风格与流程要求
- 默认 ASCII，已有 Unicode 时可沿用

## 外部依赖
- yargs（CLI），zod（校验），hono（路由/服务），Vitest/TypeScript/Node types（开发）
- 暂无外部 SaaS 集成；后续添加 Grounding 数据源时补充
