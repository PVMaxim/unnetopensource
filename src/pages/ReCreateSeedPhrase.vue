<template>
  <main>
    <div class="container-main">
      <Loading v-if="pageState === 'LOADING'" :messageLoad = messageLoad :titleLoad = titleLoad />
      <Panel  v-else-if="pageState === 'ERROR'"  
        :title=errorTitle 
        :subtitle=errorSubtitle
        :iconUrl=errorImg
        :buttonClick=errorHandler
        :buttonName="$t('button.ok')" />
      <Panel  v-else-if="pageState === 'SUCCESS'"  
        :title="$t('pages.seedPhrase.registrationSuccess')" 
        :subtitle=successMessage
        :iconUrl=successImg
        :buttonClick=successHandler
        :buttonName="$t('button.ok')" />
      <Panel  v-else-if="pageState === 'RESET'"  
        :title="$t('pages.seedPhrase.cardResetTitle')" 
        :subtitle="$t('pages.seedPhrase.cardResetSubtitle')"
        :buttonClick=questionResetCard
        :buttonName="$t('button.ok')" />
      <Panel  v-else-if="pageState === 'AUTHORIZE'"  
        :title="$t('pages.seedPhrase.cardValidation')" 
        :subtitle="$t('pages.seedPhrase.restoreValidationSubtitle')" 
        :buttonClick=authorizeCard
        :buttonName="$t('button.confirm')" />
      <PinCode v-else-if="pageState === 'PIN_NEW'"
        :title="$t('pin.enterPin')"
        v-model="pinCodeNew"
        :error=null
        :buttonClick=null
        :useStorePinCode=false
        @cancelButton="pinCancelButton($event.value)"
        @change="newPin($event.value)" 
        v-model:numberOfDigits=pinLength
        @changePinLength="changePinLength()"
      />
      <PinCode v-else-if="pageState === 'PIN_PRE'"
        :title="$t('pin.reEnterNewPin')"
        v-model="pinCodePre"
        :error=errorPin
        :confirm=pinValid
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
        @onCancel="cancelNfcHandler()"
      />
    </div>
    <AlertConfirmModal 
      v-model="isResetConfirm"
      :title="$t('pages.seedPhrase.resetConfirmTitle')"
      :buttonConfirmText="$t('pages.seedPhrase.reset')"
      :buttonCancelText="$t('button.cancel')"
      @onConfirm="alertResetConfirm($event.value)"
      @onCancel="alertResetCancel($event.value)"
    />
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
    import { generateMnemonic, deriveSeedFromMnemonic } from '@/api/mnemonic';
    import { CmdInit, CmdGetInfo }  from '@/api/card-io';
    import { setUniSettings }  from '@/api/global-settings';
    import { getWallet, clearData, prefixStore } from '../api/ApiHandler';
    import { getErrorMessage } from '@/api/sub-utils';
    import Loading from '@/components/Loading.vue';
    import Panel from '@/components/Panel.vue';
    import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
    import PinCode from '@/components/PinCode.vue';
    import AlertConfirmModal from "@/components/AlertConfirmModal.vue";
    import Button from "@/components/Button.vue";

    export default {
      name: 'ReCreateSeedPhrase',
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
        const pageState = ref('RESET');
        const isResetConfirm = ref(false);
        const nfcIsActive = ref(false);
        const nfcCancel = ref(false);
        const successMessage = ref(t('pages.seedPhrase.pressOkToContinue'));
        const titleLoad = ref(t('pages.seedPhrase.status.wait'));
        const messageLoad = ref(t('pages.seedPhrase.status.creating'));
        const errorTitle = ref(t('pages.seedPhrase.status.errorCreating'));
        const errorSubtitle = ref(t('pages.send.pressOkToTryAgain'));
        const publicKeyCard = ref(undefined);
        const accountAddress = ref(undefined);
        const pinLength = computed(() => { 
          if ( typeof store.state[`${prefixStore.value}.customtoken`]?.pinLength !== undefined ) {
            return store.state[`${prefixStore.value}.customtoken`]?.pinLength
          }
          return 4
        });
        const pinCodeNew = ref(undefined);
        const pinCodePre = ref(undefined);
        const pinValid = ref(false);
        const errorPin = ref(null);
        const router = useRouter();
        const seedPhrasesArray = ref(null);
        const seedPhrasesString = computed(() => { return seedPhrasesArray.value?.join(' '); });
        const seedPhrasesDerive = computed(() => { if (seedPhrasesArray.value?.length === 12) {return deriveSeedFromMnemonic(seedPhrasesString.value); }});
        const masterKey = ref(undefined);
        const copied = ref(false);

        const isShowConfirm = ref(false);

        const nfcHandlerWindow = ref(NFCHandlerWindow);
        const successImg = new URL(`@/assets/images/successcode.svg`, import.meta.url).href;
        const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;

        const initial = async() => {
          if ( typeof seedPhrasesArray.value === null || (typeof seedPhrasesArray.value === 'object' && seedPhrasesArray.value?.length !== 12)) {
            createSeed();
          }
        }

        const changePinLength = () => {
          pageState.value = 'PIN_NEW';
          pinCodeNew.value = undefined;
          pinCodePre.value = undefined;
          pinValid.value = false;
          errorPin.value = null;
        }

        const cancelNfcHandler = () => {
          if (seedPhrasesDerive.value !== null && seedPhrasesDerive.value !== undefined) {
            pageState.value = 'SEED'
          } else {
            pageState.value = 'AUTHORIZE'
          }
        }

        const alertConfirm = (event) => {
          enterPinCode();
        }

        const alertCancel = (event) => {
          pageState.value = 'SEED';
        }

        const questionResetCard = () => {
          isResetConfirm.value = true;
        }

        const alertResetConfirm = (event) => {
          pageState.value = 'AUTHORIZE'
        }

        const alertResetCancel = (event) => {
          router.push({ name: 'settings' });
        }

        const successHandler = () => {
          pinValid.value = false;
          clearData();
          router.push({ name: 'authorization' });
        }

        const pinCancelButton = () => {
          pageState.value = 'SEED';
          pinCodeNew.value = undefined;
          pinCodePre.value = undefined;
          pinValid.value = false;
          errorPin.value = null;
        }

        const newPin = () => {
          if (pinCodeNew.value !== undefined && pinCodeNew.value?.length >= pinLength.value ) {
            pageState.value = 'PIN_PRE';
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

        const errorHandler = () => {
          titleLoad.value = t('pages.seedPhrase.status.wait');
          messageLoad.value = t('pages.seedPhrase.status.creating');
          errorTitle.value = t('pages.seedPhrase.status.errorCreating');
          errorSubtitle.value = t('pages.send.pressOkToTryAgain');
          pinValid.value = false;
          pageState.value = 'AUTHORIZE';
        }

        const NFCWindowCancel = () => {
          nfcCancel.value = true;
          errorHandler();
        }

        const createSeed = () => {
          seedPhrasesArray.value  = generateMnemonic();
        }

        const copyToClip = () => {
          navigator.clipboard.writeText(seedPhrasesArray.value.toString());
          copied.value = true;
          setTimeout(() => copied.value = false, 2000);
        };

        const enterPinCode = () => {
          pinCodeNew.value = undefined;
          pinCodePre.value = undefined;
          pageState.value = 'PIN_NEW';
        }

        const authorizeCard = async () => {
          pageState.value = 'LOADING';
          const resultAuth = ref(undefined);
          const resultPrepareAuthenticate = ref(undefined);
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

            messageLoad.value = 'Card sign submit';
            publicKeyCard.value = resultAuth.value?.keys;

            initial();
            pageState.value = 'SEED';
        }

        const writeSeed = async() => {
          messageLoad.value = 'Prepare card sign';
          pageState.value = 'LOADING';
          const signRequestPrepare = ref(undefined);
          const signResponsePrepare = ref(undefined);
          const result = ref(null);
          setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});
          try {
            signRequestPrepare.value = await CmdInit.buildRequest(
              {
                "seed": seedPhrasesDerive.value,
                "keys": publicKeyCard.value,
                "pin": pinCodePre.value,
              }
            );
          } catch(err) {
            throw new Error(t('errors.restoreCardError'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody: err}});
          }
          messageLoad.value = 'Waiting for card sign';

          result.value = await nfcHandlerWindow.value?.nfcProgressHandler(signRequestPrepare.value, CmdInit, false);
          if (result.value === null || nfcCancel.value === true) { 
            return false;
          }
          switch (result.value?.errorCode) {
            case 1:
            throw new Error(t('errors.restoreCardError'),{ cause: {errorSubtitle: t('errors.wrongPin')}});
            case 2:
              throw new Error(t('errors.restoreCardError'),{ cause: {errorSubtitle: t('errors.cardBlocked')}});
            default:
              break
          }

          if (/^[a-fA-F0-9]{64}$/.test(result.value?.keys?.ed25519) && result.value?.keys?.ed25519!== '0000000000000000000000000000000000000000000000000000000000000000' ) {
            try {
              accountAddress.value = await getWallet(result.value?.keys);
            } catch(err) {
              throw new Error(t('errors.restoreCardError'),{ cause: {errorSubtitle: t('pages.authorization.errors.walletError'), errorBody:err}});
            }

            store.dispatch('user/setPublicKeyCard',  result.value?.keys ).then(() => {
            }).catch((err) => {
              throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
            });
            if (result.value?.ioPublicKey) {
              store.dispatch('user/setPinPublicKey',  result.value?.keys.ioPublicKey ).then(() => {
              }).catch((err) => {
                throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
              });
            }
            store.dispatch('user/setAccountAddress',  accountAddress.value ).then(() => {
            }).catch((err) => {
              throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: err}});
            });
          }
          successMessage.value = t('pages.seedPhrase.pressOkToContinue');
          pageState.value = 'SUCCESS';
        }

        onMounted(async() => {
        });

        onErrorCaptured(async(err) => {
          const {title, message} = await getErrorMessage(err);
          pageState.value = 'ERROR';
          errorTitle.value = title ?? t('pages.seedPhrase.status.errorCreating');
          errorSubtitle.value = message ?? t('pages.send.pressOkToTryAgain');
          const messageConsole = err?.cause?.errorTitle ? `errorTitle: ${err?.cause?.errorTitle}, ` : null 
            + err?.cause?.errorSubtitle ? `errorSubtitle: ${err?.cause?.errorSubtitle}, ` : null
            + err?.cause?.errorBody ? typeof err?.cause?.errorBody === 'object' || typeof err?.cause?.errorBody  === 'array' ? `errorBody: ${JSON.stringify(err?.cause?.errorBody)}, ` : `errorBody: ${err?.cause?.errorBody}, ` : null;
          return false;
        });

        return { pageState, seedPhrasesArray, seedPhrasesString, masterKey, copied, titleLoad, isResetConfirm, pinLength, 
          messageLoad, errorTitle, errorSubtitle, nfcHandlerWindow, nfcIsActive, pinCodeNew, pinCodePre, nfcCancel, 
          errorImg, successImg, successMessage, isShowConfirm, pinValid, errorPin, questionResetCard, changePinLength, 
          errorHandler, createSeed, copyToClip, writeSeed, pinCancelButton, newPin, prePin, enterPinCode, successHandler,
          alertConfirm, alertCancel, alertResetConfirm, alertResetCancel, authorizeCard, cancelNfcHandler, NFCWindowCancel
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