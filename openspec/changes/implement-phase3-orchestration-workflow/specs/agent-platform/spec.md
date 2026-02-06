## ADDED Requirements

### Requirement: Domain Abstraction
The system SHALL provide a `Domain` abstraction that groups agents, tools, workflows, and skills into logical domains (coding, analysis, documentation, testing, operations, management). Each domain SHALL be registerable and queryable via `DomainRegistry`.

#### Scenario: Register and query domain
- **WHEN** a domain "coding" is registered with agents ["coder", "reviewer"] and tools ["read", "write", "edit", "bash"]
- **THEN** `DomainRegistry.get("coding")` returns the domain with its associated agents and tools

#### Scenario: Match domain from input
- **WHEN** `Domain.match("Fix the login authentication bug")` is called
- **THEN** the system returns "coding" as the most relevant domain

### Requirement: Category-Based Task Routing
The system SHALL implement Category-based task routing where each Category defines a model, temperature, and system prompt preset (e.g., `visual-engineering` uses gemini-3-pro; `ultrabrain` uses gpt-5-codex with extra-high reasoning). Categories SHALL be configurable and overridable via user configuration.

#### Scenario: Route task by category
- **WHEN** `delegate_task({ category: "ultrabrain", task: "Design a cache invalidation strategy" })` is called
- **THEN** a sub-session is created using the ultrabrain Category's model (default: o3) with high thinking budget

#### Scenario: Custom category override
- **WHEN** user config defines `categories.ultrabrain.model = "claude-opus-4"`
- **THEN** all ultrabrain-category tasks use claude-opus-4 instead of the default

### Requirement: Skill-Based Knowledge Injection
The system SHALL inject Skill knowledge (prompt fragments + MCP tool bindings) into delegate sessions based on specified skills. Skills SHALL support Combo patterns (category + skills combination).

#### Scenario: Skill injection with MCP
- **WHEN** `delegate_task({ category: "visual-engineering", skills: ["playwright", "frontend-ui-ux"], task: "Add responsive sidebar" })` is called
- **THEN** the sub-session includes the `frontend-ui-ux` prompt and `@playwright/mcp` tools

### Requirement: Planning-Execution Separation
The system SHALL enforce strict three-layer role separation: Planner (READ-ONLY, writes plans only to `.vitamin/plans/*.md`), Orchestrator (delegates only via `delegate_task`, cannot write code directly), and Specialist (executes code/tools, cannot delegate further to prevent infinite recursion).

#### Scenario: Planner generates plan
- **WHEN** user enters `/plan Refactor the authentication module`
- **THEN** the Planner Agent analyzes the codebase (read-only) and writes a structured plan to `.vitamin/plans/refactor-auth.md`

#### Scenario: Orchestrator delegates work
- **WHEN** `/start-work` is called with an approved plan
- **THEN** the Orchestrator reads the plan and delegates tasks via `delegate_task` to appropriate Specialists

#### Scenario: Specialist cannot re-delegate
- **WHEN** a Specialist Agent attempts to call `delegate_task`
- **THEN** the system blocks the call and returns an error message

### Requirement: Agent Matrix with Dynamic Prompt
The system SHALL maintain an Agent matrix where each Agent declares metadata (type, cost, delegation triggers, usage hints). A dynamic prompt builder SHALL auto-generate the main Agent's system prompt from registered Agent metadata, so adding/removing Agents requires no manual prompt changes.

#### Scenario: Dynamic prompt generation
- **WHEN** agents [Planner, Explorer, Analyst, Reviewer] are registered with metadata
- **THEN** the Coder Agent's system prompt automatically includes sections describing when and how to delegate to each agent

#### Scenario: Intent gate classification
- **WHEN** a user sends "What is the structure of src/auth?"
- **THEN** the Phase 0 Intent Gate classifies this as "Exploratory" and routes to parallel exploration

### Requirement: Built-in Agent Matrix
The system SHALL provide built-in agents: Planner (planning, read-only), Orchestrator (delegation, no direct code), Coder (full tools, primary), Explorer (read-only, subagent), Analyst (analysis, subagent), and Reviewer (verification, subagent).

#### Scenario: Coder as primary agent
- **WHEN** a user starts a new session without specifying an agent
- **THEN** the Coder agent is selected as the default primary agent

#### Scenario: Explorer for codebase understanding
- **WHEN** the Coder delegates `subtask({ agent: "explorer", task: "Map the auth module structure" })`
- **THEN** the Explorer agent uses only read/grep/glob/ls tools to analyze the codebase

### Requirement: Hook Lifecycle System
The system SHALL provide an extensible Hook system covering lifecycle points: prompt.before, prompt.after, tool.before, tool.after, session.create, session.compaction, context.inject, and agent.delegate. Hooks SHALL be configurable (enable/disable) and support priority ordering.

#### Scenario: Orchestration enforcer hook
- **WHEN** the Orchestrator Agent attempts to call the `write` tool during `tool.before` hook
- **THEN** the `orchestration-enforcer` hook intercepts and blocks the call with an error message

#### Scenario: Context injector hook
- **WHEN** a prompt is about to be sent to the LLM during `context.inject` hook
- **THEN** the `context-injector` hook appends directory README.md content and .vitamin/instructions to the context

### Requirement: Workflow Engine
The system SHALL provide a Workflow engine that executes `WorkflowDefinition` with step types: AgentStep, ToolStep, ConditionStep, ParallelStep, LoopStep, SubWorkflowStep, and HumanStep. The engine SHALL manage step state (pending → running → completed/failed) and support template variable rendering (`{{ steps.xxx.output }}`).

#### Scenario: Execute multi-step workflow
- **WHEN** a workflow with steps [AgentStep("analyze"), ConditionStep(if critical → escalate, else → log)] is executed
- **THEN** the engine runs the analyze step first, evaluates the condition, and executes the appropriate branch

#### Scenario: Parallel execution
- **WHEN** a ParallelStep with branches [email, slack] is reached
- **THEN** both branches execute concurrently and the step completes when all branches finish

#### Scenario: Human approval step
- **WHEN** a HumanStep is reached in the workflow
- **THEN** the engine publishes a `workflow.human.required` event and suspends until user responds

### Requirement: Scene Template System
The system SHALL provide a template system with preset templates (requirement-analysis, bug-fix, feature-dev, doc-writing, code-review) and a dynamic template synthesis capability that uses LLM to compose agents, tools, and workflows from user descriptions.

#### Scenario: Run bug-fix template
- **WHEN** `Template.run("bug-fix", { bugId: "BUG-123", description: "Login white screen" })` is called
- **THEN** the template executes its workflow: Explorer analyzes logs → Analyst identifies root cause → Coder fixes → Reviewer verifies

#### Scenario: Dynamic template synthesis
- **WHEN** a user describes "I need to migrate from MySQL to PostgreSQL"
- **THEN** the system analyzes the description, selects relevant agents (Analyst, Coder) and tools (read, edit, bash), composes a workflow, and returns a synthesized template

### Requirement: Background Agent Manager
The system SHALL provide a BackgroundManager for running Agent tasks concurrently in the background with configurable concurrency limits, task lifecycle management (submit → running → completed), and result aggregation.

#### Scenario: Submit background task
- **WHEN** `BackgroundManager.submit({ agent: "explorer", task: "Analyze all test files" })` is called
- **THEN** the task runs in the background without blocking the main session
- **AND** a `background.task.completed` event is published when done
