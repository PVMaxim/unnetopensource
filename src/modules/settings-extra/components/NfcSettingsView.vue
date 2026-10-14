<template>
  <div class="settings">
    <div class="title">
      <div class="button-back" @click.prevent="$emit('back')">
        <backIcon />
      </div>
      {{ $t('pages.settings.changeSettings') }}
    </div>
    <div class="subTitle">{{ $t('pages.settings.cardListenerPriority') }}</div>
    <ToggleSwitch
      class="toggle-switch-settings"
      :options="defaultOptions"
      @change="updateMap($event.value)"
      @selected="selectedMethod"
      :modelValue="selectedMapOptionValue"
      name="name"
    />
  </div>
</template>

<script>
import { ref } from 'vue';
import { useStore } from 'vuex';
import ToggleSwitch from '@/components/ToggleSwitch.vue';
import backIcon from '@/components/svg/backIcon.vue';

export default {
  name: 'NfcSettingsView',
  components: {
    ToggleSwitch,
    backIcon,
  },
  emits: ['back', 'error'],
  setup(props, { emit }) {
    const store = useStore();
    const selectedMethod = ref('');
    const selectedMapOptionValue = ref('');

    const defaultOptions = {
      layout: {
        color: 'rgb2(255, 255, 255, .6)',
        backgroundColor: 'rgba(0,0,0,0)',
        selectedColor: 'rgba(17, 17, 17, 1)',
        selectedBackgroundColor: 'rgb(255, 152, 0)',
        borderColor: 'none',
        fontFamily: 'Arial',
        fontWeight: 'normal',
        fontWeightSelected: 'normal',
        squareCorners: true,
        noBorder: false,
      },
      size: {
        fontSize: 1.5,
        height: 3.25,
        padding: 0.5,
        width: 10,
      },
      config: {
        delay: 0.4,
        preSelected: store.state.settings.cardReaderPriority,
        disabled: false,
        items: [
          { name: 'auto', value: 'auto', width: '70px', padding: '8px 12px' },
          { name: 'nfc', value: 'nfc', width: '70px', padding: '8px 12px' },
          { name: 'fido', value: 'fido', width: '70px', padding: '8px 12px' },
          { name: 'app', value: 'mapp', width: '70px', padding: '8px 12px' },
        ],
      },
    };

    const updateMap = async (event) => {
      try {
        await store.dispatch('settings/setCardReaderPriority', event);
      } catch (error) {
        emit('error', error);
      }
    };

    return {
      defaultOptions,
      selectedMethod,
      selectedMapOptionValue,
      updateMap,
    };
  },
};
</script>

<style scoped lang="scss">
.settings {
  width: 100%;
  height: calc(100% - 28px);
}
.title {
  font-size: 20px;
  font-weight: 500;
  color: $color-white;
  text-align: center;
  margin-bottom: 24px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  position: relative;
}
.subTitle {
  font-size: 16px;
  margin-bottom: 8px;
}
.button-back {
  position: absolute;
  left: 0px;
  svg {
    height: 18px;
  }
}
</style>
