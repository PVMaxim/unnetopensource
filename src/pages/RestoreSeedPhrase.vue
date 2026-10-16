<template>
    <main>
      <div class="container-main">
        <Loading v-if="isLoading" :messageLoad = messageLoad :titleLoad = titleLoad />
        <Panel  v-else-if="error"  
          :title=errorTitle 
          :subtitle=errorSubtitle
          :iconUrl=errorImg
          :buttonClick=errorHandler
          :buttonName="$t('button.ok')" />
        <Panel  v-else-if="success"  
          :title="$t('pages.seedPhrase.restoreSuccess')" 
          :subtitle=successMessage
          :iconUrl=successImg
          :buttonClick=successHandler
          :buttonName="$t('button.ok')" />
        <Panel  v-else-if="authorize"  
          :title="$t('pages.seedPhrase.tapCardValidation')" 
          :subtitle="$t('pages.seedPhrase.onlyUnitedNetworkValid')" 
          :buttonClick=authorizeCard
          :buttonName="$t('button.ok')" />
        <PinCode v-else-if="pinState === 'PIN_NEW'"
          :title="$t('pin.enterPin')"
          v-model="pinCodeNew"
          :error=null
          :buttonClick=null
          :useStorePinCode=false
          :isNewCard="isCardIsNew()"
          @cancelButton="pinCancelButton($event.value)"
          @change="newPin($event.value)" 
          v-model:numberOfDigits=pinLength
          @changePinLength="changePinLength($event)"
        />
        <PinCode v-else-if="pinState === 'PIN_PRE'"
          :title="$t('pin.reEnterNewPin')"
          v-model="pinCodePre"
          :error=errorPin
          :confirm=pinValid
          :isNewCard="isCardIsNew()"
          @pinRight="writeSeed($event.value)"
          @cancelButton="pinCancelButton($event.value)"
          @change="prePin($event.value)" 
          v-model:numberOfDigits=pinLength
          @changePinLength="changePinLength($event)"
        /> 
        <div class="seeds-container" v-else>
          <div class="top-box">
            <div class="title">
                {{ $t('pages.seedPhrase.enterSeedTitle') }}
            </div>
            <div class="seeds-grid">
              <div class="seeds-column">
                <InputText v-for="(item, index) in 6" :key="index"
                  :inputId="`seed-phrase-${index}`"
                  inputClass="wallet"
                  v-model="seedPhrasesArray[index]"
                  :placeholder="$t('pages.seedPhrase.inputPlaceholder')"
                  :label="index+1 + ': '" 
                />
              </div>
              <div class="seeds-column">
                <InputText v-for="(item, index) in 6" :key="index + 6"
                  :inputId="`seed-phrase-${index+6}`"
                  inputClass="wallet"
                  v-model="seedPhrasesArray[index+6]"
                  :placeholder="$t('pages.seedPhrase.inputPlaceholder')"
                  :label="index+7 + ': '" 
                />
              </div>
              <div class="masterKey">
                  {{ masterKey }}
              </div>
            </div>
          </div>
          <div class="button-group">
              <button class="button-main" @click=enterPinCode :disabled=false>{{ $t('button.process') }}</button>
          </div>
        </div>
        <NFCHandlerWindow 
          ref="nfcHandlerWindow"
          :title="$t('nfcHandler.touchYourCard')"
          :subTitle="$t('nfcHandler.holdYourCard')"
          v-model:isActive=nfcIsActive
          @onCancel="NFCWindowCancel()"
        />
      </div>
    </main>
  </template>

  <script>
    import { ref, onMounted, onErrorCaptured, computed } from 'vue';
    import { useStore } from 'vuex';
    import { useRouter, useRoute } from 'vue-router';
    import { useI18n } from 'vue-i18n';
    import { deriveSeedFromMnemonic } from '@/api/mnemonic';
    import { CmdInit, CmdGetInfo }  from '@/api/card-io';
    import { setUniSettings }  from '@/api/global-settings';
    import { getWallet, prefixStore, getStorePrefix } from '../api/ApiHandler';
    import { getErrorMessage, isTheSamePublicKey } from '@/api/sub-utils';
    import { isCardIsNew, isCardRegistered, isCardBroken } from '../api/check-guards';
    import Loading from '@/components/Loading.vue';
    import Panel from '@/components/Panel.vue';
    import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
    import PinCode from '@/components/PinCode.vue';
    import InputText from '@/components/InputText.vue'

    export default {
      name: 'Seed phrase',
      layout: 'Dashboard',
      components: {
        Loading,
        Panel,
        NFCHandlerWindow,
        PinCode,
        InputText
      },
      setup() {
        const { t } = useI18n();
        const store = useStore();
        const isLoading = ref(true);
        const nfcIsActive = ref(false);
        const nfcCancel = ref(false);
        const success = ref(false);
        const authorize = ref(true);
        const successMessage = ref(t('pages.seedPhrase.pressOkToContinue'));
        const error = ref(false);
        const titleLoad = ref(t('pages.seedPhrase.status.wait'));
        const messageLoad = ref(t('pages.seedPhrase.status.restoring'));
        const errorTitle = ref(t('pages.seedPhrase.status.errorRestoring'));
        const errorSubtitle = ref(t('pages.send.pressOkToTryAgain'));
        const publicKeyCard = ref(undefined);
        const accountAddress = ref(undefined);
        const pinLength = ref(4);

        const pinState = ref(false);
        const pinCodeNew = ref(undefined);
        const pinCodePre = ref(undefined);
        const pinValid = ref(false);
        const errorPin = ref(null);
        const router = useRouter();
        const seedPhrasesArray = ref([undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined]);
        const seedPhrasesString = ref(undefined);
        const seedPhrasesDerive = ref(undefined);
        const masterKey = ref(undefined);
        const copied = ref(false);
        const nfcHandlerWindow = ref(NFCHandlerWindow);

        const successImg = new URL(`@/assets/images/successcode.svg`, import.meta.url).href;
        const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;

        const pinCancelButton = () => {
          pinState.value = undefined;
          pinCodeNew.value = undefined;
          pinCodePre.value = undefined;
          pinValid.value = false;
        }

        const newPin = () => {
          if (pinCodeNew.value !== undefined && pinCodeNew.value?.length >= pinLength.value ) {
            pinState.value = 'PIN_PRE';
          }
        }

        const prePin = () => {
          if (pinCodePre.value !== undefined && pinCodeNew.value === pinCodePre.value) {
            pinValid.value = true;
          } else if (pinCodeNew.value?.length === pinCodePre.value?.length) {
            errorPin.value = t('pages.settings.incorrectPin');
            pinValid.value = false;
          } else {
            errorPin.value = null;
          }
        }

        const changePinLength = (event) => {
          pinLength.value = event;
          pinState.value = 'PIN_NEW';
          pinCodeNew.value = undefined;
          pinCodePre.value = undefined;
          pinValid.value = false;
        }

        const errorHandler = () => {
          titleLoad.value = t('pages.seedPhrase.status.wait');
          messageLoad.value = t('pages.seedPhrase.status.restoring');
          errorTitle.value = t('pages.seedPhrase.status.errorRestoring');
          errorSubtitle.value = t('pages.send.pressOkToTryAgain');
          error.value = false;
          success.value = false;
          pinState.value = undefined;
          pinValid.value = false;
          isLoading.value = false;
        }

        const NFCWindowCancel = () => {
          nfcCancel.value = true;
          errorHandler();
        }

        const successHandler = () => {
          errorHandler();
          router.push({ name: 'dashboard' });
        }

        const createSeed = () => {
          const seedPhrasesStringLowercase = seedPhrasesArray.value.map(word => word?.trim().toLowerCase());
          seedPhrasesString.value = seedPhrasesStringLowercase.join(' ');

          try {
            seedPhrasesDerive.value = deriveSeedFromMnemonic(seedPhrasesString.value );
          } catch(err) {
            error.value = true;
            errorSubtitle.value = t('pages.seedPhrase.errors.wrongWords');
            return;
          }
        }

        const copyToClip = () => {
          navigator.clipboard.writeText(seedPhrasesArray.value.toString());
          copied.value = true;
          setTimeout(() => copied.value = false, 2000);
        };

        const enterPinCode = () => {
          pinCodeNew.value = undefined;
          pinCodePre.value = undefined;
          if (seedPhrasesArray.value.includes(undefined)) {
            error.value = true;
            errorSubtitle.value = t('pages.seedPhrase.errors.emptyFields');
            return;
          }
          createSeed();
          pinState.value = 'PIN_NEW';
        }

        const authorizeCard = async() => {
          isLoading.value = true;

          const resultAuth = ref(undefined);
          const resultPrepare = ref(null);

          messageLoad.value = 'Prepare card sign';
          setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});
          try {
            resultPrepare.value = await CmdGetInfo.buildRequest();
          } catch (err) {
            throw new Error(t('errors.authorizationError'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody: err}});
          }
          messageLoad.value = 'Waiting for card sign';
          resultAuth.value  = await nfcHandlerWindow.value?.nfcProgressHandler(resultPrepare.value, CmdGetInfo, false);
            publicKeyCard.value = resultAuth.value?.keys;

            if (publicKeyCard.value !== null && publicKeyCard.value?.ioPublicKey) {
            store.dispatch('user/setPinPublicKey',  publicKeyCard.value?.ioPublicKey).then(() => {
            }).catch((err) => {
              throw new Error('Browser error',{ cause: {errorSubtitle: 'Can not process keys.', errorBody: err}});
            });
            store.dispatch('user/setPublicKeyCard',  publicKeyCard.value ).then(() => {
            }).catch((err) => {
              throw new Error('Browser error',{ cause: {errorSubtitle: 'Can not process keys.', errorBody: err}});
            });
            isTheSamePublicKey(publicKeyCard.value);
            getStorePrefix();
            if (store.hasModule(`${prefixStore.value}.customtoken`)) {
              pinLength.value = store.state[`${prefixStore.value}.customtoken`]?.pinLength;
            }
          }
          if (isCardBroken()) {
            throw new Error(t('errors.cardError'),{ cause: {errorSubtitle: t('pages.authorization.errors.validError')}});
          }
          if (/^[a-fA-F0-9]{64,66}$/.test(store.state.user.publicKeyCard.ed25519) && store.state.user?.publicKeyCard?.ioPublicKey ) {
            authorize.value = false;
            isLoading.value = false;
          } else {
            error.value = true;
            errorSubtitle.value = t('pages.seedPhrase.errors.authorizationFail');
            isLoading.value = false;
            return;
          }
        }

        const writeSeed = async() => {
          messageLoad.value = 'Prepare card sign';
          nfcCancel.value = false;
          isLoading.value = true;
          const signRequestPrepare = ref(undefined);
          const result = ref(null);
          setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});
          try {
            signRequestPrepare.value = await CmdInit.buildRequest(
              {
                "seed": seedPhrasesDerive.value,
                "keys": store.state.user.publicKeyCard,
                "pin": pinCodePre.value,
              }
            );
          } catch(err) {
            throw new Error(t('errors.seedCreateError'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody: err}});
          }
          messageLoad.value = 'Waiting for card sign';
          result.value = await nfcHandlerWindow.value?.nfcProgressHandler(signRequestPrepare.value, CmdInit, false);
          if (result.value === null || nfcCancel.value === true) { 
            return false;
          }
          isTheSamePublicKey(result.value?.keys);
          store.dispatch('user/setPublicKeyCard',  result.value?.keys ).then(() => {
          }).catch((err) => {
            throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
          });
          if (result.value?.ioPublicKey) {
            store.dispatch('user/setPinPublicKey',  result.value?.keys?.ioPublicKey ).then(() => {
            }).catch((err) => {
              throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
            });
          }
          getStorePrefix();
          try {
            accountAddress.value = await getWallet(result.value?.keys);
          } catch(err) {
            throw new Error(t('errors.seedCreateError'),{ cause: {errorSubtitle: t('pages.authorization.errors.walletError'), errorBody:err}});
          }

          store.dispatch('user/setAccountAddress',  accountAddress.value ).then(() => {
          }).catch((error) => {
            throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
          });
          if (store.hasModule(`${prefixStore.value}.customtoken`)) {
            store.dispatch(`${prefixStore.value}.customtoken/setPinLength`, Number(pinLength.value));
          }

          isLoading.value = false;
          successMessage.value = t('pages.seedPhrase.pressOkToContinue');
          success.value = true;
        }

        onMounted(() => {
          isLoading.value = false;
        });

        onErrorCaptured(async(err) => {
          const {title, message} = await getErrorMessage(err);
          error.value = true;
          errorTitle.value = title ?? t('pages.seedPhrase.status.errorSeed');
          errorSubtitle.value = message ?? t('pages.send.pressOkToTryAgain');
          const messageConsole = err?.cause?.errorTitle ? `errorTitle: ${err?.cause?.errorTitle}, ` : null 
            + err?.cause?.errorSubtitle ? `errorSubtitle: ${err?.cause?.errorSubtitle}, ` : null
            + err?.cause?.errorBody ? typeof err?.cause?.errorBody === 'object' || typeof err?.cause?.errorBody  === 'array' ? `errorBody: ${JSON.stringify(err?.cause?.errorBody)}, ` : `errorBody: ${err?.cause?.errorBody}, ` : null;
          isLoading.value = false;
          return false;
        });

        return { isLoading, error, seedPhrasesArray, seedPhrasesString, masterKey, copied, titleLoad, pinLength, 
          messageLoad, errorTitle, errorSubtitle, nfcHandlerWindow, nfcIsActive, pinValid, nfcCancel, 
          pinState, errorImg, successImg, success, successMessage, authorize, pinCodeNew, pinCodePre, errorPin,
          errorHandler, createSeed, copyToClip, writeSeed, pinCancelButton, enterPinCode, authorizeCard,
          newPin, prePin, successHandler, NFCWindowCancel, changePinLength, isCardIsNew
        }
      },
    }
</script>

  <style scoped lang="scss">
    .container-main {
        width: 90%;
        flex-direction: column;

        &.scroll {
            justify-content: flex-start;
        }

        .seeds-container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;

            .title {
                font-size: 20px;
                font-weight: 500;
                color: $color-white;
                text-align: center;
                margin-bottom: 16px;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: center;
                position: relative;
            }
            .seeds-grid {
                display: flex;
                flex-direction: row;
                width: 100%;
                flex-wrap: wrap;
                align-content: flex-start;

                .seeds-column {
                  display: flex;
                  flex-direction: column;
                  width: 50%;
                }

                :deep(.input-container) {
                  display: flex;
                  flex-direction: column;
                  flex-wrap: nowrap;
                  align-items: center;
                  width: calc(100% - 24px);
                  margin: 0 12px 0 12px;

                  .input-label {
                    flex-direction: row;
                    align-items: center;
                  }

                  label {
                    width: 16px;
                    color: $color-gray;
                    margin-bottom: 0;
                    text-align: right;
                    margin-right: 4px;
                  }

                  input {
                    min-width: initial !important;
                  }
                }

                .seeds-item {
                    width: calc( 50% -  24px );
                    padding: 6px 12px;

                    .number {
                        color: $color-gray;
                    }
                }

                .attention {
                    position: relative;
                    margin-top: 24px;
                    outline: 1px solid red;
                    padding: 18px;
                    border-radius: 12px;

                    .attention-label {
                        position: absolute;
                        top: 0;
                        left: 24px;
                        @include transforma(translateX(0) translateY(-50%));
                        color: red;
                        background-color: $color-black;
                    }
                }
            }

            .button-group {
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
                margin-bottom: 12px;

                button {
                  width: 90%;
                }

                .button-second {
                    margin-top: 12px;
                }
            }
        }
    }

.web-app {
  .seeds-container {
    .button-group {
      bottom: 42px;
    }
  }
}
</style>