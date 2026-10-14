<template>
  <span class="token-amount-element">
    <span class="evm-token-icon">
      <Avatar :border="false" :size="16" :imageSrc="token.iconUrl" :name="token.symbol" />
      {{ '&nbsp;' }}
    </span>

    <span class="token-amount">
      {{ amountStr }}
      {{ '&nbsp;' }}
    </span>

    <span class="token-symbol">
      {{ token.symbol.toUpperCase() }}
    </span>
  </span>
</template>

<script>
import { defineComponent, ref, watch } from "vue";
import Avatar from "vue3-avatar";
import { formatAmount } from "@/api/wallet-connect/evm/formatAmount";

export default defineComponent({
  name: "EvmTokenAmountElement",
  components: {
    Avatar,
  },
  props: {
    token: Object,
    amount: Object,
    supportUnlimited: Boolean,
  },
  setup(props) {
    const amountStr = ref('');

    watch(() => props.amount, (amount) => {
      if (!amount) {
        amountStr.value = '-';
        return;
      }

      const fullDecimal = amount.asDecimal() || '0';
      if (props.supportUnlimited) {
        const TOKEN_VALUE_UNLIMITED_THRESHOLD = 10 ** 15;

        if (parseInt(fullDecimal, 10) >= TOKEN_VALUE_UNLIMITED_THRESHOLD) {
          amountStr.value = 'UNLIMITED';
          return;
        }
      }

      amountStr.value = formatAmount('en-US', fullDecimal);
    }, { immediate: true, deep: true }
    );

    return { amountStr };
  }
});
</script>

<style lang="scss" scoped>
.token-amount-element {
  overflow-wrap: anywhere;
}

.evm-token-icon {
  div {
    display: inline-block;
    vertical-align: text-top;
    padding: 0px;
    img {
      width: 16px;
      height: 16px;
      border-radius: 50%;
    }
  }

  

  margin: 0px;
  white-space: nowrap;
}

.token-amount {
  font-size: 14px;
  font-weight: 400;
  color: $color-white;
}

.token-symbol {
  font-size: 14px;
  font-weight: 400;
  color: $color-white;
}
</style>