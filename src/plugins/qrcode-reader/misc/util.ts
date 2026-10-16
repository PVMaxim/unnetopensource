export const idempotent = <T>(action: (x: any) => T) => {
  let called = false
  let result: T | undefined = undefined

  return (...args: any[]) => {
    if (called) {
      return result
    } else {
      result = action(args)
      called = true

      return result
    }
  }
}

export function assert(condition: boolean, failureMessage?: string): asserts condition {
  if (condition === false) {
    throw new Error(failureMessage ?? 'assertion failure')
  }
}

export function assertNever(_witness: never): never {
  throw new Error('this code should be unreachable')
}
