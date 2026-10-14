<template>
  <div class="wrapper">
    <div
      class="select-network"
      @click="toggleOptions"
    >
     <Suspense>
        <component v-if="currentIcon" :is="currentIcon" class="icon" />
        <template #fallback><span class="icon-placeholder" /></template>
      </Suspense> 
      <span class="selected-network">{{ provider.displayName || provider.name }}</span>
      <svg
        :class="[{ rotated: isOpen }]"
        width="11"
        height="7"
        viewBox="0 0 11 7"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="dropdown-icon"
      >
        <path
          d="M10 0.666992L5.33333 5.33366L0.666667 0.666992"
          stroke="white"
          stroke-opacity="0.4"
        />
      </svg>
    </div>

    <Teleport to="body">
      <div
        v-if="isOpen"
        @click="toggleOptions"
        class="backdrop"
      >
        <div
          class="options"
          v-if="isOpen"
        >
          <div
            v-for="rpcProvider in activeRpcList"
            :key="rpcProvider.name"
            class="option"
            @click="selectProvider(rpcProvider, $event)"
          >
            <component
              v-if="getNetworkIcon(rpcProvider.name)"
              :is="getNetworkIcon(rpcProvider.name)"
              class="option-icon"
            ></component>
            <span class="optionnetwork">{{ rpcProvider.displayName || rpcProvider.name }}</span>
          </div>
        </div>
      </div>
    </Teleport>

  </div>

</template>

<script>
import { getNetworkIcon } from "@/api/sub-utils";
import { rpcList } from '@/api/constants-types';
import { computed, ref } from "vue";
export default {
  name: "SelectNetwork",
  props: {
    provider: { type: Object, default: () => ({}) },
    setProvider: { type: Function, default: () => {} },
  },
  emits: ["update:modelValue"],
  setup(props) {
    const isOpen = ref(false);

    const toggleOptions = () => {
      isOpen.value = !isOpen.value;
    };

    const currentIcon = computed(() => getNetworkIcon(props.provider?.name));

    const selectProvider = (provider, event) => {
      event.stopPropagation();
      isOpen.value = false;
      props.setProvider(provider);
    };

    const activeRpcList = computed(() => {
      return rpcList.filter(rpc => rpc.swapChain);
    });

    return {
      activeRpcList,
      getNetworkIcon,
      isOpen,
      toggleOptions,
      selectProvider,
      currentIcon,
    };
  },
};
</script>

<style scoped lang="scss">
.wrapper {
  position: relative;
}

.select-network {
  padding: 6px;
  position: relative;
  width: 147px;
  display: flex;
  align-items: center;
  border-radius: 24px;
  background: #262626;
  cursor: pointer;
  z-index: 9999999;
}

.icon {
  width: 16px;
  height: 16px;
}

.selected-network {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 14.4px;
}

.dropdown-icon {
  position: absolute;
  right: 13px;
  transition: transform 0.3s ease;
}

.rotated {
  animation: s1 0.5s infinite;
  transform: rotate(180deg);
}

.backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
}

.options {
  padding: 6px;
  position: absolute;
  width: 90%;
  max-width: 620px;
  left: calc(50% - 310px);
  box-sizing: border-box;
  background: #262626;
  border-radius: 24px;
  z-index: 103;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.option-icon {
  width: 36px;
  height: 36px;
}

@media (max-width: 690px) {
  .options {
    left: 32px;
    right: 32px;
    width: calc(100% - 64px);
  }
}
</style>