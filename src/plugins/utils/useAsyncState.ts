import type { Ref, ShallowRef, UnwrapRef } from 'vue'
import { noop, promiseTimeout, until } from './datas'
import { ref as deepRef, shallowRef } from 'vue'

export interface UseAsyncStateReturnBase<Data, Params extends any[], Shallow extends boolean> {
  state: Shallow extends true ? Ref<Data> : Ref<UnwrapRef<Data>>
  isReady: Ref<boolean>
  isLoading: Ref<boolean>
  error: Ref<unknown>
  execute: (delay?: number, ...args: Params) => Promise<Data>
}

export type UseAsyncStateReturn<Data, Params extends any[], Shallow extends boolean> =
  UseAsyncStateReturnBase<Data, Params, Shallow>
  & PromiseLike<UseAsyncStateReturnBase<Data, Params, Shallow>>

export interface UseAsyncStateOptions<Shallow extends boolean, D = any> {
  delay?: number

  immediate?: boolean

  onError?: (e: unknown) => void

  onSuccess?: (data: D) => void

  resetOnExecute?: boolean

  shallow?: Shallow
  throwError?: boolean
}

export function useAsyncState<Data, Params extends any[] = any[], Shallow extends boolean = true>(
  promise: Promise<Data> | ((...args: Params) => Promise<Data>),
  initialState: Data,
  options?: UseAsyncStateOptions<Shallow, Data>,
): UseAsyncStateReturn<Data, Params, Shallow> {
  const {
    immediate = true,
    delay = 0,
    onError = noop,
    onSuccess = noop,
    resetOnExecute = true,
    shallow = true,
    throwError,
  } = options ?? {}
  const state = shallow ? shallowRef(initialState) : deepRef(initialState)
  const isReady = shallowRef(false)
  const isLoading = shallowRef(false)
  const error = shallowRef<unknown | undefined>(undefined)

  async function execute(delay = 0, ...args: any[]) {
    if (resetOnExecute)
      state.value = initialState
    error.value = undefined
    isReady.value = false
    isLoading.value = true

    if (delay > 0)
      await promiseTimeout(delay)

    const _promise = typeof promise === 'function'
      ? promise(...args as Params)
      : promise

    try {
      const data = await _promise
      state.value = data
      isReady.value = true
      onSuccess(data)
    }
    catch (e) {
      error.value = e
      onError(e)
      if (throwError)
        throw e
    }
    finally {
      isLoading.value = false
    }

    return state.value as Data
  }

  if (immediate) {
    execute(delay)
  }

  const shell: UseAsyncStateReturnBase<Data, Params, Shallow> = {
    state: state as Shallow extends true ? ShallowRef<Data> : Ref<UnwrapRef<Data>>,
    isReady,
    isLoading,
    error,
    execute,
  }

  function waitUntilIsLoaded() {
    return new Promise<UseAsyncStateReturnBase<Data, Params, Shallow>>((resolve, reject) => {
      until(isLoading).toBe(false).then(() => resolve(shell)).catch(reject)
    })
  }

  return {
    ...shell,
    then(onFulfilled, onRejected) {
      return waitUntilIsLoaded()
        .then(onFulfilled, onRejected)
    },
  }
}