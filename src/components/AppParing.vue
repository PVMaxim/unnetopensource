<template>
  <div class="app-pairing-card">
    <div class="app-info">
      <Avatar :size=40 :imageSrc="metadata.icons[0]" name="" />
      <div class="app-textual-info">
        <div class="app-textual-info-overflow">{{ metadata.name }}</div>
        <div class="app-textual-info-overflow">
          <a :href="metadata.url">
            {{ webSite }}
          </a>
        </div>
      </div>
    </div>
    <div style="justify-items: right;">
      <div v-if="detaching">
        <Loading />
      </div>
      <Button v-else buttonName="Detach" buttonType="main" @onClick="onRequestDetach()" />
    </div>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue';
import Avatar from 'vue3-avatar';
import Button from '@/components/Button.vue';
import Loading from "@/components/Loading.vue";

export default defineComponent({
  name: 'AppParing',
  props: {
    metadata: Object,
    detach: Function,
  },
  components: {
    Avatar,
    Button,
    Loading,
  },

  setup({ metadata, detach }) {
    const webSite = ref("");
    const detaching = ref(false);

    let host = '';
    try {
      host = new URL(metadata.url).host;
    } catch (_) { }
    const WEB_SITE_LEN_LIMIT = 23;
    webSite.value =
      host.length <= WEB_SITE_LEN_LIMIT
        ? host
        : host.substring(0, WEB_SITE_LEN_LIMIT - 3) + '...';

    const onRequestDetach = async () => {
      detaching.value = true;
      try {
        await detach();
      } catch (_) {
      } finally {
        detaching.value = false;
      }
    }

    return { webSite, onRequestDetach, detaching };
  },
});
</script>

<style scoped lang="scss">
.app-pairing-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 300px;
  border: 1px solid darkgray;
  border-radius: 10px;
  padding: 10px
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
</style>
