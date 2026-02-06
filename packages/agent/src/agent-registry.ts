import z from 'zod'
import { createId } from './ids'

const semver = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'invalid semver')

const Visibility = z.enum(['public', 'internal', 'disabled'])
const State = z.enum(['active', 'disabled'])

const AgentInput = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  description: z.string().min(1),
  version: semver,
  visibility: Visibility,
  tags: z.array(z.string()).default([]),
  entryTools: z.array(z.string()).default([]),
})

export type AgentInput = z.infer<typeof AgentInput>

export type AgentRecord = AgentInput & {
  id: string
  state: z.infer<typeof State>
  createdAt: string
  updatedAt: string
}

export type AgentFilter = {
  visibility?: z.infer<typeof Visibility>
  tags?: string[]
}

export class AgentRegistry {
  #items = new Map<string, AgentRecord>()

  register(input: AgentInput): AgentRecord {
    const parsed = AgentInput.parse(input)
    const now = new Date().toISOString()
    const record: AgentRecord = {
      ...parsed,
      id: createId('agent'),
      state: 'active',
      createdAt: now,
      updatedAt: now,
    }
    this.#items.set(record.id, record)
    return record
  }

  get(id: string): AgentRecord | undefined {
    return this.#items.get(id)
  }

  disable(id: string): AgentRecord | undefined {
    const current = this.#items.get(id)
    if (!current) return undefined
    const next: AgentRecord = { ...current, state: 'disabled', visibility: 'disabled', updatedAt: new Date().toISOString() }
    this.#items.set(id, next)
    return next
  }

  list(filter: AgentFilter = {}): AgentRecord[] {
    const matchVisibility = filter.visibility
    const matchTags = filter.tags
    const result: AgentRecord[] = []
    for (const item of this.#items.values()) {
      const visibilityOk = !matchVisibility || item.visibility === matchVisibility
      if (!visibilityOk) continue
      const tagsOk = !matchTags || matchTags.every(tag => item.tags.includes(tag))
      if (!tagsOk) continue
      result.push(item)
    }
    return result
  }
}
