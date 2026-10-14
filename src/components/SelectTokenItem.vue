<template>
  <div
    v-intersect="(entries) => onIntersect(entries, token)"
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

    <div v-else class="loader"></div>
  </div>
</template>

<script>
import { getTokenBalance } from "@/api/swap/utils/tokenBalances";
import { ref , onMounted } from "vue";
import { formatAmount } from "../api/swap/utils/formatting";
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
    const balance = ref(null);

    const onIntersect = async (entry, token) => {
      if (
        entry.isIntersecting &&
        !token.isUsersToken &&
        balance.value === null
      ) {
        const tokenBalance = await getTokenBalance(token);
        const formattedBalance = formatAmount(tokenBalance);
        balance.value = formattedBalance;
      }
    };

    onMounted(() => {
      if (props.token && props.token.isUsersToken) {
        getTokenBalance(props.token).then((bal) => {
          balance.value = formatAmount(bal);
        });
      }
    });
    return {
      balance,
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
