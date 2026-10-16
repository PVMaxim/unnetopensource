<template>
  <div class="app-card">
    <div class="app-info">
      <Avatar :border="false" :size=40 :imageSrc="metadata.icons[0] || WC_LOGO_URL" name="" />
      <div class="app-textual-info">
        <div class="app-textual-info-overflow app-name">{{ metadata.name }}</div>
        <div v-if="metadata.url" class="app-textual-info-overflow">
          <a class="app-url" :href="metadata.url" target="_blank">
            {{ appWebSite }}
          </a>
        </div>
      </div>
    </div>
    <div>
      <div v-if="disconnectInProgress" class="loading">
        <Loading />
      </div>
      <button v-else class="button-disconnect" @click="onDisconnect()">
        <img :src="DISCONNECT_ICON_URL" loading="lazy" />&nbsp;
        Disconnect
      </button>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import Avatar from 'vue3-avatar';
import Button from '@/components/Button.vue';
import Loading from "@/components/Loading.vue";

export default defineComponent({
  name: 'ConnectedAppCard',
  props: {
    metadata: Object,
    disconnect: Function,
  },
  components: {
    Avatar,
    Button,
    Loading,
  },

  setup({ metadata, disconnect }) {
    const appWebSite = ref("");
    const disconnectInProgress = ref(false);
    const DISCONNECT_ICON_URL = new URL(`@/assets/images/disconnect.svg`, import.meta.url).href;
    const WC_LOGO_URL = new URL(`@/assets/images/walletConnectLogo.svg`, import.meta.url).href;

    let host = '';
    try {
      host = new URL(metadata.url).host;
    } catch (_) { }
    appWebSite.value = host ?? 'Web site';

    const onDisconnect = async () => {
      disconnectInProgress.value = true;
      try {
        await disconnect();
      } catch (error) {
      } finally {
        disconnectInProgress.value = false;
      }
    }

    return {
      appWebSite,
      DISCONNECT_ICON_URL,
      WC_LOGO_URL,
      onDisconnect,
      disconnectInProgress,
    };
  },
});
</script>

<style scoped lang="scss">
.app-card {
  padding: 16px;

  display: flex;
  flex-direction: column;
  gap: 24px;

  background-color: $color-black-32;
  border-radius: 16px;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.app-info {
  display: flex;
  flex-direction: row;
  gap: 10px;
  align-items: center;
}

.app-textual-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.app-textual-info-overflow {
  overflow-wrap: anywhere;
}

.app-name {
  font-size: 15px;
  font-weight: 400;
  color: $color-white;
}

.app-url {
  font-size: 12px;
  font-weight: 400;
  color: rgba($color-white, .5);
}

.button-disconnect {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-black-32;
  color: $color-orange;
  border: 1px solid $color-orange;
  border-radius: 12px;
  overflow: hidden;
  font-size: 14px;

  svg {
    height: 20px;
    margin-right: 12px;
  }
}

.loading {
  width: fit-content;
  height: fit-content;
  margin: auto;
}
</style>