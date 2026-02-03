import type { CommandModule } from 'yargs'

type WithDoubleDash<T> = T & { '--'?: string[] }

export function cmd<T, U>(input: CommandModule<T, WithDoubleDash<U>>, handler: (args: WithDoubleDash<U>) => void) {
  return input
}
