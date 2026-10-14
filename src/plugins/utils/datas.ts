import { Ref, MaybeRefOrGetter, toValue, WatchOptions, WatchSource, isRef, nextTick, watch, ShallowRef, getCurrentScope, onScopeDispose } from 'vue'

export const isClient = typeof window !== 'undefined' && typeof document !== 'undefined'
export const defaultWindow = /* #__PURE__ */ isClient ? window : undefined
export const defaultDocument = /* #__PURE__ */ isClient ? window.document : undefined
export const defaultNavigator = /* #__PURE__ */ isClient ? window.navigator : undefined
export const defaultLocation = /* #__PURE__ */ isClient ? window.location : undefined
export const noop = () => {}
export type Fn = () => void
export type Arrayable<T> = T[] | T
export type AnyFn = (...args: any[]) => any
export type ArgumentsType<T> = T extends (...args: infer U) => any ? U : never
export type Promisify<T> = Promise<Awaited<T>>
export type FunctionArgs<Args extends any[] = any[], Return = void> = (...args: Args) => Return
export type PromisifyFn<T extends AnyFn> = (...args: ArgumentsType<T>) => Promisify<ReturnType<T>>

export interface Pausable {
  /**
   * A ref indicate whether a pausable instance is active
   */
  readonly isActive: Readonly<ShallowRef<boolean>>

  /**
   * Temporary pause the effect from executing
   */
  pause: Fn

  /**
   * Resume the effects
   */
  resume: Fn
}

export interface ConfigurableNavigator {
  /*
  * Specify a custom `navigator` instance, e.g. working with iframes or in testing environments.
  */
  navigator?: Navigator
}

export interface DebounceFilterOptions {
  /**
   * The maximum time allowed to be delayed before it's invoked.
   * In milliseconds.
   */
  maxWait?: MaybeRefOrGetter<number>

  /**
   * Whether to reject the last call if it's been cancel.
   *
   * @default false
   */
  rejectOnCancel?: boolean
}

export interface FunctionWrapperOptions<Args extends any[] = any[], This = any> {
  fn: FunctionArgs<Args, This>
  args: Args
  thisArg: This
}

export type ElementOf<T> = T extends (infer E)[] ? E : never
export type ShallowUnwrapRef<T> = T extends Ref<infer P> ? P : T
type Falsy = false | void | null | undefined | 0 | 0n | ''
export interface UntilValueInstance<T, Not extends boolean = false> extends UntilBaseInstance<T, Not> {
  readonly not: UntilValueInstance<T, Not extends true ? false : true>

  toBe: <P = T>(value: MaybeRefOrGetter<P>, options?: UntilToMatchOptions) => Not extends true ? Promise<T> : Promise<P>
  toBeTruthy: (options?: UntilToMatchOptions) => Not extends true ? Promise<T & Falsy> : Promise<Exclude<T, Falsy>>
  toBeNull: (options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, null>> : Promise<null>
  toBeUndefined: (options?: UntilToMatchOptions) => Not extends true ? Promise<Exclude<T, undefined>> : Promise<undefined>
  toBeNaN: (options?: UntilToMatchOptions) => Promise<T>
}
/**
 * Promised one-time watch for changes
 *
 * @see https://vueuse.org/until
 * @example
 * ```
 * const { count } = useCounter()
 *
 * await until(count).toMatch(v => v > 7)
 *
 * alert('Counter is now larger than 7!')
 * ```
 */
export interface UntilToMatchOptions {
  /**
   * Milliseconds timeout for promise to resolve/reject if the when condition does not meet.
   * 0 for never timed out
   *
   * @default 0
   */
  timeout?: number

  /**
   * Reject the promise when timeout
   *
   * @default false
   */
  throwOnTimeout?: boolean

  /**
   * `flush` option for internal watch
   *
   * @default 'sync'
   */
  flush?: WatchOptions['flush']

  /**
   * `deep` option for internal watch
   *
   * @default 'false'
   */
  deep?: WatchOptions['deep']
}

export interface UntilBaseInstance<T, Not extends boolean = false> {
  toMatch: (<U extends T = T>(
    condition: (v: T) => v is U,
    options?: UntilToMatchOptions
  ) => Not extends true ? Promise<Exclude<T, U>> : Promise<U>) & ((
    condition: (v: T) => boolean,
    options?: UntilToMatchOptions
  ) => Promise<T>)
  changed: (options?: UntilToMatchOptions) => Promise<T>
  changedTimes: (n?: number, options?: UntilToMatchOptions) => Promise<T>
}

export interface UntilArrayInstance<T> extends UntilBaseInstance<T> {
  readonly not: UntilArrayInstance<T>

  toContains: (value: MaybeRefOrGetter<ElementOf<ShallowUnwrapRef<T>>>, options?: UntilToMatchOptions) => Promise<T>
}

function createUntil<T>(r: any, isNot = false) {
  function toMatch(
    condition: (v: any) => boolean,
    { flush = 'sync', deep = false, timeout, throwOnTimeout }: UntilToMatchOptions = {},
  ): Promise<T> {
    let stop: (() => void) | null = null
    const watcher = new Promise<T>((resolve) => {
      stop = watch(
        r,
        (v) => {
          if (condition(v) !== isNot) {
            if (stop)
              stop()
            else
              nextTick(() => stop?.())
            resolve(v)
          }
        },
        {
          flush,
          deep,
          immediate: true,
        },
      )
    })

    const promises = [watcher]
    if (timeout != null) {
      promises.push(
        promiseTimeout(timeout, throwOnTimeout)
          .then(() => toValue(r))
          .finally(() => stop?.()),
      )
    }

    return Promise.race(promises)
  }

  function toBe<P>(value: MaybeRefOrGetter<P | T>, options?: UntilToMatchOptions) {
    if (!isRef(value))
      return toMatch(v => v === value, options)

    const { flush = 'sync', deep = false, timeout, throwOnTimeout } = options ?? {}
    let stop: (() => void) | null = null
    const watcher = new Promise<T>((resolve) => {
      stop = watch(
        [r, value],
        ([v1, v2]) => {
          if (isNot !== (v1 === v2)) {
            if (stop)
              stop()
            else
              nextTick(() => stop?.())
            resolve(v1)
          }
        },
        {
          flush,
          deep,
          immediate: true,
        },
      )
    })

    const promises = [watcher]
    if (timeout != null) {
      promises.push(
        promiseTimeout(timeout, throwOnTimeout)
          .then(() => toValue(r))
          .finally(() => {
            stop?.()
            return toValue(r)
          }),
      )
    }

    return Promise.race(promises)
  }

  function toBeTruthy(options?: UntilToMatchOptions) {
    return toMatch(v => Boolean(v), options)
  }

  function toBeNull(options?: UntilToMatchOptions) {
    return toBe<null>(null, options)
  }

  function toBeUndefined(options?: UntilToMatchOptions) {
    return toBe<undefined>(undefined, options)
  }

  function toBeNaN(options?: UntilToMatchOptions) {
    return toMatch(Number.isNaN, options)
  }

  function toContains(
    value: any,
    options?: UntilToMatchOptions,
  ) {
    return toMatch((v) => {
      const array = Array.from(v as any)
      return array.includes(value) || array.includes(toValue(value))
    }, options)
  }

  function changed(options?: UntilToMatchOptions) {
    return changedTimes(1, options)
  }

  function changedTimes(n = 1, options?: UntilToMatchOptions) {
    let count = -1 // skip the immediate check
    return toMatch(() => {
      count += 1
      return count >= n
    }, options)
  }

  if (Array.isArray(toValue(r))) {
    const instance: UntilArrayInstance<T> = {
      toMatch: toMatch as any,
      toContains,
      changed,
      changedTimes,
      get not() {
        return createUntil(r, !isNot) as UntilArrayInstance<T>
      },
    }
    return instance
  }
  else {
    const instance: UntilValueInstance<T, boolean> = {
      toMatch: toMatch as any,
      toBe,
      toBeTruthy: toBeTruthy as any,
      toBeNull: toBeNull as any,
      toBeNaN,
      toBeUndefined: toBeUndefined as any,
      changed,
      changedTimes,
      get not() {
        return createUntil(r, !isNot) as UntilValueInstance<T, boolean>
      },
    }

    return instance
  }
}

export function until<T extends unknown[]>(r: WatchSource<T> | MaybeRefOrGetter<T>): UntilArrayInstance<T>
export function until<T>(r: WatchSource<T> | MaybeRefOrGetter<T>): UntilValueInstance<T>
export function until<T>(r: any): UntilValueInstance<T> | UntilArrayInstance<T> {
  return createUntil(r)
}

export type EventFilter<Args extends any[] = any[], This = any, Invoke extends AnyFn = AnyFn> = (
  invoke: Invoke,
  options: FunctionWrapperOptions<Args, This>
) => ReturnType<Invoke> | Promisify<ReturnType<Invoke>>

export function toArray<T>(value: T): T extends readonly any[] ? T : [T] {
    return Array.isArray(value) ? value as any : [value] as [T]
}
export const isObject = (val: any): val is object =>
  toString.call(val) === '[object Object]'

export function createFilterWrapper<T extends AnyFn>(filter: EventFilter, fn: T) {
  function wrapper(this: any, ...args: ArgumentsType<T>) {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      // make sure it's a promise
      Promise.resolve(filter(() => fn.apply(this, args), { fn, thisArg: this, args }))
        .then(resolve)
        .catch(reject)
    })
  }

  return wrapper
}

/**
 * Create an EventFilter that debounce the events
 */
export function debounceFilter(ms: MaybeRefOrGetter<number>, options: DebounceFilterOptions = {}) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let maxTimer: ReturnType<typeof setTimeout> | undefined | null
  let lastRejector: AnyFn = noop

  const _clearTimeout = (timer: ReturnType<typeof setTimeout>) => {
    clearTimeout(timer)
    lastRejector()
    lastRejector = noop
  }

  let lastInvoker: () => void

  const filter: EventFilter = (invoke) => {
    const duration = toValue(ms)
    const maxDuration = toValue(options.maxWait)

    if (timer)
      _clearTimeout(timer)

    if (duration <= 0 || (maxDuration !== undefined && maxDuration <= 0)) {
      if (maxTimer) {
        _clearTimeout(maxTimer)
        maxTimer = null
      }
      return Promise.resolve(invoke())
    }

    return new Promise((resolve, reject) => {
      lastRejector = options.rejectOnCancel ? reject : resolve
      lastInvoker = invoke
      // Create the maxTimer. Clears the regular timer on invoke
      if (maxDuration && !maxTimer) {
        maxTimer = setTimeout(() => {
          if (timer)
            _clearTimeout(timer)
          maxTimer = null
          resolve(lastInvoker())
        }, maxDuration)
      }

      // Create the regular timer. Clears the max timer on invoke
      timer = setTimeout(() => {
        if (maxTimer)
          _clearTimeout(maxTimer)
        maxTimer = null
        resolve(invoke())
      }, duration)
    })
  }

  return filter
}

export function promiseTimeout(
  ms: number,
  throwOnTimeout = false,
  reason = 'Timeout',
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (throwOnTimeout)
      setTimeout(() => reject(reason), ms)
    else
      setTimeout(resolve, ms)
  })
}

export function tryOnScopeDispose(fn: Fn) {
  if (getCurrentScope()) {
    onScopeDispose(fn)
    return true
  }
  return false
}