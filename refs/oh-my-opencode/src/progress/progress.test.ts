/**
 * Progress Management Module Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import {
  ProgressManager,
  resetProgressManager,
  type ProgressState,
  type TaskNode,
  type CreateTaskOptions,
} from "./index"
import { DependencyGraph } from "./dependency-graph"

describe("ProgressManager", () => {
  let manager: ProgressManager

  beforeEach(() => {
    resetProgressManager()
    manager = new ProgressManager()
  })

  afterEach(() => {
    resetProgressManager()
  })

  describe("Plan Operations", () => {
    it("should create a new plan", () => {
      const plan = manager.createPlan("Build a calculator app")

      expect(plan).toBeDefined()
      expect(plan.planId).toBeDefined()
      expect(plan.goal).toBe("Build a calculator app")
      expect(plan.status).toBe("planning")
      expect(plan.version).toBe(1)
      expect(plan.tasks).toHaveLength(0)
    })

    it("should create a plan with strategic plan", () => {
      const plan = manager.createPlan(
        "Build a calculator app",
        "1. Create UI components\n2. Implement logic\n3. Add tests"
      )

      expect(plan.strategicPlan).toBe("1. Create UI components\n2. Implement logic\n3. Add tests")
    })

    it("should get a plan by ID", () => {
      const created = manager.createPlan("Test goal")
      const retrieved = manager.getPlan(created.planId)

      expect(retrieved).toBeDefined()
      expect(retrieved?.planId).toBe(created.planId)
    })

    it("should return undefined for non-existent plan", () => {
      const plan = manager.getPlan("non-existent-id")
      expect(plan).toBeUndefined()
    })

    it("should update plan status", () => {
      const plan = manager.createPlan("Test")
      manager.startExecution(plan.planId)

      const updated = manager.getPlan(plan.planId)
      expect(updated?.status).toBe("executing")
    })

    it("should increment version on replan", () => {
      const plan = manager.createPlan("Test")
      expect(plan.version).toBe(1)

      manager.startReplanning(plan.planId)
      const updated = manager.getPlan(plan.planId)

      expect(updated?.version).toBe(2)
      expect(updated?.status).toBe("replanning")
    })

    it("should get all plans", () => {
      manager.createPlan("Plan 1")
      manager.createPlan("Plan 2")
      manager.createPlan("Plan 3")

      const plans = manager.getAllPlans()
      expect(plans).toHaveLength(3)
    })
  })

  describe("Task Operations", () => {
    let plan: ProgressState

    beforeEach(() => {
      plan = manager.createPlan("Test plan with tasks")
    })

    it("should add a task to a plan", () => {
      const task = manager.addTask(plan.planId, {
        description: "Implement feature X",
      })

      expect(task).toBeDefined()
      expect(task?.description).toBe("Implement feature X")
      expect(task?.status).toBe("pending")
      expect(task?.retryCount).toBe(0)
    })

    it("should add multiple tasks", () => {
      const tasks = manager.addTasks(plan.planId, [
        { description: "Task 1" },
        { description: "Task 2" },
        { description: "Task 3" },
      ])

      expect(tasks).toHaveLength(3)

      const updatedPlan = manager.getPlan(plan.planId)
      expect(updatedPlan?.tasks).toHaveLength(3)
    })

    it("should add task with dependencies", () => {
      const task1 = manager.addTask(plan.planId, { description: "Task 1" })
      const task2 = manager.addTask(plan.planId, {
        description: "Task 2",
        dependencies: [task1!.id],
      })

      expect(task2?.dependencies).toContain(task1?.id)
      expect(task2?.status).toBe("blocked") // Blocked because task1 is not complete
    })

    it("should query tasks by status", () => {
      manager.addTask(plan.planId, { description: "Task 1" })
      const task2 = manager.addTask(plan.planId, { description: "Task 2" })
      manager.startTask(plan.planId, task2!.id)

      const pendingTasks = manager.queryTasks(plan.planId, { status: "pending" })
      const runningTasks = manager.queryTasks(plan.planId, { status: "running" })

      expect(pendingTasks).toHaveLength(1)
      expect(runningTasks).toHaveLength(1)
    })

    it("should complete a task", () => {
      const task = manager.addTask(plan.planId, { description: "Test task" })
      manager.startTask(plan.planId, task!.id)

      const completed = manager.completeTask(plan.planId, task!.id, {
        success: true,
        output: "Done!",
        completedAt: Date.now(),
      })

      expect(completed?.status).toBe("completed")
      expect(completed?.result?.success).toBe(true)
    })

    it("should retry failed task if retries available", () => {
      const task = manager.addTask(plan.planId, {
        description: "Flaky task",
        maxRetries: 3,
      })

      manager.startTask(plan.planId, task!.id)
      const retried = manager.failTask(plan.planId, task!.id, "Network error")

      expect(retried?.status).toBe("pending")
      expect(retried?.retryCount).toBe(1)
    })

    it("should fail task after max retries", () => {
      const task = manager.addTask(plan.planId, {
        description: "Failing task",
        maxRetries: 1,
      })

      // First attempt
      manager.startTask(plan.planId, task!.id)
      manager.failTask(plan.planId, task!.id, "Error 1")

      // Second attempt (should fail permanently)
      manager.startTask(plan.planId, task!.id)
      const failed = manager.failTask(plan.planId, task!.id, "Error 2")

      expect(failed?.status).toBe("failed")
    })

    it("should unblock dependent tasks when dependency completes", () => {
      const task1 = manager.addTask(plan.planId, { description: "Task 1" })
      const task2 = manager.addTask(plan.planId, {
        description: "Task 2",
        dependencies: [task1!.id],
      })

      expect(task2?.status).toBe("blocked")

      manager.startTask(plan.planId, task1!.id)
      manager.completeTask(plan.planId, task1!.id, {
        success: true,
        completedAt: Date.now(),
      })

      const updatedTask2 = manager.getTask(plan.planId, task2!.id)
      expect(updatedTask2?.status).toBe("pending")
    })

    it("should get next task by priority", () => {
      manager.addTask(plan.planId, { description: "Low priority", priority: 1 })
      manager.addTask(plan.planId, { description: "High priority", priority: 10 })
      manager.addTask(plan.planId, { description: "Medium priority", priority: 5 })

      const next = manager.getNextTask(plan.planId)
      expect(next?.description).toBe("High priority")
    })

    it("should skip a task", () => {
      const task = manager.addTask(plan.planId, { description: "Optional task" })
      const skipped = manager.skipTask(plan.planId, task!.id, "Not needed")

      expect(skipped?.status).toBe("skipped")
    })
  })

  describe("Evidence Operations", () => {
    let plan: ProgressState
    let task: TaskNode

    beforeEach(() => {
      plan = manager.createPlan("Test plan")
      task = manager.addTask(plan.planId, { description: "Test task" })!
    })

    it("should add evidence", () => {
      const evidence = manager.addEvidence(
        plan.planId,
        task.id,
        "discovery",
        "Found a better approach",
        7
      )

      expect(evidence).toBeDefined()
      expect(evidence?.type).toBe("discovery")
      expect(evidence?.significance).toBe(7)
      expect(evidence?.processed).toBe(false)
    })

    it("should clamp significance to 1-10", () => {
      const lowEvidence = manager.addEvidence(plan.planId, task.id, "context", "Low", 0)
      const highEvidence = manager.addEvidence(plan.planId, task.id, "context", "High", 15)

      expect(lowEvidence?.significance).toBe(1)
      expect(highEvidence?.significance).toBe(10)
    })

    it("should get unprocessed evidence", () => {
      manager.addEvidence(plan.planId, task.id, "discovery", "Find 1", 5)
      manager.addEvidence(plan.planId, task.id, "error", "Error 1", 8)

      const unprocessed = manager.getUnprocessedEvidence(plan.planId)
      expect(unprocessed).toHaveLength(2)
    })

    it("should filter by minimum significance", () => {
      manager.addEvidence(plan.planId, task.id, "context", "Low impact", 3)
      manager.addEvidence(plan.planId, task.id, "error", "High impact", 9)

      const highSig = manager.getUnprocessedEvidence(plan.planId, 5)
      expect(highSig).toHaveLength(1)
      expect(highSig[0].significance).toBe(9)
    })

    it("should mark evidence as processed", () => {
      const e1 = manager.addEvidence(plan.planId, task.id, "discovery", "Find 1", 5)
      const e2 = manager.addEvidence(plan.planId, task.id, "discovery", "Find 2", 6)

      manager.markEvidenceProcessed(plan.planId, [e1!.id])

      const unprocessed = manager.getUnprocessedEvidence(plan.planId)
      expect(unprocessed).toHaveLength(1)
      expect(unprocessed[0].id).toBe(e2!.id)
    })
  })

  describe("Decision Logging", () => {
    let plan: ProgressState

    beforeEach(() => {
      plan = manager.createPlan("Test plan")
    })

    it("should log decisions", () => {
      const decision = manager.logDecision(
        plan.planId,
        "replan",
        "Revised approach",
        "Task failure revealed design flaw",
        "planner"
      )

      expect(decision).toBeDefined()
      expect(decision?.type).toBe("replan")
      expect(decision?.actor).toBe("planner")
    })

    it("should log decision with related tasks", () => {
      const task = manager.addTask(plan.planId, { description: "Test" })

      const decision = manager.logDecision(
        plan.planId,
        "assign",
        "Assigned to oracle",
        "Task requires external knowledge",
        "factory",
        [task!.id]
      )

      expect(decision?.relatedTaskIds).toContain(task!.id)
    })
  })

  describe("Progress Summary", () => {
    let plan: ProgressState

    beforeEach(() => {
      plan = manager.createPlan("Test plan")
    })

    it("should calculate progress summary", () => {
      manager.addTasks(plan.planId, [
        { description: "Task 1" },
        { description: "Task 2" },
        { description: "Task 3" },
        { description: "Task 4" },
      ])

      const tasks = manager.getPlan(plan.planId)!.tasks
      manager.completeTask(plan.planId, tasks[0].id, { success: true, completedAt: Date.now() })
      manager.completeTask(plan.planId, tasks[1].id, { success: true, completedAt: Date.now() })

      const summary = manager.getSummary(plan.planId)

      expect(summary?.totalTasks).toBe(4)
      expect(summary?.completedTasks).toBe(2)
      expect(summary?.progressPercent).toBe(50)
    })

    it("should detect plan completion", () => {
      const task = manager.addTask(plan.planId, { description: "Only task" })

      expect(manager.isComplete(plan.planId)).toBe(false)

      manager.completeTask(plan.planId, task!.id, { success: true, completedAt: Date.now() })

      expect(manager.isComplete(plan.planId)).toBe(true)
    })

    it("should count pending high-significance evidence", () => {
      const task = manager.addTask(plan.planId, { description: "Task" })

      manager.addEvidence(plan.planId, task!.id, "discovery", "Low", 3)
      manager.addEvidence(plan.planId, task!.id, "error", "High 1", 7)
      manager.addEvidence(plan.planId, task!.id, "error", "High 2", 8)

      const summary = manager.getSummary(plan.planId)
      expect(summary?.pendingEvidenceCount).toBe(2) // Only significance >= 5
    })
  })
})

describe("DependencyGraph", () => {
  it("should build graph from tasks", () => {
    const tasks: TaskNode[] = [
      createMockTask("1", "Task 1", []),
      createMockTask("2", "Task 2", ["1"]),
      createMockTask("3", "Task 3", ["1", "2"]),
    ]

    const graph = DependencyGraph.fromTasks(tasks)
    const nodes = graph.getAllNodes()

    expect(nodes).toHaveLength(3)
  })

  it("should detect cycles", () => {
    const tasks: TaskNode[] = [
      createMockTask("1", "Task 1", ["3"]),
      createMockTask("2", "Task 2", ["1"]),
      createMockTask("3", "Task 3", ["2"]),
    ]

    const graph = DependencyGraph.fromTasks(tasks)
    const cycle = graph.detectCycle()

    expect(cycle.hasCycle).toBe(true)
    expect(cycle.cyclePath.length).toBeGreaterThan(0)
  })

  it("should return no cycle for acyclic graph", () => {
    const tasks: TaskNode[] = [
      createMockTask("1", "Task 1", []),
      createMockTask("2", "Task 2", ["1"]),
      createMockTask("3", "Task 3", ["2"]),
    ]

    const graph = DependencyGraph.fromTasks(tasks)
    const cycle = graph.detectCycle()

    expect(cycle.hasCycle).toBe(false)
  })

  it("should get execution order", () => {
    const tasks: TaskNode[] = [
      createMockTask("1", "Task 1", [], "pending"),
      createMockTask("2", "Task 2", ["1"], "blocked"),
      createMockTask("3", "Task 3", [], "pending"),
    ]

    const graph = DependencyGraph.fromTasks(tasks)
    const order = graph.getExecutionOrder()

    expect(order.ready).toContain("1")
    expect(order.ready).toContain("3")
    expect(order.waiting).toContain("2")
  })

  it("should get topological sort", () => {
    const tasks: TaskNode[] = [
      createMockTask("1", "Task 1", []),
      createMockTask("2", "Task 2", ["1"]),
      createMockTask("3", "Task 3", ["1"]),
      createMockTask("4", "Task 4", ["2", "3"]),
    ]

    const graph = DependencyGraph.fromTasks(tasks)
    const sorted = graph.topologicalSort()

    // Task 1 must come before 2, 3, and 4
    const idx1 = sorted.indexOf("1")
    const idx2 = sorted.indexOf("2")
    const idx3 = sorted.indexOf("3")
    const idx4 = sorted.indexOf("4")

    expect(idx1).toBeLessThan(idx2)
    expect(idx1).toBeLessThan(idx3)
    expect(idx2).toBeLessThan(idx4)
    expect(idx3).toBeLessThan(idx4)
  })

  it("should get tasks blocked by failure", () => {
    const tasks: TaskNode[] = [
      createMockTask("1", "Task 1", [], "failed"),
      createMockTask("2", "Task 2", ["1"], "blocked"),
      createMockTask("3", "Task 3", ["2"], "blocked"),
      createMockTask("4", "Task 4", [], "pending"),
    ]

    const graph = DependencyGraph.fromTasks(tasks)
    const blocked = graph.getBlockedByFailure("1")

    expect(blocked).toContain("2")
    expect(blocked).toContain("3")
    expect(blocked).not.toContain("4")
  })

  it("should check if task can execute", () => {
    const tasks: TaskNode[] = [
      createMockTask("1", "Task 1", [], "completed"),
      createMockTask("2", "Task 2", ["1"], "pending"),
      createMockTask("3", "Task 3", ["1"], "running"),
      createMockTask("4", "Task 4", ["2", "3"], "blocked"),
    ]

    const graph = DependencyGraph.fromTasks(tasks)

    expect(graph.canExecute("2")).toBe(true) // Dep 1 is completed
    expect(graph.canExecute("4")).toBe(false) // Deps 2,3 not completed
  })

  it("should get critical path", () => {
    const tasks: TaskNode[] = [
      createMockTask("1", "Task 1", []),
      createMockTask("2", "Task 2", ["1"]),
      createMockTask("3", "Task 3", ["2"]),
      createMockTask("4", "Task 4", ["1"]), // Shorter path
    ]

    const graph = DependencyGraph.fromTasks(tasks)
    const criticalPath = graph.getCriticalPath()

    expect(criticalPath).toEqual(["1", "2", "3"])
  })
})

// Helper to create mock TaskNode
function createMockTask(
  id: string,
  description: string,
  dependencies: string[],
  status: TaskNode["status"] = "pending"
): TaskNode {
  return {
    id,
    description,
    status,
    dependencies,
    retryCount: 0,
    maxRetries: 3,
    priority: 0,
    createdAt: Date.now(),
  }
}
