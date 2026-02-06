/**
 * Dependency Graph Management
 *
 * Tracks task dependencies, detects blocked tasks, and provides
 * topological ordering for execution scheduling.
 */

import type { TaskNode, TaskStatus } from "./types"

/**
 * Dependency graph node with computed metadata
 */
export interface DependencyNode {
  /** Task ID */
  id: string
  /** Direct dependency IDs */
  dependencies: string[]
  /** Tasks that depend on this one */
  dependents: string[]
  /** Computed depth in graph (0 = no dependencies) */
  depth: number
  /** Current status */
  status: TaskStatus
}

/**
 * Cycle detection result
 */
export interface CycleInfo {
  /** Whether a cycle exists */
  hasCycle: boolean
  /** Task IDs involved in the cycle */
  cyclePath: string[]
}

/**
 * Execution order result
 */
export interface ExecutionOrder {
  /** Tasks that can execute now (no pending dependencies) */
  ready: string[]
  /** Tasks waiting on dependencies */
  waiting: string[]
  /** Tasks that are blocked (dependencies failed) */
  blocked: string[]
  /** Topologically sorted order (for all pending tasks) */
  sortedOrder: string[]
}

/**
 * Dependency Graph Manager
 *
 * Provides dependency analysis, cycle detection, and execution ordering.
 */
export class DependencyGraph {
  private nodes: Map<string, DependencyNode> = new Map()

  /**
   * Build graph from tasks
   */
  static fromTasks(tasks: TaskNode[]): DependencyGraph {
    const graph = new DependencyGraph()

    // Create nodes for all tasks
    for (const task of tasks) {
      graph.nodes.set(task.id, {
        id: task.id,
        dependencies: [...task.dependencies],
        dependents: [],
        depth: 0,
        status: task.status,
      })
    }

    // Build reverse edges (dependents)
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        const depNode = graph.nodes.get(depId)
        if (depNode) {
          depNode.dependents.push(task.id)
        }
      }
    }

    // Compute depths
    graph.computeDepths()

    return graph
  }

  /**
   * Compute depth for each node (max path length to a root)
   */
  private computeDepths(): void {
    const visited = new Set<string>()
    const depths = new Map<string, number>()

    const computeDepth = (nodeId: string, path: Set<string>): number => {
      if (path.has(nodeId)) {
        // Cycle detected, return 0 to avoid infinite recursion
        return 0
      }

      if (depths.has(nodeId)) {
        return depths.get(nodeId)!
      }

      const node = this.nodes.get(nodeId)
      if (!node || node.dependencies.length === 0) {
        depths.set(nodeId, 0)
        return 0
      }

      path.add(nodeId)
      let maxDepth = 0
      for (const depId of node.dependencies) {
        if (this.nodes.has(depId)) {
          maxDepth = Math.max(maxDepth, computeDepth(depId, path) + 1)
        }
      }
      path.delete(nodeId)

      depths.set(nodeId, maxDepth)
      return maxDepth
    }

    for (const nodeId of this.nodes.keys()) {
      const depth = computeDepth(nodeId, new Set())
      const node = this.nodes.get(nodeId)
      if (node) {
        node.depth = depth
      }
      visited.add(nodeId)
    }
  }

  /**
   * Detect cycles in the dependency graph
   */
  detectCycle(): CycleInfo {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []

    const dfs = (nodeId: string): string[] | null => {
      visited.add(nodeId)
      recursionStack.add(nodeId)
      path.push(nodeId)

      const node = this.nodes.get(nodeId)
      if (node) {
        for (const depId of node.dependencies) {
          if (!visited.has(depId)) {
            const cyclePath = dfs(depId)
            if (cyclePath) return cyclePath
          } else if (recursionStack.has(depId)) {
            // Found cycle - extract the cycle path
            const cycleStart = path.indexOf(depId)
            return [...path.slice(cycleStart), depId]
          }
        }
      }

      path.pop()
      recursionStack.delete(nodeId)
      return null
    }

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cyclePath = dfs(nodeId)
        if (cyclePath) {
          return { hasCycle: true, cyclePath }
        }
      }
    }

    return { hasCycle: false, cyclePath: [] }
  }

  /**
   * Get topologically sorted order of tasks
   */
  topologicalSort(): string[] {
    const result: string[] = []
    const visited = new Set<string>()
    const temp = new Set<string>()

    const visit = (nodeId: string): boolean => {
      if (temp.has(nodeId)) {
        // Cycle detected
        return false
      }
      if (visited.has(nodeId)) {
        return true
      }

      temp.add(nodeId)
      const node = this.nodes.get(nodeId)
      if (node) {
        for (const depId of node.dependencies) {
          if (this.nodes.has(depId)) {
            if (!visit(depId)) return false
          }
        }
      }
      temp.delete(nodeId)
      visited.add(nodeId)
      result.push(nodeId)
      return true
    }

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (!visit(nodeId)) {
          // Cycle detected, return partial result
          return result
        }
      }
    }

    return result
  }

  /**
   * Determine which tasks are ready, waiting, or blocked
   */
  getExecutionOrder(): ExecutionOrder {
    const ready: string[] = []
    const waiting: string[] = []
    const blocked: string[] = []

    for (const [nodeId, node] of this.nodes) {
      // Skip completed, failed, or skipped tasks
      if (
        node.status === "completed" ||
        node.status === "failed" ||
        node.status === "skipped" ||
        node.status === "running"
      ) {
        continue
      }

      // Check if any dependency failed
      const hasFailedDep = node.dependencies.some((depId) => {
        const depNode = this.nodes.get(depId)
        return depNode?.status === "failed"
      })

      if (hasFailedDep) {
        blocked.push(nodeId)
        continue
      }

      // Check if all dependencies are completed
      const allDepsCompleted = node.dependencies.every((depId) => {
        const depNode = this.nodes.get(depId)
        return depNode?.status === "completed" || depNode?.status === "skipped"
      })

      if (allDepsCompleted) {
        ready.push(nodeId)
      } else {
        waiting.push(nodeId)
      }
    }

    // Sort ready tasks by depth (lower depth = fewer dependencies = prioritize)
    ready.sort((a, b) => {
      const nodeA = this.nodes.get(a)
      const nodeB = this.nodes.get(b)
      return (nodeA?.depth ?? 0) - (nodeB?.depth ?? 0)
    })

    return {
      ready,
      waiting,
      blocked,
      sortedOrder: this.topologicalSort(),
    }
  }

  /**
   * Get tasks that are blocked by a specific task's failure
   */
  getBlockedByFailure(failedTaskId: string): string[] {
    const blocked: string[] = []
    const visited = new Set<string>()

    const collectDependents = (taskId: string) => {
      const node = this.nodes.get(taskId)
      if (!node) return

      for (const depId of node.dependents) {
        if (!visited.has(depId)) {
          visited.add(depId)
          blocked.push(depId)
          collectDependents(depId)
        }
      }
    }

    collectDependents(failedTaskId)
    return blocked
  }

  /**
   * Get tasks that will be unblocked when a task completes
   */
  getUnblockedOnComplete(taskId: string): string[] {
    const unblocked: string[] = []
    const node = this.nodes.get(taskId)
    if (!node) return unblocked

    for (const depId of node.dependents) {
      const depNode = this.nodes.get(depId)
      if (!depNode || depNode.status !== "blocked") continue

      // Check if all other dependencies are completed
      const allOtherDepsCompleted = depNode.dependencies.every((otherId) => {
        if (otherId === taskId) return true // This one will be completed
        const otherNode = this.nodes.get(otherId)
        return otherNode?.status === "completed" || otherNode?.status === "skipped"
      })

      if (allOtherDepsCompleted) {
        unblocked.push(depId)
      }
    }

    return unblocked
  }

  /**
   * Check if a task has all dependencies satisfied
   */
  canExecute(taskId: string): boolean {
    const node = this.nodes.get(taskId)
    if (!node) return false

    if (node.dependencies.length === 0) return true

    return node.dependencies.every((depId) => {
      const depNode = this.nodes.get(depId)
      return depNode?.status === "completed" || depNode?.status === "skipped"
    })
  }

  /**
   * Get all ancestors (transitive dependencies) of a task
   */
  getAncestors(taskId: string): string[] {
    const ancestors = new Set<string>()

    const collect = (id: string) => {
      const node = this.nodes.get(id)
      if (!node) return

      for (const depId of node.dependencies) {
        if (!ancestors.has(depId)) {
          ancestors.add(depId)
          collect(depId)
        }
      }
    }

    collect(taskId)
    return Array.from(ancestors)
  }

  /**
   * Get all descendants (transitive dependents) of a task
   */
  getDescendants(taskId: string): string[] {
    const descendants = new Set<string>()

    const collect = (id: string) => {
      const node = this.nodes.get(id)
      if (!node) return

      for (const depId of node.dependents) {
        if (!descendants.has(depId)) {
          descendants.add(depId)
          collect(depId)
        }
      }
    }

    collect(taskId)
    return Array.from(descendants)
  }

  /**
   * Get critical path (longest path through the graph)
   */
  getCriticalPath(): string[] {
    let maxDepth = 0
    let deepestNode: string | undefined

    for (const [nodeId, node] of this.nodes) {
      if (node.depth > maxDepth) {
        maxDepth = node.depth
        deepestNode = nodeId
      }
    }

    if (!deepestNode) return []

    // Trace back from deepest node
    const path: string[] = [deepestNode]
    let current = deepestNode

    while (true) {
      const node = this.nodes.get(current)
      if (!node || node.dependencies.length === 0) break

      // Find the dependency with highest depth
      let maxDepDepth = -1
      let nextNode: string | undefined

      for (const depId of node.dependencies) {
        const depNode = this.nodes.get(depId)
        if (depNode && depNode.depth > maxDepDepth) {
          maxDepDepth = depNode.depth
          nextNode = depId
        }
      }

      if (!nextNode) break
      path.unshift(nextNode)
      current = nextNode
    }

    return path
  }

  /**
   * Update task status (for re-computing execution order)
   */
  updateStatus(taskId: string, status: TaskStatus): void {
    const node = this.nodes.get(taskId)
    if (node) {
      node.status = status
    }
  }

  /**
   * Get node by ID
   */
  getNode(taskId: string): DependencyNode | undefined {
    return this.nodes.get(taskId)
  }

  /**
   * Get all nodes
   */
  getAllNodes(): DependencyNode[] {
    return Array.from(this.nodes.values())
  }
}

/**
 * Validate dependencies before adding to a plan
 */
export function validateDependencies(
  existingTasks: TaskNode[],
  newTaskDependencies: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const existingIds = new Set(existingTasks.map((t) => t.id))

  for (const depId of newTaskDependencies) {
    if (!existingIds.has(depId)) {
      errors.push(`Dependency "${depId}" does not exist`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
