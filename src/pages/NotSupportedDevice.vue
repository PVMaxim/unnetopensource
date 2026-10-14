<template>
    <main>
      <div class="container-main">
        <div class="panel">
          <div class="icon">
            <Qrcode
              class="qrImage"
              :value="url"
              :size=150
              level="H"
              renderAs='svg'
              background='#1f1f1f'
              foreground='#ffffff'
            />
          </div>
          <div class="title">
            {{ $t('pages.notSupportedDevice.title') }} <span class="text-orange">{{ $t('pages.notSupportedDevice.titleSpan') }}</span>.
          </div>
          <div class="subtitle">
            {{ $t('pages.notSupportedDevice.subtitle') }}
          </div>
        </div>
      </div>
    </main>
  </template>
    
<script>
import { ref } from 'vue';
  import Qrcode from '@/plugins/qrcode-generate';
  import { getHost } from '@/api/ApiHandler';

  export default {
    name: 'NotSupportedDevice',
    layout: 'NotSupported',
    components: {
      Qrcode
    },
    setup() {
      const url = ref(`https://${getHost()}/`);
      return { url }
    }
  }
</script>

<style scoped lang="scss">
body main {
  padding-top: 0px;
  height: calc(100% - 144px);

  .panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0px 5% 24px 5%;

    .icon {
      margin-bottom: 36px;
    }

    .title{
      font-size: clamp(24px, calc(25px + (31 - 25) * (100vw - 400px)/(460 - 400)), 32px);
      line-height: clamp(32px, calc(33px + (43 - 33) * (100vw - 400px)/(460 - 400)), 44px);
      font-weight: 600;
      text-align: center;
      margin: 0;
      padding-bottom: 16px;
      width: 100%;
      word-break: break-word;
    }
    .subtitle{
      font-size: 16px;
      font-weight: 400;
      line-height: 19px;
      text-align: center;
      margin-bottom: 20px;
      width: 100%;
      word-break: break-word;
    }
    .error {
      color: red;
      width: 100%;
      word-break: break-word;
    }
  }
}</style>