<template>
  <div v-if="tokenData?.symbol === undefined && tokenData?.isMandatory === undefined" class="token-item" >
    <Loading :size=30 :borderWidth=5 />
  </div>
  <div v-else class="token-item" @click="(rpcProviderName === RPC_NAMES.XRP && tokenData.additionalData?.tokenLimits == 0) || (rpcProviderName === RPC_NAMES.COTI && tokenData.additionalData?.cotiIsSecureToken === true && tokenData.additionalData?.isOnBoarded === false ) ? null : goToSendHandler()" :class="{attentionline:typeof tokenData.additionalData?.isEnoughRootTokenBalance !== undefined && tokenData.additionalData?.isEnoughRootTokenBalance === false}">
    <div class="token-column first">
      <div class="token-icon">
        <TokenIcon v-if="typeof tokenData === 'object'" :tokenIconSymbol="tokenData?.symbol" :tokenIconUrl="tokenData?.iconUrl" iconClass="icon" />
      </div>
      <div class="token-col">
        <div class="token-symbol-name">
          {{ tokenData.symbol }}
        </div>
        <div class="token-balance-usd-change">
          <span v-if="tokenData.price?.usdPrice" class="text-gray">
            ${{ roundNumber(tokenData.price.usdPrice, 2) }}
          </span>
          <span v-else class="text-gray">-</span>
          <div class="token-change" :class="[{ negative: tokenData.price?.usd24hChange < 0 }]">
            <span v-if="tokenData.price?.usd24hChange">
              {{ tokenData.price.usd24hChange >= 0 ? '+' : '' }}{{ roundNumber(tokenData.price.usd24hChange, 2) }}%
            </span>
            <span v-else class="text-gray">-</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="rpcProviderName === RPC_NAMES.COTI && tokenData.additionalData?.cotiIsSecureToken === true && tokenData.additionalData?.isOnBoarded === false" class="token-column last">
      <div class="button-wrap">
        <button v-if="loaderCotiToken === false" class="button-main inf-approval" @click.prevent="unlockCotiToken" :class="{ loading: unlockCotiTokenButton }" >
          <span v-if="!unlockCotiTokenButton">Unlock token</span>
          <Loading v-else :size=30 :borderWidth=5 />
        </button>
        <div v-if="loaderCotiToken === true" class="token-loading" >
          <Loading :size=30 :borderWidth=5 />
        </div>
      </div>
    </div>
    <div v-else-if="rpcProviderName === RPC_NAMES.XRP && tokenData.additionalData?.tokenLimits == 0" class="token-column last">
      <div class="button-wrap">
        <button v-if="loaderXrpToken === false" class="button-main inf-approval" @click.prevent="allowUseToken" :class="{ loading: unlockXrpTokenButton }" >
          <span v-if="!unlockXrpTokenButton">Unlock token</span>
          <Loading v-else :size=30 :borderWidth=5 />
        </button>
        <div v-if="loaderXrpToken === true" class="token-loading" >
          <Loading :size=30 :borderWidth=5 />
        </div>
      </div>
    </div>
    <div v-else class="token-column last">
      <div class="token-col right mrr">
        <div class="token-balance">
          {{ roundNumber(tokenData.balance, 6) }}
        </div>
        <div class="token-balance-usd">
          <span v-if="tokenData.price?.usdPrice" class="text-gray">
            ${{ roundNumber(getPriceMultiplie(tokenData.balance, tokenData.price.usdPrice), 2) }}
          </span>
          <span v-else class="text-gray">-</span>
        </div>
      </div>
      <div class="token-btn" @click="goToSendHandler">
        <narrow />
      </div>
    </div>
  </div>
  <div v-if="typeof tokenData.additionalData?.isEnoughRootTokenBalance !== undefined && tokenData.additionalData?.isEnoughRootTokenBalance === false" class="token-item attention">
    <div class="token-column text-red marquee-container" ref="errorMessageContainer">
      <div class="marquee-content" :class="{ animate: isOverflowing }">
        <span class="marquee-text">{{ $t('messages.messageXrpMinBalance') }}</span>
        <span v-if="isOverflowing" class="marquee-text">{{ $t('messages.messageXrpMinBalance') }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, shallowRef, computed, watchEffect, nextTick } from 'vue';
import { useStore } from 'vuex';
import { setTokenBalance, getTokenObject, getCotiSecret } from '@/api/ApiHandler';
import { roundNumber, getPriceMultiplie } from '@/api/sub-utils';
import { RPC_NAMES } from '../api/constants-types';
import { useRouter } from 'vue-router';
import Loading from '@/components/Loading.vue';
import narrow from '@/components/svg/narrowRight.vue';
import TokenIcon from "@/components/TokenIcon.vue";

export default defineComponent({
  name: 'DashboardListItem',
  emits: ['update:rpcProviderChange', 'approveTokenLimit', 'unlockCotiToken'],
  props: {
    tokenId: {
      type: String,
      required: true,
    },
    rpcProviderName: {
      type: String,
      required: true,
    },
    rpcProviderChange: {
      type: Boolean,
      default: false,
      required: false,
    },
    nfcHandler: {
      type: [Object, null],
      required: false,
    },
    loaderCotiToken: {
      type: Boolean,
      default: false,
      required: false,
    },
    loaderXrpToken: {
      type: Boolean,
      default: false,
      required: false,
    },
  },
  components: {
    Loading,
    TokenIcon,
    narrow,
  },
  async setup(props, { emit }) {
    const store = useStore();
    const router = useRouter();
    const tokenData = computed(() => {
      let tokenBalance = store.state.user.tokenBalance[props.rpcProviderName] || [];
      let index = tokenBalance.findIndex((item) => item.root === props.tokenId);
      return index > -1 ? tokenBalance[index] : {};
    });
    const unlockCotiTokenButton = ref(false);
    const unlockXrpTokenButton = ref(false);
    const loaderCotiToken = computed(() => {
      return props.loaderCotiToken;
    });
    const loaderXrpToken = computed(() => {
      return props.loaderXrpToken;
    });

    const errorMessageContainer = ref(null);
    const isOverflowing = ref(false);

    const checkOverflow = () => {
      if (errorMessageContainer.value) {
        const container = errorMessageContainer.value;
        const content = container.querySelector('.marquee-content');
        if (content) {
          isOverflowing.value = content.offsetWidth > container.offsetWidth;
        }
      }
    };

    const goToSendHandler = () => {
      if(Object.keys(tokenData.value).length > 0){
        store.dispatch('user/setSelectedToken', {
          key: props.rpcProviderName,
          value: tokenData.value,
        })
        .then(() => {
          router.push({ name: 'send' });
        })
        .catch((error) => {
        });
      }
    };

    if (Object.keys(tokenData.value).length > 0) {
      setTokenBalance(props.tokenId, props.rpcProviderName );
    }

    const allowUseToken = async() => {
      const token = shallowRef(await getTokenObject(props.tokenId, props.rpcProviderName));
      const trustLimitObject = shallowRef(null);
      const trustLimitRequest = shallowRef(null);
      unlockXrpTokenButton.value = true;
      await new Promise(resolve => setTimeout(resolve, 400));
      try {
        trustLimitRequest.value = await token.value.setTrustLimit({
          limit: 9999999999999999e80,
          keys: store.state.user.publicKeyCard,
        })
      } catch(err) {
        unlockXrpTokenButton.value = false;
        if (err.message === 'Account not found.') {
          throw new Error('Token limit allow.', { cause: {errorSubtitle: 'XRP token balances mast been more than 1 XRP', errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err}});
        }
      }
      trustLimitObject.value = {
        'rpc': props.rpcProviderName,
        'token_id': props.tokenId,
        'request':  trustLimitRequest.value
      }
      emit( 'approveTokenLimit', trustLimitObject.value);
      unlockXrpTokenButton.value = false;
    }

    const unlockCotiToken = async() => {
      unlockCotiTokenButton.value = true;
      const unlockCotiObject = shallowRef(null);
      const unlockCotiRequest = shallowRef(null);
      try {
        unlockCotiRequest.value = await getCotiSecret();
      } catch (err) {
        unlockCotiTokenButton.value = false;
        throw err;
      }
      unlockCotiObject.value = {
        'rpc': props.rpcProviderName,
        'token_id': props.tokenId,
        'request':  unlockCotiRequest.value
      }
      emit('unlockCotiToken', unlockCotiObject.value);
      unlockCotiTokenButton.value = false;
    }

    watchEffect(async() => {
      if ( props.rpcProviderChange === true ) {
        setTokenBalance(props.tokenId, props.rpcProviderName);
        emit('update:rpcProviderChange', false );
      }
    });

    watchEffect(() => {
      if (tokenData.value.additionalData?.isEnoughRootTokenBalance === false) {
        nextTick(() => {
          checkOverflow();
        });
      }
    });

    return {
      roundNumber,
      goToSendHandler,
      getPriceMultiplie,
      allowUseToken,
      unlockCotiToken,
      RPC_NAMES,
      tokenData,
      unlockCotiTokenButton,
      unlockXrpTokenButton,
      loaderCotiToken,
      loaderXrpToken,
      errorMessageContainer,
      isOverflowing
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

    &.first {
      flex-grow: 1;
      flex-basis: 0;
      min-width: auto;
    }
    &.last {
      flex-grow: 0;
      overflow: hidden;
    }
  }

  .token-col {
    height: 100%;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    flex-basis: 0;
    min-width: 0;
    overflow: hidden;

    &.right {
      align-items: flex-end;
    }

    &.mrr {
      margin-right: 14px;
    }

    .token-symbol-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding-right: 7px;
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

  .button-wrap {
    width: 105px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .inf-approval {
    width: 105px;
    height: initial;
    padding: 8px 12px;
    text-wrap: nowrap;
    display: flex;
    align-items: center;
    justify-content: center;

    @include transition(
      width .3s ease-in-out 0s, 
      border-radius .4s ease-in-out 0s,
      background-color .4s ease-in-out 0s
    );

    &.loading {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      padding: 0;
      min-width: 42px;
      background-color: rgba($color-orange,0);
    }
  }
  .token-loading {
    min-width: 55px;
  }
}
.token-item.attention {
}
.token-item.attentionline {
  border-color: $color-red;
}
</style>
