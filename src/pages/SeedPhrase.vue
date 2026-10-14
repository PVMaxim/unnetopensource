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
        :title="$t('pages.seedPhrase.registrationSuccess')" 
        :subtitle=successMessage
        :iconUrl=successImg
        :buttonClick=successHandler
        :buttonName="$t('button.ok')" />
      <Panel  v-else-if="authorize"  
        :title="$t('pages.seedPhrase.cardValidation')" 
        :subtitle="$t('pages.seedPhrase.restoreValidationSubtitle')" 
        :buttonClick=authorizeCard
        :buttonName="$t('button.ok')" />
      <PinCode v-else-if="pinState === 'PIN_NEW'"
        :title="$t('pin.enterPin')"
        v-model="pinCodeNew"
        :error=null
        :buttonClick=null
        :useStorePinCode=false
        :isNewCard="true"
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
        :isNewCard="true"
        @pinRight="writeSeed($event.value)"
        @cancelButton="pinCancelButton($event.value)"
        @change="prePin($event.value)" 
        v-model:numberOfDigits=pinLength
        @changePinLength="changePinLength()"
      />
      <div class="seeds-container" v-else>
          <div class="title">
              {{ $t('pages.seedPhrase.title') }}
          </div>
          <div class="middle-box" >
            <div class="seeds-grid" v-if="seedPhrasesArray?.length > 0">
              <div class="seeds-column">
                <div class="seeds-item" v-for="(item, index) in seedPhrasesArray.slice(0, 6)" :key="index">
                    <div class="number">{{ index + 1 }}.  </div><div class="word">{{ item }}</div>
                </div>
              </div>
              <div class="seeds-column">
                <div class="seeds-item" v-for="(item, index) in seedPhrasesArray.slice(6, 12)" :key="index + 6">
                    <div class="number">{{ index + 7 }}.  </div><div class="word">{{ item }}</div>
                </div>
              </div>
            </div>
              <fieldset class="attention">
                  <legend class="attention-label">{{ $t('pages.seedPhrase.attention') }}</legend>
                  {{ $t('pages.seedPhrase.attentionText') }}
              </fieldset>
              <div class="masterKey">
                  {{ masterKey }}
              </div>
          </div>
          <div class="button-group">
            <Button
              class="button-main"
              :buttonName="$t('pages.seedPhrase.wroteItDown')"
              buttonType="main"
              buttonRound="round12"
              @onClick="isShowConfirm = true"
              :disabled=false
            />
            <div v-if="copied" class="button-second">{{ $t('button.copied') }}</div>
            <Button v-else 
              class="button-second"
              :buttonName="$t('pages.seedPhrase.copyAllWords')"
              buttonType="transparent"
              buttonRound="round12"
              @onClick=copyToClip
              :disabled=false
            />
          </div>
      </div>
      <NFCHandlerWindow 
        ref="nfcHandlerWindow"
        :title="$t('nfcHandler.touchYourCard')"
        :subTitle="$t('nfcHandler.holdYourCard')"
        v-model:isActive=nfcIsActive
        @onCancel="errorHandler()"
      />
    </div>
    <AlertConfirmModal 
        v-model="isShowConfirm"
        :title="$t('pages.seedPhrase.confirmationTitle')"
        :subTitle="$t('pages.seedPhrase.confirmationSubtitle')"
        :buttonConfirmText="$t('button.confirm')"
        :buttonCancelText="$t('button.cancel')"
        @onConfirm="alertConfirm($event.value)"
        @onCancel="alertCancel($event.value)"
        />
  </main>
</template>
  
  <script>
    import { ref, onMounted, computed, onErrorCaptured } from 'vue';
    import { useStore } from 'vuex';
    import { useRouter } from 'vue-router';
    import { useI18n } from 'vue-i18n';
    //import init from '@/api/pkg/venom_card_extra_wasm.js';
    import { generateMnemonic, deriveSeedFromMnemonic } from '@/api/mnemonic';
    import { CmdInit, CmdGetInfo }  from '@/api/card-io';
    import { setUniSettings }  from '@/api/global-settings';
    import { getWallet, prefixStore, getStorePrefix } from '../api/ApiHandler';
    import { getErrorMessage, isTheSamePublicKey } from '@/api/sub-utils';
    import Loading from '@/components/Loading.vue';
    import Panel from '@/components/Panel.vue';
    import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
    import PinCode from '@/components/PinCode.vue';
    import AlertConfirmModal from "@/components/AlertConfirmModal.vue";
    import Button from "@/components/Button.vue";

    export default {
      name: 'Seed phrase',
      layout: 'Dashboard',
      components: {
        Loading,
        Panel,
        NFCHandlerWindow,
        PinCode,
        AlertConfirmModal,
        Button
      },
      setup() {
        const { t } = useI18n();
        const store = useStore();
        const isLoading = ref(true);
        const nfcIsActive = ref(false);
        const nfcCancel = ref(false);
        const success = ref(false);
        const authorize = ref(false);
        const successMessage = ref(t('pages.seedPhrase.pressOkToContinue'));
        const error = ref(false);
        const titleLoad = ref(t('pages.seedPhrase.status.wait'));
        const messageLoad = ref(t('pages.seedPhrase.status.creating'));
        const errorTitle = ref(t('pages.seedPhrase.status.errorCreating'));
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
        const seedPhrasesArray = computed(() => { return store.state.user.seedPhrase; });
        const seedPhrasesString = computed(() => { return seedPhrasesArray.value?.join(' '); });
        const seedPhrasesDerive = computed(() => { if (store.state.user.seedPhrase?.length === 12) {return deriveSeedFromMnemonic(seedPhrasesString.value); }});
        const masterKey = ref(undefined);
        const copied = ref(false);

        const isShowConfirm = ref(false);

        const nfcHandlerWindow = ref(NFCHandlerWindow);
        const successImg = new URL(`@/assets/images/successcode.svg`, import.meta.url).href;
        const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;
       
        const initial = async() => {
          //await init();
          console.log(`store.state.user.seedPhrase:  type is ${typeof store.state.user.seedPhrase} data is ${store.state.user.seedPhrase}`);
          if ( typeof store.state.user.seedPhrase === null || (typeof store.state.user.seedPhrase === 'object' && store.state.user.seedPhrase?.length !== 12)) {
            createSeed();
          }
          isLoading.value = false;
        }

        const changePinLength = (event) => {
          pinLength.value = event;
          pinState.value = 'PIN_NEW';
          pinCodeNew.value = undefined;
          pinCodePre.value = undefined;
          pinValid.value = false;
          errorPin.value = null;
        }

        const alertConfirm = (event) => {
          console.log(`alertConfirm:  type is ${typeof event} data is ${JSON.stringify(event)}`);
          console.log(`isShowConfirm:  type is ${typeof isShowConfirm.value} data is ${isShowConfirm.value}`);
          enterPinCode();
        }

        const alertCancel = (event) => {
          console.log(`alertCancel:  type is ${typeof event} data is ${JSON.stringify(event)}`);
          console.log(`isShowConfirm:  type is ${typeof isShowConfirm.value} data is ${isShowConfirm.value}`);
          errorHandler();
        }

        const successHandler = () => {
          errorHandler();
          router.push({ name: 'dashboard' });
        }

        const pinCancelButton = () => {
          pinState.value = undefined;
          pinCodeNew.value = undefined;
          pinCodePre.value = undefined;
          pinValid.value = false;
          errorPin.value = null;
        }

        const newPin = () => {
          if (pinCodeNew.value !== undefined && pinCodeNew.value?.length >= pinLength.value ) {
            pinState.value = 'PIN_PRE';
          }
        }

        const prePin = () => {
          if (pinCodePre.value !== undefined && pinCodeNew.value === pinCodePre.value) {
            pinValid.value = true;
            console.log('pinCode - ' + pinCodePre.value);
          } else if (pinCodeNew.value?.length === pinCodePre.value?.length) {
            errorPin.value = t('pages.settings.incorrectPin');
            pinValid.value = false;
          } else {
            errorPin.value = null;
          }
        }

        const errorHandler = () => {
          titleLoad.value = t('pages.seedPhrase.status.wait');
          messageLoad.value = t('pages.seedPhrase.status.creating');
          errorTitle.value = t('pages.seedPhrase.status.errorCreating');
          errorSubtitle.value = t('pages.send.pressOkToTryAgain');
          error.value = false;
          success.value = false;
          pinState.value = undefined;
          pinValid.value = false;
          isLoading.value = false;
        }

        const NFCWindowCancel = () => {
          console.log(`Click Cancel NFC window button.`);
          nfcCancel.value = true;
          errorHandler();
        }
       
        const createSeed = () => {
          console.log('start create seeds ' )
          const seedPhrases  = generateMnemonic();
          store.dispatch('user/setSeedPhrase',  seedPhrases );
        }

        const copyToClip = () => {
          navigator.clipboard.writeText(seedPhrasesArray.value.toString());
          copied.value = true;
          setTimeout(() => copied.value = false, 2000);
        };

        const enterPinCode = () => {
          pinCodeNew.value = undefined;
          pinCodePre.value = undefined;
          pinState.value = 'PIN_NEW';
        }

        const authorizeCard = async () => {
          isLoading.value = true;
          const resultAuth = ref(undefined);
          const resultPrepareAuthenticate = ref(undefined);
          const resultPrepare = ref(null);

          messageLoad.value = 'Prepare card sign';
          setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});
          try {
            resultPrepare.value = await CmdGetInfo.buildRequest();
          } catch (err) {
            console.error('Error during NFC process', err);
            throw new Error(t('errors.authorizationError'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody: err}});
          }
          messageLoad.value = 'Waiting for card sign';

          resultAuth.value  = await nfcHandlerWindow.value?.nfcProgressHandler(resultPrepare.value, CmdGetInfo, false);

            console.log(`CmdGetInfo.parseResponse SUCCESS all: ${JSON.stringify(resultAuth.value)}`);
            messageLoad.value = 'Card sign submit';
            publicKeyCard.value = resultAuth.value?.keys;
            console.log(`publicKeyCard: ${publicKeyCard.value}`);

          if (publicKeyCard.value !== null && publicKeyCard.value?.ioPublicKey) {
            store.dispatch('user/setPinPublicKey',  publicKeyCard.value?.ioPublicKey).then(() => {
            }).catch((err) => {
              throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
            });
            store.dispatch('user/setPublicKeyCard',  publicKeyCard.value ).then(() => {
              console.log(`authorizeCard setPublicKeyCard ${typeof publicKeyCard.value} data is ${JSON.stringify(publicKeyCard.value)}`);
            }).catch((err) => {
              throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
            });
            try {
              accountAddress.value = await getWallet( store.state.user.publicKeyCard );
              console.log(`accountAddress.value typeof: ${typeof accountAddress.value} data ${JSON.stringify(accountAddress.value)}`);
            } catch(err) {
              console.log(`walletAddress ERROR: ${err}`);
              throw new Error(t('errors.authorizationError'),{ cause: {errorSubtitle: t('pages.authorization.errors.walletError'), errorBody:err}});
            }
            console.log(`walletAddress: ${JSON.stringify(accountAddress.value)}, provider type ${store.state.settings.rpcProvider?.type}`);

            store.dispatch('user/setAccountAddress',  accountAddress.value ).then(() => {
              console.log(`user/setAccountAddress typeof: ${typeof accountAddress.value} data ${JSON.stringify(accountAddress.value)}`);
            }).catch((err) => {
              throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
            });
          }
          console.log(`store.state.user.publicKeyCard typeof: ${typeof store.state.user.publicKeyCard} data ${JSON.stringify(store.state.user.publicKeyCard)}`);
          console.log(`/^[a-fA-F0-9]{64,66}$/.test(store.state.user.publicKeyCard.ed25519)  data ${/^[a-fA-F0-9]{64,66}$/.test(store.state.user.publicKeyCard.ed25519)}`);
          if (/^[a-fA-F0-9]{64,66}$/.test(store.state.user.publicKeyCard.ed25519) && store.state.user?.publicKeyCard?.ioPublicKey ) {
            initial();
            authorize.value = false;
            isLoading.value = false;
          } else {
            throw new Error(t('errors.authorizationError'),{ cause: {errorSubtitle: t('pages.authorization.errors.validError')}});
          }
        }

        const writeSeed = async() => {
          messageLoad.value = 'Prepare card sign';
          isLoading.value = true;
          const signRequestPrepare = ref(undefined);
          const signResponsePrepare = ref(undefined);
          const result = ref(null);
          setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});
          console.log(`signRequestPrepare PREPARE:   data is ${JSON.stringify(
            {
              "seed": seedPhrasesDerive.value,
              "keys": store.state.user.publicKeyCard,
              "pin": pinCodePre.value,
            }
          )}`);
          try {
            signRequestPrepare.value = await CmdInit.buildRequest(
              {
                "seed": seedPhrasesDerive.value,
                "keys": store.state.user.publicKeyCard,
                "pin": pinCodePre.value,
              }
            );
            console.log(`signRequestPrepare NFC:  type is ${typeof signRequestPrepare.value} data is ${JSON.stringify(signRequestPrepare.value)}`);
          } catch(err) {
            console.log(`signRequestPrepare NFC ERROR:  type is ${typeof err} data is ${JSON.stringify(err)}`);
            throw new Error(t('errors.restoreCardError'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody: err}});
          }
          messageLoad.value = 'Waiting for card sign';
          result.value = await nfcHandlerWindow.value?.nfcProgressHandler(signRequestPrepare.value, CmdInit, false);
          console.log(`CmdInit.parseResponse: ${JSON.stringify(result.value)}`);
          console.log(`nfcCancel: ${nfcCancel.value}`);
          if (result.value === null || nfcCancel.value === true) { 
            return false;
          }
          switch (result.value?.errorCode) {
            case 1:
              console.log(`result.errorCode 1: FAIL`);
            throw new Error(t('errors.restoreCardError'),{ cause: {errorSubtitle: t('errors.wrongPin')}});
            case 2:
              console.log(`result.errorCode 2: FAIL`);
              throw new Error(t('errors.restoreCardError'),{ cause: {errorSubtitle: t('errors.cardBlocked')}});
            default:
              console.log(`result.errorCode 0: OK`);
              break
          }
          console.log(`setPublicKeyCard BEFORE: ${JSON.stringify(result.value?.keys)}`);
          if (/^[a-fA-F0-9]{64}$/.test(result.value?.keys?.ed25519) && result.value?.keys?.ed25519!== '0000000000000000000000000000000000000000000000000000000000000000' ) {
            isTheSamePublicKey(result.value?.keys);
            store.dispatch('user/setPublicKeyCard',  result.value?.keys ).then(() => {
              console.log(`writeSeed setPublicKeyCard ${typeof result.value?.keys} data is ${JSON.stringify(result.value?.keys)}`);
            }).catch((err) => {
            console.log(`setPublicKeyCard ERROR: ${JSON.stringify(err)}`);
              throw new Error('Browser error',{ cause: {errorSubtitle: 'Can not process keys.', errorBody: err}});
          });
          if (result.value?.ioPublicKey) {
            store.dispatch('user/setPinPublicKey',  result.value?.keys.ioPublicKey ).then(() => {
            }).catch((err) => {
                throw new Error('Browser error',{ cause: {errorSubtitle: 'Can not process keys.', errorBody: err}});
            });
          }
            getStorePrefix();
            try {
              accountAddress.value = await getWallet(result.value?.keys);
            } catch(err) {
              console.log(`walletAddress ERROR: ${err}`);
              throw new Error(t('errors.restoreCardError'),{ cause: {errorSubtitle: t('pages.authorization.errors.walletError'), errorBody:err}});
            }
            console.log(`walletAddress: ${JSON.stringify(accountAddress.value)}`);
            store.dispatch('user/setAccountAddress',  accountAddress.value ).then(() => {
            }).catch((err) => {
              throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
            });
            if (store.hasModule(`${prefixStore.value}.customtoken`)) {
              store.dispatch(`${prefixStore.value}.customtoken/setPinLength`, Number(pinLength.value));
            }
          }
          store.dispatch('user/resetSeedPhrase');
          isLoading.value = false;
          successMessage.value = `Press OK to continue`;
          success.value = true;
        }

        onMounted(() => {
          console.log(`onMounted store.state.user?.publicKeyCard ${typeof store.state.user?.publicKeyCard} data is ${JSON.stringify(store.state.user?.publicKeyCard)}`);
          if (!store.state.user?.publicKeyCard.ioPublicKey ) {
            authorize.value = true;
            isLoading.value = false;
          } else {
            initial();
          }
        });

        onErrorCaptured(async(err) => {
          const {title, message} = await getErrorMessage(err);
          error.value = true;
          errorTitle.value = title ?? t('pages.seedPhrase.status.errorCreating');
          errorSubtitle.value = message ?? t('pages.send.pressOkToTryAgain');
          console.log(`errorBody = ${err?.cause?.errorBody}`);
          const messageConsole = err?.cause?.errorTitle ? `errorTitle: ${err?.cause?.errorTitle}, ` : null 
            + err?.cause?.errorSubtitle ? `errorSubtitle: ${err?.cause?.errorSubtitle}, ` : null
            + err?.cause?.errorBody ? typeof err?.cause?.errorBody === 'object' || typeof err?.cause?.errorBody  === 'array' ? `errorBody: ${JSON.stringify(err?.cause?.errorBody)}, ` : `errorBody: ${err?.cause?.errorBody}, ` : null;
          console.log(messageConsole);
          isLoading.value = false;
          return false;
        });
  
        return { isLoading, error, seedPhrasesArray, seedPhrasesString, masterKey, copied, titleLoad, pinLength, 
          messageLoad, errorTitle, errorSubtitle, nfcHandlerWindow, nfcIsActive, pinCodeNew, pinCodePre, nfcCancel, 
          pinState, errorImg, successImg, success, successMessage, isShowConfirm, pinValid, errorPin, authorize, 
          errorHandler, createSeed, copyToClip, writeSeed, pinCancelButton, newPin, prePin, enterPinCode, successHandler,
          alertConfirm, alertCancel, authorizeCard, NFCWindowCancel, changePinLength
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
            .middle-box {
              width: 100%;
              height: 100%;

              .seeds-grid {
                display: flex;
                flex-direction: row;
                width: 100%;
                // height: 180px;
                flex-wrap: wrap;
                align-content: flex-start;

                .seeds-column {
                  display: flex;
                  flex-direction: column;
                  width: 50%;
                }

                .seeds-item {
                  display: flex;
                  padding: 6px 12px;
                  flex-direction: row;
                  flex-wrap: nowrap;
                  align-content: center;
                  align-items: center;

                  .number {
                    width: 18px;
                    color: $color-gray;
                  }
                }
              }
            }

                .attention {
                  position: relative;
                  margin-top: 24px;
                  border-color: red;
                  padding: 18px;
                  border-radius: 12px;

                    .attention-label {
                      color: red;
                      padding: 0 8px;
                    }
                }

            .button-group {
              display: flex;
              flex-direction: column;
              width: 100%;
              margin-bottom: 12px;

              button {
                width: 100%;
              }

              .button-second {
                  margin-top: 3%;
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