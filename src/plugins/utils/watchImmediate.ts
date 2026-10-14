import type { WatchCallback, WatchOptions, WatchSource, WatchStopHandle } from 'vue'

import { watch } from 'vue'

export type MapSources<T> = {
    [K in keyof T]: T[K] extends WatchSource<infer V> ? V : never;
}

export type MapOldSources<T, Immediate> = {
    [K in keyof T]: T[K] extends WatchSource<infer V> ? Immediate extends true ? V | undefined : V : never;
}

export function watchImmediate<T extends Readonly<WatchSource<unknown>[]>>(
  source: [...T],
  cb: WatchCallback<MapSources<T>, MapOldSources<T, true>>,
  options?: Omit<WatchOptions<true>, 'immediate'>
): WatchStopHandle

export function watchImmediate<T>(
  source: WatchSource<T>,
  cb: WatchCallback<T, T | undefined>,
  options?: Omit<WatchOptions<true>, 'immediate'>
): WatchStopHandle

export function watchImmediate<T extends object>(
  source: T,
  cb: WatchCallback<T, T | undefined>,
  options?: Omit<WatchOptions<true>, 'immediate'>
): WatchStopHandle

export function watchImmediate<T = any>(source: T, cb: any, options?: Omit<WatchOptions, 'immediate'>) {
  return watch(
    source as any,
    cb,
    {
      ...options,
      immediate: true,
    },
  )
}