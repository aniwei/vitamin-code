## ADDED Requirements

### Requirement: Space Project Model
The system SHALL provide Space as the core organizational unit with CRUD operations. A Space SHALL contain repositories, documents, iterations, grounding sources, and sessions. Spaces SHALL be persisted to Storage and queryable via REST API.

#### Scenario: Create space with repository
- **WHEN** `POST /space { name: "Auth Module", repositories: [{ path: "/project/auth" }] }` is called
- **THEN** a Space is created with the repository linked and Git-based grounding initialized

#### Scenario: List spaces
- **WHEN** `GET /space` is called
- **THEN** all spaces are returned with their metadata (name, repository count, session count, last activity)

### Requirement: Space Iteration Management
The system SHALL support iteration management within a Space with status tracking (planning → active → completed), task assignment, and timeline views.

#### Scenario: Create iteration
- **WHEN** `POST /space/:id/iteration { title: "Sprint 1", startDate, endDate }` is called
- **THEN** an iteration is created with status "planning" and linked to the space

### Requirement: Chat API with Plan/Execute Modes
The system SHALL provide a Chat API at `POST /space/:spaceId/chat` that supports streaming SSE responses. The API SHALL support two modes: Plan (uses Planner Agent, returns structured plans) and Execute (uses Coder/Orchestrator Agent, executes tasks with real-time progress).

#### Scenario: Chat in plan mode
- **WHEN** `POST /space/:spaceId/chat { message: "Refactor auth", mode: "plan" }` is called
- **THEN** the Planner Agent generates a structured plan returned via SSE stream

#### Scenario: Chat in execute mode
- **WHEN** `POST /space/:spaceId/chat { message: "Implement the approved plan", mode: "execute" }` is called
- **THEN** the Orchestrator/Coder Agent executes the task with real-time SSE events (text, tool calls, file changes)

#### Scenario: Streaming response
- **WHEN** the LLM is generating a response
- **THEN** the Chat API streams SSE events: `text` (incremental text), `reasoning` (thinking), `tool-call` (tool invocation), `snapshot` (file state)

### Requirement: Web Frontend Application
The system SHALL provide a web application built with React 19, Mantine 7, React Router v7, TanStack Query v5, and Vite. The application SHALL have two sections: User App and Admin App.

#### Scenario: User navigates to space
- **WHEN** user clicks a space card on the home page
- **THEN** the app navigates to `/spaces/:id` showing the space detail with sidebar navigation (Chat, Iterations, Repos, Docs)

### Requirement: User App AI Chat Interface
The system SHALL provide an AI chat interface with message rendering (Text, Reasoning, ToolCall, Snapshot parts), real-time SSE updates, Plan/Execute mode toggle, tool call cards (collapsible with parameters and results), and file diff preview.

#### Scenario: Render streaming message
- **WHEN** SSE events arrive from the Chat API
- **THEN** the chat panel renders text incrementally, shows reasoning blocks as collapsible, and displays tool calls as cards

#### Scenario: Plan mode interface
- **WHEN** the user switches to Plan mode
- **THEN** the interface shows a plan preview panel with step status indicators and an "Approve & Execute" button

### Requirement: Iteration Board
The system SHALL provide an iteration board with three views: Kanban (columns: Todo/InProgress/Done), List (table format), and Gantt (timeline view).

#### Scenario: Kanban drag-and-drop
- **WHEN** a user drags a task card from "Todo" to "In Progress"
- **THEN** the task status is updated and persisted

### Requirement: Repository Browser
The system SHALL provide a repository browser with a file tree component and Monaco Editor code preview (read-only).

#### Scenario: Browse repository files
- **WHEN** a user navigates to the repository browser
- **THEN** the file tree is displayed and clicking a file shows its content in Monaco Editor

### Requirement: Admin Dashboard
The system SHALL provide an admin dashboard with statistics (active sessions, agents, tool invocations, LLM token usage) and recent activity feed.

#### Scenario: View dashboard
- **WHEN** an admin navigates to `/admin`
- **THEN** the dashboard shows real-time statistics cards and a recent activity list

### Requirement: Admin Agent Builder
The system SHALL provide a visual Agent builder for configuring agent properties (domain, role, capabilities, tools, skills, model, temperature, system prompt), testing conversations, and managing permissions.

#### Scenario: Create agent via builder
- **WHEN** an admin fills the agent form and clicks "Create"
- **THEN** the agent is registered via API and available for sessions

### Requirement: Admin Workflow Builder
The system SHALL provide a drag-and-drop Workflow builder based on React Flow with node types (Agent, Tool, Condition, Parallel, Loop, Human), automatic edge generation, node property panels, and export to WorkflowDefinition JSON.

#### Scenario: Build workflow visually
- **WHEN** an admin drags an AgentNode and a ToolNode onto the canvas and connects them
- **THEN** a WorkflowDefinition with two sequential steps is generated

### Requirement: Admin Swarm Graph
The system SHALL provide a real-time Swarm topology visualization based on React Flow, driven by SSE events. Agent nodes SHALL show status (color-coded), clicking a node SHALL open a side panel with LLM history and messages, and message flow SHALL be animated on edges.

#### Scenario: Real-time swarm visualization
- **WHEN** a swarm creates new agents and sends messages
- **THEN** the Swarm Graph adds nodes and edges in real-time with animated message flow

### Requirement: Admin Tool Builder
The system SHALL provide a Tool builder interface with JSON Schema parameter editor (Monaco Editor), description editing, test execution panel (input parameters → execute → view results), and tool metadata management.

#### Scenario: Test tool execution
- **WHEN** an admin enters parameters in the Tool Builder test panel and clicks "Execute"
- **THEN** the tool executes with the provided parameters and the result is displayed in the output panel

#### Scenario: Edit tool parameters schema
- **WHEN** an admin modifies the Zod parameter schema in the Monaco Editor
- **THEN** the parameter form auto-updates to reflect the new schema

### Requirement: Document Center
The system SHALL provide a document center within each Space for managing Markdown documents with CRUD operations, Markdown editor with live preview, and document listing.

#### Scenario: Create and edit document
- **WHEN** a user creates a new document in a Space's document center
- **THEN** the Markdown editor opens with live preview, and the document is persisted to Storage

#### Scenario: List space documents
- **WHEN** a user navigates to the document center of a Space
- **THEN** all documents are listed with title, last modified date, and preview snippet

### Requirement: Template Management Interface
The system SHALL provide a template management interface for listing available templates, viewing template details (agents, tools, workflow), creating new templates, and launching sessions from templates.

#### Scenario: Launch session from template
- **WHEN** an admin selects the "bug-fix" template and clicks "Run"
- **THEN** a new session is created with the template's pre-configured agents, tools, and workflow

#### Scenario: View template details
- **WHEN** an admin clicks on a template in the list
- **THEN** the detail view shows the template's agents, tools, workflow definition, and system prompt overrides

### Requirement: Configuration Management Interface
The system SHALL provide a configuration management interface for editing Provider settings (API keys, default models), MCP server configuration (server list, connection status), and permission rule management.

#### Scenario: Configure LLM provider
- **WHEN** an admin sets the API key for Anthropic in the Provider settings
- **THEN** the key is saved to configuration and all subsequent LLM calls use the updated credentials

#### Scenario: Manage MCP servers
- **WHEN** an admin adds a new MCP server entry with command and arguments
- **THEN** the server appears in the MCP list and can be connected/disconnected
