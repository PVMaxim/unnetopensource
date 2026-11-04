<template>
  <div :class="iconClass">
    <component v-if="localIcon" :is="localIcon" class="icon"></component>
    <template v-else>
      <img
        v-if="displayUrl && !hasError"
        v-show="isImageLoaded"
        ref="imgRef"
        :src="displayUrl"
        class="icon"
        @load="onImageLoad"
        @error="onImageError"
      />
      <noneIcon
        v-show="!isImageLoaded || hasError || !displayUrl"
        class="icon"
      />
    </template>
  </div>
</template>

<script>
import { ref, computed, defineComponent, onMounted, watch, nextTick } from 'vue';
import {
  getTokenIcon,
  preloadTokenIconUrl,
  isImageUrlCached,
  markImageUrlCached,
} from '@/api/token-icons';
import noneIcon from '@/components/svg/none.vue';

function cleanIconUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  if (!clean || clean.includes('unknownTokenIcon.svg')) return null;
  return clean.replace(/(\/__icons\/)([^/?#]+)/i, (_, prefix, ticker) => {
    return prefix + encodeURIComponent(decodeURIComponent(ticker).toLowerCase().trim());
  });
}

export default defineComponent({
  name: 'TokenIcon',
  props: {
    tokenIconSymbol: {
      type: [String, null],
      default: null,
      required: true,
    },
    tokenIconUrl: {
      type: [String, null],
      default: null,
      required: false,
    },
    iconClass: {
      type: String,
      required: true,
    }
  },
  components: {
    noneIcon,
  },
  setup(props) {
    const imgRef = ref(null);
    const hasError = ref(false);

    const localIcon = computed(() => {
      if (!props.tokenIconSymbol) return null;
      return getTokenIcon(props.tokenIconSymbol, false, true);
    });

    const displayUrl = computed(() => {
      if (localIcon.value) return null;
      return cleanIconUrl(props.tokenIconUrl);
    });

    const isImageLoaded = ref(Boolean(displayUrl.value && isImageUrlCached(displayUrl.value)));

    const onImageLoad = () => {
      isImageLoaded.value = true;
      hasError.value = false;
      if (displayUrl.value) {
        markImageUrlCached(displayUrl.value);
      }
    };

    const onImageError = () => {
      hasError.value = true;
      isImageLoaded.value = false;
    };

    const checkLoadedState = () => {
      hasError.value = false;
      if (!displayUrl.value) {
        isImageLoaded.value = false;
        return;
      }
      if (isImageUrlCached(displayUrl.value)) {
        isImageLoaded.value = true;
        return;
      }
      preloadTokenIconUrl(displayUrl.value);
      isImageLoaded.value = false;
      nextTick(() => {
        if (imgRef.value?.complete && imgRef.value?.naturalWidth > 0) {
          onImageLoad();
        }
      });
    };

    onMounted(checkLoadedState);

    watch(
      () => [displayUrl.value, props.tokenIconSymbol],
      checkLoadedState
    );

    return {
      imgRef,
      localIcon,
      displayUrl,
      isImageLoaded,
      hasError,
      onImageLoad,
      onImageError,
    };
  },
});
</script>

<style scoped lang="scss">
.token-item {
  display: flex;
  flex-direction: row;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;

  .token-column {
    height: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
  }

  .token-col {
    height: 100%;
    display: flex;
    flex-direction: column;

    &.right {
      align-items: flex-end;
    }

    &.mrr {
      margin-right: 14px;
    }
  }

  .token-balance-usd-change {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    font-family: 'Poppins', sans-serif;
    font-size: 12px;

    .token-change {
      color: $color-green;
      margin-left: 5px;

      &.negative {
        color: $color-red;
      }
    }
  }

  .token-balance-usd {
    font-family: 'Poppins', sans-serif;
    font-size: 12px;
  }

  .token-btn {
    display: flex;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;

    svg {
      width: 14px;
      height: 14px;
    }
  }

  &:not(:last-child) {
    border-bottom: 1px solid $color-black-32;
  }
}
</style>
