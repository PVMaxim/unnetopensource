<template>
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
      return { network, isCantonOnboardingActive };
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
</style>