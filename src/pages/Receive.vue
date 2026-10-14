<template>
  <main>
    <div class="container-main" :class="[{falc: isLoading || error}]">
      <Loading v-if="isLoading" :messageLoad = messageLoad :titleLoad = titleLoad />
      <Panel  v-else-if="error"  
        :title="$t('pages.receive.errors.title')" 
        :subtitle=errorSubtitle
        :iconUrl=errorImg
        :buttonClick=errorHandler
        buttonName="Ok" />
      <div class="container-box" v-else>
        <SendReceiveSwapPanel 
          :disableReceive="true"
        />
        <div class="send-box">
          <div class="qr-window">
            <div class="title">{{ $t('pages.receive.title') }} {{ storeProvider?.name }}</div>
            <div class="card-address-group">
              {{ $t('pages.receive.walletAddress') }} 
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
            </div>
            <Qrcode
              class="qrImage"
              :value="accountAddress"
              :size=225
              level="H"
              renderAs='svg'
              background='#1f1f1f'
              foreground='#ffffff'
            />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
  import { ref, onMounted, onErrorCaptured, computed } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useStore } from 'vuex';
  import { useRouter } from 'vue-router';
  import SendReceiveSwapPanel from '@/components/SendReceiveSwapPanel.vue';
  import { isValidWalletAddress } from '@/api/ApiHandler';
  import { getErrorMessage, copyToClipboard } from '@/api/sub-utils';
  import Loading from '@/components/Loading.vue';
  import Panel from '@/components/Panel.vue';
  import CopyIcon from '@/components/svg/copyIcon.vue';
  import QrCodeIcon from '@/components/svg/qrCodeIcon.vue';
  import Qrcode from '@/plugins/qrcode-generate';
  
  export default {
    name: 'Receive page',
    layout: 'Dashboard',
    components: {
      Loading,
      SendReceiveSwapPanel,
      Qrcode,
      CopyIcon,
      QrCodeIcon,
      Panel
    },
    setup() {
      const { t } = useI18n();
      const store = useStore();
      const isLoading = ref(false);
      const error = ref(false);
      const titleLoad = ref(t('pages.receive.status.wait'));
      const messageLoad = ref(t('pages.receive.status.gettingData'));
      const errorTitle = ref(t('pages.receive.errors.title'));
      const errorSubtitle = ref(t('pages.receive.errors.subtitle'));
      const router = useRouter();
      const storeProvider = computed(() => { return store.state.settings.rpcProvider });
      const accountAddress = computed(() => { return store.state.user.accountAddress });
      const accountAddressShort = computed(() => { 
        if (accountAddress?.value?.length > 10) {
          return accountAddress?.value.substring(0,4) + '...' + accountAddress.value.substring(accountAddress?.value.length - 3);
        }return store.state.user.accountAddress });
      const copied = ref(false);

      const errorHandler = () => {
        error.value = false;
        titleLoad.value = t('pages.receive.status.wait');
        messageLoad.value = t('pages.receive.status.gettingData');
        errorTitle.value = t('pages.receive.errors.title');
        errorSubtitle.value = t('pages.receive.errors.subtitle');
        router.push({ name: 'receive' });
      }

      const copyToClip = async() => {
        const result = ref(await copyToClipboard(accountAddress.value));
        if (result.value > 0) {
          copied.value = true;
          setTimeout(() => copied.value = false, 2000);
        }
      };

      onMounted(async() => {
        if ( typeof(store.state.user.accountAddress) !== 'string' ) {
          router.push({ name: 'authorization' });
        } else if ( !isValidWalletAddress(store.state.user.accountAddress ) ) {
          router.push({ name: 'authorization' });
        }
      });

      onErrorCaptured(async(err) => {
        const {title, message} = await getErrorMessage(err);
        error.value = true;
        errorTitle.value = title ?? t('pages.receive.errors.receiveError');
        errorSubtitle.value = message ?? t('pages.receive.errors.subtitle');
        console.log(`errorBody = ${err?.cause?.errorBody}`);
        const messageConsole = err?.cause?.errorTitle ? `errorTitle: ${err?.cause?.errorTitle}, ` : null 
          + err?.cause?.errorSubtitle ? `errorSubtitle: ${err?.cause?.errorSubtitle}, ` : null
          + err?.cause?.errorBody ? typeof err?.cause?.errorBody === 'object' || typeof err?.cause?.errorBody  === 'array' ? `errorBody: ${JSON.stringify(err?.cause?.errorBody)}, ` : `errorBody: ${err?.cause?.errorBody}, ` : null;
        console.log(messageConsole);
        isLoading.value = false;
        return false;
      });

      return { isLoading, error, titleLoad, messageLoad, errorTitle, errorSubtitle, accountAddress, storeProvider, 
        accountAddressShort, copied, copyToClip, errorHandler
      }
    },
  }
</script>

<style scoped lang="scss">
.container-main{
  width: 90%;
  height: 100%;
  flex-direction: column;
  justify-content: flex-start;

  &.falc {
    justify-content: center;
  }

  .container-box {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 16px;

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
      // margin-bottom: 16px;
    }

    .card-address-group {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: $color-gray;
      margin: 12px 0px;

      .public-key-card-group {
        width: calc(100% - 36px);
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;

        .public-key-card {
          width: 100%;
          padding: 5px 18px 5px 0;
          
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

      .button-clipboard {
        width: initial;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(255, 255, 255, 0);
        color: rgb(255, 255, 255);
        border-radius: 0px;
        overflow: hidden;
        border: none;
        padding: 9px;
        position: relative;
        -webkit-appearance: none;
        -moz-appearance: none;
        appearance: none;
        height: 18px;

        svg {
          width: 18px;
          height: 18px;

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
    }
  }

  .qr-window {
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

    .qrImage {
      margin: 24px 0;
    }
  }
}

// .web-app {
//   .container-main{
//     .container-box{

//     }
//   }
// }
</style>