## ADDED Requirements

### Requirement: Enhanced Agent Definition
The system SHALL support `AgentDefinition` with fields: id, name, domain, role (orchestrator/specialist/advisor/executor/utility), capabilities, tools, skills, mode (primary/subagent), model, temperature, maxTokens, systemPrompt, permissions, and metadata. The `role` field describes the Agent's functional role in orchestration (distinct from P3's `Category` which defines model+temperature routing presets). Agents SHALL be definable via YAML, Markdown (frontmatter), or TypeScript (`defineAgent()`).

#### Scenario: Register agent from TypeScript
- **WHEN** `defineAgent({ id: "analyst", domain: "analysis", role: "specialist", capabilities: ["data.analyze"], tools: ["read", "grep"], model: "claude-sonnet-4-20250514" })` is called
- **THEN** the agent is registered in AgentRegistry with all specified metadata

#### Scenario: Scan and register agents from directory
- **WHEN** `AgentRegistry.scanAndRegister(".vitamin/agents/")` is called
- **THEN** all `.yaml`, `.md`, and `.ts` agent definition files in the directory are parsed and registered

#### Scenario: Query agents by domain
- **WHEN** `AgentRegistry.byDomain("coding")` is called
- **THEN** all agents with `domain: "coding"` are returned

#### Scenario: Resolve agent for input
- **WHEN** `AgentRegistry.resolve("Fix the login bug")` is called
- **THEN** the system selects the most appropriate agent based on configured rules

### Requirement: Enhanced Tool Definition and MCP Adapter
The system SHALL support `ToolDefinition` with category (file/code/document/search/api/data/shell/communication/utility), Zod parameter schema, and async execute function. The system SHALL adapt MCP server tools via `ToolRegistry.loadFromMCP()` and convert tools to AI SDK format via `ToolRegistry.toAISDKTools()`.

#### Scenario: Define and register a tool
- **WHEN** `Tool.define("read", factory)` is called where factory returns `{ description, parameters: zodSchema, execute }`
- **THEN** the tool is registered and available for agents

#### Scenario: Load MCP tools
- **WHEN** `ToolRegistry.loadFromMCP(mcpServer)` is called for a connected MCP server
- **THEN** all tools exposed by the MCP server are registered as ToolDefinitions

#### Scenario: Filter tools for agent
- **WHEN** `ToolRegistry.forAgent("analyst")` is called
- **THEN** only tools that the "analyst" agent has permission to use are returned

#### Scenario: Convert to AI SDK format
- **WHEN** `ToolRegistry.toAISDKTools(toolIds)` is called
- **THEN** the specified tools are converted to Vercel AI SDK `tools` parameter format

### Requirement: Built-in Tool Set
The system SHALL provide built-in tools: read (file), write (file), edit (file), bash (shell execution), glob (file search), grep (text search), ls (directory listing), subtask (sub-agent invocation), fetch (web page), and todo (task management).

#### Scenario: Read file tool
- **WHEN** the `read` tool is executed with `{ path: "src/app.ts", startLine: 1, endLine: 50 }`
- **THEN** the tool returns the file contents for the specified line range

#### Scenario: Bash tool with permission check
- **WHEN** the `bash` tool is executed with `{ command: "npm test" }`
- **THEN** the system checks `bash.execute` permission before executing the command

#### Scenario: Subtask tool
- **WHEN** the `subtask` tool is executed with `{ task: "Analyze the auth module" }`
- **THEN** a sub-session is created with the default agent and the task result is returned
- **NOTE** P2 uses the default/specified agent; P3 adds Agent Matrix integration (e.g., `agent: "explorer"`)

### Requirement: Session Management
The system SHALL manage sessions with CRUD operations (create, list, get, remove, fork). Sessions SHALL persist via Storage and publish events via Bus. Each session tracks project ID, directory, messages, agent assignment, and metadata.

#### Scenario: Create session
- **WHEN** `Session.create({ directory, agent: "build" })` is called
- **THEN** a new session is created, persisted to Storage, and `session.created` event is published

#### Scenario: Fork session
- **WHEN** `Session.fork(sessionId, messageId)` is called
- **THEN** a new session is created with messages up to `messageId` copied from the source session

### Requirement: Session Prompt Processing Loop
The system SHALL implement the agentic loop: receive user input → resolve agent → get LLM model → build tool set (registered + MCP) → stream LLM response → parse text/reasoning/tool-calls → execute tools with permission checks → persist message parts → loop until no tool calls remain.

#### Scenario: Simple text response
- **WHEN** a user sends "What is TypeScript?" to a session
- **THEN** the LLM responds with text, a TextPart is persisted, and `message.created` event is published

#### Scenario: Tool call loop
- **WHEN** the LLM responds with a tool call to `read` file
- **THEN** the tool is executed, the result is added to context, and the LLM is called again with the tool result
- **AND** this loops until the LLM produces a final text response

#### Scenario: Context compaction
- **WHEN** the total token count of session messages exceeds the model's context window
- **THEN** the system compacts older messages into a summary while preserving recent context

### Requirement: MCP Client
The system SHALL implement an MCP client that loads configuration from `.vitamin/mcp.json`, connects to MCP servers, discovers tools, and registers them in ToolRegistry.

#### Scenario: Load MCP configuration
- **WHEN** `.vitamin/mcp.json` defines `{ "servers": [{ "name": "playwright", "command": "npx @playwright/mcp" }] }`
- **THEN** the system connects to the MCP server and registers its tools

### Requirement: Permission System
The system SHALL implement rule-based permission control with `allow/deny/ask` actions and wildcard pattern matching. Rules SHALL be layered: defaults → agent definition → user config → session override.

#### Scenario: Permission check
- **WHEN** a tool execution requires `file.write` permission for path `/src/app.ts`
- **AND** the agent's rule set has `{ permission: "file.write", pattern: "/src/**", action: "allow" }`
- **THEN** the tool execution proceeds without user confirmation

#### Scenario: Ask permission
- **WHEN** a tool execution requires `bash.execute` permission
- **AND** no matching rule has `action: "allow"`
- **THEN** the system publishes a `permission.requested` event and waits for user response

### Requirement: Skill Loader
The system SHALL load Skills from `.vitamin/skills/` and project `skills/` directories by scanning for `.md` files and parsing YAML frontmatter (name, description, MCP configuration). The loader SHALL work without Bun runtime dependencies.

#### Scenario: Load skill from markdown
- **WHEN** `.vitamin/skills/playwright.md` exists with frontmatter `name: playwright, description: Browser automation`
- **THEN** the skill is loaded and available for agent prompt injection

### Requirement: Git Snapshot and Revert
The system SHALL record Git snapshots before file-modifying tool executions (write/edit/bash) and support reverting to any snapshot point.

#### Scenario: Snapshot before edit
- **WHEN** the `edit` tool is about to modify `src/app.ts`
- **THEN** the current Git state of the file is recorded as a SnapshotPart

#### Scenario: Revert to snapshot
- **WHEN** a user requests revert to a specific snapshot
- **THEN** the system restores all files to their state at that snapshot point

### Requirement: Grounding Knowledge MVP
The system SHALL provide MVP grounding with `code_repo` (code repository grep/glob indexing) and `data_store` (Storage-based file queries) data sources.

#### Scenario: Code repository grounding
- **WHEN** an agent needs to understand the codebase structure
- **THEN** the `code_repo` grounding source provides file listing and content search capabilities

### Requirement: Short-Term Memory
The system SHALL provide short-term memory (session message history management) and working memory (current task context) as the Phase 1 memory layer.

#### Scenario: Short-term message history
- **WHEN** a session has accumulated 50 messages
- **THEN** the shortTerm memory provides access to the full message history for context building and compaction decisions

#### Scenario: Working memory context
- **WHEN** an agent is executing a multi-step task
- **THEN** the working memory maintains current task state, recent tool results, and accumulated context
