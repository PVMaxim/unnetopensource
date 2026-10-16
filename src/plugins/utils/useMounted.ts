import {
    getCurrentInstance,
    onMounted,
    shallowRef,
  } from 'vue'

  export function useMounted() {
    const isMounted = shallowRef(false)

    const instance = getCurrentInstance()
    if (instance) {
      onMounted(() => {
        isMounted.value = true
      }, instance)
    }

    return isMounted
  }