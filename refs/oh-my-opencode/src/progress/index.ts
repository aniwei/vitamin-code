/**
 * Progress Management Module
 *
 * Main entry point for the Progress Management system.
 * Provides a unified API for managing task execution progress,
 * evidence collection, and decision logging.
 */

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
import { ProgressStore, getProgressStore, resetProgressStore, type StoreEventListener } from "./store"
import { ProgressPersistence, getProgressPersistence, resetProgressPersistence, type PersistenceConfig } from "./persistence"
import { DependencyGraph, type ExecutionOrder, type CycleInfo } from "./dependency-graph"

// Re-export types
export * from "./types"
export { DependencyGraph, type ExecutionOrder, type CycleInfo } from "./dependency-graph"
export { type StoreEventListener, type StoreEvent, type StoreEventType } from "./store"
export { type PersistenceConfig } from "./persistence"

/**
 * Progress Manager Configuration
 */
export interface ProgressManagerConfig {
  /** Project root directory for persistence */
  projectRoot?: string
  /** Persistence configuration */
  persistence?: Partial<PersistenceConfig>
}

/**
 * Progress Manager
 *
 * Centralized facade for all progress management operations.
 * Acts as the "single source of truth" for task states, dependencies,
 * evidence, and decisions across all agents in a plan.
 */
export class ProgressManager {
  private store: ProgressStore
  private persistence: ProgressPersistence | undefined
  private config: ProgressManagerConfig

  constructor(config: ProgressManagerConfig = {}) {
    this.config = config
    this.store = getProgressStore()

    if (config.projectRoot) {
      this.persistence = getProgressPersistence(config.projectRoot, config.persistence)
      this.persistence.enableAutoSave()
    }
  }

  // ========== Plan Operations ==========

  /**
   * Create a new plan
   */
  createPlan(goal: string, strategicPlan?: string): ProgressState {
    const plan = this.store.createPlan(goal, strategicPlan)

    // Log the creation decision
    this.store.logDecision(
      plan.planId,
      "plan",
      `Created plan for goal: ${goal}`,
      "User initiated task",
      "planner"
    )

    return plan
  }

  /**
   * Get a plan by ID
   */
  getPlan(planId: string): ProgressState | undefined {
    return this.store.getPlan(planId)
  }

  /**
   * Check if a plan exists
   */
  hasPlan(planId: string): boolean {
    return this.store.hasPlan(planId)
  }

  /**
   * Get all active plans
   */
  getAllPlans(): ProgressState[] {
    return this.store.getAllPlans()
  }

  /**
   * Update plan status
   */
  updatePlanStatus(planId: string, status: PlanStatus): ProgressState | undefined {
    return this.store.updatePlanStatus(planId, status)
  }

  /**
   * Start plan execution
   */
  startExecution(planId: string): ProgressState | undefined {
    return this.store.updatePlanStatus(planId, "executing")
  }

  /**
   * Mark plan as replanning
   */
  startReplanning(planId: string): ProgressState | undefined {
    const plan = this.store.updatePlanStatus(planId, "replanning")
    if (plan) {
      this.store.incrementPlanVersion(planId)
    }
    return plan
  }

  /**
   * Complete a plan
   */
  completePlan(planId: string): ProgressState | undefined {
    const plan = this.store.updatePlanStatus(planId, "completed")
    if (plan) {
      this.store.logDecision(
        planId,
        "plan",
        "Plan completed successfully",
        "All tasks completed",
        "planner"
      )
    }
    return plan
  }

  /**
   * Fail a plan
   */
  failPlan(planId: string, reason: string): ProgressState | undefined {
    const plan = this.store.updatePlanStatus(planId, "failed")
    if (plan) {
      this.store.logDecision(
        planId,
        "abort",
        "Plan failed",
        reason,
        "planner"
      )
    }
    return plan
  }

  /**
   * Delete a plan
   */
  async deletePlan(planId: string): Promise<boolean> {
    const deleted = this.store.deletePlan(planId)
    if (deleted && this.persistence) {
      await this.persistence.delete(planId)
    }
    return deleted
  }

  // ========== Task Operations ==========

  /**
   * Add a task to a plan
   */
  addTask(planId: string, options: CreateTaskOptions): TaskNode | undefined {
    return this.store.addTask(planId, options)
  }

  /**
   * Add multiple tasks to a plan
   */
  addTasks(planId: string, taskOptions: CreateTaskOptions[]): TaskNode[] {
    return this.store.addTasks(planId, taskOptions)
  }

  /**
   * Get a task by ID
   */
  getTask(planId: string, taskId: string): TaskNode | undefined {
    return this.store.getTask(planId, taskId)
  }

  /**
   * Query tasks with filters
   */
  queryTasks(planId: string, query: TaskQuery): TaskNode[] {
    return this.store.queryTasks(planId, query)
  }

  /**
   * Update a task
   */
  updateTask(planId: string, taskId: string, updates: UpdateTaskOptions): TaskNode | undefined {
    return this.store.updateTask(planId, taskId, updates)
  }

  /**
   * Start executing a task
   */
  startTask(planId: string, taskId: string, agent?: string): TaskNode | undefined {
    return this.store.updateTask(planId, taskId, {
      status: "running",
      assignedAgent: agent,
    })
  }

  /**
   * Complete a task
   */
  completeTask(planId: string, taskId: string, result: TaskResult): TaskNode | undefined {
    const task = this.store.completeTask(planId, taskId, result)

    if (task) {
      this.store.logDecision(
        planId,
        "assign",
        `Task completed: ${task.description}`,
        result.output ?? "Success",
        "executor",
        [taskId]
      )

      // Check if plan is complete
      if (this.store.isComplete(planId)) {
        this.completePlan(planId)
      }
    }

    return task
  }

  /**
   * Fail a task
   */
  failTask(planId: string, taskId: string, error: string): TaskNode | undefined {
    const task = this.store.getTask(planId, taskId)
    if (!task) return undefined

    // Check if we should retry
    if (task.retryCount < task.maxRetries) {
      this.store.updateTask(planId, taskId, {
        status: "pending",
        incrementRetry: true,
      })

      this.store.logDecision(
        planId,
        "retry",
        `Retrying task: ${task.description}`,
        `Attempt ${task.retryCount + 1}/${task.maxRetries}. Error: ${error}`,
        "executor",
        [taskId]
      )

      return this.store.getTask(planId, taskId)
    }

    // Max retries reached, fail the task
    const failedTask = this.store.failTask(planId, taskId, error)

    if (failedTask) {
      this.store.logDecision(
        planId,
        "abort",
        `Task failed: ${task.description}`,
        `Max retries (${task.maxRetries}) exceeded. Error: ${error}`,
        "executor",
        [taskId]
      )

      // Add evidence for the failure
      this.store.addEvidence(
        planId,
        taskId,
        "error",
        `Task failed after ${task.maxRetries} retries: ${error}`,
        8 // High significance - may trigger replan
      )
    }

    return failedTask
  }

  /**
   * Skip a task
   */
  skipTask(planId: string, taskId: string, reason: string): TaskNode | undefined {
    const task = this.store.updateTask(planId, taskId, {
      status: "skipped",
      result: {
        success: true,
        output: `Skipped: ${reason}`,
        completedAt: Date.now(),
      },
    })

    if (task) {
      this.store.logDecision(
        planId,
        "skip",
        `Skipped task: ${task.description}`,
        reason,
        "planner",
        [taskId]
      )
    }

    return task
  }

  /**
   * Get the next task ready for execution
   */
  getNextTask(planId: string): TaskNode | undefined {
    return this.store.getNextTask(planId)
  }

  // ========== Dependency Graph Operations ==========

  /**
   * Get dependency graph for a plan
   */
  getDependencyGraph(planId: string): DependencyGraph | undefined {
    const plan = this.store.getPlan(planId)
    if (!plan) return undefined
    return DependencyGraph.fromTasks(plan.tasks)
  }

  /**
   * Get execution order for a plan
   */
  getExecutionOrder(planId: string): ExecutionOrder | undefined {
    const graph = this.getDependencyGraph(planId)
    return graph?.getExecutionOrder()
  }

  /**
   * Check for dependency cycles
   */
  detectCycles(planId: string): CycleInfo | undefined {
    const graph = this.getDependencyGraph(planId)
    return graph?.detectCycle()
  }

  /**
   * Get tasks blocked by a failed task
   */
  getBlockedByFailure(planId: string, failedTaskId: string): string[] {
    const graph = this.getDependencyGraph(planId)
    return graph?.getBlockedByFailure(failedTaskId) ?? []
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
    return this.store.addEvidence(planId, taskId, type, content, significance)
  }

  /**
   * Get unprocessed evidence
   */
  getUnprocessedEvidence(planId: string, minSignificance?: number): Evidence[] {
    return this.store.getUnprocessedEvidence(planId, minSignificance)
  }

  /**
   * Mark evidence as processed
   */
  markEvidenceProcessed(planId: string, evidenceIds: string[]): void {
    this.store.markEvidenceProcessed(planId, evidenceIds)
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
    return this.store.logDecision(planId, type, decision, rationale, actor, relatedTaskIds)
  }

  // ========== Summary & Statistics ==========

  /**
   * Get progress summary for a plan
   */
  getSummary(planId: string): ProgressSummary | undefined {
    return this.store.getSummary(planId)
  }

  /**
   * Check if all tasks are completed
   */
  isComplete(planId: string): boolean {
    return this.store.isComplete(planId)
  }

  // ========== Event Subscription ==========

  /**
   * Subscribe to store events
   */
  subscribe(listener: StoreEventListener): () => void {
    return this.store.subscribe(listener)
  }

  // ========== Persistence Operations ==========

  /**
   * Save a plan to disk
   */
  async savePlan(planId: string): Promise<void> {
    if (!this.persistence) return

    const plan = this.store.getPlan(planId)
    if (plan) {
      await this.persistence.save(plan)
    }
  }

  /**
   * Load and restore a plan from disk
   */
  async restorePlan(planId: string): Promise<ProgressState | undefined> {
    if (!this.persistence) return undefined
    return this.persistence.restore(planId)
  }

  /**
   * List persisted plans
   */
  async listPersistedPlans(): Promise<string[]> {
    if (!this.persistence) return []
    return this.persistence.listPersistedPlans()
  }

  /**
   * Cleanup old plans
   */
  async cleanupOldPlans(maxAgeMs?: number): Promise<number> {
    if (!this.persistence) return 0
    return this.persistence.cleanup(maxAgeMs)
  }

  /**
   * Flush pending saves
   */
  async flush(): Promise<void> {
    if (this.persistence) {
      await this.persistence.flush()
    }
  }

  // ========== Lifecycle ==========

  /**
   * Reset the manager (for testing)
   */
  reset(): void {
    resetProgressStore()
    resetProgressPersistence()
    this.store = getProgressStore()
    this.persistence = undefined
  }
}

/**
 * Singleton instance
 */
let managerInstance: ProgressManager | undefined

export function getProgressManager(config?: ProgressManagerConfig): ProgressManager {
  if (!managerInstance) {
    managerInstance = new ProgressManager(config)
  }
  return managerInstance
}

export function resetProgressManager(): void {
  if (managerInstance) {
    managerInstance.reset()
    managerInstance = undefined
  }
}
