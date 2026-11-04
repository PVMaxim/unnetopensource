<template>
  <div
    v-intersect.once="(entry) => onIntersect(entry, token)"
    class="option"
    :class="{ 'disable-option': disabled }"
  >
    <SwapTokenIcon
      :token="token"
      iconClass="swap-select-token-option-icon"
      :lazy="true"
    />

    <span>{{ token.symbol }}</span>
    <span v-if="balance !== null" class="option-subtitle">{{ balance }}</span>
    <div v-else-if="isLoadingBalance" class="loader"></div>
  </div>
</template>

<script>
import { getTokenBalance } from "@/api/swap/utils/tokenBalances";
import { ref, onMounted } from "vue";
import { useStore } from "vuex";
import { formatAmount } from "../api/swap/utils/formatting";
import { useDebounceFn } from "@/plugins/utils/useDebounceFn";
import { rpcList } from "@/api/constants-types";
import SwapTokenIcon from "./SwapTokenIcon.vue";

export default {
  name: "SelectTokenItem",
  components: {
    SwapTokenIcon,
  },
  props: {
    token: Object,
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const store = useStore();
    const balance = ref(null);
    const isLoadingBalance = ref(false);

    const checkExistingBalance = () => {
      if (!props.token?.chain || !props.token?.address) return false;
      const cacheKey = `${props.token.chain}-${props.token.address}`;
      const cached = store.state.swap?.balances?.[cacheKey];
      if (cached && typeof cached.amount !== "undefined") {
        balance.value = formatAmount(cached.amount);
        return true;
      }
      const provider = rpcList.find((rpc) => rpc.swapChain === props.token.chain);
      if (provider) {
        const userTokens = store.state.user?.tokenBalance?.[provider.name];
        if (Array.isArray(userTokens)) {
          const found = userTokens.find((item) =>
            item?.symbol?.toLowerCase() === props.token.symbol?.toLowerCase() ||
            item?.root?.toLowerCase() === props.token.address?.toLowerCase()
          );
          if (found && typeof found.balance !== "undefined") {
            balance.value = formatAmount(found.balance);
            return true;
          }
        }
      }
      return false;
    };

    const debouncedFetchBalance = useDebounceFn(async (token) => {
      if (balance.value !== null || isLoadingBalance.value) return;
      isLoadingBalance.value = true;
      try {
        const tokenBalance = await getTokenBalance(token);
        balance.value = formatAmount(tokenBalance);
      } catch {
      } finally {
        isLoadingBalance.value = false;
      }
    }, 250);

    const onIntersect = (entry, token) => {
      if (entry.isIntersecting && balance.value === null) {
        debouncedFetchBalance(token);
      }
    };

    onMounted(() => {
      const hasBalance = checkExistingBalance();
      if (!hasBalance && props.token?.isUsersToken) {
        debouncedFetchBalance(props.token);
      }
    });

    return {
      balance,
      isLoadingBalance,
      onIntersect,
    };
  },
};
</script>

<style scoped lang="scss">
.option {
  padding: 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  border-bottom: 1px solid rgba(205, 205, 205, 0.04);
  min-height: 68px;
  box-sizing: border-box;
}

.option-subtitle {
  margin-left: auto;
  margin-right: 5px;
  font-size: 15px;
  color: rgba(255, 255, 255, 1);
}

.loader {
  margin-left: auto;
  margin-right: 5px;
  position: relative;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  border: 3px solid;
  border-color: $color-orange #0000;
  box-sizing: border-box;
  animation: s1 0.5s infinite;
}

.disable-option {
  opacity: 0.5;
  pointer-events: none;
}

@keyframes s1 {
  to {
    transform: rotate(0.5turn);
  }
}
</style>

<style lang="scss">
.swap-select-token-option-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}
</style>
