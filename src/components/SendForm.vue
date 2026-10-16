<template>
  <form class="form-send" @submit.prevent="submitForm">
    <div class="input-box">
      <div class="input-container">
        <div class="label-box">
          <label data-v-612b88b5="" for="amount">{{ $t('pages.send.form.selectToken') }}</label>
          <div v-if="selectedToken?.isMandatory === false" class="deleteSelectedToken" @click.prevent=deleteSelectedToken>{{ $t('pages.send.form.deleteCustomToken') }}</div>
        </div>
        <multiselect v-model="selectedToken" track-by="symbol" :label="$t('pages.send.form.selectToken')"
          :placeholder="$t('pages.send.form.selectToken')" 
          :options="tokenBalance" 
          :searchable="false" 
          :allow-empty="false"
          :show-labels="false"
          :taggable="true"
          openDirection="bottom"
          @select="multiselectChange()"
          :loading="tokenBalance.length === 0 ? true : false"
        >
        <template #singleLabel="{option}">
          <KeepAlive :include="'singleLabel' + option?.symbol">
            <TokenIcon :tokenIconSymbol="option?.symbol" :tokenIconUrl="option?.iconUrl" iconClass="icon" />
          </KeepAlive>
          <span class="option__desc">
            <span class="option__balance">{{ roundNumber(option.balance, 6) }}</span>
            <span class="option__title">{{ option.symbol }}</span>
          </span>
        </template>
        <template #option="props">
          <KeepAlive :include="'option' + props.option?.symbol">
            <TokenIcon :tokenIconSymbol="props.option?.symbol" :tokenIconUrl="props.option?.iconUrl" iconClass="icon" />
        </KeepAlive>
          <div class="option__desc">
            <span class="option__balance">{{ roundNumber(props.option.balance, 6) }}</span>
            <span class="option__title">{{ props.option.symbol }}</span>
          </div>
        </template>
      </multiselect>
    </div>
    <div class="card-address-group">
      <InputText 
        inputId="wallet"
        inputClass="wallet"
        v-model="formData.wallet"
        :placeholder="$t('pages.send.form.inputWalletPlaceholder')"
        :label = "$t('pages.send.form.walletAddressLabel')"
        @input="walletChanged"
        v-model:errorMessage=walletError
        :showError=true
      />
      <ButtonIcon 
        iconComponent = "pasteIcon"
        class="button-clipboard fill"
        buttonType="button"
        @onClick="pasteFromClip()"
        @click="pasteFromClip()"
        :disabled="clipboardPermission === 'denied' && !isWebViewApp() ? true : false"
      >
      <template #permission="{showPermissionNotify}">
        <div v-if="clipboardPermission === 'denied' && !isWebViewApp()" class="permissionAttention" @click.stop="showPermissionNotify()">!</div>
      </template>
      </ButtonIcon>
      <ButtonIcon 
        iconComponent = "cardIcon"
        class="button-clipboard fill"
        buttonType="button"
        @onClick="pasteFromCard()"
        :disabled="(nfcPermissionStatus === 'denied' || nfcPermissionStatus === undefined) && !isWebViewApp() && !isSafariBrowser ? true : false"
      >
      <template #permission>
        <div v-if="(nfcPermissionStatus === 'denied' || nfcPermissionStatus === undefined) && !isWebViewApp() && !isSafariBrowser" class="permissionAttention">!</div>
      </template>
      </ButtonIcon>
      <ButtonIcon 
        iconComponent = "cameraIcon"
        class="button-clipboard stroke" 
        buttonType="button"
        @onClick="toggleCamera()"
        :disabled="cameraPermission === 'denied' && !isWebViewApp() ? true : false"
      >
      <template #permission>
        <div v-if="cameraPermission === 'denied' && !isWebViewApp()" class="permissionAttention" @onClick="showPermissionNotify()">!</div>
      </template>
      </ButtonIcon>
    </div>
      <InputDigits 
        inputId="amount"
        inputClass="amount"
        v-model="formData.amount"
        placeholder="0.00"
        :label = "$t('pages.send.form.amountLabel')"
        @input="amountChanged"
        v-model:errorMessage=amountError
        :showError=true
      />
      <div class="gas-box">
        <div class="gas-row">
          <div class="gas-label">{{ $t('pages.send.form.amountUsdLabel') }}</div>
          <div v-if="price.priceUsd" class="gas-value">≈ ${{ roundNumber(price.priceUsd, 2) }}</div>
          <div v-else class="gas-value text-gray">-</div>
        </div>
        <div class="gas-row">
          <div class="gas-label">{{ $t('pages.send.form.gasPriceLabel') }}</div>
          <div class="gas-value">
            ≈ {{ roundNumber(price.gazPriceToken, 6) }} 
            {{ props.nativeToken }} 
            <span class="gas-value-gray">(≈ ${{ roundNumber(price.gazPriceUsd, 2) }})</span>
          </div>
        </div>
      </div>
    </div>
    <div class="buttons-group">
      <button class="button-main" type="submit" :disabled="props.isLoading || disableConfirmButton || submitButtonLoading ? true : false" :class="{ loading: submitButtonLoading }" >
        <span v-if="!props.isLoading && !submitButtonLoading">{{ $t('button.confirm') }}</span>
        <Loading v-else :size="30" :borderWidth="5" />
      </button>
    </div>
  </form>
  <AlertConfirmModal 
    v-model="isShowConfirm"
    :title="$t('pages.send.modals.confirmDeleteTitle')"
    :token=selectedToken
    :buttonConfirmText="$t('button.confirm')"
    :buttonCancelText="$t('button.cancel')"
    @onConfirm="alertConfirm($event.value)"
    @onCancel="alertCancel($event.value)"
   />
  <AlertConfirmModal 
    v-model="isShowPermissionNotify"
    :title="$t('pages.send.modals.notificationTitle')"
    :subTitle="$t('pages.send.modals.notificationSubtitle')"
    :buttonConfirmText="$t('button.submit')"
    @onConfirm="closePermissionNotify($event.value)"
  />
</template>

<script>
import { defineComponent, ref, shallowRef,reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { roundNumber, isWebViewApp, getErrorMessage } from '@/api/sub-utils';
import { CmdGetInfo}  from '@/api/card-io';
import { setUniSettings }  from '@/api/global-settings';
import { useDebounceFn } from '@/plugins/utils/useDebounceFn';
import { usePermission } from '@/plugins/utils/usePermission';
import { setDefaultSelectedToken, getToken, setTokensBalances, 
    isValidWalletAddress, getWallet,
    getNativeCoinSymbol, getStorePrefix, getTokenSymbolById, getNativeCoinId } from '@/api/ApiHandler';
import { useEventsBus } from '@/plugins/eventBus.js';
import Multiselect from '@/components/multiselect';
import InputText from '@/components/InputText.vue';
import InputDigits from '@/components/InputDigits.vue';
import AlertConfirmModal from "@/components/AlertConfirmModal.vue";
import TokenIcon from "@/components/TokenIcon.vue";
import ButtonIcon from '@/components/ButtonIcon.vue';
import { isSafariBrowser } from '@/plugins/checkDevice';
import { permissionManager } from '@/components/permissionManager';
import Loading from '@/components/Loading.vue';

export default defineComponent({
  name: 'SendForm',
  emits: ['update:formData', 'update:price', 'update:qrScan', 'update:isLoading', 'submitForm'],
    props: {
      formData: {
        type: Object,
        required: true
      },
      price: {
        type: Object,
        required: true
      },
      isLoading: {
        type: [Boolean],
      },
      qrScan: {
        type: [Boolean],
      },
      nfcHandler: {
        type: [Object, null],
        required: true
      },
      nativeToken: {
        type: [String],
        required: true
      }
    },
    components: {
      Multiselect,
      InputText,
      InputDigits,
      AlertConfirmModal,
      TokenIcon,
      ButtonIcon,
      Loading
    },

    setup(props, { emit }) {
      const { t } = useI18n();
      const formData = reactive(props.formData);
      const price = reactive(props.price);
      const store = useStore();
      const amountError = ref(null);
      const walletError = ref(null);
      const isShowPermissionNotify = ref(false);
      const isShowConfirm = ref(false);
      const disableConfirmButton = ref(true);
      const submitButtonLoading = ref(false);
      const token = computed(() => { return getToken(store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name]?.root);});
      const tokenBalance = computed(() => {
        const providerName = store.state.settings.rpcProvider?.name;
        let tokens = store.state.user.tokenBalance?.[providerName] || [];
        if (tokens.length === 0) {
          setTokensBalances();
        }
        return tokens.map((token) => {
          return {
            ...token,
            $isDisabled: (token?.additionalData?.cotiIsSecureToken === true && token?.additionalData?.isOnBoarded === false) || (token?.additionalData?.tokenLimits == 0),
          };
        });
      });
      const selectedToken = computed({
        get: () => store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name],
        set: (value) => {  store.dispatch('user/setSelectedToken', {"key":store.state.settings.rpcProvider?.name, "value":value } ) },
      })
      const nfcPermissionStatus = usePermission('nfc');
      const cameraPermission  = usePermission('camera')
      const clipboardPermission  = usePermission('clipboard-read')

      const getEstimateFee = async(amount = 0) => {
        if (validateFields(amount)) { 
          price.gazPriceToken = null;
          price.gazPriceUsd = null;
          price.priceUsd = null;
          emit('update:price', price);
          return false;
        }
        const request = shallowRef(null);
        const transactionData = ref(
          {
            "recipient": formData.wallet,
            "amount": amount,
            "keys": store.state.user.publicKeyCard
          }
        );
        submitButtonLoading.value = true;
        try {
          request.value = await token.value.transfer(transactionData.value);
          disableConfirmButton.value = false;
        } catch(err) {
          formData.amount = amount;
          price.gazPriceToken = null;
          price.gazPriceUsd = null;
          disableConfirmButton.value = true;
          submitButtonLoading.value = false;

          switch (true) {
            case err?.code?.toString() === 'SAME_SENDER_AND_RECIPIENT' :
            walletError.value = t('errors.sameSenderRecipient');
            return false;
            case err?.code?.toString() === 'AMOUNT_TOO_SMALL' || err?.code?.toString() === 'NUMERIC_FAULT':
            amountError.value = t('errors.tooSmallAmount') + ' ' + (err?.minAmount ? t('errors.minimalAmountIs') + ' ' + err?.minAmount : '');
            return false;
            case err?.code?.toString() === 'TOO_MANY_DECIMALS':
            amountError.value = t('errors.tooSmallAmount') + ' ' + (err?.maxDecimals ? t('errors.minimalDecimalsIs') + ' ' + err?.maxDecimals : '');
            return false;
            case err?.code?.toString() === 'LOW_BALANCE' || err?.code?.toString() === 'INSUFFICIENT_FUNDS' || err?.code?.toString() === '2': {
              const nativeCoinId = await getNativeCoinId();
              const tokenName = await getTokenSymbolById(err?.tokenId);
              amountError.value = nativeCoinId === err?.tokenId
                ? t('errors.insufficientBalanceForGas', { token: err?.tokenId ? tokenName : '' })
                : t('errors.insufficientBalanceGeneric', { token: err?.tokenId ? tokenName : '' });
              return false;
            }
            case err?.code?.toString() === 'INVALID_ARGUMENT':
            amountError.value = t('errors.enteredDataWrong');
            return false;

            default:
              null;
          }
        }
        disableConfirmButton.value = false;
        try {
          price.gazPriceToken = await request.value.estimateFee();
        } catch(err) {
          price.gazPriceToken = null;
          price.gazPriceUsd = null;
          emit('update:price', price);
        }

        if ( price.gazPriceToken && props.nativeToken) {
          const index = store.state.user.tokenBalance[store.state.settings.rpcProvider?.name].findIndex(item => item.name === props.nativeToken);
          price.gazPriceUsd =  price.gazPriceToken * store.state.user.tokenBalance[store.state.settings.rpcProvider?.name][index]?.price?.usdPrice;
        }
        price.priceUsd = amount * store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name]?.price?.usdPrice;
        emit('update:price', price);
        submitButtonLoading.value = false;
      }

      const walletChangedDebounced = useDebounceFn( async() => {
        await getEstimateFee(formData.amount);
      }, 1000, { maxWait: 5000 })

      const setLoadingPayload = (payload = false) => {
        useEventsBus().emit('loadingPayload', payload);
      }

      const walletChanged = () => {
        walletError.value = null;
        walletChangedDebounced();
      }

      const validateFields =(amount = 0) => {
        const isError = ref(false);
        if (typeof parseInt(amount) !== 'number' || amount <= 0) {
          isError.value = true;
          disableConfirmButton.value = true;

        }

        if (!isValidWalletAddress(formData.wallet) && formData.wallet?.length > 1) {
          isError.value = true;
          walletError.value = t('errors.walletAddressError');
          disableConfirmButton.value = true;
        }

        if (formData.wallet?.length < 1) {
          isError.value = true;
          disableConfirmButton.value = true;
        }

        return isError.value ? true : false;
      }

      const amountChangedDebounced = useDebounceFn(async(amount = 0) => {
        await getEstimateFee(amount);
      }, 1000, { maxWait: 5000 })

      const amountChanged = (event) => {
        amountError.value = null;
        amountChangedDebounced(event?.target.value);
      }

      const multiselectChange = async () => {
        store.dispatch('user/setSelectedToken', {"key":store.state.settings.rpcProvider?.name, "value":selectedToken.value} ).then(() => {
          }).catch((error) => {
          });
        formData.amount = '';
        price.gazPriceToken = null;
        price.gazPriceUsd = null;
        price.priceUsd = null;
        emit('update:formData', formData);
        emit('update:price', price);
        amountChanged();
      }

      const checkFields =() => {
        const isError = ref(false);
        if (typeof parseInt(formData.amount) !== 'number' || formData.amount <= 0) {
          amountError.value = t('errors.wrongAmount');
          isError.value = true;
        }

        if (parseFloat(formData.amount) > parseFloat(store.state.user.selectedToken?.[store.state.settings.rpcProvider?.name].balance) ){
          amountError.value = t('errors.insufficientBalance');
          isError.value = true;
        }
        if (isValidWalletAddress(formData.wallet) === false) {
          walletError.value = t('errors.walletAddressError');
          isError.value = true;
        }

        return isError.value ? true : false;
      }

      const submitForm = () => {
        if (checkFields()) {
          return;
        }

        emit('submitForm', {
          value: formData,
          srcEvent: 'submitForm'
        });
      };

      const showPermissionNotify = () => {
        isShowPermissionNotify.value = true;
      }

      const closePermissionNotify = () => {
        isShowPermissionNotify.value = false;
      }

      const toggleCamera = () => {
        emit('update:qrScan', !props.qrScan );
      }

      const pasteFromClip = async () => {
        try {
          permissionManager.logPermissionsState('SendForm.button-clipboard');
        } catch (err) {
        }
        try {
          if (navigator?.clipboard?.readText) {
            const text = await navigator.clipboard.readText();
            formData.wallet = text;
            emit('update:formData', formData);
          }
        } catch (e) {
        }
      };

      const pasteFromCard = async () => {
        const resultPrepareNFC = ref(null);
        const accountAddress = ref(null);
        const resultPrepareAuthenticate = ref(undefined);
        const resultAuth = ref(undefined);

        setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});

        try {
          resultPrepareNFC.value = await CmdGetInfo.buildRequest();
        } catch (err) {
          throw new Error(t('errors.authorizationError'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody: typeof err === 'object' ? JSON.stringify(err) : err}});
        }

        resultAuth.value = await props.nfcHandler?.nfcProgressHandler(resultPrepareNFC.value, CmdGetInfo, false);

          if (resultAuth.value.isNewCard) {
            throw new Error(t('errors.cardResponse'),{ cause: {errorSubtitle: t('errors.walletNotDeployed')} });
          }

          try {
            accountAddress.value = await getWallet(resultAuth.value.keys);
          } catch(err) {
            throw new Error(t('errors.gettingData'),{ cause: {errorSubtitle: t('pages.authorization.errors.walletError'), errorBody: typeof err === 'object' ? JSON.stringify(err) : err} });
          }
        formData.wallet = accountAddress.value;
        emit('update:formData', formData);
        setLoadingPayload(false);
      };

      const alertConfirm = async () => {
        isShowConfirm.value = false;
        setLoadingPayload(true);
        const prefixStore = getStorePrefix();
        const rpcName = store.state.settings.rpcProvider?.name;
        const currentList = store.state[`${prefixStore}.customtoken`]?.customToken?.[rpcName];
        const arrayCopy = Array.isArray(currentList) ? [...currentList] : [];
        const index = arrayCopy.findIndex(item => item === store.state.user.selectedToken?.[rpcName]?.root);
        if (index !== -1) {
          arrayCopy.splice(index, 1);
          store.dispatch(`${prefixStore}.customtoken/setCustomToken`, {"key": rpcName, "value": arrayCopy} ).catch((error) => {
          });
        }
        await setDefaultSelectedToken(true);
        await setTokensBalances(true);
        setLoadingPayload(false);
      }

      const alertCancel = () => {
        isShowConfirm.value = false;
      }

      const deleteSelectedToken = () => {
        isShowConfirm.value = true;
      }

      onMounted(async() => {
        getEstimateFee(formData.amount);
      });

      return { 
        props, formData, price, selectedToken, tokenBalance, clipboardPermission, cameraPermission, nfcPermissionStatus, 
        isShowPermissionNotify, walletError, amountError, isShowConfirm, isWebViewApp, disableConfirmButton, 

        submitForm, deleteSelectedToken, multiselectChange, roundNumber, walletChanged, showPermissionNotify, isSafariBrowser, 
        closePermissionNotify, pasteFromClip, pasteFromCard, toggleCamera, alertConfirm, alertCancel, amountChanged, submitButtonLoading
       }
    }
})
</script>

<style scoped lang="scss">
.form-send {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  .label-box {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .deleteSelectedToken {
      color: $color-orange;
      background: none;
      padding: 0;
      margin: 0;
      margin-bottom: 8px;
    }
  }

  .gas-row {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .gas-label {
      font-size: 14px;
      color: $color-gray;
    }
    .gas-value {
      font-size: 14px;
    }
    .gas-value-gray {
      font-size: 14px;
      color: $color-gray;
    }
  }
  .gas-row:not(:first-child) {
    margin-top: 9px;
  }
}

.multiselect__tags, .multiselect__content-wrapper  {
  color: $color-white;
  background-color: $color-gray-dark;
  border: none;
}

.multiselect__option--selected.multiselect__option--highlight {
  background-color: $color-gray;
}

.multiselect__option--highlight {
  background-color: $color-orange;
}

.multiselect__input, .multiselect__single {
  background-color: rgba(255,255,255,0);
}

.multiselect__option {
  display: flex;
  flex-direction: row;
  align-content: center;
  align-items: center;

  svg, img {
    width: 18px;
    height: 18px;
    margin-right: 8px;
  }
}

.multiselect__single {
  display: flex;
  flex-direction: row;
  align-content: center;
  align-items: center;

  svg, .icon {
    width: 24px;
    height: 25px;
    margin-right: 8px;
  }
}

.option__balance {
  margin-right: 4px;
}

.balance-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  color: $color-gray;

  .balance-icon {
    svg {
      display: flex;
      align-items: center;
      width: 16px;
      height: 16px;
      margin-left: 8px;
      margin-right: 8px;
    }
  }

  .balance {
    color: $color-white;
    margin-right: 8px;
  }
}

.input-container:not(:first-child) {
  padding: 0 0 0 0;
}

.input-container:first-child {
  padding: 0px 0 0 0;
}

.card-address-group {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  color: $color-gray;
  padding: 15px 0 0 0;

  .input-container {
    width: 100%;

    label[data-v-612b88b5] {
      display: block;
      position: relative;
      transition: all 0.2s;
      color: rgb(255, 255, 255);
      pointer-events: none;
      margin-bottom: 8px;
    }
  }

  #card-address {
    display: none;
  }

  .card-address{
    color: $color-orange;
    margin: 0 7px;
  }

  .button-clipboard {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0);
    color: rgb(255, 255, 255);
    border-radius: 8px;
    overflow: hidden;
    border: none;
    font-size: 18px;
    padding: 7px;
    width: 42px;

    svg {
      width: 24px;
      height: 24px;
    }
  }

  .button-card {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0);
    color: rgb(255, 255, 255);
    border-radius: 8px;
    overflow: hidden;
    border: none;
    font-size: 18px;
    padding: 7px;
    width: 50px;

    svg {
      width: 26px;
      height: 24px;
    }
  }

  .button-camera {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0);
    color: rgb(255, 255, 255);
    border-radius: 8px;
    overflow: hidden;
    border: none;
    font-size: 18px;
    padding: 7px;
    width: 50px;

    svg {
      width: 27px;
      height: 27px;
    }
  }
}

.buttons-group {
  width: 100%;
  margin: 20px 0px 0px 0px;
  display: flex;
  justify-content: center;
  align-items: center;

  .button-main {
    width: 90%;
    position: relative;
    @include transition(
      width .3s ease-in-out 0s, 
      border-radius .4s ease-in-out 0s,
      background-color .4s ease-in-out 0s
    );

    &.loading {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      padding: 0;
      min-width: 42px;
    }

    &:disabled,
    &[disabled] {
      cursor: pointer;
      background-color: $color-orange-disable;
      &.loading {
        background-color: rgba($color-orange,0);
      }
    }
  }
}
</style>