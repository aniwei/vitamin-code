import z from 'zod'
import { createId } from './ids'

const semver = z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, 'invalid semver')

const ToolType = z.enum(['extension', 'function', 'datastore', 'codeexec'])
const Visibility = z.enum(['public', 'internal', 'hidden'])

const ToolInput = z.object({
  name: z.string().min(1),
  type: ToolType,
  version: semver,
  visibility: Visibility,
  paramsSchema: z.unknown(),
  description: z.string().min(1),
  boundAgents: z.array(z.string()).default([]),
  authn: z.string().optional(),
})

export type ToolInput = z.infer<typeof ToolInput>

export type ToolRecord = ToolInput & {
  id: string
  createdAt: string
  updatedAt: string
}

export type ToolFilter = {
  agentId?: string
  visibility?: z.infer<typeof Visibility>
}

export class ToolRegistry {
  #items = new Map<string, ToolRecord>()

  register(input: ToolInput): ToolRecord {
    const parsed = ToolInput.parse(input)
    const now = new Date().toISOString()
    const record: ToolRecord = {
      ...parsed,
      id: createId('tool'),
      createdAt: now,
      updatedAt: now,
    }
    this.#items.set(record.id, record)
    return record
  }

  get(id: string): ToolRecord | undefined {
    return this.#items.get(id)
  }

  list(filter: ToolFilter = {}): ToolRecord[] {
    const matchVisibility = filter.visibility
    const matchAgent = filter.agentId
    const result: ToolRecord[] = []

    for (const item of this.#items.values()) {
      const visibilityOk = !matchVisibility || item.visibility === matchVisibility

      if (!visibilityOk) continue
      const agentOk = !matchAgent || item.boundAgents.includes(matchAgent)
      
      if (!agentOk) continue
      result.push(item)
    }
    return result
  }
}
