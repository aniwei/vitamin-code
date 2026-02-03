import z from 'zod'
import { EventEmitter } from 'events'

export namespace Bus {
  type Subscription = (event: unknown) => void

  
  export function define<Type extends string, Properties extends z.ZodType>(type: Type, properties: Properties) {
    const result = {
      type,
      properties,
    }

    registry.set(type, result)
    return result
  }

  export type Definition = ReturnType<typeof define>

  export function payloads() {
    return z
      .discriminatedUnion('type', registry.entries().map(([type, def]) => {
        return z.object({
          type: z.literal(type),
          properties: def.properties
        }).meta({
          ref: `Event.${def.type}`
        })
      }).toArray() as any,).meta({ ref: 'Event' })
  }

  const registry: Map<string, Definition> = new Map()

  export const global = new EventEmitter<{
    event: [
      {
        directory?: string
        payload: any
      },
    ]
  }>()

  export const InstanceDisposed = define('server.instance.disposed', z.object({
    directory: z.string()
  }))
}
