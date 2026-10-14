<template>
  <main>
    <WalletConnectResultModal />
    <QrReader v-if="qrReaderEnabled" :title="$t('qr.scanQrCode')" @qrDetected="onQrReaderOk($event.value)"
      @onClose="onQrReaderClose()" @onError="onQrReaderError($event.value)" />
    <div v-else class="container-main">
      <div class="app-connect-page-panel">
        <div class="app-connect-panel">
          <img class="app-connect-logo" :src="WC_LOGO_URL" loading="lazy" />
          <h3 class="app-connect-title">{{ $t('pages.connectedApps.title') }}</h3>
          <p class="app-connect-subtitle">
            {{ $t('pages.connectedApps.subtitle') }}
            <span style="white-space:nowrap;"> {{ $t('pages.connectedApps.subtitleSpan') }}</span>
          </p>
          <div class="app-connect-link-input-container">
            <InputText v-model="appConnectLink" placeholder="wc:000916a3e270846a16451..." :autofocus="true" />
            <button class="button-paste" @click.prevent=onPaste>
              <PasteIcon />
            </button>
            <button class="button-camera" @click.prevent=onQrReaderNeeded>
              <CameraIcon />
            </button>
          </div>
          <div v-if="connectInProgress" class="loading">
            <Loading />
          </div>
          <div v-else class="app-connect-actions">
            <button class="button-main app-connect-action" :disabled="!appConnectLink"
              @click="onConnect()">{{ $t('pages.connectedApps.connect') }}</button>
            <button v-if="debugMode" class="button-main app-connect-action" @click="onDebug()">{{ $t('pages.connectedApps.debug') }}</button>
          </div>
        </div>
        <ConnectedAppsPanel />
      </div>
    </div>
  </main>
</template>

<script>
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import WalletConnectResultModal, { walletConnectResultModalData } from '@/components/wallet-connect//modals/WalletConnectResultModal.vue';
import QrReader from "@/components/QrReader.vue";
import InputText from '@/components/InputText.vue';
import PasteIcon from '@/components/svg/pasteIcon.vue';
import CameraIcon from '@/components/svg/cameraIcon.vue';
import Loading from "@/components/Loading.vue";
import ConnectedAppsPanel from "@/components/wallet-connect/ConnectedAppsPanel.vue";
import { checkCardKeys, getCardKeys } from '@/api/wallet-connect/wcCardKeys';
import { invalidateConnectedAppsCache, walletConnectHelper } from '@/api/wallet-connect/wcHelper';
import { isWalletConnectDebugMode } from '@/api/wallet-connect/wcDebug';

export default {
  name: "Connected apps",
  layout: "Dashboard",
  components: {
    WalletConnectResultModal,
    QrReader,
    InputText,
    PasteIcon,
    CameraIcon,
    Loading,
    ConnectedAppsPanel,
  },
  setup() {
    const { t } = useI18n();
    const WC_LOGO_URL = new URL(`@/assets/images/walletConnectLogo.svg`, import.meta.url).href;
    const appConnectLink = ref("");
    const qrReaderError = ref(undefined);
    const qrReaderEnabled = ref(false);
    const connectInProgress = ref(false);

    const router = useRouter();

    onMounted(async () => {
      walletConnectResultModalData.value = undefined;

      if (!checkCardKeys(getCardKeys())) {
        router.push({ name: 'authorization' });
      }

      if (navigator.mediaDevices || navigator["getUserMedia"]) {
        navigator.permissions.query({ name: "camera" }).then(async ({ state }) => {
          if (state == "granted") {
            qrReaderError.value = undefined;
            console.log("permission granted!");
          } else if (state == "denied") {
            qrReaderError.value =
              t('pages.connectedApps.cameraPermissionError');
            console.log("permission denied!");
          }
        });
      }
    });

    const onPaste = async () => {
      navigator.clipboard.readText().then(text => {
        appConnectLink.value = text;
      });
    };

    const onQrReaderNeeded = () => {
      qrReaderEnabled.value = true;
    }

    const onQrReaderOk = (value) => {
      console.log("onQrReaderOk");

      qrReaderEnabled.value = false;
      appConnectLink.value = value;

      onConnect();
    };

    const onQrReaderError = (error) => {
      console.log("onQrReaderError", error);

      if (error.startsWith('[NotAllowedError]')) {
        walletConnectResultModalData.value = {
          success: false,
          message: t('pages.connectedApps.unableToUseCamera'),
          details: t('pages.connectedApps.cameraPermissionNotGranted'),
        };
      }

      qrReaderError.value = error;
      qrReaderEnabled.value = false;
    };

    const onQrReaderClose = () => {
      console.log("onQrReaderClose");

      qrReaderEnabled.value = false;
    };

    const onConnect = async () => {
      connectInProgress.value = true;
      try {
        if (!walletConnectHelper.value) {
          throw new Error('WalletConnect helper is not initialized');
        }
        await walletConnectHelper.value.connect(appConnectLink.value);
        appConnectLink.value = "";
        invalidateConnectedAppsCache();
      } catch (error) {
        console.error('onConnect error:', error);
        walletConnectResultModalData.value = {
          success: false,
          message: t('pages.connectedApps.unableToConnect'),
          details: t('pages.connectedApps.obsoleteQrError'),
        }
      } finally {
        connectInProgress.value = false;
      }
    }

    const debugMode = isWalletConnectDebugMode();
    const onDebug = () => {
      const helper = walletConnectHelper.value;
      if (!helper) {
        return;
      }

      helper.test();
    }

    return {
      WC_LOGO_URL,
      appConnectLink,
      qrReaderError,
      qrReaderEnabled,
      connectInProgress,

      onPaste,
      onQrReaderNeeded,
      onQrReaderOk,
      onQrReaderClose,
      onQrReaderError,
      onConnect,

      debugMode,
      onDebug,
    };
  },
};
</script>

<style scoped lang="scss">
.container-main {
  width: 90%;
  height: 100%;
}

.app-connect-page-panel {
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: column;
  gap: 12px;

  align-items: center;
  margin-bottom: 16px;
}

.app-connect-panel {
  display: flex;
  flex-direction: column;
  gap: 0px;
  width: calc(100% - 40px);
  background-color: $color-black-23;
  border-radius: 16px;
  border: 1px solid $color-black-40;
  padding: 24px;

  .app-connect-logo {
    width: 80px;
    margin: 0px auto 20px auto;
  }

  .app-connect-title {
    font-size: 24px;
    font-weight: 600;
    color: $color-white;
    text-align: center;
    margin-top: 0px;
    margin-bottom: 12px;
  }

  .app-connect-subtitle {
    font-size: 16px;
    font-weight: 500;
    color: rgba($color-white, .5);
    text-align: center;
    margin-top: 0px;
    margin-bottom: 27px;
  }

  .app-connect-link-input-container {
    width: 100%;
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: end;
    justify-content: space-between;

    button {
      width: 27px;
      height: 27px;
      padding: 0px;
      border: none;
      background-color: rgba(255, 255, 255, 0);
      display: flex;
      overflow: hidden;
      align-items: center;
      justify-content: center;
    }

    .button-paste {
      svg {
        width: 24px;
        height: 24px;
      }
    }

    .button-camera {
      svg {
        width: 27px;
        height: 27px;
      }
    }

    .input-container {
      width: 100%;
      padding: 0px;
    }
  }

  .loading {
    margin: 20px auto 0px auto;
    justify-items: center;
  }

  .app-connect-actions {
    margin-top: 20px;
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  .app-connect-action {
    width: 100%;
  }
}
</style>
