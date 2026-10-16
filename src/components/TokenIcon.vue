<template>
  <div :class="iconClass">
    <component v-if="localIcon" :is="localIcon" class="icon"></component>
    <template v-else>
      <img
        v-if="resolvedIconUrl && !hasError && !isUnknown(resolvedIconUrl)"
        v-show="isImageLoaded"
        :src="resolvedIconUrl"
        class="icon"
        @load="isImageLoaded = true"
        @error="hasError = true"
      />
      <noneIcon
        v-show="!isImageLoaded || hasError || !resolvedIconUrl || isUnknown(resolvedIconUrl)"
        class="icon"
      />
    </template>
  </div>
</template>

<script>
import { ref, computed, defineComponent, onMounted, watch } from 'vue';
import { getTokenIcon, getRemoteTokenIconUrl } from '@/api/token-icons';
import noneIcon from '@/components/svg/none.vue';

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
    const isImageLoaded = ref(false);
    const hasError = ref(false);
    const resolvedIconUrl = ref(props.tokenIconUrl || null);

    const isUnknown = (url) => typeof url === 'string' && url.includes('unknownTokenIcon.svg');

    const localIcon = computed(() => {
      if (!props.tokenIconSymbol) return null;
      return getTokenIcon(props.tokenIconSymbol, false, true);
    });

    const resolveUrl = async () => {
      isImageLoaded.value = false;
      hasError.value = false;
      if (props.tokenIconUrl) {
        resolvedIconUrl.value = props.tokenIconUrl;
      } else if (props.tokenIconSymbol && !localIcon.value) {
        resolvedIconUrl.value = await getRemoteTokenIconUrl(props.tokenIconSymbol);
      } else {
        resolvedIconUrl.value = null;
      }
    };

    onMounted(resolveUrl);

    watch(
      () => [props.tokenIconUrl, props.tokenIconSymbol],
      resolveUrl
    );

    return {
      localIcon,
      resolvedIconUrl,
      isImageLoaded,
      hasError,
      isUnknown,
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
