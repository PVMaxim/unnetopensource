
import { useIntervalFn } from './useIntervalFn'
import { toRef } from './toRef'
import type { MaybeRefOrGetter } from 'vue'
import type { Pausable, ConfigurableNavigator } from './datas'
import { defaultNavigator } from './datas'
import { useSupported } from './useSupported'

export interface UseVibrateOptions extends ConfigurableNavigator {
  pattern?: MaybeRefOrGetter<number[] | number>
  interval?: number
}

export function useVibrate(options?: UseVibrateOptions) {
  const {
    pattern = [],
    interval = 0,
    navigator = defaultNavigator,
  } = options || {}

  const isSupported = useSupported(() => typeof navigator !== 'undefined' && 'vibrate' in navigator)

  const patternRef = toRef(pattern)
  let intervalControls: Pausable | undefined

  const vibrate = (pattern = patternRef.value) => {
    if (isSupported.value)
      navigator!.vibrate(pattern)
  }

  const stop = () => {
    if (isSupported.value)
      navigator!.vibrate(0)
    intervalControls?.pause()
  }

  if (interval > 0) {
    intervalControls = useIntervalFn(
      vibrate,
      interval,
      {
        immediate: false,
        immediateCallback: false,
      },
    )
  }

  return {
    isSupported,
    pattern,
    intervalControls,
    vibrate,
    stop,
  }
}

export type UseVibrateReturn = ReturnType<typeof useVibrate>