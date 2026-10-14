<template>
  <Teleport to="body">
    <Transition name="pn-slide">
      <div v-if="isVisible" class="pn-root">
        <div
          ref="bannerRef"
          class="pn-banner"
          role="alert"
          aria-live="assertive"
          v-clickoutside="dismiss"
          @mouseenter="clearTimer"
          @mouseleave="startTimer"
        >
          <div class="pn-icon-wrap">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
                fill="currentColor"
              />
            </svg>
          </div>

          <div class="pn-body">
            <p class="pn-app-name">Web3 Alert</p>
            <p class="pn-text">{{ notificationText }}</p>
          </div>

          <button class="pn-close" @click="dismiss" aria-label="Close notification">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M13 1L1 13M1 1l12 12"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { defineComponent, ref, watch, onUnmounted } from 'vue';
import { useEvmNotification } from './useEvmNotification';
import clickOutside from '@/plugins/click-outside/click-outside';

export default defineComponent({
  name: 'PushNotificationBanner',
  directives: {
    clickoutside: clickOutside,
  },
  setup() {
    const { notificationText, isVisible, dismiss } = useEvmNotification();
    const bannerRef = ref(null);
    let autoCloseTimer = null;

    const startTimer = () => {
      clearTimer();
      if (isVisible.value) {
        autoCloseTimer = setTimeout(() => {
          dismiss();
        }, 5000);
      }
    };

    const clearTimer = () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer);
        autoCloseTimer = null;
      }
    };

    watch(isVisible, (visible) => {
      if (visible) {
        startTimer();
      } else {
        clearTimer();
      }
    }, { immediate: true });

    onUnmounted(() => {
      clearTimer();
    });

    return {
      notificationText,
      isVisible,
      dismiss,
      bannerRef,
      startTimer,
      clearTimer,
    };
  },
});
</script>

<style scoped lang="scss">
.pn-root {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}

.pn-overlay {
  flex: 1;
  pointer-events: auto;
  cursor: pointer;
}

.pn-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin-top: 24px;
  padding: 14px 20px;
  box-sizing: border-box;
  background: linear-gradient(135deg, $color-orange 0%, $color-orange-disable 100%);
  color: #fff;
  box-shadow: 0 4px 24px rgba(255, 152, 0, 0.45);
  pointer-events: auto;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
  position: relative;
  z-index: 1;
}

.pn-icon-wrap {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pn-body {
  flex: 1;
  min-width: 0;
}

.pn-app-name {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.85;
}

.pn-text {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
}

.pn-close {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
  padding: 0;
}

.pn-close:hover {
  background: rgba(255, 255, 255, 0.35);
}

/* Slide-down animation */
.pn-slide-enter-active .pn-banner,
.pn-slide-leave-active .pn-banner {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.pn-slide-enter-from .pn-banner,
.pn-slide-leave-to .pn-banner {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
