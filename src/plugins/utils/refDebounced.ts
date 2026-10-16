import type { Ref } from 'vue'
import type { DebounceFilterOptions } from './datas'
import { ref as deepRef, watch, MaybeRefOrGetter } from 'vue'
import { useDebounceFn } from './useDebounceFn'

export function refDebounced<T>(value: Ref<T>, ms: MaybeRefOrGetter<number> = 200, options: DebounceFilterOptions = {}): Readonly<Ref<T>> {
  const debounced = deepRef(value.value as T) as Ref<T>

  const updater = useDebounceFn(() => {
    debounced.value = value.value
  }, ms, options)

  watch(value, () => updater())

  return debounced
}

export {
  refDebounced as debouncedRef,
  refDebounced as useDebounce,
}