import z from 'zod'

export namespace Log {
  export const Level = z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR'])
  export type Level = z.infer<typeof Level>

  const levelPriority: Record<Level, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  }

  let level: Level = "INFO"

  function should(input: Level): boolean {
    return levelPriority[input] >= levelPriority[level]
  }

  
}