/**
 * Progress State Persistence
 *
 * JSON file-based persistence for session recovery.
 * Stores progress state to disk and restores on session resume.
 */

import * as fs from "fs"
import * as path from "path"
import type { ProgressState } from "./types"
import { getProgressStore } from "./store"

/**
 * Persistence configuration
 */
export interface PersistenceConfig {
  /** Enable/disable persistence */
  enabled: boolean
  /** Directory to store progress files */
  directory: string
  /** Auto-save on every state change */
  autoSave: boolean
  /** Auto-save debounce delay in ms */
  autoSaveDelayMs: number
}

const DEFAULT_CONFIG: PersistenceConfig = {
  enabled: true,
  directory: ".opencode/progress",
  autoSave: true,
  autoSaveDelayMs: 1000,
}

/**
 * Progress Persistence Manager
 */
export class ProgressPersistence {
  private config: PersistenceConfig
  private projectRoot: string
  private pendingSaves: Map<string, NodeJS.Timeout> = new Map()
  private unsubscribe?: () => void

  constructor(projectRoot: string, config?: Partial<PersistenceConfig>) {
    this.projectRoot = projectRoot
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Get the directory for storing progress files
   */
  private getProgressDir(): string {
    return path.join(this.projectRoot, this.config.directory)
  }

  /**
   * Get the file path for a plan's progress file
   */
  private getFilePath(planId: string): string {
    return path.join(this.getProgressDir(), `${planId}.json`)
  }

  /**
   * Ensure the progress directory exists
   */
  private ensureDirectory(): void {
    const dir = this.getProgressDir()
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  /**
   * Save a plan's progress to disk
   */
  async save(state: ProgressState): Promise<void> {
    if (!this.config.enabled) return

    try {
      this.ensureDirectory()
      const filePath = this.getFilePath(state.planId)
      const content = JSON.stringify(state, null, 2)
      await fs.promises.writeFile(filePath, content, "utf-8")
    } catch (error) {
      console.error(`[ProgressPersistence] Failed to save plan ${state.planId}:`, error)
    }
  }

  /**
   * Save with debounce (for auto-save)
   */
  saveDebounced(state: ProgressState): void {
    if (!this.config.enabled || !this.config.autoSave) return

    const planId = state.planId

    // Clear existing pending save
    const existing = this.pendingSaves.get(planId)
    if (existing) {
      clearTimeout(existing)
    }

    // Schedule new save
    const timeout = setTimeout(() => {
      this.save(state)
      this.pendingSaves.delete(planId)
    }, this.config.autoSaveDelayMs)

    this.pendingSaves.set(planId, timeout)
  }

  /**
   * Load a plan's progress from disk
   */
  async load(planId: string): Promise<ProgressState | undefined> {
    if (!this.config.enabled) return undefined

    const filePath = this.getFilePath(planId)

    try {
      if (!fs.existsSync(filePath)) {
        return undefined
      }

      const content = await fs.promises.readFile(filePath, "utf-8")
      const state = JSON.parse(content) as ProgressState

      // Validate basic structure
      if (!state.planId || !state.goal || !Array.isArray(state.tasks)) {
        console.warn(`[ProgressPersistence] Invalid progress file: ${filePath}`)
        return undefined
      }

      return state
    } catch (error) {
      console.error(`[ProgressPersistence] Failed to load plan ${planId}:`, error)
      return undefined
    }
  }

  /**
   * Load and restore a plan to the store
   */
  async restore(planId: string): Promise<ProgressState | undefined> {
    const state = await this.load(planId)
    if (!state) return undefined

    // Restore to store
    const store = getProgressStore()

    // Delete existing if present
    if (store.hasPlan(planId)) {
      store.deletePlan(planId)
    }

    // Create new plan with restored state
    const newPlan = store.createPlan(state.goal, state.strategicPlan)

    // This is a simplified restore - in production, we'd have a proper
    // restore method on the store that accepts a full ProgressState
    // For now, we manually add tasks
    for (const task of state.tasks) {
      const addedTask = store.addTask(newPlan.planId, {
        description: task.description,
        dependencies: task.dependencies,
        priority: task.priority,
        maxRetries: task.maxRetries,
        assignedAgent: task.assignedAgent,
      })

      if (addedTask) {
        // Restore status and result
        store.updateTask(newPlan.planId, addedTask.id, {
          status: task.status,
          result: task.result,
        })
      }
    }

    // Restore evidence
    for (const evidence of state.evidence) {
      store.addEvidence(
        newPlan.planId,
        evidence.taskId,
        evidence.type,
        evidence.content,
        evidence.significance
      )
    }

    // Restore decisions
    for (const decision of state.decisions) {
      store.logDecision(
        newPlan.planId,
        decision.type,
        decision.decision,
        decision.rationale,
        decision.actor,
        decision.relatedTaskIds
      )
    }

    // Update plan status
    store.updatePlanStatus(newPlan.planId, state.status)

    return store.getPlan(newPlan.planId)
  }

  /**
   * Delete a plan's progress file
   */
  async delete(planId: string): Promise<void> {
    if (!this.config.enabled) return

    const filePath = this.getFilePath(planId)

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
      }
    } catch (error) {
      console.error(`[ProgressPersistence] Failed to delete plan ${planId}:`, error)
    }
  }

  /**
   * List all persisted plan IDs
   */
  async listPersistedPlans(): Promise<string[]> {
    if (!this.config.enabled) return []

    const dir = this.getProgressDir()

    try {
      if (!fs.existsSync(dir)) {
        return []
      }

      const files = await fs.promises.readdir(dir)
      return files
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(".json", ""))
    } catch (error) {
      console.error("[ProgressPersistence] Failed to list plans:", error)
      return []
    }
  }

  /**
   * Clean up old/completed plans
   */
  async cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.config.enabled) return 0

    const planIds = await this.listPersistedPlans()
    const now = Date.now()
    let deleted = 0

    for (const planId of planIds) {
      const state = await this.load(planId)
      if (!state) continue

      // Delete if too old or completed
      const age = now - state.updatedAt
      if (age > maxAgeMs || state.status === "completed" || state.status === "failed") {
        await this.delete(planId)
        deleted++
      }
    }

    return deleted
  }

  /**
   * Enable auto-save by subscribing to store events
   */
  enableAutoSave(): void {
    if (!this.config.enabled || !this.config.autoSave) return

    const store = getProgressStore()

    this.unsubscribe = store.subscribe((event) => {
      // Save on any meaningful update
      if (
        event.type.startsWith("task:") ||
        event.type === "evidence:added" ||
        event.type === "decision:logged"
      ) {
        const plan = store.getPlan(event.planId)
        if (plan) {
          this.saveDebounced(plan)
        }
      }
    })
  }

  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = undefined
    }

    // Flush pending saves
    for (const timeout of this.pendingSaves.values()) {
      clearTimeout(timeout)
    }
    this.pendingSaves.clear()
  }

  /**
   * Flush all pending saves immediately
   */
  async flush(): Promise<void> {
    const store = getProgressStore()

    for (const [planId, timeout] of this.pendingSaves.entries()) {
      clearTimeout(timeout)
      const plan = store.getPlan(planId)
      if (plan) {
        await this.save(plan)
      }
    }

    this.pendingSaves.clear()
  }
}

/**
 * Singleton instance
 */
let persistenceInstance: ProgressPersistence | undefined

export function getProgressPersistence(
  projectRoot?: string,
  config?: Partial<PersistenceConfig>
): ProgressPersistence {
  if (!persistenceInstance) {
    if (!projectRoot) {
      throw new Error("[ProgressPersistence] Project root required for initialization")
    }
    persistenceInstance = new ProgressPersistence(projectRoot, config)
  }
  return persistenceInstance
}

export function resetProgressPersistence(): void {
  if (persistenceInstance) {
    persistenceInstance.disableAutoSave()
    persistenceInstance = undefined
  }
}
