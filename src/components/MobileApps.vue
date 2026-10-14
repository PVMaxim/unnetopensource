<template>
  <div class="application-buttons-group">
    <GooglePlay @click="goToGoogle()" />
    <AppStore @click="goToApple()" />
    <Apk @click="goToApk()" />
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import GooglePlay from '@/components/svg/landing/app-googleplay.vue';
import AppStore from '@/components/svg/landing/app-appstore.vue';
import Apk from '@/components/svg/landing/app-apk.vue';

export default defineComponent({
  name: 'Mobile Applications',
  components: {
    GooglePlay,
    AppStore,
    Apk
    },
  setup() {
    const goToGoogle = () => {
			window.open('https://play.google.com/store/apps/details?id=united.network', '_blank');
		}

    const goToApple = () => {
			window.open('https://apps.apple.com/ua/app/united-network-crypto-wallet/id6743347938', '_blank');
		}

    const goToApk = () => {
			const link = document.createElement('a');
      link.href = `https://apk.united.network/unitednetwork.apk?v=1`;
      link.target = '_blank';
      link.download = 'https://apk.united.network/unitednetwork.apk';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
		}
    return { goToGoogle, goToApple, goToApk }
  }
});
</script>

<style scoped lang="scss">
  .application-buttons-group {
   display: flex;
   flex-direction: row;
   flex-wrap: nowrap;
   justify-content: center;
   align-items: center;
   margin-top: 24px;
   z-index: 3;

   svg {
    width: 25%;

    &:not(:last-child) {
      margin-right: 1%;
    }
   }
  }

  @media (max-width: 600px) {
    .application-buttons-group {
      svg {
        width: 33.33%;
      }
    }
  }
</style>
