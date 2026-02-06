## ADDED Requirements

### Requirement: AIME Dynamic Planner
The system SHALL provide a Dynamic Planner based on the AIME framework with: DomainAnalyzer (domain identification + complexity estimation), DynamicPlannerCore (strategic + tactical dual-layer planning), ActorFactory (dynamic Agent instantiation from specs), and ProgressManager (centralized state + dependency graph tracking). A Bypass mechanism SHALL skip planning for simple tasks. Replanning SHALL trigger on task failure, critical evidence, dependency blocking, progress stagnation, or token budget depletion, with frequency control (max 3 replans, 60s cooldown).

#### Scenario: Bypass simple task
- **WHEN** a user sends a request under 50 tokens or targeting a single file
- **THEN** the Planner Bypass mechanism routes the task directly to execution without generating a plan

#### Scenario: Generate strategic and tactical plan
- **WHEN** a complex task "Refactor the entire authentication module with OAuth2 support" is submitted with planning enabled
- **THEN** the DynamicPlanner generates a strategic plan (high-level goals) and tactical plan (concrete tasks with Actor assignments)

#### Scenario: Replanning on failure
- **WHEN** a task in the plan fails with an unexpected error
- **THEN** the Replanning trigger evaluates the failure, generates an updated plan, and reassigns tasks
- **AND** replanning respects the 3-max limit and 60s cooldown

#### Scenario: Progress tracking
- **WHEN** tasks are executing under a plan
- **THEN** ProgressManager tracks each task state (pending → assigned → running → completed/failed/blocked) and detects dependency blockages

### Requirement: Visual Debug System with Breakpoints
The system SHALL provide a visual debug system with 16 breakpoint locations across LLM Loop (before_call, after_response, on_tool_decision, on_stream_chunk), Tool (before_execute, after_execute, on_error, on_permission), Agent lifecycle (on_create, on_terminate, on_idle_timeout), Message (on_send, on_receive), Workflow (on_step_start, on_step_end), and Orchestration (on_delegate). Breakpoints SHALL support conditional expressions and hit count filters.

#### Scenario: Pause at LLM tool decision
- **WHEN** a breakpoint is set at `llm.on_tool_decision` and the LLM decides to call a tool
- **THEN** execution pauses, `debug.paused` event is published with full DebugContext, and the system waits for resume

#### Scenario: Resume with step over
- **WHEN** execution is paused at a breakpoint and `resume("step_over")` is called
- **THEN** execution continues to the next breakpoint location at the same depth level

#### Scenario: Conditional breakpoint
- **WHEN** a breakpoint is set at `tool.before_execute` with condition `args.path.includes("auth")`
- **THEN** execution only pauses when the tool is operating on a file containing "auth" in its path

### Requirement: Debug Context Snapshot
The system SHALL capture complete context snapshots at breakpoints including: agent state, swarm topology, LLM parameters (model, temperature, messages), tool call details, workflow progress, and memory contents.

#### Scenario: Inspect context at breakpoint
- **WHEN** execution is paused at a breakpoint
- **THEN** `GET /debug/context` returns the complete DebugContext with all agent, LLM, tool, and memory state

### Requirement: Trace Replay
The system SHALL record complete execution traces (event sequences + context snapshot chains) and support replay with 1x/2x/4x speed, pause, and jump-to-breakpoint navigation.

#### Scenario: Replay execution trace
- **WHEN** an admin requests replay of a session trace via `GET /debug/trace/:sessionId`
- **THEN** the system returns the ordered event sequence with context snapshots for time-based replay

### Requirement: Elastic Auto-Scaling
The system SHALL implement Runner-level auto-scaling based on metrics: scale up when queue wait exceeds threshold or active Runner ratio > 80%, scale down when idle Runners > 50% for over 5 minutes. Scaling step SHALL be ±25% of capacity with configurable min/max limits.

#### Scenario: Scale up under load
- **WHEN** 10 tasks are queued and all 5 Runners are active (100% utilization)
- **THEN** the scaling strategy triggers scale-up, adding 2 more Runners (25% of capacity rounded up)

#### Scenario: Scale down when idle
- **WHEN** 4 out of 8 Runners are idle for more than 5 minutes
- **THEN** the scaling strategy triggers scale-down, removing 2 idle Runners

### Requirement: Multi-Machine Discovery Interface
The system SHALL provide service discovery and distributed scheduling interfaces for future multi-machine deployment: node registration/heartbeat, health checks, cross-node message routing, and task distribution strategies (round-robin, least-loaded, affinity).

#### Scenario: Node registration
- **WHEN** a new machine starts a Vitamin server with multi-machine mode enabled
- **THEN** the node registers itself with the discovery service and begins heartbeat reporting

### Requirement: Agent Evaluation Framework
The system SHALL provide an evaluation framework with EvalSuite (test suite), EvalCase (input + expected + graders), and EvalResult (score + details). Grader types SHALL include: ExactMatch, PatternMatch, LLMGrader (rubric-based LLM scoring), HumanGrader (manual scoring), and CompositeGrader (weighted average). The framework SHALL support parallel case execution and non-determinism handling via statistical runs.

#### Scenario: Run evaluation suite
- **WHEN** `vitamin eval run coding-eval` is executed with a suite containing 10 cases
- **THEN** the system creates sessions for each case, runs them (optionally in parallel), collects outputs, applies graders, and generates an EvalReport

#### Scenario: LLM grader scoring
- **WHEN** an EvalCase uses an LLMGrader with rubric "Score 1-5 on code quality: correctness, readability, efficiency"
- **THEN** the LLM evaluates the agent output against the rubric and returns a structured score

#### Scenario: Non-determinism handling
- **WHEN** an EvalCase is configured with `runs: 5`
- **THEN** the case is executed 5 times and the report includes mean score, standard deviation, and pass rate

### Requirement: Sandbox Execution
The system SHALL provide sandbox isolation for tool execution: command whitelist for shell, file system access scoping, network access control, timeout protection, and resource limits (memory/CPU).

#### Scenario: Blocked command in sandbox
- **WHEN** an agent attempts to execute `rm -rf /` via the bash tool with sandbox enabled
- **THEN** the sandbox blocks the command and returns a permission denied error

#### Scenario: File system scoping
- **WHEN** sandbox is configured with `allowedPaths: ["/project/src"]`
- **THEN** file operations outside `/project/src` are blocked

### Requirement: Audit Logging
The system SHALL record all agent operations (tool calls, file modifications, shell executions, LLM calls) as AuditEntry records persisted to Storage with timestamp, agent ID, action type, target, result, and metadata.

#### Scenario: Audit trail for file modification
- **WHEN** an agent modifies `src/auth.ts` via the edit tool
- **THEN** an AuditEntry is created with action "file.edit", target "src/auth.ts", and the diff as metadata

### Requirement: Advanced Memory System
The system SHALL extend the memory system with: longTerm (cross-session persistent memory for key decisions and patterns), episodic (key operation snapshots for success/failure trajectories), and an optional semantic memory interface for future vector store integration.

#### Scenario: Long-term memory recall
- **WHEN** a new session starts in a project where a previous session learned "this project uses Prettier for formatting"
- **THEN** the longTerm memory provides this information to the agent's context

### Requirement: Observability
The system SHALL provide structured log export (OpenTelemetry format), metrics collection with Prometheus endpoint (`GET /metrics`), and distributed trace propagation (traceId/spanId across agent calls).

#### Scenario: Prometheus metrics endpoint
- **WHEN** `GET /metrics` is called
- **THEN** the server returns Prometheus-formatted metrics including agent_sessions_total, llm_calls_duration_seconds, tool_executions_total
