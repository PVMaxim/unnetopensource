<template>
  <main :class="[{qrScan: qrScan}]">
    <div class="container-main" :class="[{falc: isLoading || success || error}]">
      <Loading v-if="isLoading" :messageLoad = messageLoad :titleLoad = titleLoad />
      <Panel  v-else-if="error"  
        :title=errorTitle 
        :subtitle=errorSubtitle
        :iconUrl=errorImg
        :buttonClick=errorHandler
        :buttonName="$t('button.ok')" />
      <Panel  v-else-if="success"  
        :title="$t('pages.send.modals.transactionComplete')" 
        :subtitle="$t('pages.send.modals.pressOkBack')"
        :iconUrl=successImg
        :buttonClick=successHandler
        :buttonName="$t('button.ok')"/>
      <PinCode v-else-if="pinState"
        :title="$t('pin.enterPin')"
        v-model="pinPre"
        :error=null
        :buttonClick=null
        :useStorePinCode=true
        @isStore="storePinHandler($event.value)"
        @cancelButton="pinCancelButton($event.value)"
        @change="updatePin($event.value)" 
        v-model:numberOfDigits=pinLength
        @changePinLength="changePinLength()"
      />
      <QrReader v-else-if="qrScan"
        :title="$t('qr.scanQrCode')"
        @qrDetected="qrHandler($event.value)"
        @onClose="qrClose($event.value)"
        @isActive="qrActive($event.value)"
        @onError="qrError($event.value)"
       />
        <template  v-else>
          <div class="container-box" v-show="!nfcIsActive">
            <SendReceiveSwapPanel 
              :disableSend="true"
            />
            <SendReceiveSwapTabs 
              :firstTab="firstTabName"
              :secondTab="secondTabName"
              v-model:activeTab=activeTab
            />
            <div class="send-box">
            <div v-if="activeTab === firstTabName" class="receive">
              <SendForm
                v-model:formData=formData
                v-model:price=price
                v-model:isLoading=isLoading
                v-model:qrScan=qrScan
                v-model:nativeToken=nativeToken
                :nfcHandler="nfcHandlerWindow"
                @submitForm="submitPinSelectHandler($event.value)"
              />
            </div>
            <div v-if="activeTab === secondTabName" class="history" ref="historyBox">
              <div class="history-title">{{ $t('pages.send.historyColon') }}</div>
                <TokenTransactionList v-if="historyPageLimit"
                  :historyPageLimit=historyPageLimit
                  :minHeight=minHeightComp
                />
              </div>
            </div>
          </div>
        </template>
        <div class="container-box" v-show="nfcIsActive">
          <NFCHandlerWindow 
            ref="nfcHandlerWindow"
            :title="$t('nfcHandler.touchYourCard')"
            :subTitle="$t('nfcHandler.holdYourCard')"
            v-model:isActive=nfcIsActive
            v-model:isLoading=isLoading
            @onCancel="pinPre=null"
          />
        </div>
    </div>
  </main>
</template>

<script>
  import { ref, shallowRef, onMounted, watchEffect, reactive, onUnmounted, onErrorCaptured, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useStore } from 'vuex';
  import { useRouter } from 'vue-router';
  import SendForm from '@/components/SendForm.vue';
  import SendReceiveSwapPanel from '@/components/SendReceiveSwapPanel.vue';
  import SendReceiveSwapTabs from '@/components/SendReceiveSwapTabs.vue';
  import { setDefaultSelectedToken, getToken, setTokensBalances, 
    isValidWalletAddress, checkNfcSupport,
    getNativeCoinSymbol, getStorePrefix, prefixStore } from '../api/ApiHandler';
  import { sha256, roundNumber, isWebViewApp, getErrorMessage, roundNumberIntMin } from '@/api/sub-utils';
  import { setUniSettings }  from '@/api/global-settings';
  import { useEventsBus } from '@/plugins/eventBus.js';
  import { format } from '@/plugins/datetime/index';
  import Loading from '@/components/Loading.vue';
  import Panel from '@/components/Panel.vue';
  import TokenTransactionList from '@/components/TokenTransactionList.vue';
  import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
  import PinCode from '@/components/PinCode.vue';
  import QrReader from '@/components/QrReader.vue';

  export default {
    name: 'Send page',
    layout: 'Dashboard',
    components: {
      Loading,
      SendForm,
      SendReceiveSwapPanel,
      SendReceiveSwapTabs,
      TokenTransactionList,
      NFCHandlerWindow,
      PinCode,
      Panel,
      QrReader
    },
    setup() {
      const { t } = useI18n();
      const amountErr = ref('');
      const nfcIsActive = ref(false);
      const store = useStore();
      const isLoading = ref(true);
      const error = ref(false);
      const formData = reactive({
        amount: '',
        wallet: '',
        tokenList: '',
      });
      const price = reactive({
        priceUsd: 0,
        gazPriceToken: 0,
        gazPriceUsd: 0
      });
      const nativeToken = ref( '' );
      const titleLoad = ref(t('pages.send.status.wait'));
      const messageLoad = ref(t('pages.send.status.gettingData'));
      const errorTitle = ref(t('errors.transferError'));
      const errorSubtitle = ref(t('pages.send.pressOkToTryAgain'));

      const activeTab = ref(null);
      const success = ref(false);
      const router = useRouter();
      const balance = ref(null);
      const historyBox = ref(null);

      const nfcHandlerWindow = ref(NFCHandlerWindow);
      const nfcSupported = checkNfcSupport;
      const pinLength = computed(() => { 
        if ( store.state[`${prefixStore.value}.customtoken`]?.pinLength !== undefined ) {
          return store.state[`${prefixStore.value}.customtoken`]?.pinLength
        }
        return 4
      });
      const pinState = ref(false);
      const pinPre = ref(null);
      const hashPinPre = ref(null);
      const storePin = ref(false);
      const qrScan = ref(false);
      const selectedToken = computed({
        get: () => store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name],
        set: (value) => {  store.dispatch('user/setSelectedToken', {"key":store.state.settings.rpcProvider?.name, "value":value } ) },
      })
      const firstTabName = computed(() => t('pages.send.tabs.sendTokens'));
      const secondTabName = computed(() => t('pages.send.tabs.history'));

      const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;
      const successImg = new URL(`@/assets/images/successcode.svg`, import.meta.url).href;

      const amountError = ref(null);
      const walletError = ref(null);

      const token = computed(() => { return getToken(store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name]?.root);});

      const historyPageLimit = computed(() => { 
        if ( historyBox.value?.clientHeight ) {
          return Number(roundNumberIntMin((historyBox.value?.clientHeight - 69) / 50));
        }
        return null;
      });

      const changePinLength = () => {
        pinPre.value = null;
      }

      const minHeightComp = computed(() => {
        if ( historyBox.value?.clientHeight) {
          return `${Number((historyBox.value?.clientHeight-100).toFixed())}px`;
        }
        return 'initial'
      });

      const qrHandler = (event) => {
        qrScan.value = false;
        formData.wallet = event;
      }

      const qrActive = () => {
      }

      const qrError = () => {
        qrScan.value = false;
      }

      const qrClose = () => {
        qrScan.value = false;
      }

      const pinCancelButton = () => {
        pinState.value = false;
        pinPre.value = null;
      }

      const storePinHandler = async (event) => {
        storePin.value = event;
      }

      const updatePin = async () => {
        if (pinPre.value !== null && pinPre.value?.length === pinLength.value) {
          hashPinPre.value = await sha256(pinPre.value);
          pinState.value = false;
          await submitFormOrderHandler();
        }
      }

      const errorHandler = () => {
        error.value = false;
        titleLoad.value = t('pages.send.status.wait');
        messageLoad.value = t('pages.send.status.gettingData');
        errorTitle.value = t('errors.transferError');
        errorSubtitle.value = t('pages.send.pressOkToTryAgain');
        pinPre.value = null;
        router.push({ name: 'send' });
      }

      const successHandler = () => {
        error.value = false;
        titleLoad.value = t('pages.send.status.wait');
        messageLoad.value = t('pages.send.status.gettingData');
        errorTitle.value = t('errors.transferError');
        errorSubtitle.value = t('pages.send.pressOkToTryAgain');
        pinPre.value = null;
        router.push({ name: 'dashboard' });
      }

      const receiveHandler = () => {
        router.push({ name: 'receive' });
      }

      const submitFormOrderHandler = async () => {
        if (parseFloat(formData.amount) > parseFloat(store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name].balance) ){
          amountError.value = t('errors.balanceError');
          return;
        }
        isLoading.value = true;
        if (typeof store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name] !== 'object' ) {
          error.value = true;
          errorSubtitle.value = t('errors.incorrectToken');
          isLoading.value = false;
        }
        const resultStart = shallowRef(null);
        const transaction = shallowRef(undefined);
        const transactionData = ref(
          {
            "recipient": formData.wallet,
            "amount": formData.amount,
            "keys": store.state.user.publicKeyCard
          }
        );

        messageLoad.value = t('pages.send.status.prepareSign');

        const request = shallowRef(null);
        setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});
        try {
          request.value = await token.value.transfer(transactionData.value);
        } catch(err) {
          throw new Error(t('errors.tokenTransfer'),{ cause: {errorSubtitle: t('errors.transferError'), errorBody: typeof err === 'object' ? JSON.stringify(err) : err} });
        }
        resultStart.value = await nfcHandlerWindow.value?.nfcProgressChunksHandler(request.value, pinPre.value, true);
        messageLoad.value = t('pages.send.status.processing');
        try {
          transaction.value = await request.value.send();
        } catch(err) {
          throw new Error(t('errors.cardResponse'),{ cause: {errorSubtitle: t('errors.transferError'), errorBody:typeof err === 'object' ? JSON.stringify(err) : err} });
        }

        if (pinPre.value !== null && storePin.value === true && store.state.user.pinHash === null) {
          store.dispatch('user/setPinHash', {"pin":pinPre.value, "date":Date.now() + (1000 * 60 * 5)}).then(() => {
          }).catch((err) => {
          });
        }
        pinPre.value = null;
        success.value = true;
        isLoading.value = false;
      };

      const submitPinSelectHandler = async(event) => {
        formData.amount = event.amount;
        formData.wallet = event.wallet;
        formData.tokenList = event.tokenList;
        if ( store.state.user.pinHash !== null && (store.state.user.pinHash?.date - Date.now()) > 0 ) {
          pinPre.value = store.state.user.pinHash?.pin;
          await submitFormOrderHandler();
        } else {
          store.dispatch('user/resetPinHash').then(() => {
          }).catch((err) => {
          });
          pinState.value = true;
        }
      }

      useEventsBus().on('loadingPayload', async (payload) => {
        isLoading.value = payload;
      });

      useEventsBus().on('rpcProviderChange', async (payload) => {
        isLoading.value = true;
        price.gazPriceToken = null;
        price.gazPriceUsd = null;
        price.priceUsd = null;
        setTokensBalances(true).catch(() => {});
        nativeToken.value = await getNativeCoinSymbol();
        formData.wallet = '';
        formData.amount = '';
        isLoading.value = false;
      });

      onMounted(async() => {
        if ( typeof(store.state.user.accountAddress) !== 'string' ) {
          router.push({ name: 'authorization' });
        } else if ( !(await isValidWalletAddress(store.state.user.accountAddress)) ) {
          router.push({ name: 'authorization' });
        }
        nativeToken.value = await getNativeCoinSymbol();
        isLoading.value = false;
      });

      onUnmounted(() => {
      });

      watchEffect(async() => {
        if ( store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name] === null || store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name] === undefined ) {
          await setDefaultSelectedToken();
        }
      });

      onErrorCaptured(async(err) => {
        const {title, message} = await getErrorMessage(err);
        error.value = true;
        errorTitle.value = title ?? t('errors.sendTokenError');
        errorSubtitle.value = message ?? t('pages.send.pressOkToTryAgain');
        const messageConsole = err?.cause?.errorTitle ? `errorTitle: ${err?.cause?.errorTitle}, ` : null 
          + err?.cause?.errorSubtitle ? `errorSubtitle: ${err?.cause?.errorSubtitle}, ` : null
          + err?.cause?.errorBody ? typeof err?.cause?.errorBody === 'object' ? `errorBody: ${JSON.stringify(err?.cause?.errorBody)}, ` : `errorBody: ${err?.cause?.errorBody}, ` : null;
        isLoading.value = false;
        return false;
      });

      return { roundNumber, isLoading, formData, balance, submitFormOrderHandler, token, pinLength, 
        activeTab, historyBox, historyPageLimit, price, nativeToken, amountErr, nfcIsActive, 
        selectedToken , errorImg, error, successImg, success, errorHandler, successHandler, receiveHandler, amountError, walletError,
        nfcSupported, updatePin, pinState, pinPre, submitPinSelectHandler, format, minHeightComp,
        storePin, storePinHandler, pinCancelButton, errorSubtitle, nfcHandlerWindow, qrHandler, qrClose,
        qrActive, qrError, qrScan, titleLoad, messageLoad, errorTitle, changePinLength, firstTabName, secondTabName
      }
    }
  }
</script>

<style scoped lang="scss">
.container-main{
  width: 90%;
  height: 100%;
  flex-direction: column;
  justify-content: center;

  .container-box {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;

    .subtitle{
      font-size: 16px;
      font-weight: 400;
      line-height: 19px;
      letter-spacing: 0em;
      text-align: center;
      margin-bottom: 20px;
    }

    .send-box {
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      margin-bottom: 16px;
    }

    .receive {
      display: flex;
      width: calc(100% - 40px);
      height: calc(100% - 42px);
      min-width: 264px;
      padding: 20px 20px;
      flex-direction: column;
      align-items: center;
      border-radius: 16px;
      border: 1px solid $color-black-40;
      background-color: $color-black-23;
      position: relative;
    }

    .history {
      display: flex;
      width: calc(100% - 40px);
      height: calc(100% - 42px);
      min-width: 264px;
      padding: 20px 20px;
      flex-direction: column;
      align-items: center;
      border-radius: 16px;
      border: 1px solid $color-black-40;
      background-color: $color-black-23;
      position: relative;
    }

    .history-title {
      font-size: 12px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.4);
      width: 100%;
      display: flex;
      flex-flow: row;
      justify-content: flex-start;
    }

    .vtl {
      margin-top: 16px;
    }
  }
}

.amount-error {
  height: 12px;
  color: red;
  margin-top: 8px;
  font-size: 12px;
}

main {
  &.qrScan{
    .container-main {
      width: 100%;
    }
  }
}
.multiselect {
  .option__title {
    margin-left: 5px;
    color: $color-gray;
  }
}
.web-app {
  .container-main{
    .container-box{
      .history {
        margin-bottom: 42px;
      }

    }
  }
}
</style>

<style lang="scss">
  .token-link {
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
</style>