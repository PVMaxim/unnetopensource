<template>
  <Suspense timeout="0" @resolve="handleResolve" @fallback="handleFallback">
    <template #default>
      <AppLayout />
    </template>
    <template #fallback>
      <Loading />
    </template>
  </Suspense>
  <Transition name="fade">
    <div v-if="isRouteLoading" class="route-loading-overlay">
      <Loading />
    </div>
  </Transition>
  <WalletConnectRequestModalSocket />
</template>

<script>
import { defineComponent, onMounted, onUnmounted } from 'vue';
import Loading from '@/components/Loading.vue';
import WalletConnectRequestModalSocket from '@/components/wallet-connect/modals/WalletConnectRequestModalSocket.vue';
import { errorReload } from '@/plugins/vitePreloadError.ts';
import { isRouteLoading } from '@/router/index';

export default defineComponent({
  name: 'App',
  components: { 
    Loading,
    WalletConnectRequestModalSocket,
  },
  setup() {
    const handlePreloadError = (e) => {
      console.error('[App] Vite preload error detected');
      e.preventDefault();
      errorReload('Error during page load', 3);
    };

    const handleResolve = () => {
      document.body.classList.remove('loading');
    };

    const handleFallback = () => {
      document.body.classList.add('loading');
    };

    onMounted(() => {
      window.addEventListener("vite:preloadError", handlePreloadError);
    });

    onUnmounted(() => {
      window.removeEventListener("vite:preloadError", handlePreloadError);
    });

    return {
      handleResolve,
      handleFallback,
      isRouteLoading
    };
  },
});
</script>

<style lang="scss">
body.loading #united-network {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.modal-container {
  background-color: rgba(0, 0, 0, 0.47) !important;
}

.route-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(17, 17, 17, 0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.fade-enter-active,
.fade-leave-active {
  @include transition(opacity 0.2s ease);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
