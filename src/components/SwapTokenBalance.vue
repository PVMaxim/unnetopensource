<template>
  <div class="info-block">
    <p class="info">${{ balanceInUsd }}</p>
    <button @click="click" class="balance-button">
      Balance: <span>{{ balance }}</span>
    </button>
  </div>
</template>

<script>
import { getTokenBalance } from "@/api/swap/utils/tokenBalances";
import { getTokenPrice } from "@/api/swap/utils/tokenPrice";
import { onMounted, ref, watch , onUnmounted } from "vue";
import { useStore } from "vuex";
import { SET_SWAP_TOKEN_BALANCE } from "../store/mutation-types";
import { formatAmount } from "../api/swap/utils/formatting";
export default {
  name: "SwapTokenBalance",
  props: {
    token: {
      type: Object,
      required: true,
    },
    amount: {
      type: [String, Number],
      required: false,
    },
    click: {
      type: Function,
      default: () => {},
    },
  },
  setup(props) {
    const store = useStore();

    const balance = ref(0);
    const balanceInUsd = ref(0);
    const getBalance = async () => {
      balance.value = 0;
      const tokenBalance = await getTokenBalance(props.token);
      const formattedBalance = formatAmount(tokenBalance);
      balance.value = formattedBalance;
      if (props.amount) {
        balanceInUsd.value = await getTokenPrice(props.token, props.amount);
      }
    };

    watch(
      () => props.token,
      async () => {
        balance.value = 0;
        balanceInUsd.value = 0;
        await getBalance();
        await getTokenPrice(props.token, 0);
      }
    );

    watch(
      () => props.amount,
      async (newAmount) => {
        if (!newAmount) {
          balanceInUsd.value = 0;
          return;
        }
        balanceInUsd.value = await getTokenPrice(props.token, newAmount);
      }
    );

    onMounted(async () => {
      await getBalance();
    });

    const unsubscribe = store.subscribe((mutation, state) => {
      if (
        mutation.type === `swap/${SET_SWAP_TOKEN_BALANCE}` &&
        state.swap.balances[`${props.token.chain}-${props.token.address}`] &&
        state.swap.balances[`${props.token.chain}-${props.token.address}`]
          .amount !== balance.value
      ) {
        const formattedBalance = formatAmount(
          state.swap.balances[`${props.token.chain}-${props.token.address}`]
            .amount
        );
        balance.value = formattedBalance;
      }
    });

    onUnmounted(() => {
      unsubscribe();
    });

    return {
      balance,
      balanceInUsd,
    };
  },
};
</script>

<style coped lang="scss">
.info-block {
  margin-top: 1.5vh;
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}
.info {
  font-size: 12px;
  color: $color-gray;
}

.balance-button {
  font-size: 12px;
  font-family: 'Inter Tight';
  color: $color-gray;
  background-color: transparent;
  border: none;
  padding: 0;
  width: fit-content;
}
</style>
