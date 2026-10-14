import { MaybeRefOrGetter } from 'vue'
import type { DebounceFilterOptions, FunctionArgs, PromisifyFn } from './datas'
import { createFilterWrapper, debounceFilter } from './datas'

export function useDebounceFn<T extends FunctionArgs>(
  fn: T,
  ms: MaybeRefOrGetter<number> = 200,
  options: DebounceFilterOptions = {},
): PromisifyFn<T> {
  return createFilterWrapper(
    debounceFilter(ms, options),
    fn,
  )
}