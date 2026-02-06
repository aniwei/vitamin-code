## ADDED Requirements

### Requirement: SwarmWorkspace
The system SHALL provide a SwarmWorkspace that maintains Agent instances, a MessageHub, and a Topology graph. It SHALL support two core primitives: `create` (dynamically create Agent) and `send` (deliver message to Agent). Humans SHALL be able to chat with any Agent at any level via `chatWith(agentPath)`.

#### Scenario: Create swarm and agents
- **WHEN** `SwarmWorkspace.create({ name: "auth-refactor" })` is called followed by `createAgent({ role: "coder", task: "Implement JWT auth" })`
- **THEN** a workspace is created with the agent registered in the topology

#### Scenario: Human interacts with nested agent
- **WHEN** `SwarmWorkspace.chatWith(workspaceId, "1-3-2", "What about OAuth scopes?")` is called
- **THEN** the message is delivered to the agent at topology path 1-3-2 and the agent responds

### Requirement: AgentRunner Lifecycle
The system SHALL provide an AgentRunner that implements the main loop: check inbox → merge messages → LLM reasoning loop → tool execution (including `create`/`send` primitives) → persist state → repeat. Runner lifecycle SHALL be: idle → active → suspended → terminated, with configurable idle timeout for auto-termination.

#### Scenario: AgentRunner main loop
- **WHEN** a message arrives in an idle Agent's inbox
- **THEN** the Runner transitions to active, processes the message through the LLM loop, executes any tool calls, and returns to idle

#### Scenario: LLM loop with tool calls
- **WHEN** the LLM responds with a tool call to `create` a sub-agent
- **THEN** the Runner executes the create primitive, adds the new agent to the topology, starts a sub-runner, and continues the LLM loop with the creation result

#### Scenario: Idle timeout termination
- **WHEN** an Agent remains idle for longer than the configured timeout (default 5 minutes)
- **THEN** the Runner transitions to terminated and resources are released

### Requirement: MessageHub
The system SHALL route messages between Agents via a MessageHub supporting point-to-point, broadcast, and multicast delivery. All messages SHALL be persisted to Storage and trigger Bus events.

#### Scenario: Point-to-point message
- **WHEN** `MessageHub.send(agentA, agentB, { content: "Analysis complete" })` is called
- **THEN** the message is added to agentB's inbox and `swarm.message.created` event is published

#### Scenario: Broadcast message
- **WHEN** `MessageHub.broadcast(coordinator, { content: "New requirement added" })` is called
- **THEN** all agents in the workspace receive the message

### Requirement: Topology Management
The system SHALL maintain a topology graph tracking Agent relationships (who created whom, who messages whom). Agents SHALL be assigned role-based index numbers (e.g., coder-1, coder-2). Topology changes SHALL trigger Bus events.

#### Scenario: Role index assignment
- **WHEN** two agents with role "coder" are created in the same workspace
- **THEN** they are assigned roleIndex 1 and 2 respectively (coder-1, coder-2)

#### Scenario: Topology path
- **WHEN** agent A (index 1) creates agent B (index 3), and agent B creates agent C (index 2)
- **THEN** `Topology.getPath(C)` returns `"1-3-2"` index-based path notation

#### Scenario: Cascading cleanup
- **WHEN** an agent is terminated
- **THEN** all its child agents in the topology are also terminated

### Requirement: Runner Pool
The system SHALL manage AgentRunner instances with configurable maximum concurrency. Idle runners SHALL be recycled and new runners SHALL queue when the pool is full.

#### Scenario: Concurrency limit
- **WHEN** maxConcurrency is set to 5 and 5 runners are active
- **THEN** the 6th agent creation queues until a runner becomes available

### Requirement: Swarm UI Events
The system SHALL define and publish Swarm-specific events via Bus: agent lifecycle (created/terminated/status), message delivery, LLM calls (start/end/text streaming), tool execution (start/end), and topology changes. All events SHALL be available via SSE.

#### Scenario: Real-time topology visualization
- **WHEN** a new agent is created in the swarm
- **THEN** `swarm.agent.created` and `swarm.topology.changed` events are published via Bus
- **AND** SSE clients receive both events for real-time UI update

### Requirement: Task API
The system SHALL provide an async Task API: `POST /task` returns 202 Accepted with a TaskRecord. Tasks go through a state machine (queued → running → suspended → completed/failed/cancelled). A `GET /task/:id/events` SSE endpoint SHALL stream real-time progress events with `Last-Event-ID` reconnection support.

#### Scenario: Submit async task
- **WHEN** `POST /task { input: "Refactor auth module" }` is called
- **THEN** the server responds with 202 and a TaskRecord with status "queued"
- **AND** a SwarmWorkspace is created to process the task

#### Scenario: Task SSE events
- **WHEN** a client connects to `GET /task/t1/events`
- **THEN** the client receives real-time events: agent creation, LLM streaming, tool execution, topology changes, and task completion

#### Scenario: Task cancellation
- **WHEN** `POST /task/t1/cancel` is called while the task is running
- **THEN** all agents in the task's workspace are terminated and the task status becomes "cancelled"

### Requirement: Task Authentication
The system SHALL support configurable authentication for Task API: none (local development), JWT token verification, and OAuth2 flow.

#### Scenario: JWT authentication
- **WHEN** Task API auth is configured as "jwt" and a request arrives with `Authorization: Bearer <token>`
- **THEN** the token is verified and the request is processed if valid, or rejected with 401 if invalid
