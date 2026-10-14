<template>
    <div class='pull-to-refresh-wrapper' :class="{ 'pull-to-refresh-loading-wrapper': isRefresh }">
      <div
        class='pull-to-refresh-container'
        ref="pullToRefreshContainer"
        @touchstart='handleTouchStart'
        @touchmove='handleTouchMove'
        @touchend='handleTouchEnd'
        :style='`transform: translateY(${refreshHeight}px)`'
      >
        <div v-if='isRefresh' class='pull-to-refresh-box '>
            <Loading />
        </div>
        <slot />
      </div>
    </div>
  </template>
  
  <script>
import { defineComponent, watchEffect, ref, computed } from 'vue';
import Loading from '@/components/Loading.vue';
  
  export default defineComponent({
    name: 'PullToRefresh',
    emits: ['refresh'],
      props: {
        isLoading: {
          type: Boolean,
          default: false
        },
        minHeight: {
          type: [Number, null],
          default: null
        }
      },
      components: {
        Loading
      },
  
      setup(props, { emit }) {
        const pullToRefreshContainer = ref(null);
        const startY = ref(0);
        const refreshIndicatorRotation = ref(0);
        const refreshHeight = ref(0);
        const isRefresh = ref(false);
        const minHeightComp = computed(() => {
          if ( props.minHeight !== null) {
            return `${props.minHeight}px`;
          }
          return 'initial'
        });
  
        const checkScrollTop = () => {
          return pullToRefreshContainer.value.scrollTop <= 10;
        }

        const doRefresh = (event) => {
          const deltaY = Math.min(event.touches[0].clientY - startY.value, 84);
          if (deltaY < 0) return;
          refreshHeight.value = deltaY
          refreshIndicatorRotation.value = deltaY * 2;
        }

        const blockingPullStatus = () => {
          return !checkScrollTop() || props.isLoading;
        }
  
        const handleTouchStart = (event) => {
          if (blockingPullStatus()) return;
          startY.value = event.touches[0].clientY;
        }

        const handleTouchMove = (event) => {
          if (blockingPullStatus()) return;
          doRefresh(event);
        }

        const handleTouchEnd = (event) => {
          if (!checkScrollTop() || isRefresh.value) return;
          const deltaY = event.changedTouches[0].clientY - startY.value;
          if (deltaY >= 70) {
            animationHeight(70);
            isRefresh.value = true;
            emit('refresh');
          } else {
            animationHeight(0);
          }
          refreshIndicatorRotation.value = 0;
        }

        const animationHeight = (targetHeight) => {
          const startTime = performance.now();
          const startHeight = refreshHeight.value
          const animationDuration = 450;
          let animationFrameId;

          const animateHeight = (timestamp) => {
            const elapsedTime = timestamp - startTime;
            if (elapsedTime < animationDuration) {
              refreshHeight.value = Math.max(
              targetHeight,
              startHeight - (startHeight / animationDuration) * elapsedTime
              );
              animationFrameId = requestAnimationFrame(animateHeight);
            } else {
              refreshHeight.value = targetHeight;
              if (refreshHeight.value === 0) {
              isRefresh.value = false;
              }
            }
          }
          animationFrameId = requestAnimationFrame(animateHeight);
          return () => {
          cancelAnimationFrame(animationFrameId);
          };
        };

        watchEffect(() => {
        if (props.isLoading === false && isRefresh.value) {
            animationHeight(0);
        }}
        );

        return { isRefresh, refreshHeight, refreshIndicatorRotation, pullToRefreshContainer, handleTouchStart, handleTouchMove, handleTouchEnd, minHeightComp }
      }
  })
  </script>

  <style scoped lang="scss">
  .pull-to-refresh-wrapper {
    overflow: hidden;
    width: 100%;
    min-height: v-bind(minHeightComp);
  }
  
  .pull-to-refresh-loading-wrapper {
    pointer-events: none;
  }
  
  .pull-to-refresh-container {
    scroll-behavior: smooth;
    overscroll-behavior: contain;
    position: relative;
    left: 0;
    width: 100%;
    min-height: 100%;
  }
  
  .pull-to-refresh-box  {
    box-sizing: border-box;
    scroll-behavior: smooth;
    height: 70px;
    position: absolute;
    top: -70px;
    left: 0;
    width: 100%;
    max-height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 400;
    flex-direction: column;

    :deep(.loader) {
      width: 36px;
      height: 36px;
      border-width: 6px;
      z-index: 2;
    }
  }
  
  </style>