/**
 * Progress Management Module Types
 *
 * Centralized state management for AIME-style dynamic planning.
 * Acts as "single source of truth" for task states, dependencies, evidence, and decisions.
 */

/**
 * Overall status of a plan execution
 */
export type PlanStatus =
  | "planning"    // Initial planning in progress
  | "executing"   // Tasks are being executed
  | "replanning"  // Re-evaluating and adjusting the plan
  | "completed"   // All tasks completed successfully
  | "failed"      // Plan failed and cannot continue

/**
 * Status of an individual task
 */
export type TaskStatus =
  | "pending"     // Ready to execute, waiting in queue
  | "running"     // Currently being executed by an agent
  | "completed"   // Successfully completed
  | "failed"      // Failed (may retry)
  | "blocked"     // Waiting on dependencies
  | "skipped"     // Skipped due to plan change

/**
 * Result of a completed or failed task
 */
export interface TaskResult {
  /** Whether the task succeeded */
  success: boolean
  /** Output/result data from the task */
  output?: string
  /** Error message if failed */
  error?: string
  /** Execution time in milliseconds */
  durationMs?: number
  /** Token usage for this task */
  tokensUsed?: number
  /** Timestamp when completed */
  completedAt: number
}

/**
 * A single task node in the execution plan
 */
export interface TaskNode {
  /** Unique identifier for this task */
  id: string
  /** Human-readable task description */
  description: string
  /** Current status of the task */
  status: TaskStatus
  /** IDs of tasks that must complete before this one */
  dependencies: string[]
  /** Agent assigned to execute this task (if any) */
  assignedAgent?: string
  /** Result of task execution (if completed/failed) */
  result?: TaskResult
  /** Number of retry attempts */
  retryCount: number
  /** Maximum retries allowed for this task */
  maxRetries: number
  /** Priority level (higher = more important) */
  priority: number
  /** Timestamp when task was created */
  createdAt: number
  /** Timestamp when task started running */
  startedAt?: number
}

/**
 * Evidence discovered during task execution
 * Used to inform replanning decisions
 */
export interface Evidence {
  /** Unique identifier for this evidence */
  id: string
  /** ID of the task that discovered this evidence */
  taskId: string
  /** Type of evidence */
  type: "discovery" | "error" | "constraint" | "opportunity" | "context"
  /** Significance level (1-10, higher = more important for replanning) */
  significance: number
  /** Description of what was discovered */
  content: string
  /** Timestamp when evidence was recorded */
  timestamp: number
  /** Whether this evidence has been processed by the planner */
  processed: boolean
}

/**
 * Log entry for decisions made during planning/execution
 */
export interface DecisionLog {
  /** Unique identifier for this decision */
  id: string
  /** Type of decision */
  type: "plan" | "replan" | "assign" | "retry" | "skip" | "abort"
  /** What decision was made */
  decision: string
  /** Why this decision was made */
  rationale: string
  /** Component that made the decision */
  actor: "planner" | "factory" | "executor" | "trigger"
  /** Related task IDs (if any) */
  relatedTaskIds: string[]
  /** Timestamp when decision was made */
  timestamp: number
}

/**
 * Complete state of a plan's execution progress
 */
export interface ProgressState {
  /** Unique identifier for this plan */
  planId: string
  /** Original goal/request from user */
  goal: string
  /** Plan version (increments on each replan) */
  version: number
  /** Current plan status */
  status: PlanStatus
  /** All tasks in the plan */
  tasks: TaskNode[]
  /** Evidence discovered during execution */
  evidence: Evidence[]
  /** Decision log */
  decisions: DecisionLog[]
  /** Timestamp when plan was created */
  createdAt: number
  /** Timestamp of last state update */
  updatedAt: number
  /** Strategic plan summary (high-level approach) */
  strategicPlan?: string
  /** Optional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Summary statistics for a plan's progress
 */
export interface ProgressSummary {
  /** Plan ID */
  planId: string
  /** Current status */
  status: PlanStatus
  /** Total number of tasks */
  totalTasks: number
  /** Number of completed tasks */
  completedTasks: number
  /** Number of failed tasks */
  failedTasks: number
  /** Number of blocked tasks */
  blockedTasks: number
  /** Number of pending tasks */
  pendingTasks: number
  /** Number of running tasks */
  runningTasks: number
  /** Completion percentage (0-100) */
  progressPercent: number
  /** Unprocessed high-significance evidence count */
  pendingEvidenceCount: number
}

/**
 * Query options for filtering tasks
 */
export interface TaskQuery {
  /** Filter by status */
  status?: TaskStatus | TaskStatus[]
  /** Filter by assigned agent */
  assignedAgent?: string
  /** Include only tasks with specific IDs */
  ids?: string[]
  /** Include only tasks dependent on these task IDs */
  dependsOn?: string[]
}

/**
 * Options for creating a new task
 */
export interface CreateTaskOptions {
  /** Task description */
  description: string
  /** Task dependencies (IDs of tasks that must complete first) */
  dependencies?: string[]
  /** Priority level */
  priority?: number
  /** Maximum retry attempts */
  maxRetries?: number
  /** Pre-assigned agent */
  assignedAgent?: string
}

/**
 * Options for updating task status
 */
export interface UpdateTaskOptions {
  /** New status */
  status?: TaskStatus
  /** Assigned agent */
  assignedAgent?: string
  /** Task result (for completed/failed) */
  result?: TaskResult
  /** Increment retry count */
  incrementRetry?: boolean
}
