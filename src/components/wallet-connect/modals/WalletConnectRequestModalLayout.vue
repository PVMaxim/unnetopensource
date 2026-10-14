<template>
  <main>
    <div v-if="state != STATE_DEFAULT" class="overlap-backdrop">
      <div v-if="state == STATE_INPROGRESS" class="inprogress">
        <Loading :titleLoad="progressTitle" />
      </div>
      <div v-else class="result">
        <slot v-if="state == STATE_PROCESS_SUCCESS" name="process-success"></slot>
        <slot v-else-if="state == STATE_PROCESS_FAIL" name="process-fail"></slot>
        <slot v-else-if="state == STATE_STEP_FAIL" name="step-fail"></slot>
      </div>
    </div>
    <div class="content-backdrop">
      <div class="content-window">
        <div class="content" :class="contentClass">
          <div v-if="showCloseButton" class="close-content">
            <close-icon @click="close" class="close-icon" />
          </div>
          <div class="header-content">
            <slot name="header"></slot>
          </div>
          <div class="body-content" :class="bodyContentClass">
            <slot name="body"></slot>
          </div>
          <div class="actions-content">
            <slot name="actions"></slot>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script>
import { defineComponent } from "vue";
import Loading from "@/components/Loading.vue";
import closeIcon from "@/components/svg/closeIcon.vue";

export const STATE_DEFAULT = "DEFAULT";
export const STATE_INPROGRESS = "INPROGRESS";
export const STATE_PROCESS_SUCCESS = "PROCESS-SUCCESS";
export const STATE_PROCESS_FAIL = "PROCESS-FAUK";
export const STATE_STEP_FAIL = "STEP-FAIL";

export default defineComponent({
  name: "WalletConnectRequestModalLayout",
  components: {
    Loading,
    closeIcon,
  },
  props: {
    state: String,
    progressTitle: String,
    showCloseButton: Boolean,
    close: {
      type: Function,
      default: () => { },
    },
    contentClass: [String, Object, Array],
    bodyContentClass: [String, Object, Array],
  },
  setup() {
    return {
      STATE_DEFAULT, STATE_INPROGRESS, STATE_PROCESS_FAIL, STATE_STEP_FAIL, STATE_PROCESS_SUCCESS
    }
  },
});
</script>

<style lang="scss" scoped>
.content-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.inprogress {
  width: fit-content;
  height: fit-content;
  margin: auto;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.result {
  width: 100%;
  max-width: 620px;
  margin: auto;

  padding: 30px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.overlap-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;

  z-index: 10001;
}

.content-window {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 620px;
  background-color: $color-black;
  padding: 0px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.content {
  max-height: calc(100% - 30px);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 15px;

  &.pin-request {
    gap: 0px;
    height: 100%;
    justify-content: space-between;
  }
}

.close-content {
  height: fit-content;

}

.close-icon {
  cursor: pointer;
  width: 24px;
  height: 24px;
  stroke: rgba(255, 152, 0, 1);
}

.header-content {
  height: fit-content;
}

.body-content {
  min-height: 100px;
  height: fit-content;
  overflow-y: auto;
  overflow-x: hidden;

  &.pin-request {
    height: 100%;
  }
}

.actions-content {
  height: fit-content;
}
</style>
