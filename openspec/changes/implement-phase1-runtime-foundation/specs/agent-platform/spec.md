## ADDED Requirements

### Requirement: Instance Context Container
The system SHALL provide an `Instance` context container based on `AsyncLocalStorage` that manages per-directory runtime state. It SHALL support `Instance.provide({ directory, init, fn })` to create/reuse instances, `Instance.state(factory, dispose?)` to create instance-scoped singletons, and `Instance.directory` / `Instance.worktree` / `Instance.project` accessors.

#### Scenario: Creating instance context
- **WHEN** `Instance.provide({ directory: "/project", init, fn })` is called
- **THEN** the system creates a new instance context bound to the directory and invokes `fn()` within that context

#### Scenario: Instance state lifecycle
- **WHEN** a module calls `Instance.state(() => createResource(), dispose)` within an instance context
- **THEN** the state is created once per instance, cached for subsequent calls, and `dispose()` is invoked when `Instance.dispose()` is called

#### Scenario: Nested instance provide
- **WHEN** `Instance.provide()` is called within an existing instance context with a different directory
- **THEN** a new separate instance context is created for the new directory

### Requirement: Project Space Detection
The system SHALL detect project information from a working directory by finding the Git root and computing a stable project ID from the root commit hash. It SHALL work without Bun runtime dependencies.

#### Scenario: Git project detection
- **WHEN** `Space.detect(directory)` is called on a directory within a Git repository
- **THEN** the system returns `SpaceInfo` with `id` (root commit hash), `name`, `worktree`, and `vcs` metadata

#### Scenario: Non-git directory
- **WHEN** `Space.detect(directory)` is called on a directory that is not a Git repository
- **THEN** the system returns a `SpaceInfo` with a generated ID based on the directory path

### Requirement: File System Storage Engine
The system SHALL provide a JSON key-value storage engine that persists data to the local file system under `$XDG_DATA_HOME/vitamin/storage/`. It SHALL support `read`, `write`, `update`, `remove`, and `list` operations with read-write locking for concurrent safety.

#### Scenario: Writing and reading data
- **WHEN** `Storage.write(["session", "proj1", "sess1"], data)` is called
- **THEN** the data is persisted to `$XDG_DATA_HOME/vitamin/storage/session/proj1/sess1.json`
- **AND** `Storage.read(["session", "proj1", "sess1"])` returns the same data

#### Scenario: Atomic update
- **WHEN** `Storage.update(key, draft => { draft.title = "new" })` is called
- **THEN** the storage reads current data, applies the mutation, and writes back atomically with a write lock

#### Scenario: Listing entries
- **WHEN** `Storage.list(["session", "proj1"])` is called
- **THEN** the system returns all session IDs under the `proj1` directory

#### Scenario: Migration execution
- **WHEN** the storage engine starts with pending migrations
- **THEN** migrations are executed sequentially and the version number is recorded

### Requirement: Dual-Layer Event Bus
The system SHALL provide a dual-layer event bus: an instance-scoped `Bus` for publish/subscribe within a single instance, and a `GlobalBus` for cross-instance broadcasts. Events SHALL be defined using Zod schemas for type safety.

#### Scenario: Instance-scoped publish/subscribe
- **WHEN** a subscriber registers for `session.created` event via `Bus.subscribe(SessionCreated, handler)`
- **AND** `Bus.publish(SessionCreated, { sessionId: "s1" })` is called within the same instance
- **THEN** the handler receives the typed payload

#### Scenario: Wildcard subscription
- **WHEN** a subscriber registers with `Bus.subscribe("*", handler)`
- **THEN** the handler receives all events published within the instance

#### Scenario: Global broadcast
- **WHEN** `Bus.publish()` is called within any instance
- **THEN** `GlobalBus` also receives the event and all SSE clients connected via `GET /event` receive the event

### Requirement: Multi-Layer Configuration System
The system SHALL merge configuration from multiple layers in priority order: remote → global (`$XDG_CONFIG_HOME/vitamin/vitamin.jsonc`) → project (`.vitamin/config.jsonc`) → environment variable (`VITAMIN_CONFIG`) → inline. All configuration SHALL be validated with Zod schemas.

#### Scenario: Configuration merge priority
- **WHEN** global config sets `provider.default = "anthropic"` and project config sets `provider.default = "openai"`
- **THEN** the merged config uses `provider.default = "openai"` (project overrides global)

#### Scenario: JSONC parsing
- **WHEN** a configuration file contains JSON with comments (`// comment` or `/* block */`)
- **THEN** the system correctly parses the file by stripping comments before JSON.parse

#### Scenario: Config hot reload
- **WHEN** a configuration file is modified on disk
- **THEN** the system reloads the configuration and publishes `config.changed` event via Bus

### Requirement: Unified LLM Provider Interface
The system SHALL provide a unified interface for 20+ LLM providers based on Vercel AI SDK. It SHALL support `Provider.getModel(providerID, modelID)` to obtain an AI SDK `LanguageModel` instance, and `Provider.transform()` for provider-specific parameter adjustments.

#### Scenario: Getting a model
- **WHEN** `Provider.getModel("anthropic", "claude-sonnet-4-20250514")` is called with a valid API key configured
- **THEN** the system returns an AI SDK `LanguageModel` instance for Anthropic Claude Sonnet

#### Scenario: Provider authentication
- **WHEN** a provider requires an API key and the key is configured via environment variable or config
- **THEN** `Provider.auth(providerID)` returns the credentials used to initialize the provider

#### Scenario: Model registry lookup
- **WHEN** `Provider.models()` is called
- **THEN** the system returns all registered models with metadata (context window, pricing, supported features)

### Requirement: HTTP Server with SSE
The system SHALL provide an HTTP server based on Hono with Server-Sent Events support. The `GET /event` endpoint SHALL stream all Bus events to connected clients with `Last-Event-ID` reconnection support.

#### Scenario: SSE event streaming
- **WHEN** a client connects to `GET /event`
- **AND** a `session.created` event is published via Bus
- **THEN** the client receives the event as an SSE message with `event: session.created` and `data: {...}`

#### Scenario: SSE reconnection
- **WHEN** a client reconnects with `Last-Event-ID: 42`
- **THEN** the server replays any missed events since ID 42

#### Scenario: Instance context switching
- **WHEN** a request includes `x-vitamin-directory: /path/to/project` header
- **THEN** the request is processed within the instance context for that directory

#### Scenario: Health check
- **WHEN** `GET /health` is called
- **THEN** the server responds with 200 and system status information

### Requirement: CLI Bootstrap Chain
The system SHALL provide a `bootstrap()` function that initializes the runtime: parse directory → create Instance → run initialization chain (Config → Vcs → Snapshot) → execute callback → cleanup. CLI commands SHALL be registered via yargs.

#### Scenario: Starting headless server
- **WHEN** user runs `vitamin serve --port 3141`
- **THEN** the CLI bootstraps an instance for the current directory and starts the HTTP server on port 3141

#### Scenario: Non-interactive execution
- **WHEN** user runs `vitamin run "Fix the login bug"`
- **THEN** the CLI bootstraps an instance and sends the message to the AI session (skeleton; full implementation in P2)

### Requirement: Shared Utility Library
The system SHALL provide shared utilities: `createId(prefix)` for unique ID generation (timestamp + random with prefix), `Log` namespace for leveled logging (DEBUG/INFO/WARN/ERROR), `Global` namespace for XDG-compliant path management, and `Env` namespace for environment variable access.

#### Scenario: ID generation
- **WHEN** `createId("sess")` is called twice
- **THEN** two different IDs are returned, both prefixed with `sess_`

#### Scenario: Log level filtering
- **WHEN** log level is set to WARN
- **THEN** `Log.debug()` and `Log.info()` calls produce no output
- **AND** `Log.warn()` and `Log.error()` calls produce output

#### Scenario: XDG paths
- **WHEN** `Global.data()` is called
- **THEN** the system returns `$XDG_DATA_HOME/vitamin/` (defaulting to `~/.local/share/vitamin/` if unset)
