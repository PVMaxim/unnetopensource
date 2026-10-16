export interface SingletonPromiseReturn<T> {
    (): Promise<T>
    reset: () => Promise<void>
  }

  export function createSingletonPromise<T>(fn: () => Promise<T>): SingletonPromiseReturn<T> {
    let _promise: Promise<T> | undefined

    function wrapper() {
      if (!_promise)
        _promise = fn()
      return _promise
    }
    wrapper.reset = async () => {
      const _prev = _promise
      _promise = undefined
      if (_prev)
        await _prev
    }

    return wrapper
  }

  export function invoke<T>(fn: () => T): T {
    return fn()
  }