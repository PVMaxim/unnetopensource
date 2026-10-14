<template>
  <Panel
    v-if="isError"
    :title="errorTitle"
    :subtitle="errorMessage"
    :iconUrl="errorImg"
    :buttonClick="closeErrorModal"
    :buttonName="$t('button.ok')"
  />
</template>

<script>
import Panel from "@/components/Panel.vue";
import { computed } from "vue";
import { useStore } from "vuex";

export default {
  name: "SwapErrorModal",
  components: {
    Panel,
  },
  setup() {
    const store = useStore();
    const errorImg = new URL("@/assets/images/errorcode.svg", import.meta.url).href;

    const isError = computed(() => store.state.swap.isError);
    const errorTitle = computed(() => store.state.swap.errorTitle);
    const errorMessage = computed(() => store.state.swap.errorMessage);
    const errorHandler = computed(() => store.state.swap.errorHandler);

    const closeErrorModal = () => {
      if (errorHandler.value) {
        errorHandler.value();
      } else {
        store.dispatch("swap/resetError");
      }
    };

    return {
      closeErrorModal,
      errorHandler,
      errorTitle,
      errorMessage,
      isError,
      errorImg,
    };
  },
};
</script>

<style></style>
