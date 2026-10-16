<template>
  <div class="token-item">
    <div class="token-column first">
      <div class="token-icon">
        <TokenIcon  v-if="typeof tokenObject === 'object'" :tokenIconSymbol="tokenObject?.symbol" :tokenIconUrl="tokenObject?.iconUrl" iconClass="icon" />
      </div>
      <div class="token-col">
        <div class="token-symbol-name">
          {{ tokenObject.symbol }}
        </div>
        <div class="token-balance-usd-change">
          <span v-if="tokenObject.price?.usdPrice" class="text-gray">
            ${{ roundNumber( tokenObject.price?.usdPrice, 2) }}
          </span>
          <span v-else class="text-gray">-</span>
          <div class="token-change" :class="[{ negative: tokenObject.price?.usd24hChange < 0 }]">
            <span v-if="tokenObject.price?.usd24hChange">{{tokenObject.price?.usd24hChange >= 0 ? '+' : ''}}{{ roundNumber(tokenObject.price?.usd24hChange, 2) }}%</span>
            <span v-else class="text-gray">-</span>
          </div>
        </div>
      </div>
    </div>
    <div class="token-column last">
      <div class="token-col right mrr">
        <div class="token-balance">
          {{ roundNumber(tokenObject.balance, 6) }}
        </div>
        <div class="token-balance-usd">
          <span v-if="tokenObject.price?.usdPrice" class="text-gray">
            ${{ roundNumber(getPriceMultiplie(tokenObject.balance, tokenObject.price?.usdPrice), 2) }}
          </span>
          <span v-else class="text-gray">-</span>
        </div>
      </div>
      <button v-if="!checkIfTokenExist(tokenObject.root) && windowSize > 375" class="button-main" @click=addTokenConfirm>{{ $t('button.add') }}</button>
      <button v-else-if="!checkIfTokenExist(tokenObject.root) && windowSize <= 375" class="button-main small-button" @click=addTokenConfirm>+</button>
      <div v-else class="token-btn" :class="[{ smalltb: windowSize <= 375 }]" @click=goToSendHandler>
        <narrow />
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted, shallowRef, reactive } from 'vue'
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { initialManager, getWallet, getStorePrefix } from '@/api/ApiHandler';
import { roundNumber, getPriceMultiplie } from '@/api/sub-utils';
import { useEventsBus } from '@/plugins/eventBus.js';
import TokenIcon from "@/components/TokenIcon.vue";
import narrow from '@/components/svg/narrowRight.vue';

export default defineComponent({
  name: 'SearchTokenListItem',
  emits: ['tokenAdded'],
    props: {
      tokenObject: {
        default: null,
        required: true,
      },
      windowSize: {
        type: [Number,null],
        required: false,
      },
    },
    components: {
      TokenIcon,
      narrow
    },

    setup(props, { emit }) {
      const store = useStore();
      const router = useRouter();
      const error = ref(undefined);
      const token = shallowRef(props.tokenObject);
      const mgr = shallowRef(initialManager());
      const walletAddress = ref(null);
      const tokenObject = reactive({
          root: null,
          symbol: null,
          balance: null,
          price: null,
          name: null,
          isMandatory: null,
          iconUrl: null
        });
      const isShowConfirm = ref(false);

      const clearVariables = async() => {
        token.value = null;
        tokenObject.root = null;
        tokenObject.symbol = null;
        tokenObject.balance = null;
        tokenObject.price = null;
        tokenObject.name = null;
        tokenObject.isMandatory = null;
        tokenObject.iconUrl = null;
        walletAddress.value = null;
      }

      const getDataToken = async () => {
        const skip = ref(false);
        if ( token.value === null || tokenObject.root === null || tokenObject.symbol === null || walletAddress.value === null) {
          tokenObject.root = token.value?.root;
          tokenObject.symbol = token.value?.symbol;
          walletAddress.value = await getWallet(store.state.user.publicKeyCard);

          try {
            tokenObject.iconUrl = await token.value?.tip3?.getIconUrl();
          } catch(err) {
          }
        }
        try {
          tokenObject.balance = await token.value?.tip3?.getBalance(walletAddress.value);
        } catch(err) {
          skip.value = true;
        }
        if (!skip.value) {
        tokenObject.price = await token.value?.tip3?.getPrice();
        tokenObject.isMandatory = token.value?.tip3?.isMandatory;
        tokenObject.name = await token.value?.tip3?.getName();
      }
      skip.value = false;
      }

      const goToSendHandler = async (e) => {
        store.dispatch('user/setSelectedToken', {"key":store.state.settings.rpcProvider?.name, "value":tokenObject} ).then(() => {
        }).catch((error) => {
          error.value = error;
        });
        router.push({ name: 'send' });
      }

      const checkIfTokenExist = (token) => {
        const index = store.state.user.tokenBalance[store.state.settings.rpcProvider?.name].findIndex(item => item.root === token);
        return index < 0 ? false : true;
      }

      const addCustomToken = (tokenAddress) => {
        if (!tokenAddress) return [];
        const prefixStore = getStorePrefix();
        if (!prefixStore) return [];
        const rpcName = store.state.settings.rpcProvider?.name;
        const currentCustomTokens = store.state[`${prefixStore}.customtoken`]?.customToken?.[rpcName];
        const tokenList = Array.isArray(currentCustomTokens) ? [...currentCustomTokens] : [];
        if (!tokenList.includes(tokenAddress)) {
          tokenList.push(tokenAddress);
        }
        return tokenList;
      }

      const addToken = () => {
        isShowConfirm.value = false;
        if (!token.value && !tokenObject?.root) {
          return;
        }

        const tokenRoot = token.value?.root || tokenObject?.root;
        const tokenTip3 = token.value?.tip3;

        try {
          if (tokenTip3 && mgr.value?.addToken) {
            mgr.value.addToken(tokenTip3);
          } else if (tokenRoot && mgr.value?.addTokenByMetadata) {
            mgr.value.addTokenByMetadata({ address: tokenRoot });
          }
        } catch(err) {
          token.value = null;
          throw new Error('Can not add token', { cause: { errorSubtitle: 'Can not add token.', errorBody: typeof err === 'object' ? JSON.stringify(err) : err } });
        }

        const dsd = addCustomToken(tokenRoot);
        const prefixStore = getStorePrefix();
        if (prefixStore && store.state.settings.rpcProvider?.name) {
          store.dispatch(`${prefixStore}.customtoken/setCustomToken`, { "key": store.state.settings.rpcProvider?.name, "value": dsd }).catch((error) => {
          });
        }

        store.dispatch('user/setTokenBalanceItem', { "provider": store.state.settings.rpcProvider?.name, "key": tokenRoot, "value": tokenObject, "action": "newToken" }).catch((err) => {
        });

        token.value = null;
      }

      const alertCancel = () => {
        isShowConfirm.value = false;
      }

      const addTokenConfirm = () => {
        useEventsBus().emit('confirmAddToken', JSON.stringify(tokenObject));
      }

      useEventsBus().on('confirmedAddToken',  (payload) => {
        payload = JSON.parse(payload);
        if (payload?.root === tokenObject?.root) {
         addToken();
        }
      });

      onMounted( async () => {
        await getDataToken();
      });

      useEventsBus().on('rpcProviderChange', async (payload) => {
        clearVariables();
        await getDataToken();
      });

      return { roundNumber , addToken, getPriceMultiplie, token, tokenObject, checkIfTokenExist, addTokenConfirm, alertCancel, isShowConfirm, goToSendHandler }
    }
})
</script>

<style scoped lang="scss">
.token-item {
  display: flex;
  flex-direction: row;
  width: 100% ;
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
      min-width: 0;
    }

    &.last {
      flex-grow: 0;
    }

    .token-symbol-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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
    width: 60.91px;
    height: 24px;
    align-items: center;
    justify-content: center;

    &.smalltb {
      width: 36px;
    }

    svg {
      width: 14px;
      height: 14px;
    }
  }

  button {
    height: 32px;
  }

  &:not(:last-child) {
    border-bottom: 1px solid $color-black-32;
  }
}

.small-button {
  width: 32px;
  height: 32px;
}
</style>