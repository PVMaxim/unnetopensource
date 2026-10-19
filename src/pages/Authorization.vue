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
      <div v-show="!error && !isLoading" class="container-app">
        <div class="button-group">
          <Button
            :buttonName="$t('pages.authorization.connectCard')"
            buttonType="main"
            buttonRound="round12"
            @onClick="authorizationHandler()"
          />
          <Button
            :buttonName="$t('pages.authorization.restoreCard')"
            buttonType="transparent"
            @onClick="restoreHandler()"
          />
        </div>
      </div>
      <div class="panel" v-show="nfcIsActive">
        <NFCHandlerWindow 
          ref="nfcHandlerWindow"
          :title="$t('nfcHandler.touchYourCard')"
          :subTitle="$t('nfcHandler.holdYourCard')"
          v-model:isActive=nfcIsActive
          @onCancel="isLoading=false"
        />
      </div>
    </div>
  </main>
</template>

<script>
  import { ref, computed, onMounted, onErrorCaptured } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useStore } from 'vuex';
  import { useRouter, useRoute } from 'vue-router';
  import { useEventsBus } from '@/plugins/eventBus.js';
  import { CmdGetInfo, parsePublicKeyHexList }  from '../api/card-io';
  import { setUniSettings }  from '../api/global-settings';
  import { getWallet, getStorePrefix } from '../api/ApiHandler';
  import { isWebViewApp, getErrorMessage, isTheSamePublicKey } from '@/api/sub-utils';
  import Loading from '@/components/Loading.vue';
  import Panel from '@/components/Panel.vue';
  import NFCHandlerWindow from '@/components/NFCHandlerWindow.vue';
  import { isCardRegistered, isCardIsNew, isCardBroken, checkAndSetVersionFromUrl } from '../api/check-guards';
  import Button from "@/components/Button.vue";

  export default {
    name: 'Authorization page',
    layout: 'Dashboard',
    components: {
      Loading,
      Panel,
      NFCHandlerWindow,
      Button
    },
    setup() {
      const { t } = useI18n();
      const store = useStore();
      const isLoading = ref(false);
      const nfcIsActive = ref(false);
      const error = ref(false);
      const titleLoad = ref(t('pages.authorization.status.wait'));
      const messageLoad = ref(t('pages.authorization.status.authorizing'));
      const errorTitle = ref(t('pages.authorization.errors.title'));
      const errorSubtitle = ref(t('pages.authorization.errors.subtitle'));
      const route = useRoute();
      const router = useRouter();
      const publicKeyCard = ref(undefined);
      const accountAddress = ref(undefined);
      const errorImg = new URL(`@/assets/images/errorcode.svg`, import.meta.url).href;

      const nfcHandlerWindow = ref(NFCHandlerWindow);

      const toggleOptions = computed(() => { return {
        layout: {
          color: 'rgb2(255, 255, 255, .6)',
          backgroundColor: 'rgba(0,0,0,0)',
          selectedColor: 'rgba(17, 17, 17, 1)',
          selectedBackgroundColor: 'rgb(255, 152, 0)',
          borderColor: 'none',
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
            { name: 'nfc', value: "nfc",  width: '60px', padding: '8px 12px' },
            { name: 'fido', value: "fido", width: '60px', padding: '8px 12px' }
          ]
        }
      }});

      const updatePriorityCard = async(event) => {
        await store.dispatch('settings/setCardReaderPriority', event ).then(() => {
          }).catch((error) => {
            error.value = true;
            errorSubtitle.value = error;
            return;
          });
      }

      const restoreHandler = async() => {
        router.push({ name: 'restore-card' });
      }

      const authorizationHandler = async() => {
        isLoading.value = true;
        const resultPrepareNFC = ref(null);
        const resultAuth = ref(undefined);
        const resultPrepareAuthenticate = ref(undefined);

        messageLoad.value = t('pages.authorization.status.prepareSign');
        setUniSettings({ioMethod: store.state.settings.cardReaderPriority === 'fido' ? 'fido' : 'nfc'});
        try {
          resultPrepareNFC.value = await CmdGetInfo.buildRequest();
        } catch (err) {
          throw new Error(t('errors.authorizationError'),{ cause: {errorSubtitle: t('pages.authorization.errors.prepareError'), errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err}});
        }

        if (!publicKeyCard.value) {
          messageLoad.value = t('pages.authorization.status.waitingSign');
          resultAuth.value = await nfcHandlerWindow.value?.nfcProgressHandler(resultPrepareNFC.value, CmdGetInfo, false);
          messageLoad.value = t('pages.authorization.status.verificationSign');
          messageLoad.value = t('pages.authorization.status.submitSign');
          publicKeyCard.value = resultAuth.value?.keys;
          if (resultAuth.value?.version) {
            store.dispatch('settings/setCardVersion',  resultAuth.value?.version ).then(() => {
            }).catch((err) => {
            });
          }
          if (resultAuth.value?.isNewCard !== undefined) {
            store.dispatch('user/setRegistered',  resultAuth.value?.isNewCard);
          }
        }

        isTheSamePublicKey(publicKeyCard.value);

        if (publicKeyCard.value !== null && publicKeyCard.value?.ioPublicKey) {
          store.dispatch('user/setPinPublicKey',  publicKeyCard.value?.ioPublicKey ).then(() => {
          });
        }

        store.dispatch('user/setPublicKeyCard',  publicKeyCard.value ).then(() => {
        }).catch((err) => {
          throw new Error(t('errors.authorizationError'),{ cause: {errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err}});
        });

        const prefix = getStorePrefix();

        if (isCardIsNew()) {
          router.push({ name: 'registration-card' });
          return;
        }
        if (!isCardIsNew() && !isCardBroken()) {
          try {
            accountAddress.value = await getWallet( store.state.user.publicKeyCard, true );
          } catch(err) {
            throw new Error(t('errors.authorizationError'),{ cause: {errorSubtitle: t('pages.authorization.errors.walletError'), errorBody:err}});
          }

          store.dispatch('user/setAccountAddress',  accountAddress.value ).then(() => {
          }).catch((err) => {
            throw new Error(t('errors.browserError'),{ cause: {errorSubtitle: t('pages.authorization.errors.processError'), errorBody: typeof err === 'object' || typeof err === 'array' ? JSON.stringify(err) : err}});
          });
        }

        if (isCardRegistered() && !isCardIsNew()) {
          router.push({ name: 'dashboard' });
          return;
        } else if (isCardBroken()) {
          throw new Error(t('errors.cardError'),{ cause: {errorSubtitle: t('pages.authorization.errors.validError')}});
        }
        isLoading.value = false;
       }

      useEventsBus().on('useAnotherCard', (payload) => {
        throw new Error(t('errors.cardError'),{ cause: {errorSubtitle: t('pages.authorization.errors.anotherCard')}});
      });

      const errorHandler = () => {
        publicKeyCard.value = undefined;
        accountAddress.value = undefined;
        error.value = false;
        errorTitle.value = t('pages.authorization.errors.title');
        errorSubtitle.value = t('pages.authorization.errors.subtitle');
        titleLoad.value = t('pages.authorization.status.wait');
        messageLoad.value = t('pages.authorization.status.authorizing');
        router.push({ name: 'authorization' });
      }

      async function detectNfcCapabilities() {
        const result = {
          webNfc: 'NDEFReader' in window,
          webAuthn: !!window.PublicKeyCredential,
          webUsb: 'usb' in navigator,
        };

        if (result.webNfc) {
          try {
            const reader = new NDEFReader();
            await reader.scan();
            result.nfcAvailable = true;
          } catch {
            result.nfcAvailable = false;
          }
        }

        if (result.webAuthn) {
          const platform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          result.platformAuthenticator = platform;
        }

        return result;
      }

      onMounted(() => {
        detectNfcCapabilities().then(() => {});
        checkAndSetVersionFromUrl(route.query);

        if (route.params.publicKey ) {
          try {
            publicKeyCard.value = parsePublicKeyHexList(route.params.publicKey);
            authorizationHandler();
          } catch(err) {
          }
        }
        isLoading.value = false;
      });

      onErrorCaptured(async(err) => {
        const {title, message} = await getErrorMessage(err);
        error.value = true;
        errorTitle.value = title ?? t('pages.authorization.errors.title');
        errorSubtitle.value = message ?? t('pages.authorization.errors.subtitle');
        const messageConsole = err?.cause?.errorTitle ? `errorTitle: ${err?.cause?.errorTitle}, ` : null 
          + err?.cause?.errorSubtitle ? `errorSubtitle: ${err?.cause?.errorSubtitle}, ` : null
          + err?.cause?.errorBody ? typeof err?.cause?.errorBody === 'object' || typeof err?.cause?.errorBody  === 'array' ? `errorBody: ${JSON.stringify(err?.cause?.errorBody)}, ` : `errorBody: ${err?.cause?.errorBody}, ` : null;
        isLoading.value = false;
        return false;
      });

      return { isWebViewApp, isLoading, error, authorizationHandler, errorHandler, restoreHandler, toggleOptions, updatePriorityCard, 
        errorImg, nfcHandlerWindow, titleLoad, messageLoad, errorTitle, errorSubtitle, nfcIsActive
      }
    },
  }
</script>

<style scoped lang="scss">
  .container-main {
    width: 90%;
    flex-direction: column;
  }
  .container-app {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
  }

  .button-group {
    width: 90%;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    button {
      width: 100%;
      font-size: 14px;
    }

    .get-card {
      display: flex;
      flex-direction: row;

      .get-card-link {
        color: $color-orange;
        margin-left: 5px;

        &:hover{
          color: $color-orange-hover;
        }
      }
    }
  }
  .web-app {
    .button-group {
      margin-bottom: 42px;
    }
  }
</style>