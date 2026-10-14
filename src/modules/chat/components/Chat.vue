<template>
  <main>
    <div class="container-main">
      <div class="container-box">
        <SendReceiveSwapPanel />
        <ChatWindow />
      </div>
    </div>
  </main>
</template>

<script>
import SendReceiveSwapPanel from '@/components/SendReceiveSwapPanel.vue';
import ChatWindow from './ChatWindow.vue';

export default {
  name: 'Chat page',
  layout: 'Dashboard',
  components: {
    SendReceiveSwapPanel,
    ChatWindow,
  },
};
</script>

<style scoped lang="scss">
.container-main {
  width: 90%;
  height: 100%;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;

  .container-box {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
  }
}
</style>
