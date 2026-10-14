
import type { ComputedRef, ShallowRef } from 'vue'
import { useEventListener } from './useEventListener'
import { readonly, shallowRef, computed } from 'vue'
import { useMounted } from './useMounted'
import { defaultWindow } from './datas'

export interface ConfigurableWindow {
    window?: Window
}

export function useSupported(callback: () => unknown) {
    const isMounted = useMounted()

    return computed(() => {
        isMounted.value
        return Boolean(callback())
    })
}

export type NetworkType = 'bluetooth' | 'cellular' | 'ethernet' | 'none' | 'wifi' | 'wimax' | 'other' | 'unknown'

export type NetworkEffectiveType = 'slow-2g' | '2g' | '3g' | '4g' | undefined

export interface NetworkState {
  isSupported: ComputedRef<boolean>
  isOnline: Readonly<ShallowRef<boolean>>
  offlineAt: Readonly<ShallowRef<number | undefined>>
  onlineAt: Readonly<ShallowRef<number | undefined>>
  downlink: Readonly<ShallowRef<number | undefined>>
  downlinkMax: Readonly<ShallowRef<number | undefined>>
  effectiveType: Readonly<ShallowRef<NetworkEffectiveType | undefined>>
  rtt: Readonly<ShallowRef<number | undefined>>
  saveData: Readonly<ShallowRef<boolean | undefined>>
  type: Readonly<ShallowRef<NetworkType>>
}

export function useNetwork(options: ConfigurableWindow = {}): Readonly<NetworkState> {
  const { window = defaultWindow } = options
  const navigator = window?.navigator
  const isSupported = useSupported(() => navigator && 'connection' in navigator)

  const isOnline = shallowRef(true)
  const saveData = shallowRef(false)
  const offlineAt = shallowRef<number | undefined>(undefined)
  const onlineAt = shallowRef<number | undefined>(undefined)
  const downlink = shallowRef<number | undefined>(undefined)
  const downlinkMax = shallowRef<number | undefined>(undefined)
  const rtt = shallowRef<number | undefined>(undefined)
  const effectiveType = shallowRef<NetworkEffectiveType>(undefined)
  const type = shallowRef<NetworkType>('unknown')

  const connection = isSupported.value && (navigator as any).connection

  function updateNetworkInformation() {
    if (!navigator)
      return

    isOnline.value = navigator.onLine
    offlineAt.value = isOnline.value ? undefined : Date.now()
    onlineAt.value = isOnline.value ? Date.now() : undefined

    if (connection) {
      downlink.value = connection.downlink
      downlinkMax.value = connection.downlinkMax
      effectiveType.value = connection.effectiveType
      rtt.value = connection.rtt
      saveData.value = connection.saveData
      type.value = connection.type
    }
  }

  const listenerOptions = { passive: true }

  if (window) {
    useEventListener(window, 'offline', () => {
      isOnline.value = false
      offlineAt.value = Date.now()
    }, listenerOptions)

    useEventListener(window, 'online', () => {
      isOnline.value = true
      onlineAt.value = Date.now()
    }, listenerOptions)
  }

  if (connection)
    useEventListener(connection, 'change', updateNetworkInformation, listenerOptions)

  updateNetworkInformation()

  return {
    isSupported,
    isOnline: readonly(isOnline),
    saveData: readonly(saveData),
    offlineAt: readonly(offlineAt),
    onlineAt: readonly(onlineAt),
    downlink: readonly(downlink),
    downlinkMax: readonly(downlinkMax),
    effectiveType: readonly(effectiveType),
    rtt: readonly(rtt),
    type: readonly(type),
  }
}

export type UseNetworkReturn = ReturnType<typeof useNetwork>