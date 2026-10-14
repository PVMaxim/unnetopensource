<template>
  <main>
    <div class="container-main" :class="{'scroll' : ( state === 'menu' || state === 'change-settings' || state === 'change-pin') && (isLoading === false && error === false ) }">
      <Loading v-if="isLoading" :messageLoad = "$t('pages.authorization.status.authorizing')" :titleLoad = "$t('pages.seedPhrase.status.wait')" />
      <Panel v-else-if="error"  
        :title=errorTitle
        :subtitle=errorSubtitle
        :iconUrl=errorImg
        :buttonClick=errorHandler
        :buttonName="$t('button.ok')" />
      <div class="settings-menu" v-else-if="state === 'menu'" >
        <div v-if="storeCardVersion" class="card-version">
          {{ $t('pages.settings.cardVersion') }} {{ getDecodedVersion(storeCardVersion) }}
        </div>
        <div v-if="accountAddress" class="title">
          {{ $t('pages.settings.walletAddressFor') }} {{ storeProvider?.name }}
        </div>
        <div v-if="accountAddress" class="public-key-card-group">
          <div class="public-key-card">
            <div v-html="accountAddress"  class="public-key-card-input" />
          </div>
          <button class="button-clipboard" @click.prevent=copyToClip>
            <CopyIcon class="copy-icon-animation" :class="{active:copied}"/>
            <svg class="success-icon-animation" :class="{active:copied}" viewBox="0 0 16 16">
              <path d="M13.25 4.75L6 12L2.75 8.75"></path>
            </svg>
          </button>
        </div>
        <div class="title">
          {{ $t('pages.settings.securitySettings') }}
        </div>
        <div class="panel-small">
          <div class="changePin" @click.prevent=showPinChangeHandler>
            {{ $t('pages.settings.changePin') }}
            <narrow />
          </div>
          <div class="cardReset" @click.prevent=createNewWallet>
            {{ $t('pages.settings.cardReset') }}
            <narrow />
          </div>
          <component :is="SettingsExtraItems" @openNfcSettings="showSettingsChangeHandler" />
        </div>
      </div>
      <Panel  v-else-if="state === 'needAuthorization'"  
        :title="storeUserRegistered === true ? $t('pages.settings.cardIsNewRegister') : $t('pages.settings.needsAuthorization')" 
        :subtitle="$t('pages.settings.pressOkToAuthorize')"
        :iconUrl=attentionIcon
        :buttonClick=goAuthorization
        :buttonName="$t('button.ok')" />
      <Panel  v-else-if="state === 'pinChanged'"  
        :title="$t('pages.settings.pinChanged')" 
        :subtitle="$t('pages.settings.pressOkToBack')"
        :iconUrl=successImg
        :buttonClick=errorHandler
        :buttonName="$t('button.ok')" />
      <div class="settings" v-else-if="state === 'change-pin'">
        <div class="title">
          <div class="button-back" @click.prevent=backHandler>
            <backIcon/>
          </div>
          {{ $t('pages.settings.changePin') }}
        </div>
        <PinCode v-if="pinState === 'OLD_PIN'"
          :title="$t('pin.enterOldPin')"
          v-model="pinOld"
          :error=errorPin
          :buttonClick=null
          @cancelButton="pinCancelButton($event.value)"
          @change="updatePinOld($event.value)" 
          v-model:numberOfDigits=pinLength
          @changePinLength="changePinLengthOld()"
        />
        <PinCode v-if="pinState === 'NEW_PIN'"
          :title="$t('pin.enterNewPin')"
          v-model="pinNew"
          :error=errorPin
          :buttonClick=null
          @cancelButton="pinCancelButton($event.value)"
          @change="updatePinNew($event.value)" 
          v-model:numberOfDigits=pinLength
          @changePinLength="changePinLengthNew()"
        />
        <PinCode v-if="pinState === 'PRE_PIN'"
          :title="$t('pin.reEnterNewPin')"
          v-model="pinPre"
          :error=errorPin
          :buttonClick=confirmPinHandler
          :confirm=pinValid
          @cancelButton="pinCancelButton($event.value)"
          @change="updatePinPre($event.value)" 
          v-model:numberOfDigits=pinLength
          @changePinLength="changePinLengthNew()"
        />
      </div>
      <component :is="NfcSettingsView" v-else-if="state === 'change-settings' && NfcSettingsView" @back="backHandler" @error="onNfcError" />
      <NFCHandlerWindow 
        ref="nfcHandlerWindow"
        :title="$t('pages.authorization.nfc.title')"
        :subTitle="$t('pages.authorization.nfc.subtitle')"
        v-model:isActive=nfcIsActive
        @onCancel="isLoading=false"
      />
    </div>
  </main>
</template>

<script>
  import { ref, computed, watchEffect, onErrorCaptured, getCurrentInstance } from 'vue'
  import { useI18n } from 'vue-i18n';
  import { useStore } from 'vuex'
  import { useRouter, useRoute } from 'vue-router'
  import { CmdSetPin }  from '@/api/card-io';
  import { setUniSettings }  from '@/api/global-settings';
  import { i18n } from '@/plugins/i18n'
  import { isWebViewApp, getDecodedVersion, getErrorMessage, copyToClipboard } from '@/api/sub-utils';
  import { prefixStore } from '../api/ApiHandler';
  import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
  import Loading from '@/components/Loading.vue'
  import Panel from '@/components/Panel.vue'
  import PinCode from '@/components/PinCode.vue'
  import ToggleSwitch from '@/components/ToggleSwitch.vue'
  import Multiselect from '@/components/multiselect';
  import narrow from '@/components/svg/narrowRight.vue';
  import backIcon from '@/components/svg/backIcon.vue';
  import CopyIcon from '@/components/svg/copyIcon.vue'
  
  export default {
    name: 'Settings page',
    layout: 'Dashboard',
    components: {
      Loading,
      Panel,
      PinCode,
      ToggleSwitch,
      Multiselect,
      narrow,
      backIcon,
      NFCHandlerWindow,
      CopyIcon
    },
    setup() {
      const { t } = useI18n();
      const store = useStore();
      const isLoading = ref(false);
      const nfcIsActive = ref(false);
      const error = ref(false);
      const errorTitle = ref(t('pages.settings.pinChangeError'));
      const errorSubtitle = ref(t('pages.settings.pressOkToTryAgain'));
      const errorPin = ref(null);
      const router = useRouter();
      const pin = ref(null);
      const pinNew = ref(null);
      const pinOld = ref(null);
      const pinPre = ref(null);

      const pinState = ref('OLD_PIN');
      const pinLength = computed(() => { 
        if ( typeof store.state[`${prefixStore.value}.customtoken`]?.pinLength !== undefined ) {
          console.log(`pinLength isset`);
          return store.state[`${prefixStore.value}.customtoken`]?.pinLength;
        }
        return 4
      });
      const pinValid = ref(false);
      const accountAddress = computed(() => { return store.state.user.accountAddress });
      const state = ref('menu');
      const currentLanguage = ref(store.state.lang.locale);
      const selectedMapOptionValue = ref('');
      const copied = ref(false);
      const nfcHandlerWindow = ref(NFCHandlerWindow);
      const storeProvider = computed(() => { return store.state.settings.rpcProvider });
      const storeCardVersion = computed(() => { return store.state.settings.cardVersion });
      const storeUserRegistered = computed(() => { return store.state.settings.rpcProvider });

      const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;
      const attentionIcon = new URL(`@/assets/images/attentionIcon.svg`, import.meta.url).href;
      const successImg = new URL(`@/assets/images/successcode.svg`, import.meta.url).href;

      const defaultOptions = {
        layout: {
          color: 'rgb2(255, 255, 255, .6)',
          backgroundColor: 'rgba(0,0,0,0)',
          selectedColor: 'rgba(17, 17, 17, 1)',
          selectedBackgroundColor: 'rgb(255, 152, 0)',
          borderColor: 'none',
          fontFamily: 'Arial',
          fontWeight: 'normal',
          fontWeightSelected: 'normal',
          squareCorners: true,
          noBorder: false
        },
        size: {
          fontSize: 1.5,
          height: 3.25,
          padding: 0.5,
          width: 10
        },
        config: {
          delay: 0.4,
          preSelected: store.state.settings.cardReaderPriority,
          disabled: false,
          items: [
            { name: 'auto', value: "auto", width: '70px', padding: '8px 12px' },
            { name: 'nfc', value: "nfc", width: '70px', padding: '8px 12px' },
            { name: 'fido', value: "fido", width: '70px', padding: '8px 12px' },
            { name: 'app', value: "mapp", width: '70px', padding: '8px 12px' }
          ]
        }
      }

      const changePinLengthOld = () => {
        pinState.value = 'OLD_PIN';
        clearPin();
      }

      const changePinLengthNew = () => {
        pinState.value = 'NEW_PIN';
        pinNew.value = null;
        pinPre.value = null;
        pinValid.value = false;
      }

      const copyToClip = async() => {
        const result = ref(await copyToClipboard(accountAddress.value));
        if (result.value) {
          copied.value = true;
          setTimeout(() => copied.value = false, 2000);
        }
      };

      const setLocale = (locale) => {
        if (i18n.global.locale.value !== locale) {
          store.dispatch('lang/setLocale', { locale })
          setI18nLanguage(locale)
          router.currentRoute.value.name
          ? router.push({ name: router.currentRoute.value.name, params: { locale: locale } }) : null
        }
      }

      const updateMap = async (event) => {
        await store.dispatch('settings/setCardReaderPriority', event ).then(() => {
          }).catch((error) => {
            error.value = true;
            errorSubtitle.value = error;
            return;
          });
      }

      const clearPin = async () => {
        pinOld.value = null;
        pinNew.value = null;
        pinPre.value = null;
        pinValid.value = false;
      }

      const updatePinOld = async (event) => {
        if (pinOld.value !== null && pinOld.value.length >= 4) {
        pinState.value = 'NEW_PIN';
        }
      }

      const updatePinNew = async (event) => {
        if (pinNew.value !== null && pinNew.value.length >= 4 ) {
        pinState.value = 'PRE_PIN';
        }
      }

      const pinCancelButton = async (event) => {
        await clearPin();
        pinState.value = 'OLD_PIN';
        state.value = 'menu';
        errorPin.value = null;
      }

      const updatePinPre = async (event) => {
        if (pinNew.value === pinPre.value) {
        pinValid.value = true;
        } else {
          if (pinNew.value.length === pinPre.value?.length) {
          errorPin.value = t('pages.settings.incorrectPin');
        } else {
          errorPin.value = null;
        }
          pinValid.value = false;
        }
      }

      const confirmPinHandler = async () => {
        console.log(`confirmPinHandler 1 state = ${state.value}, error = ${error.value}`);
        isLoading.value = true;
        const resultAuth = ref(null);
        const resultChangePinHandler = ref(null);
        const pinPrepareData = ref(
          {
            "keys": store.state.user.publicKeyCard,
            "oldPin": pinOld.value,
            "newPin": pinNew.value
          });

        setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});
        try {
          console.log(`CmdSetPin.buildRequest NFC PRE: data is ${JSON.stringify(pinPrepareData.value)}`);
          resultAuth.value = await CmdSetPin.buildRequest(pinPrepareData.value);
          console.log(`CmdSetPin.buildRequest NFC:  type is ${typeof resultAuth.value} data is ${JSON.stringify(resultAuth.value)}`);
        } catch(err) {
          console.log(`buildRequest NFC ERROR:  type is ${typeof err} data is ${JSON.stringify(err)}`);
          error.value = true;
          errorSubtitle.value = err;
          isLoading.value = false;
          return;
        }

        resultChangePinHandler.value = await nfcHandlerWindow.value?.nfcProgressHandler(resultAuth.value, CmdSetPin, false);
        console.log(`confirmPinHandler 2 state = ${state.value}, error = ${error.value}`);
         
        console.log(`After SWITCH`);
        state.value = 'pinChanged';
        isLoading.value = false;
        console.log(`confirmPinHandler 3 state = ${state.value}, error = ${error.value}`);
      }

      const selectedMethod = ref('');

      const goAuthorization = async () => {
        error.value = false;
        errorTitle.value = t('pages.settings.pinChangeError');
        errorSubtitle.value = t('pages.settings.pressOkToTryAgain');
        router.push({ name: 'authorization' });
      }

      const createNewWallet = () => {
        router.push({ name: 're-registration-card' });
      }

      const errorHandler = async () => {
        await clearPin();
        error.value = false;
        errorTitle.value = t('pages.settings.pinChangeError');
        errorSubtitle.value = t('pages.settings.pressOkToTryAgain');
        pinState.value = 'OLD_PIN';
        state.value = 'menu';
        router.push({ name: 'settings' });
      }

      const showPinChangeHandler = async () => {
        state.value = 'change-pin';
      }
      const showSettingsChangeHandler = async () => {
        state.value = 'change-settings';
      }
      
      const backHandler = async () => {
        error.value = false;
        errorTitle.value = t('pages.settings.pinChangeError');
        errorSubtitle.value = t('pages.settings.pressOkToTryAgain');
        state.value = 'menu';
      }

      console.log(`store.state.user?.publicKeyCard.ioPublicKey: data is ${JSON.stringify(store.state.user?.publicKeyCard?.ioPublicKey)}`);
      console.log(`store.state.user.registered: data is ${store.state.user.registered}`);
      
      watchEffect(() => {
        currentLanguage.value = store.state.lang.locale;
        if (state.value === 'change-pin' && (!store.state.user?.publicKeyCard?.ioPublicKey || store.state.user.registered === true || store.state.user.registered === null )) {
          state.value = 'needAuthorization';
        }
      })

      onErrorCaptured(async(err) => {
        const {title, message} = await getErrorMessage(err, 'changePinCode');
        state.value = 'menu';
        error.value = true;
        errorTitle.value = title ?? t('errors.sendTokenError');
        errorSubtitle.value = message ?? t('pages.settings.pressOkToTryAgain');
        console.log(`errorBody = ${err?.cause?.errorBody}`);
        const messageConsole = err?.cause?.errorTitle ? `errorTitle: ${err?.cause?.errorTitle}, ` : null 
          + err?.cause?.errorSubtitle ? `errorSubtitle: ${err?.cause?.errorSubtitle}, ` : null
          + err?.cause?.errorBody ? typeof err?.cause?.errorBody === 'object' || typeof err?.cause?.errorBody  === 'array' ? `errorBody: ${JSON.stringify(err?.cause?.errorBody)}, ` : `errorBody: ${err?.cause?.errorBody}, ` : null;
        console.log(messageConsole);
        console.log(`onErrorCaptured state = ${state.value}, error = ${error.value}`);
        isLoading.value = false;
        return false;
      });

      const instance = getCurrentInstance();
      const SettingsExtraItems = computed(() => instance?.appContext.components['SettingsExtraItems']);
      const NfcSettingsView = computed(() => instance?.appContext.components['NfcSettingsView']);
      const onNfcError = (err) => {
        error.value = true;
        errorSubtitle.value = err;
      };

      return { isLoading, state, accountAddress, error, goAuthorization, errorTitle, errorHandler, errorImg, pinState, pin, pinPre, createNewWallet, 
        showPinChangeHandler, backHandler, showSettingsChangeHandler, pinValid, errorPin, pinNew, pinOld, storeProvider, storeCardVersion, storeUserRegistered, 
        selectedMapOptionValue, updateMap, selectedMethod, defaultOptions, updatePinOld, updatePinNew, getDecodedVersion, nfcIsActive, pinLength, changePinLengthOld, changePinLengthNew, 
        updatePinPre, confirmPinHandler, attentionIcon, successImg, pinCancelButton, errorSubtitle, nfcHandlerWindow, copied, copyToClip, isWebViewApp,
        currentLanguage, setLocale, SettingsExtraItems, NfcSettingsView, onNfcError
      }
    },
  }
</script>

<style scoped lang="scss">
// .toggle-switch-settings {
//   :deep(.toggle-switch){
//     width: 100%;
//   }
// }
.container-main {
  width: 90%;
  flex-direction: column;

  &.scroll {
    justify-content: flex-start;
  }
}
.settings{
  width: 100%;
  height: calc(100% - 28px);;
}
.settings-menu {
  width: 100%;
}
.panel-small {
  width: 100%;
  background-color: rgb(23, 23, 23);
  border-radius: 20px;
}
  .title {
    font-size: 20px;
    font-weight: 500;
    color: $color-white;
    text-align: center;
    margin-bottom: 24px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .settings-language-select {
    width: 100px;
    
    :deep(.multiselect) {
      background-color: transparent;
      
      .multiselect__tags {
        background-color: $color-black-38;
        border: 1px solid $color-black-40;
        border-radius: 12px;
        padding: 8px 12px;
        height: 40px;
        color: $color-white;
      }

      .multiselect__option {
        height: 40px;
      }

      .multiselect__single {
        background-color: transparent;
        color: $color-white;
      }

      .multiselect__content-wrapper {
        background-color: $color-black-23;
        border: 1px solid $color-black-40;
        border-bottom-left-radius: 12px;
        border-bottom-right-radius: 12px;
        z-index: 50;
      }

      .multiselect__option {
        background-color: transparent;
        color: $color-white;
        
        &--highlight {
          background-color: $color-orange;
          color: $color-white;
        }

        &--selected {
          font-weight: bold;
        }
      }

      .multiselect__select {
        height: 40px;
        &::before {
          border-color: $color-white transparent transparent;
        }
      }
    }
  }
  .subTitle {
    font-size: 16px;
    margin-bottom: 8px;
  }
  .button-back {
    position: absolute;
    left: 0px;
    svg {
      height: 18px;
    }
  }
  .card-version {
    font-size: 13px;
    text-align: right;
    margin-bottom: 24px;
  }
  .public-key-card-group {
    width: calc(100% - 56px);
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-bottom: 24px;

    .public-key-card {
      width: 100%;
      background-color: rgb(23, 23, 23);
      border-radius: 20px;
      padding: 18px 0 18px 18px;
      
      .public-key-card-input {
        width: 100%;
        height: auto;
        background: none;
        border: none;
        color: $color-white;
        font-size: 15px;
        word-wrap: break-word;
        -webkit-user-select: text;
        -ms-user-select: text;
        user-select: text;
        word-break: break-all;
      }
    }
  }
  .createPin, .changePin, .cardReset, .changeSettings, .change-language {
    width: 90%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 18px;
    cursor: default;

    &:hover {
      cursor: pointer;
    }

    svg {
      height: 18px;
    }
  }
  .createPin, .changePin, .cardReset, .changeSettings {
    border-bottom: 2px solid $color-black-light;
  }

  .panel-small > *:last-child {
    border-bottom: none;
  }

  .change-language {
    padding: 5.5px 18px;
  }

  .button-clipboard {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0);
    color: rgb(255, 255, 255);
    border-radius: 0px;
    overflow: hidden;
    border: none;
    padding: 7px;
    position: relative;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    height: 18px;
    width: 18px;
    margin-left: 12px;

    svg {
      width: 100%;
      height: 100%;

    &.copy-icon-animation {
      position: absolute;
      top: 0;
      left: 0;
      stroke-dasharray: 50;
      stroke-dashoffset: revert-layer;
      -webkit-transition: all 300ms ease-in-out;
      transition: all 300ms ease-in-out;
      fill: $color-orange;

      &.active {
        fill: none;
      }
    }

    &.success-icon-animation {
      position: absolute;
      top: 0;
      left: 0;
      stroke-dasharray: 50;
      stroke-dashoffset: -50;
      -webkit-transition: all 300ms ease-in-out;
      transition: all 300ms ease-in-out;
      fill: none;
      stroke: #28a745;
      stroke-width: 1.5;
      stroke-linecap:round;
      stroke-linejoin: round;

      &.active {
        stroke-dashoffset: 0;
      }
    }
    }
  }
</style>