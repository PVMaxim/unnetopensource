<template>
  <div class="swap-token-block" @click="toggleModal">
    <SwapTokenIcon :token="token" iconClass="swap-selected-token-icon" />
    <span class="swap-token-symbol">{{ token?.symbol }}</span>
    <svg
      class="swap-token-arrow"
      width="7"
      height="11"
      viewBox="0 0 7 11"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.00098 0.833008L5.66764 5.49967L1.00098 10.1663"
        stroke="white"
        stroke-opacity="0.4"
      />
    </svg>
  </div>

  <Teleport to="body">
    <div v-if="isOpen" class="backdrop" @click.self="toggleModal">
      <div class="select-token-modal-content">
        <div class="select-token-modal-header">
          <h3>
            {{ $t("pages.selectToken.selectToken") }} <span>{{ title }}</span>
          </h3>
          <closeIcon @click="toggleModal" />
        </div>
        <div class="select-token-modal-input-wrapper">
          <input
            class="select-token-modal-input"
            :value="searchText"
            @input="onChangeSearchText"
            :placeholder="$t('pages.selectToken.search')"
          />
          <searchIcon />
        </div>
        <div v-if="isTokensLoading && filteredTokens.length === 0" class="select-token-loading">
          <div class="loader"></div>
          <span>{{ $t("pages.selectToken.loading") || "Loading tokens..." }}</span>
        </div>
        <div v-else-if="filteredTokens.length === 0" class="option-not-found">
          {{ $t("pages.selectToken.notFound") }}
        </div>
        <div v-else class="options">
          <SelectTokenItem
            v-for="token in displayedTokens"
            :key="`${token.chain}-${token.address}`"
            :token="token"
            :disabled="
              disabledToken?.address === token.address &&
              disabledToken?.chain === token.chain
            "
            @click="selectToken(token, $event)"
          />
          <div
            v-if="hasMoreTokens"
            v-intersect="loadMoreTokens"
            class="options-scroll-sentinel"
          >
            <div class="sentinel-loader"></div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, onMounted, computed, watch, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import closeIcon from "@/components/svg/closeIcon.vue";
import searchIcon from "@/components/svg/searchIcon.vue";
import SelectTokenItem from "@/components/SelectTokenItem.vue";
import { getOwnerAddress } from "@/api/swap/utils/ownerAddress";
import { useStore } from "vuex";
import { SET_SWAP_TOKEN_BALANCE } from "../store/mutation-types";
import { useDebounceFn } from "@/plugins/utils/useDebounceFn";
import SwapTokenIcon from "./SwapTokenIcon.vue";

export default {
  name: "SelectToken",
  components: {
    closeIcon,
    searchIcon,
    SelectTokenItem,
    SwapTokenIcon,
  },
  props: {
    token: { type: Object, default: () => ({}) },
    title: { type: String, default: "Select Token" },
    provider: { type: Object, default: () => ({}) },
    setToken: { type: Function, default: () => {} },
    disabledToken: { type: Object, default: () => ({}) },
  },

  setup(props) {
    const tokens = ref([]);
    const store = useStore();

    const isOpen = ref(false);
    const searchText = ref("");
    const searchQuery = ref("");
    const ownerAddress = ref(null);
    const displayLimit = ref(30);

    const isTokensLoading = computed(() => !!store.state.swap?.isTokensLoading);

    const debouncedSearch = useDebounceFn((value) => {
      searchQuery.value = (value || "").trim().toLowerCase();
      displayLimit.value = 30;
    }, 200);

    const onChangeSearchText = (event) => {
      searchText.value = event.target.value;
      debouncedSearch(event.target.value);
    };

    const toggleModal = () => {
      if (isOpen.value) {
        searchText.value = "";
        searchQuery.value = "";
        displayLimit.value = 30;
      }
      isOpen.value = !isOpen.value;
    };

    const selectToken = (token, event) => {
      event.stopPropagation();
      searchText.value = "";
      searchQuery.value = "";
      displayLimit.value = 30;
      isOpen.value = false;
      props.setToken(token);
    };

    const onKeydown = (event) => {
      if (event.key === "Escape" && isOpen.value) {
        toggleModal();
      }
    };

    const updateTokensList = async () => {
      const chain = props.provider?.swapChain;
      if (!chain) {
        tokens.value = [];
        return;
      }
      const chainTokens = store.state.swap?.tokens?.[chain];
      if (!Array.isArray(chainTokens) || chainTokens.length === 0) {
        tokens.value = [];
        return;
      }
      const balances = store.state.swap?.balances || {};
      const sorted = [...chainTokens].sort((a, b) => {
        const balA = parseFloat(balances[`${chain}-${a.address}`]?.amount || "0");
        const balB = parseFloat(balances[`${chain}-${b.address}`]?.amount || "0");
        return balB - balA;
      });
      tokens.value = sorted;

      if (!ownerAddress.value && store.state.user?.publicKeyCard) {
        ownerAddress.value = await getOwnerAddress(
          props.provider,
          store.state.user.publicKeyCard
        );
      }
    };

    onMounted(async () => {
      window.addEventListener("keydown", onKeydown);
      await updateTokensList();
    });

    watch(
      () => props.provider?.swapChain,
      async () => {
        await updateTokensList();
      }
    );

    watch(
      () => store.state.swap?.tokens,
      async () => {
        await updateTokensList();
      },
      { deep: false }
    );

    const debouncedSort = useDebounceFn(async () => {
      await updateTokensList();
    }, 350);

    const unsubscribe = store.subscribe((mutation) => {
      if (
        mutation.type === `swap/${SET_SWAP_TOKEN_BALANCE}` &&
        mutation.payload?.token?.chain === props.provider?.swapChain
      ) {
        debouncedSort();
      }
    });

    onUnmounted(() => {
      window.removeEventListener("keydown", onKeydown);
      unsubscribe();
    });

    const filteredTokens = computed(() => {
      const query = searchQuery.value;
      if (!query) {
        return tokens.value;
      }
      const matches = [];
      const lowerQuery = query.toLowerCase();
      for (const token of tokens.value) {
        const symbol = token.symbol?.toLowerCase();
        const name = token.name?.toLowerCase();
        const address = token.address?.toLowerCase();
        if (symbol === lowerQuery || address === lowerQuery) {
          matches.unshift(token);
        } else if (symbol?.startsWith(lowerQuery)) {
          matches.push(token);
        } else if (name?.includes(lowerQuery) || symbol?.includes(lowerQuery)) {
          matches.push(token);
        }
        if (matches.length >= 40) break;
      }
      return matches;
    });

    const displayedTokens = computed(() => {
      return filteredTokens.value.slice(0, displayLimit.value);
    });

    const hasMoreTokens = computed(() => {
      return displayedTokens.value.length < filteredTokens.value.length;
    });

    const loadMoreTokens = () => {
      if (hasMoreTokens.value) {
        displayLimit.value += 25;
      }
    };

    return {
      isOpen,
      toggleModal,
      selectToken,
      searchText,
      onChangeSearchText,
      filteredTokens,
      displayedTokens,
      hasMoreTokens,
      loadMoreTokens,
      isTokensLoading,
      ownerAddress,
    };
  },
};
</script>

<style scoped lang="scss">
.swap-token-block {
  padding: 4px 14px 4px 4px;
  border-radius: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #262626;
  box-sizing: border-box;
  gap: 10px;
}

.swap-token-icon {
  width: 27px;
  height: 27px;
}

.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-token-modal-content {
  padding: 18px 16px;
  position: absolute;
  width: 90%;
  max-width: 620px;
  left: calc(50% - 310px);
  box-sizing: border-box;
  background: #262626;
  border-radius: 24px;
  z-index: 103;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.select-token-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 20px;
    font-family: 'Inter Tight';
    font-weight: 500;

    span {
      font-weight: 400;
      color: rgba(255, 255, 255, 0.5);
    }
  }

  svg {
    cursor: pointer;
    width: 18px;
    height: 18px;

    stroke: rgba(255, 152, 0, 1);
  }
}

.select-token-modal-input-wrapper {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: $color-black;
  border-radius: 10px;
  span {
    color: rgba(255, 255, 255, 0.3);
  }
  svg {
    width: 16px;
    height: 16px;
  }
}

.select-token-modal-input {
  width: 100%;
  background: transparent;
  border: none;
  font-size: 14px;
  color: $color-white;
  border-bottom: none;
  font-family: 'Inter Tight';

  &:focus,
  &:valid {
    background-color: rgba(255, 255, 255, 0) !important;
  }
}

.options {
  max-height: 400px;
  overflow-y: scroll;
}

.option-not-found {
  padding: 16px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.select-token-loading {
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;

  .loader {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid;
    border-color: $color-orange #0000;
    box-sizing: border-box;
    animation: s1 0.5s infinite;
  }
}

.options-scroll-sentinel {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  .sentinel-loader {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid;
    border-color: $color-orange #0000;
    box-sizing: border-box;
    animation: s1 0.5s infinite;
  }
}

@keyframes s1 {
  to {
    transform: rotate(0.5turn);
  }
}

@media (max-width: 690px) {
  .select-token-modal-content {
    left: 32px;
    right: 32px;
    width: calc(100% - 64px);
  }
}
</style>

<style lang="scss">
.swap-selected-token-icon {
  width: 27px;
  height: 27px;
  overflow: hidden;
  border-radius: 50%;
}
</style>
