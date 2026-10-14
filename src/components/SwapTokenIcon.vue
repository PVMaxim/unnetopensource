<template>
  <div ref="iconContainer" class="swap-token-icon-wrapper" :class="iconClass">
    <component
      v-if="localIcon"
      :is="localIcon"
      class="swap-token-icon-inner"
      :class="iconClass"
    />
    <template v-else>
      <img
        v-if="iconUrl && !hasError"
        v-show="isImageLoaded && shouldLoad"
        :src="shouldLoad ? iconUrl : undefined"
        class="swap-token-icon-inner"
        :class="iconClass"
        @load="onImageLoad"
        @error="onImageError"
      />
      <noneIcon
        v-show="!isImageLoaded || hasError || !iconUrl"
        class="swap-token-icon-inner"
        :class="iconClass"
      />
    </template>
  </div>
</template>

<script>
import { ref, computed, defineComponent, onMounted, watch, onUnmounted } from "vue";
import { getTokenIcon as getLocalTokenSvg, getRemoteTokenIconUrl } from "@/api/token-icons";
import noneIcon from "@/components/svg/none.vue";

export default defineComponent({
  name: "SwapTokenIcon",
  components: {
    noneIcon,
  },
  props: {
    token: {
      type: Object,
      required: true,
    },
    iconClass: {
      type: String,
      required: true,
    },
    lazy: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const isImageLoaded = ref(false);
    const hasError = ref(false);
    const iconUrl = ref(null);
    const shouldLoad = ref(!props.lazy);
    const iconContainer = ref(null);
    let observer = null;

    const localIcon = computed(() => {
      if (props.token?.logoURI) return null;
      if (!props.token?.symbol) return null;
      return getLocalTokenSvg(props.token.symbol, false, true);
    });

    const onImageLoad = () => {
      isImageLoaded.value = true;
      hasError.value = false;
    };

    const onImageError = () => {
      isImageLoaded.value = false;
      hasError.value = true;
    };

    const loadIconUrl = async (token) => {
      isImageLoaded.value = false;
      hasError.value = false;
      if (!token) {
        iconUrl.value = null;
        return;
      }
      if (token.logoURI) {
        iconUrl.value = token.logoURI;
        return;
      }
      if (token.symbol && getLocalTokenSvg(token.symbol, false, true) !== null) {
        iconUrl.value = null;
        return;
      }
      try {
        const url = await getRemoteTokenIconUrl(token);
        if (!url || (typeof url === "string" && url.includes("unknownTokenIcon.svg"))) {
          iconUrl.value = null;
        } else {
          iconUrl.value = url;
        }
      } catch {
        iconUrl.value = null;
        hasError.value = true;
      }
    };

    const setupIntersectionObserver = () => {
      if (!props.lazy || shouldLoad.value || !iconContainer.value) {
        return;
      }

      if (typeof window === "undefined" || !window.IntersectionObserver) {
        shouldLoad.value = true;
        return;
      }

      observer = new window.IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (entry && entry.isIntersecting) {
            shouldLoad.value = true;
            observer.disconnect();
            observer = null;
          }
        },
        { rootMargin: "120px 0px" }
      );

      observer.observe(iconContainer.value);
    };

    onMounted(() => {
      setupIntersectionObserver();
      if (shouldLoad.value) {
        loadIconUrl(props.token);
      }
    });

    watch(
      () => props.token,
      (newToken) => {
        isImageLoaded.value = false;
        hasError.value = false;
        if (!shouldLoad.value) {
          return;
        }
        loadIconUrl(newToken);
      },
      { deep: true },
    );

    watch(shouldLoad, (isVisible) => {
      if (isVisible) {
        loadIconUrl(props.token);
      }
    });

    onUnmounted(() => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    });

    return {
      localIcon,
      isImageLoaded,
      hasError,
      iconUrl,
      shouldLoad,
      iconContainer,
      onImageLoad,
      onImageError,
    };
  },
});
</script>

<style scoped lang="scss">
.swap-token-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  border-radius: 50%;
}

.swap-token-icon-inner {
  width: 100%;
  height: 100%;
  display: block;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}
</style>
