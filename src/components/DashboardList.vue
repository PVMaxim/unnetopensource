<template>
  <KeepAlive :include="'token' + item.root" v-if="typeof tokenBalanceList === 'object' && tokenBalanceList.length > 0"
    v-for="item in tokenBalanceList">
    <DashboardListItem 
      :token-id="item.root"
      :rpc-provider-name="storeProvider?.name"
      v-model:rpc-provider-change=rpcProviderChange
      :nfcHandler="nfcHandlerWindow"
      @approveTokenLimit="getPinCode($event)"
      @unlockCotiToken="getPinCodeCoti($event)"
      :loaderCotiToken="loaderCotiToken"
      :loaderXrpToken="loaderXrpToken"
    />
  </KeepAlive>
  <div v-if="!tokenBalanceList.length"  class="loader-box">
    <Loading :messageLoad = messageLoad :titleLoad = titleLoad />
  </div>
  <template v-if="storeProvider?.name === RPC_NAMES.XRP || storeProvider?.name === RPC_NAMES.COTI">
    <Teleport defer to="#dashboard">
      <PinCode v-if="pinState"
        title="Enter PIN"
        v-model="pinPre"
        :error=null
        :buttonClick=null
        :useStorePinCode=true
        @cancelButton="pinCancelButton($event.value)"
        @isStore="storePinHandler($event.value)"
        @change="updatePin($event.value)" 
        v-model:numberOfDigits=pinLength
        @changePinLength="changePinLength()"
      />

    <NFCHandlerWindow 
      ref="nfcHandlerWindow"
      title="Touch your card"
      subTitle="Hold your card flat against the back of your device until this window is open."
      v-model:isActive=nfcIsActive
      v-model:isLoading=isLoading
      @onCancel="pinPre=null"
    />
  </Teleport>
  </template>
</template>

<script>
import { defineComponent, ref, shallowRef, computed } from 'vue';
import { useStore } from 'vuex';
import { setTokenBalance, getTokensList, prefixStore } from '@/api/ApiHandler';
import { useEventsBus } from '@/plugins/eventBus.js';
import { RPC_NAMES } from '../api/constants-types';
import DashboardListItem from '@/components/DashboardListItem.vue';
import Loading from '@/components/Loading.vue';
import PinCode from '@/components/PinCode.vue';
import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
import { setUniSettings }  from '@/api/global-settings';

export default defineComponent({
  name: 'DashboardList',
  components: {
    DashboardListItem,
    Loading,
    PinCode,
    NFCHandlerWindow,
  },
  props: {
    minHeight: {
      type: [String, null],
      default: null,
      required: false
    },
  },
  async setup() {
    const store = useStore();
    const titleLoad = ref('Please wait.');
    const messageLoad = ref('Loading tokens data.');
    const rpcProviderChange = ref(false);
    const nfcIsActive = ref(false);
    const isLoading = ref(true);
    const pinLength = computed(() => { 
      if ( typeof store.state[`${prefixStore.value}.customtoken`]?.pinLength !== undefined ) {
        return store.state[`${prefixStore.value}.customtoken`]?.pinLength
      }
      return 4
    });
    const pinPre = ref(null);
    const pinState = ref(false);
    const trustLimitObject = shallowRef(null);
    const unlockCotiTokenObject = shallowRef(null);
    const nfcHandlerWindow = ref(NFCHandlerWindow);
    const storePin = ref(false);
    const loaderCotiToken = ref(false);
    const loaderXrpToken = ref(false);
    const storeProvider = computed(() => {
      if (typeof store.state.settings.rpcProvider  === 'object') {
        return store.state.settings.rpcProvider 
      }
    });
    const tokenBalanceList = computed(() => {
      if (typeof store.state.user.tokenBalance[storeProvider.value?.name] === 'object') {
        return store.state.user.tokenBalance[storeProvider.value?.name];
      }
      return [];
    });

    const fetchTokenList = async (isForced = false) => {
      try {
        const inputDataNew = getTokensList(isForced);
        const responseParsed = inputDataNew.map((item) => ({
          root: item?.id,
        }));
        await store.dispatch('user/setTokenBalance', {
          provider: storeProvider.value?.name,
          value: responseParsed,
        });
      } catch (error) {
      }
    };

    if ( typeof store.state.user.tokenBalance[storeProvider.value?.name] === 'object' && store.state.user.tokenBalance[storeProvider.value?.name]?.length === 0 ) {
      fetchTokenList();
    }

    const changePinLength = () => {
      pinPre.value = null;
    }

    const storePinHandler = async (event) => {
        storePin.value = event;
      }

    const getPinCode = (event) => {
      trustLimitObject.value = event;
      pinState.value = true;
    }

    const getPinCodeCoti = (event) => {
      unlockCotiTokenObject.value = event;
      pinState.value = true;
    }

    const pinCancelButton = () => {
      pinState.value = false;
      pinPre.value = null;
    }

    const updatePin = async () => {
      if (pinPre.value !== null && pinPre.value?.length === pinLength.value) {
        await new Promise(resolve => setTimeout(resolve, 100))
        pinState.value = false;
        if (trustLimitObject.value?.rpc === RPC_NAMES.XRP) {
          await submitXRPTokenLimit();
        } else if (unlockCotiTokenObject.value?.rpc === RPC_NAMES.COTI) {
          await submitUnlockCotiToken();
        }
      }
    }

    const submitXRPTokenLimit = async () => {
      isLoading.value = true;
      loaderXrpToken.value = true;
      if (typeof trustLimitObject.value?.request !== 'object') {
      }
      if (typeof store.state.user.selectedToken?.[trustLimitObject.value?.rpc] !== 'object' ) {
        error.value = true;
        errorSubtitle.value = 'Incorrect token';
        isLoading.value = false;
        loaderXrpToken.value = false;
      }
      const resultStart = shallowRef(null);
      const transaction = shallowRef(undefined);
      messageLoad.value = 'Prepare sign transaction';
      const request = shallowRef(null);
      setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});

      resultStart.value = await nfcHandlerWindow.value?.nfcProgressChunksHandler(trustLimitObject.value.request, pinPre.value, true);
      try {
        transaction.value = await trustLimitObject.value.request.send();
      } catch(err) {
        trustLimitObject.value = null;
        loaderXrpToken.value = false;
        throw new Error('Card response',{ cause: {errorSubtitle: 'Transaction error.', errorBody:typeof err === 'object' ? JSON.stringify(err) : err} });
      }

      setTokenBalance(trustLimitObject.value.token_id, trustLimitObject.value.rpc );

      if (pinPre.value !== null && storePin.value === true && store.state.user.pinHash === null) {
        store.dispatch('user/setPinHash', {"pin":pinPre.value, "date":Date.now() + (1000 * 60 * 5)}).then(() => {
        }).catch((err) => {
        });
      }
      trustLimitObject.value = null;
      pinPre.value = null;
      loaderXrpToken.value = false;
      isLoading.value = false;
    };

    const submitUnlockCotiToken = async () => {
      isLoading.value = true;
      loaderCotiToken.value = true;
      if (typeof unlockCotiTokenObject.value?.request !== 'object') {
      }
      const resultStart = shallowRef(null);
      const transaction = shallowRef(undefined);
      messageLoad.value = 'Prepare sign transaction';
      const request = shallowRef(null);
      setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});

      resultStart.value = await nfcHandlerWindow.value?.nfcProgressChunksHandler(unlockCotiTokenObject.value.request, pinPre.value, true);
      try {
        transaction.value = await unlockCotiTokenObject.value.request.send();
      } catch(err) {
        unlockCotiTokenObject.value = null;
        loaderCotiToken.value = false;
        throw new Error('Card response',{ cause: {errorSubtitle: 'Transaction error.', errorBody:typeof err === 'object' ? JSON.stringify(err) : err} });
      }

      setTokenBalance(unlockCotiTokenObject.value.token_id, unlockCotiTokenObject.value.rpc );

      if (pinPre.value !== null && storePin.value === true && store.state.user.pinHash === null) {
        store.dispatch('user/setPinHash', {"pin":pinPre.value, "date":Date.now() + (1000 * 60 * 5)}).then(() => {
        }).catch((err) => {
        });
      }
      unlockCotiTokenObject.value = null;
      pinPre.value = null;
      loaderCotiToken.value = false;
      isLoading.value = false;
    };

    useEventsBus().on('rpcProviderChange', async () => {
      if ( typeof store.state.user.tokenBalance[storeProvider.value?.name] === 'object' && store.state.user.tokenBalance[storeProvider.value?.name]?.length === 0 ) {
        fetchTokenList(true);
      }
      rpcProviderChange.value = true;
    });

    return { storeProvider, tokenBalanceList, titleLoad, messageLoad, rpcProviderChange, RPC_NAMES, nfcHandlerWindow, getPinCodeCoti, 
      nfcIsActive, isLoading, pinLength, pinPre, pinState, updatePin, pinCancelButton, getPinCode, storePinHandler, changePinLength, loaderCotiToken, loaderXrpToken
     };
  },
});
</script>

<style scoped lang="scss">
.text-gray {
    color: rgba(255, 255, 255, 0.4);
    text-align: center;
    margin-top: 24px;
}
.loader-box {
  display: flex;
  width: 100%;
  height: calc(100% - 20px);
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: v-bind(minHeight);
}
.keyboard-wrap{
  position: absolute;
  width: 90%;
  height: calc(100% - var(--header-height) - 12px);
  background-color: $color-black-17;
  z-index: 99;
}
body.web-app .keyboard-wrap {
  height: calc(100% - var(--header-height) - 70px);
}
</style>
