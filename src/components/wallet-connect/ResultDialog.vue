<template>
  <div class="result-dialog">
    <div class="close-content">
      <closeIcon class="close-icon" @click="close" />
    </div>
    <div class="result-content">
      <div class="result-icon-background">
        <successSwapIcon v-if="success" />
        <errorSwapIcon v-else />
      </div>
      <h3 v-if="message" class="message">{{ message }}</h3>
      <div v-if="details" class="details">{{ details }}</div>
      <button class="button-main ok-button" @click="close">OK</button>
    </div>
  </div>
</template>

<script>
import { defineComponent } from "vue";
import closeIcon from "@/components/svg/closeIcon.vue";
import successSwapIcon from "@/components/svg/successSwapIcon.vue";
import errorSwapIcon from "@/components/svg/errorSwapIcon.vue";

export default defineComponent({
  name: "ResultDialog",
  components: {
    closeIcon,
    errorSwapIcon,
    successSwapIcon
  },
  props: {
    success: Boolean,
    message: String,
    details: String,
    close: {
      type: Function,
      default: () => { },
    },
  },
});
</script>

<style scoped lang="scss">
.result-dialog {
  width: fit-content;
  min-width: 310px;
  max-width: 620px;

  padding: 22px 16px;
  box-sizing: border-box;
  background: #262626;
  border-radius: 24px;

  display: flex;
  flex-direction: column;
  gap: 8px;

  justify-content: center;
  align-items: center;
}

.close-content {
  width: 100%;

  display: flex;
  justify-content: end;
  align-items: center;
}

.close-icon {
  cursor: pointer;
  width: 18px;
  height: 18x;
  stroke: rgba(255, 152, 0, 1);
}

.result-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 34px;

  justify-content: center;
  align-items: center;
}

.result-icon-background {
  width: 100px;
  height: 100px;

  background: linear-gradient(180deg, #fca100 0%, #fd7b00 100%);
  border-radius: 50%;

  display: flex;
  justify-content: center;
  align-items: center;
}

.message {
  margin: 0px;
  font-size: 20px;
  font-weight: 500;
  font-family: 'Inter Tight';
  color: $color-white;

  text-align: center;
  overflow-wrap: anywhere;
}

.details {
  padding: 0px;
  font-size: 15px;
  font-weight: 400;
  font-family: 'Inter Tight';
  color: $color-white;

  text-align: center;
  overflow-wrap: anywhere;
}

.ok-button {
  width: 100%;
}
</style>