<template>
  <main :class="[{ qrReaderMode: qrReaderMode }]">
    <QrReader
      v-if="qrReaderMode"
      :title="$t('qr.scanQrCode')"
      @onDetected="onQrReaderOk($event.value)"
      @onClose="onQrReaderClose()"
      @onError="onQrReaderError($event.value)"
    />
    <div v-else-if="walletConnectReady" class="container-main">
      <div class="qr-section">
        <div>{{ $t('pages.connectToApp.scanAppLink') }}</div>
        <button
          class="button-camera"
          @click.prevent="enableQrReaderMode"
          :disabled="qrReaderError !== undefined"
        >
          <CameraIcon />
        </button>
      </div>

      <div class="manual-section">
        <div>{{ $t('pages.connectToApp.specifyManually') }}</div>
        <InputText v-model="appConnectLink" placeholder="wc:a281567bb3e4..." />
        <Button
          :buttonName="$t('pages.connectToApp.connect')"
          buttonType="main"
          :disabled="!appConnectLink"
          @onClick="connect()"
        />
      </div>
    </div>
  </main>
</template>

<script>
import { ref, onMounted, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import QrReader from '@/components/QrReader.vue';
import Button from '@/components/Button.vue';
import InputText from '@/components/InputText.vue';
import CameraIcon from '@/components/svg/cameraIcon.vue';
import { WalletConnectHelper } from '../api/wallet-connect/wallet-connect-helper';

export default {
  name: 'Connect to app',
  layout: 'Dashboard',
  components: {
    Button,
    InputText,
    QrReader,
    CameraIcon,
  },
  setup() {
    const { t } = useI18n();
    const store = useStore();
    const router = useRouter();

    const walletConnectReady = ref(false);
    const appConnectLink = ref('');
    const qrReaderError = ref(undefined);
    const qrReaderMode = ref(false);

    onMounted(async () => {
      //   if (!store.state.user.publicKeyCard || store.state.user.publicKeyCard.ed25519 === '0000000000000000000000000000000000000000000000000000000000000000') {
      //     router.push({ name: 'authorization' });
      //   }

      await WalletConnectHelper.recreateIfNeeded();
      walletConnectReady.value = WalletConnectHelper.isReady();

      if (navigator.mediaDevices || navigator['getUserMedia']) {
        navigator.permissions
          .query({ name: 'camera' })
          .then(async ({ state }) => {
            if (state == 'granted') {
              qrReaderError.value = undefined;
              console.log('permission granted!');
            } else if (state == 'denied') {
              qrReaderError.value =
                t('pages.connectToApp.cameraPermissionError');
              console.log('permission denied!');
            }
          });
      }

      console.log(walletConnectReady.value);
    });

    watchEffect(async () => {
      if (qrReaderMode.value) {
        document.body.classList.remove('scroll');
      } else {
        document.body.classList.add('scroll');
      }
    });

    const connect = async () => {
      console.log('Connect', appConnectLink.value);
      await WalletConnectHelper.required().connect(appConnectLink.value);
    };

    const enableQrReaderMode = () => {
      qrReaderMode.value = true;
    };

    const onQrReaderOk = (value) => {
      console.log('onQrReaderOk', value);
      qrReaderMode.value = false;
      appConnectLink.value = value;
    };

    const onQrReaderError = (error) => {
      qrReaderMode.value = false;
      qrReaderError.value = error;
    };

    const onQrReaderClose = () => {
      qrReaderMode.value = false;
    };

    return {
      walletConnectReady,
      appConnectLink,
      connect,
      qrReaderError,
      qrReaderMode,
      enableQrReaderMode,
      onQrReaderOk,
      onQrReaderClose,
      onQrReaderError,
    };
  },
};
</script>

<style scoped lang="scss">
.container-main {
  width: 90%;
  flex-direction: column;
  gap: 60px;
}
.qr-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.manual-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.button-camera {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0);
  color: rgb(255, 255, 255);
  border-radius: 8px;
  overflow: hidden;
  font-size: 18px;
  padding: 10px;

  svg {
    width: 50px;
    height: 50px;
  }
}
main {
  &.qrReaderMode {
    .container-main {
      width: 100%;
    }
  }
}
</style>

<style lang="scss">
body.scroll {
  overflow-y: auto;

  header {
    position: relative !important;
  }

  main {
    height: initial;
    padding-top: 4px;
  }
}
</style>
