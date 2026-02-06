/**
 * Progress State Store
 *
 * In-memory state store for progress management with CRUD operations.
 * Provides thread-safe access to plan execution state.
 */

import { nanoid } from "nanoid"
import type {
  ProgressState,
  TaskNode,
  TaskStatus,
  TaskResult,
  Evidence,
  DecisionLog,
  ProgressSummary,
  TaskQuery,
  CreateTaskOptions,
  UpdateTaskOptions,
  PlanStatus,
} from "./types"

/**
 * Event types emitted by the store
 */
export type StoreEventType =
  | "plan:created"
  | "plan:updated"
  | "plan:deleted"
  | "task:created"
  | "task:updated"
  | "task:completed"
  | "task:failed"
  | "task:unblocked"
  | "evidence:added"
  | "decision:logged"

export interface StoreEvent {
  type: StoreEventType
  planId: string
  taskId?: string
  timestamp: number
  data?: unknown
}

export type StoreEventListener = (event: StoreEvent) => void

/**
 * In-memory progress state store
 */
export class ProgressStore {
  /** Map of planId -> ProgressState */
  private plans: Map<string, ProgressState> = new Map()

  /** Event listeners */
  private listeners: Set<StoreEventListener> = new Set()

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return nanoid(12)
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: Omit<StoreEvent, "timestamp">): void {
    const fullEvent: StoreEvent = {
      ...event,
      timestamp: Date.now(),
    }
    for (const listener of this.listeners) {
      try {
        listener(fullEvent)
      } catch (e) {
        console.error("[ProgressStore] Event listener error:", e)
      }
    }
  }

  /**
   * Subscribe to store events
   */
  subscribe(listener: StoreEventListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // ========== Plan Operations ==========

  /**
   * Create a new plan
   */
  createPlan(goal: string, strategicPlan?: string): ProgressState {
    const planId = this.generateId()
    const now = Date.now()

    const state: ProgressState = {
      planId,
      goal,
      version: 1,
      status: "planning",
      tasks: [],
      evidence: [],
      decisions: [],
      createdAt: now,
      updatedAt: now,
      strategicPlan,
    }

    this.plans.set(planId, state)
    this.emit({ type: "plan:created", planId })

    return state
  }

  /**
   * Get a plan by ID
   */
  getPlan(planId: string): ProgressState | undefined {
    return this.plans.get(planId)
  }

  /**
   * Check if a plan exists
   */
  hasPlan(planId: string): boolean {
    return this.plans.has(planId)
  }

  /**
   * Get all active plans
   */
  getAllPlans(): ProgressState[] {
    return Array.from(this.plans.values())
  }

  /**
   * Update plan status
   */
  updatePlanStatus(planId: string, status: PlanStatus): ProgressState | undefined {
    const plan = this.plans.get(planId)
    if (!plan) return undefined

    plan.status = status
    plan.updatedAt = Date.now()

    this.emit({ type: "plan:updated", planId, data: { status } })

    return plan
  }

  /**
   * Increment plan version (on replan)
   */
  incrementPlanVersion(planId: string): ProgressState | undefined {
    const plan = this.plans.get(planId)
    if (!plan) return undefined

    plan.version += 1
    plan.updatedAt = Date.now()

    return plan
  }

  /**
   * Delete a plan
   */
  deletePlan(planId: string): boolean {
    const deleted = this.plans.delete(planId)
    if (deleted) {
      this.emit({ type: "plan:deleted", planId })
    }
    return deleted
  }

  // ========== Task Operations ==========

  /**
   * Add a task to a plan
   */
  addTask(planId: string, options: CreateTaskOptions): TaskNode | undefined {
    const plan = this.plans.get(planId)
    if (!plan) return undefined

    const taskId = this.generateId()
    const now = Date.now()

    const task: TaskNode = {
      id: taskId,
      description: options.description,
      status: "pending",
      dependencies: options.dependencies ?? [],
      assignedAgent: options.assignedAgent,
      retryCount: 0,
      maxRetries: options.maxRetries ?? 3,
      priority: options.priority ?? 0,
      createdAt: now,
    }

    // Check if blocked by dependencies
    if (task.dependencies.length > 0) {
      const allDepsCompleted = task.dependencies.every((depId) => {
        const depTask = plan.tasks.find((t) => t.id === depId)
        return depTask?.status === "completed"
      })
      if (!allDepsCompleted) {
        task.status = "blocked"
      }
    }

    plan.tasks.push(task)
    plan.updatedAt = now

    this.emit({ type: "task:created", planId, taskId })

    return task
  }

  /**
   * Add multiple tasks to a plan
   */
  addTasks(planId: string, taskOptions: CreateTaskOptions[]): TaskNode[] {
    const tasks: TaskNode[] = []
    for (const options of taskOptions) {
      const task = this.addTask(planId, options)
      if (task) tasks.push(task)
    }
    return tasks
  }

  /**
   * Get a task by ID
   */
  getTask(planId: string, taskId: string): TaskNode | undefined {
    const plan = this.plans.get(planId)
    return plan?.tasks.find((t) => t.id === taskId)
  }

  /**
   * Query tasks with filters
   */
  queryTasks(planId: string, query: TaskQuery): TaskNode[] {
    const plan = this.plans.get(planId)
    if (!plan) return []

    let tasks = plan.tasks

    // Filter by status
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status]
      tasks = tasks.filter((t) => statuses.includes(t.status))
    }

    // Filter by assigned agent
    if (query.assignedAgent) {
      tasks = tasks.filter((t) => t.assignedAgent === query.assignedAgent)
    }

    // Filter by IDs
    if (query.ids) {
      const idSet = new Set(query.ids)
      tasks = tasks.filter((t) => idSet.has(t.id))
    }

    // Filter by dependencies
    if (query.dependsOn) {
      const depSet = new Set(query.dependsOn)
      tasks = tasks.filter((t) => t.dependencies.some((d) => depSet.has(d)))
    }

    return tasks
  }

  /**
   * Update a task
   */
  updateTask(planId: string, taskId: string, updates: UpdateTaskOptions): TaskNode | undefined {
    const plan = this.plans.get(planId)
    if (!plan) return undefined

    const task = plan.tasks.find((t) => t.id === taskId)
    if (!task) return undefined

    const previousStatus = task.status

    if (updates.status) {
      task.status = updates.status
      if (updates.status === "running" && !task.startedAt) {
        task.startedAt = Date.now()
      }
    }

    if (updates.assignedAgent !== undefined) {
      task.assignedAgent = updates.assignedAgent
    }

    if (updates.result) {
      task.result = updates.result
    }

    if (updates.incrementRetry) {
      task.retryCount += 1
    }

    plan.updatedAt = Date.now()

    // Emit appropriate event
    if (task.status === "completed" && previousStatus !== "completed") {
      this.emit({ type: "task:completed", planId, taskId })
      // Check for unblocked tasks
      this.checkUnblockedTasks(planId, taskId)
    } else if (task.status === "failed" && previousStatus !== "failed") {
      this.emit({ type: "task:failed", planId, taskId })
    } else {
      this.emit({ type: "task:updated", planId, taskId })
    }

    return task
  }

  /**
   * Check and unblock tasks that were waiting on a completed task
   */
  private checkUnblockedTasks(planId: string, completedTaskId: string): void {
    const plan = this.plans.get(planId)
    if (!plan) return

    for (const task of plan.tasks) {
      if (task.status === "blocked" && task.dependencies.includes(completedTaskId)) {
        // Check if all dependencies are now completed
        const allDepsCompleted = task.dependencies.every((depId) => {
          const depTask = plan.tasks.find((t) => t.id === depId)
          return depTask?.status === "completed"
        })

        if (allDepsCompleted) {
          task.status = "pending"
          this.emit({ type: "task:unblocked", planId, taskId: task.id })
        }
      }
    }
  }

  /**
   * Mark a task as completed
   */
  completeTask(planId: string, taskId: string, result: TaskResult): TaskNode | undefined {
    return this.updateTask(planId, taskId, {
      status: "completed",
      result,
    })
  }

  /**
   * Mark a task as failed
   */
  failTask(planId: string, taskId: string, error: string): TaskNode | undefined {
    const task = this.getTask(planId, taskId)
    if (!task) return undefined

    return this.updateTask(planId, taskId, {
      status: "failed",
      result: {
        success: false,
        error,
        completedAt: Date.now(),
      },
    })
  }

  /**
   * Get the next pending task (highest priority, unblocked)
   */
  getNextTask(planId: string): TaskNode | undefined {
    const pendingTasks = this.queryTasks(planId, { status: "pending" })
    if (pendingTasks.length === 0) return undefined

    // Sort by priority (descending) then by creation time (ascending)
    pendingTasks.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return a.createdAt - b.createdAt
    })

    return pendingTasks[0]
  }

  // ========== Evidence Operations ==========

  /**
   * Add evidence to a plan
   */
  addEvidence(
    planId: string,
    taskId: string,
    type: Evidence["type"],
    content: string,
    significance: number
  ): Evidence | undefined {
    const plan = this.plans.get(planId)
    if (!plan) return undefined

    const evidence: Evidence = {
      id: this.generateId(),
      taskId,
      type,
      significance: Math.max(1, Math.min(10, significance)), // Clamp to 1-10
      content,
      timestamp: Date.now(),
      processed: false,
    }

    plan.evidence.push(evidence)
    plan.updatedAt = Date.now()

    this.emit({ type: "evidence:added", planId, data: { evidenceId: evidence.id } })

    return evidence
  }

  /**
   * Get unprocessed evidence
   */
  getUnprocessedEvidence(planId: string, minSignificance?: number): Evidence[] {
    const plan = this.plans.get(planId)
    if (!plan) return []

    return plan.evidence.filter((e) => {
      if (e.processed) return false
      if (minSignificance !== undefined && e.significance < minSignificance) return false
      return true
    })
  }

  /**
   * Mark evidence as processed
   */
  markEvidenceProcessed(planId: string, evidenceIds: string[]): void {
    const plan = this.plans.get(planId)
    if (!plan) return

    const idSet = new Set(evidenceIds)
    for (const evidence of plan.evidence) {
      if (idSet.has(evidence.id)) {
        evidence.processed = true
      }
    }

    plan.updatedAt = Date.now()
  }

  // ========== Decision Logging ==========

  /**
   * Log a decision
   */
  logDecision(
    planId: string,
    type: DecisionLog["type"],
    decision: string,
    rationale: string,
    actor: DecisionLog["actor"],
    relatedTaskIds: string[] = []
  ): DecisionLog | undefined {
    const plan = this.plans.get(planId)
    if (!plan) return undefined

    const log: DecisionLog = {
      id: this.generateId(),
      type,
      decision,
      rationale,
      actor,
      relatedTaskIds,
      timestamp: Date.now(),
    }

    plan.decisions.push(log)
    plan.updatedAt = Date.now()

    this.emit({ type: "decision:logged", planId, data: { decisionId: log.id } })

    return log
  }

  // ========== Summary & Statistics ==========

  /**
   * Get progress summary for a plan
   */
  getSummary(planId: string): ProgressSummary | undefined {
    const plan = this.plans.get(planId)
    if (!plan) return undefined

    const tasks = plan.tasks
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === "completed").length
    const failedTasks = tasks.filter((t) => t.status === "failed").length
    const blockedTasks = tasks.filter((t) => t.status === "blocked").length
    const pendingTasks = tasks.filter((t) => t.status === "pending").length
    const runningTasks = tasks.filter((t) => t.status === "running").length

    const progressPercent = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0

    const pendingEvidenceCount = plan.evidence.filter(
      (e) => !e.processed && e.significance >= 5
    ).length

    return {
      planId,
      status: plan.status,
      totalTasks,
      completedTasks,
      failedTasks,
      blockedTasks,
      pendingTasks,
      runningTasks,
      progressPercent,
      pendingEvidenceCount,
    }
  }

  /**
   * Check if all tasks are completed
   */
  isComplete(planId: string): boolean {
    const plan = this.plans.get(planId)
    if (!plan || plan.tasks.length === 0) return false

    return plan.tasks.every((t) => t.status === "completed" || t.status === "skipped")
  }

  /**
   * Clear all plans (for testing)
   */
  clear(): void {
    this.plans.clear()
  }
}

/**
 * Singleton instance for global access
 */
let storeInstance: ProgressStore | undefined

export function getProgressStore(): ProgressStore {
  if (!storeInstance) {
    storeInstance = new ProgressStore()
  }
  return storeInstance
}

export function resetProgressStore(): void {
  storeInstance = undefined
}
