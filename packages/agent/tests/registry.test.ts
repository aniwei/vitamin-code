import { describe, expect, it } from 'vitest'
import { AgentRegistry } from '../src/agent-registry'
import { ToolRegistry } from '../src/tool-registry'

describe('AgentRegistry', () => {
  it('registers and fetches agent with tools', () => {
    const registry = new AgentRegistry()
    const agent = registry.register({
      name: 'planner',
      role: 'plan tasks',
      description: 'plans and coordinates tasks',
      version: '1.0.0',
      visibility: 'public',
      tags: ['core'],
      entryTools: ['tool_1'],
    })

    const fetched = registry.get(agent.id)
    expect(fetched?.name).toBe('planner')
    expect(fetched?.state).toBe('active')
    expect(fetched?.entryTools).toContain('tool_1')
  })

  it('disables agent and reflects in list', () => {
    const registry = new AgentRegistry()
    const agent = registry.register({
      name: 'worker',
      role: 'execute tasks',
      description: 'executes assigned tasks',
      version: '1.0.0',
      visibility: 'public',
      tags: ['worker'],
      entryTools: [],
    })

    registry.disable(agent.id)
    const list = registry.list({ visibility: 'public' })
    expect(list.length).toBe(0)
    const disabled = registry.get(agent.id)
    expect(disabled?.state).toBe('disabled')
    expect(disabled?.visibility).toBe('disabled')
  })

  it('filters agents by tags', () => {
    const registry = new AgentRegistry()
    registry.register({
      name: 'alpha',
      role: 'analyze',
      description: 'analyzes data',
      version: '1.0.0',
      visibility: 'public',
      tags: ['analyze', 'core'],
      entryTools: [],
    })
    registry.register({
      name: 'beta',
      role: 'assist',
      description: 'assists tasks',
      version: '1.0.0',
      visibility: 'public',
      tags: ['assist'],
      entryTools: [],
    })

    const filtered = registry.list({ tags: ['core'] })
    expect(filtered.map(item => item.name)).toContain('alpha')
    expect(filtered.map(item => item.name)).not.toContain('beta')
  })
})

describe('ToolRegistry', () => {
  it('registers tool and filters by agent and visibility', () => {
    const registry = new ToolRegistry()
    const tool = registry.register({
      name: 'search',
      type: 'extension',
      version: '1.0.0',
      visibility: 'public',
      paramsSchema: { q: 'string' },
      description: 'search tool',
      boundAgents: ['agent-1'],
    })

    const fetched = registry.get(tool.id)
    expect(fetched?.name).toBe('search')

    const forAgent = registry.list({ agentId: 'agent-1' })
    expect(forAgent).toHaveLength(1)
    expect(forAgent[0].id).toBe(tool.id)

    const hidden = registry.list({ visibility: 'hidden' })
    expect(hidden).toHaveLength(0)
  })
})
