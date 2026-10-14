import { computed } from 'vue'
import { useMounted } from './useMounted'

export function useSupported(callback: () => unknown) {
  const isMounted = useMounted()

  return computed(() => {
    isMounted.value
    return Boolean(callback())
  })
}

export type UseSupportedReturn = ReturnType<typeof useSupported>