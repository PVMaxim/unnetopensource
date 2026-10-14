<template>
  <div class="background" :style="{ background: `url(${backgroundImg}) center center / contain no-repeat` }"></div>
  <Header />
    <slot v-if="!isCantonOnboardingActive"></slot>
    <CantonOnboardingOverlay />
    <PermissionsModal />
    <div v-if="!network.isOnline" class="is-online">You are currently offline.</div>
</template>
    
<script>
  import { ref, reactive, watchEffect, defineComponent } from "vue";
  import { useRouter } from 'vue-router';
  import Header from "@/components/Header.vue";
  import CantonOnboardingOverlay from "@/components/CantonOnboardingOverlay.vue";
  import PermissionsModal from "@/components/permissionManager/PermissionsModal.vue";
  import { useNetwork } from '@/plugins/utils/useNetwork';
  import { isCantonOnboardingActive } from "@/plugins/cantonState";

  export default defineComponent({
    name: "DashboardLayout",
    components: {
      Header,
      CantonOnboardingOverlay,
      PermissionsModal
    },
    setup() {
      const router = useRouter();
      const network = reactive(useNetwork())
      const backgroundImg = new URL(`@/assets/images/RadialBackgroundWithoutText.svg`, import.meta.url).href;
      const prevNetworkState = ref(false);

      watchEffect(() => {
        if (!network.isOnline) {
          prevNetworkState.value = true;
          console.log('online prevNetworkState');
        }
        setTimeout(3000);
        if (prevNetworkState.value && network.isOnline) {
          console.log('online refresh');
          prevNetworkState.value = false;
          router.go();
        }
      });
      return { backgroundImg, network, isCantonOnboardingActive };
    }
  });
</script>

<style scoped lang="scss">
  .is-online {
    position: fixed;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    top:0;
    color: $color-white;
    background-color: $color-red;
    padding: 4px 0;
    z-index: 999;
  }

.background{
  width: 100%;
  height: 200%;
  max-width: 1392px;
  position: fixed;
  top: 0;
  margin: 0 auto;
  left: 50%;
  top: -95%;
  transform: translate(-50%) scale(.9);
  z-index: 0;
  opacity: .25;

  @media (max-width: 480px) {
    transform: translate(-50%) scale(1.9);
  }
  @media (min-width: 480px) and (max-width: 640px) {
    transform: translate(-50%) scale(1.7);
  }
  @media (min-width: 640px) and (max-width: 820px) {
    transform: translate(-50%) scale(1.4);
  }
  @media (min-width: 820px) and (max-width: 1024px) {
    transform: translate(-50%) scale(1.2);
  }
  @media (min-width: 1024px) and (max-width: 1440px) {
    transform: translate(-50%) scale(1);
  }
}
</style>