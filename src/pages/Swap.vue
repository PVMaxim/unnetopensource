<template>
  <main>
    <div class="container-main" :class="[{ falc: isLoading || isPageError }]">
      <Loading v-if="isLoading" :messageLoad="messageLoad" :titleLoad="titleLoad" />
      <Panel
        v-else-if="isPageError"
        :title="displayErrorTitle"
        :subtitle="displayErrorSubtitle"
        :iconUrl="errorImg"
        :buttonClick="errorHandler"
        :buttonName="$t('button.ok')"
        :isDisabled="isProviderUnsupported"
      />
      <template v-else>
        <div class="container-box">
          <SendReceiveSwapPanel :disableSwap="true" />
          <SendReceiveSwapTabs
            firstTab="Swap"
            secondTab="History"
            v-model:activeTab="activeTab"
            @change="setActiveTab($event.value)"
          />
          <div class="swap-box">
            <SwapForm v-if="activeTab === 'Swap'" />
            <SwapHistory v-if="activeTab === 'History'" />
          </div>
        </div>
      </template>
    </div>
  </main>
</template>

<script>
import SendReceiveSwapPanel from "@/components/SendReceiveSwapPanel.vue";
import SendReceiveSwapTabs from "@/components/SendReceiveSwapTabs.vue";
import SwapForm from "@/features/swap-form";
import SwapHistory from "@/components/SwapHistory.vue";
import Loading from "@/components/Loading.vue";
import Panel from "@/components/Panel.vue";
import { ref, computed, onMounted, onErrorCaptured, watch } from "vue";
import { useStore } from "vuex";
import { useI18n } from "vue-i18n";
import { SWAP_PAGE_TABS } from "../store/constants";
import { getErrorMessage } from "@/api/sub-utils";
import { useEventsBus } from "@/plugins/eventBus.js";

export default {
  name: "Swap Page",
  layout: "Dashboard",
  components: {
    SendReceiveSwapPanel,
    SendReceiveSwapTabs,
    SwapForm,
    SwapHistory,
    Loading,
    Panel,
  },

  setup() {
    const store = useStore();
    const { t } = useI18n();

    const error = ref(false);
    const errorTitle = ref("");
    const errorSubtitle = ref("");
    const errorImg = new URL("@/assets/images/errorcode.svg", import.meta.url).href;
    const isLoading = ref(false);
    const titleLoad = ref("");
    const messageLoad = ref("");

    const isSwapStoreError = computed(() => store.state.swap.isError);
    const swapStoreErrorTitle = computed(() => store.state.swap.errorTitle);
    const swapStoreErrorMessage = computed(() => store.state.swap.errorMessage);
    const swapStoreErrorHandler = computed(() => store.state.swap.errorHandler);

    const isPageError = computed(() => error.value || isSwapStoreError.value);
    const displayErrorTitle = computed(
      () => errorTitle.value || swapStoreErrorTitle.value || t("errors.transferError")
    );
    const displayErrorSubtitle = computed(
      () => errorSubtitle.value || swapStoreErrorMessage.value || t("pages.send.pressOkToTryAgain")
    );

    const isProviderUnsupported = computed(() => {
      const title = displayErrorTitle.value?.toLowerCase?.() || "";
      const subtitle = displayErrorSubtitle.value?.toLowerCase?.() || "";
      return (
        title.includes("provider not supported") ||
        subtitle.includes("select another provider")
      );
    });

    const errorHandler = () => {
      error.value = false;
      errorTitle.value = "";
      errorSubtitle.value = "";
      if (swapStoreErrorHandler.value) {
        swapStoreErrorHandler.value();
      }
      store.dispatch("swap/resetError");
    };

    const handleProviderChange = (newProvider) => {
      const provider = newProvider || store.state.settings.rpcProvider;
      if (provider) {
        store.dispatch("swap/setFromProvider", provider);
      }
      error.value = false;
      errorTitle.value = "";
      errorSubtitle.value = "";
    };

    const setActiveTab = (event) => {
      switch (event?.toLowerCase()) {
        case SWAP_PAGE_TABS.SWAP:
          store.dispatch("swap/setActiveTab", SWAP_PAGE_TABS.SWAP);
          return true;
        case SWAP_PAGE_TABS.HISTORY:
          store.dispatch("swap/setActiveTab", SWAP_PAGE_TABS.HISTORY);
          return true;
        default:
          return false;
      }
    };

    const activeTab = computed({
      get: () =>
        store.state.swap.activeTab.charAt(0).toUpperCase() +
        store.state.swap.activeTab.slice(1),
      set: (value) => {
        setActiveTab(value);
      },
    });

    onMounted(() => {
      store.dispatch("swapHistory/checkIsHistoryExist");
      if (store.state.settings.rpcProvider) {
        handleProviderChange(store.state.settings.rpcProvider);
      }
    });

    useEventsBus().on("rpcProviderChange", () => {
      handleProviderChange();
    });

    watch(
      () => store.state.settings.rpcProvider,
      (newProvider) => {
        handleProviderChange(newProvider);
      }
    );

    onErrorCaptured(async (err) => {
      const { title, message } = await getErrorMessage(err);
      error.value = true;
      errorTitle.value = title ?? t("errors.transferError");
      errorSubtitle.value = message ?? t("pages.send.pressOkToTryAgain");
      isLoading.value = false;
      return false;
    });

    return {
      activeTab,
      SWAP_PAGE_TABS,
      setActiveTab,
      error,
      errorTitle,
      errorSubtitle,
      errorImg,
      errorHandler,
      isLoading,
      titleLoad,
      messageLoad,
      isPageError,
      displayErrorTitle,
      displayErrorSubtitle,
      isProviderUnsupported,
    };
  },
};
</script>

<style scoped lang="scss">
.container-box {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .swap-box {
    width: 100%;
    height: calc(100% + 16px);
    overflow-x: hidden;
    overflow-y: auto;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
}

.container-main {
  width: 90%;
  height: 100%;
  flex-direction: column;
  align-items: center;
}
</style>