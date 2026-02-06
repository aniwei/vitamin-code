<p align="center">
  <a href="https://opencode.ai">
    <picture>
      <source srcset="packages/console/app/src/asset/logo-ornate-dark.svg" media="(prefers-color-scheme: dark)">
      <source srcset="packages/console/app/src/asset/logo-ornate-light.svg" media="(prefers-color-scheme: light)">
      <img src="packages/console/app/src/asset/logo-ornate-light.svg" alt="OpenCode logo">
    </picture>
  </a>
</p>
<p align="center">开源的 AI Coding Agent。</p>
<p align="center">
  <a href="https://opencode.ai/discord"><img alt="Discord" src="https://img.shields.io/discord/1391832426048651334?style=flat-square&label=discord" /></a>
  <a href="https://www.npmjs.com/package/opencode-ai"><img alt="npm" src="https://img.shields.io/npm/v/opencode-ai?style=flat-square" /></a>
  <a href="https://github.com/anomalyco/opencode/actions/workflows/publish.yml"><img alt="Build status" src="https://img.shields.io/github/actions/workflow/status/anomalyco/opencode/publish.yml?style=flat-square&branch=dev" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> |
  <a href="README.zh.md">简体中文</a> |
  <a href="README.zht.md">繁體中文</a> |
  <a href="README.ko.md">한국어</a> |
  <a href="README.de.md">Deutsch</a> |
  <a href="README.es.md">Español</a> |
  <a href="README.fr.md">Français</a> |
  <a href="README.it.md">Italiano</a> |
  <a href="README.da.md">Dansk</a> |
  <a href="README.ja.md">日本語</a> |
  <a href="README.pl.md">Polski</a> |
  <a href="README.ru.md">Русский</a> |
  <a href="README.ar.md">العربية</a> |
  <a href="README.no.md">Norsk</a> |
  <a href="README.br.md">Português (Brasil)</a>
</p>

[![OpenCode Terminal UI](packages/web/src/assets/lander/screenshot.png)](https://opencode.ai)

---

### 安装

```bash
# 直接安装 (YOLO)
curl -fsSL https://opencode.ai/install | bash

# 软件包管理器
npm i -g opencode-ai@latest        # 也可使用 bun/pnpm/yarn
scoop install opencode             # Windows
choco install opencode             # Windows
brew install anomalyco/tap/opencode # macOS 和 Linux（推荐，始终保持最新）
brew install opencode              # macOS 和 Linux（官方 brew formula，更新频率较低）
paru -S opencode-bin               # Arch Linux
mise use -g opencode               # 任意系统
nix run nixpkgs#opencode           # 或用 github:anomalyco/opencode 获取最新 dev 分支
```

> [!TIP]
> 安装前请先移除 0.1.x 之前的旧版本。

### 桌面应用程序 (BETA)

OpenCode 也提供桌面版应用。可直接从 [发布页 (releases page)](https://github.com/anomalyco/opencode/releases) 或 [opencode.ai/download](https://opencode.ai/download) 下载。

| 平台                  | 下载文件                              |
| --------------------- | ------------------------------------- |
| macOS (Apple Silicon) | `opencode-desktop-darwin-aarch64.dmg` |
| macOS (Intel)         | `opencode-desktop-darwin-x64.dmg`     |
| Windows               | `opencode-desktop-windows-x64.exe`    |
| Linux                 | `.deb`、`.rpm` 或 AppImage            |

```bash
# macOS (Homebrew Cask)
brew install --cask opencode-desktop
# Windows (Scoop)
scoop bucket add extras; scoop install extras/opencode-desktop
```

#### 安装目录

安装脚本按照以下优先级决定安装路径：

1. `$OPENCODE_INSTALL_DIR` - 自定义安装目录
2. `$XDG_BIN_DIR` - 符合 XDG 基础目录规范的路径
3. `$HOME/bin` - 如果存在或可创建的用户二进制目录
4. `$HOME/.opencode/bin` - 默认备用路径

```bash
# 示例
OPENCODE_INSTALL_DIR=/usr/local/bin curl -fsSL https://opencode.ai/install | bash
XDG_BIN_DIR=$HOME/.local/bin curl -fsSL https://opencode.ai/install | bash
```

### Agents

OpenCode 内置两种 Agent，可用 `Tab` 键快速切换：

- **build** - 默认模式，具备完整权限，适合开发工作
- **plan** - 只读模式，适合代码分析与探索
  - 默认拒绝修改文件
  - 运行 bash 命令前会询问
  - 便于探索未知代码库或规划改动

另外还包含一个 **general** 子 Agent，用于复杂搜索和多步任务，内部使用，也可在消息中输入 `@general` 调用。

了解更多 [Agents](https://opencode.ai/docs/agents) 相关信息。

### 文档

更多配置说明请查看我们的 [**官方文档**](https://opencode.ai/docs)。

### CLI 命令速览（基于源码）

以下内容根据源码中的 cli/cmd 实现整理，便于快速了解每个命令的用途。

#### 启动与交互

- `opencode [project]`：启动 TUI（默认命令）。
  - 支持 `--model/-m`、`--continue/-c`、`--session/-s`、`--prompt`、`--agent`。
  - 当显式设置网络参数（如端口/主机名/MDNS）时会启动本地服务，否则使用内部 RPC。
- `opencode attach <url>`：连接到已运行的服务。
  - 支持 `--dir`（工作目录）、`--session/-s`。
- `opencode run [message...]`：发送一次性消息或执行命令。
  - 支持 `--command`、`--file/-f`、`--format`（默认/JSON 事件）、`--model/-m`、`--agent`、`--title`、`--continue/-c`、`--session/-s`、`--share`、`--attach`、`--port`、`--variant`。
  - 支持从 stdin 读取内容并拼接到消息中。

#### 账号与模型

- `opencode auth`：凭据管理。
  - `login [url]`：登录 provider（支持插件/OAuth/API Key）。
  - `logout`：移除已保存的凭据。
  - `list`：列出已保存的凭据与生效的环境变量。
- `opencode models [provider]`：列出可用模型。
  - `--verbose` 输出模型元数据；`--refresh` 刷新缓存。

#### 会话与数据

- `opencode session list`：列出会话。
  - `--max-count/-n` 限制数量；`--format` 支持 table/json。
- `opencode export [sessionID]`：导出会话 JSON（未指定时会交互选择）。
- `opencode import <file|url>`：从本地 JSON 或 opncd.ai 分享链接导入会话。
- `opencode stats`：统计 token/cost。
  - `--days`、`--tools`、`--models`、`--project` 过滤与聚合。

#### 服务与协议

- `opencode serve`：启动无界面服务端（headless）。
- `opencode web`：启动服务端并打开 Web 界面。
- `opencode mcp`：管理 MCP（Model Context Protocol）服务器。
  - `list`：显示连接与认证状态。
  - `add`：添加本地命令或远程 URL（可选 OAuth）。
  - `auth [name]`：执行 OAuth 认证。
  - `logout [name]`：移除 OAuth 凭据。
  - `debug <name>`：诊断 OAuth 与连通性。
- `opencode acp`：启动 ACP（Agent Client Protocol）服务，使用 stdin/stdout 的 NDJSON 通道。

#### 集成与协作

- `opencode github`：GitHub Agent 管理。
  - `install`：生成 GitHub Actions 工作流并提示下一步配置。
  - `run`：在 Actions 事件上下文中运行（支持 mock event/token）。
- `opencode pr <number>`：拉取并检出 PR 分支，必要时导入会话并启动 TUI。

#### 调试

- `opencode debug`：调试与排障工具集。
  - `config` 配置解析；`lsp` 诊断/符号；`ripgrep` 搜索；`file` 文件系统调试；
  - `scrap` 项目列表；`skill` 技能列表；`snapshot` 快照追踪与差异；
  - `agent` 代理配置详情；`paths` 全局路径；`wait` 常驻等待。

### 参与贡献

如有兴趣贡献代码，请在提交 PR 前阅读 [贡献指南 (Contributing Docs)](./CONTRIBUTING.md)。

### 基于 OpenCode 进行开发

如果你在项目名中使用了 “opencode”（如 “opencode-dashboard” 或 “opencode-mobile”），请在 README 里注明该项目不是 OpenCode 团队官方开发，且不存在隶属关系。

### 常见问题 (FAQ)

#### 这和 Claude Code 有什么不同？

功能上很相似，关键差异：

- 100% 开源。
- 不绑定特定提供商。推荐使用 [OpenCode Zen](https://opencode.ai/zen) 的模型，但也可搭配 Claude、OpenAI、Google 甚至本地模型。模型迭代会缩小差异、降低成本，因此保持 provider-agnostic 很重要。
- 内置 LSP 支持。
- 聚焦终端界面 (TUI)。OpenCode 由 Neovim 爱好者和 [terminal.shop](https://terminal.shop) 的创建者打造，会持续探索终端的极限。
- 客户端/服务器架构。可在本机运行，同时用移动设备远程驱动。TUI 只是众多潜在客户端之一。

---

**加入我们的社区** [Discord](https://discord.gg/opencode) | [X.com](https://x.com/opencode)
