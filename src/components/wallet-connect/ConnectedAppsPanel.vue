<template>
  <div v-if="connectedAppsCache?.length" class="connected-apps-panel">
    <div class="connected-apps-list">
      <div class="connected-apps-title">Connected Applications</div>
      <ConnectedAppCard v-for="app in connectedAppsCache" :key="app.key" :appKey="app.key"
        :metadata="app.sessions[0].peerMetadata" :disconnect="() => disconnect(app.sessions)" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";
import ConnectedAppCard from "./ConnectedAppCard.vue";
import { connectedAppsCache, invalidateConnectedAppsCache, walletConnectHelper } from '@/api/wallet-connect/wcHelper';

export default defineComponent({
  name: "ConnectedAppsPanel",
  components: {
    ConnectedAppCard,
  },
  setup() {
    const disconnect = async (sessions) => {
      const helper = walletConnectHelper.value;
      if (!helper) {
        return;
      }

      try {
        await Promise.allSettled(sessions.map(session => helper.disconnectSession(session.topic)));
      } finally {
        invalidateConnectedAppsCache();
      }
    }

    return {
      connectedAppsCache,
      disconnect,
    };
  },
});
</script>

<style scoped lang="scss">
.connected-apps-panel {
  width: calc(100% - 40px);
  height: fit-content;
  max-height: 100%;

  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 0px;

  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  background-color: $color-black-23;
  border-radius: 16px;
  border: 1px solid $color-black-40;
}

.connected-apps-title {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.4);
}

.connected-apps-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
