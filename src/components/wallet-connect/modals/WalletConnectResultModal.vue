<template>
  <Teleport to="body">
    <div v-if="walletConnectResultModalData" class="backdrop">
      <div class="result">
        <ResultDialog :success="walletConnectResultModalData.success" :close="closeModal"
          :message="walletConnectResultModalData.message" :details="walletConnectResultModalData.details" />
      </div>
    </div>
  </Teleport>
</template>

<script>
import { defineComponent, ref } from 'vue';
import ResultDialog from '../ResultDialog.vue';

export const walletConnectResultModalData = ref();

export default defineComponent({
  name: 'WalletConnectResultModal',
  components: {
    ResultDialog,
  },
  setup: (_props) => {
    const closeModal = () => {
      walletConnectResultModalData.value = undefined;
    };
    return {
      closeModal,
      walletConnectResultModalData,
    };
  },
});
</script>

<style lang="scss" scoped>
.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 12;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result {
  position: relative;
  width: 100%;
  max-width: 620px;
  margin: auto;

  padding: 30px;

  display: flex;
  justify-content: center;
}
</style>
