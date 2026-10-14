<template>
  <div v-if="props.firstTab !== null" class="send-receive-swap-tabs" :class="{ oneTab: props.secondTab === null }">
    <button
      :class="{ active: props.firstTab === props.activeTab }"
      @click="setActiveTab(props.firstTab)"
      :disabled=props.firstTabDisable
    >
      {{ props.firstTab }}
    </button>
    <button v-if="props.secondTab !== null"
      :class="{ active: props.secondTab === props.activeTab }"
      @click="setActiveTab(props.secondTab)"
      :disabled=props.secondTabDisable
    >
      {{ props.secondTab }}
    </button>
  </div>
</template>

<script>
  import { defineComponent } from 'vue'
  import { boolean } from 'zod';

  export default defineComponent({
    name: 'SendReceiveSwapTabs',
    emits: ['update:activeTab', 'change'],
    props: {
      modelValue: [String, null],
      firstTab: {
        type: [String, null],
        default: null,
        required: true
      },
      secondTab: {
        type: [String, null],
        default: null,
        required: false
      },
      firstTabDisable: {
        type: [Boolean],
        default: false,
        required: false
      },
      secondTabDisable: {
        type: [Boolean],
        default: false,
        required: false
      },
      activeTab: {
        type: [String, null],
        default: null
      },
    },
    setup(props, { emit }) {
      const setActiveTab = (name) => {
        emit('change', {
            value: name,
            srcEvent: 'changeTab'
          });
        emit('update:activeTab', name);
      };

      if (props.activeTab === null) {
        setActiveTab(props.firstTab);
      }

      return { props, setActiveTab }
    }
  })
</script>

<style scoped lang="scss">
  .send-receive-swap-tabs {
    margin-bottom: 12px;
    padding: 1px;
    width: 100%;
    height: 36px;
    height: initial;
    border-radius: 12px;
    background-color: $color-black-23;
    border: 1px solid $color-black-40;
    display: flex;
    justify-content: space-around;
    align-items: center;

    &.oneTab {
      button {
        width: 100%;
      }
    }
  }

  button {
    background-color: transparent;
    border: none;
    color: #cdcdcd;
    cursor: pointer;
    width: 50%;
    height: 32px;
    border-radius: 10px;
    font-family: 'Inter Tight';
    font-weight: 500;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.4);
    @include transition(color .3s ease-in-out, background-color .3s ease-in-out);

    &.active{
      background-color: $color-black-32;
      color: $color-orange;
    }
}
</style>