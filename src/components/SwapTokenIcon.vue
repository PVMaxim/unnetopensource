<template>
  <div class="swap-token-icon-wrapper" :class="iconClass">
    <component
      v-if="localIcon"
      :is="localIcon"
      class="swap-token-icon-inner"
      :class="iconClass"
    />
    <template v-else>
      <img
        v-if="iconUrl && !hasError"
        :src="iconUrl"
        loading="lazy"
        class="swap-token-icon-inner"
        :class="iconClass"
        @error="onImageError"
      />
      <noneIcon
        v-else
        class="swap-token-icon-inner"
        :class="iconClass"
      />
    </template>
  </div>
</template>

<script>
import { ref, computed, defineComponent, onMounted, watch } from "vue";
import {
  getTokenIcon as getLocalTokenSvg,
  getRemoteTokenIconUrl,
  getCachedTokenIconUrlSync,
} from "@/api/token-icons";
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
    const cleanSymbol = computed(() => {
      if (!props.token?.symbol) return "";
      return props.token.symbol.replace(/\s*\([^)]*\)\s*$/, "").trim();
    });

    const localIcon = computed(() => {
      if (props.token?.logoURI) return null;
      if (!props.token?.symbol) return null;
      return (
        getLocalTokenSvg(props.token, false, true) ||
        (cleanSymbol.value ? getLocalTokenSvg(cleanSymbol.value, false, true) : null)
      );
    });

    const initialSyncUrl = computed(() => {
      if (localIcon.value) return null;
      return getCachedTokenIconUrlSync(props.token, props.token?.logoURI);
    });

    const hasError = ref(false);
    const asyncIconUrl = ref(null);

    const iconUrl = computed(() => {
      return initialSyncUrl.value || asyncIconUrl.value;
    });

    const onImageError = () => {
      hasError.value = true;
    };

    const loadIconUrl = async (token) => {
      hasError.value = false;
      if (!token) {
        asyncIconUrl.value = null;
        return;
      }
      if (token.logoURI) {
        asyncIconUrl.value = token.logoURI;
        return;
      }
      if (localIcon.value) {
        asyncIconUrl.value = null;
        return;
      }
      if (initialSyncUrl.value) {
        return;
      }
      try {
        const url = await getRemoteTokenIconUrl(token);
        if (!url || (typeof url === "string" && url.includes("unknownTokenIcon.svg"))) {
          asyncIconUrl.value = null;
        } else {
          asyncIconUrl.value = url;
        }
      } catch {
        asyncIconUrl.value = null;
        hasError.value = true;
      }
    };

    onMounted(() => {
      loadIconUrl(props.token);
    });

    watch(
      () => props.token,
      (newToken) => {
        loadIconUrl(newToken);
      },
      { deep: true },
    );

    return {
      localIcon,
      hasError,
      iconUrl,
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
