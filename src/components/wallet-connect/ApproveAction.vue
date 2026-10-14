<template>
  <button class="button-main approve-action" @click="approve" :disabled="isLoading">
     <span v-if="isLoading" class="loader"></span>
     <span v-else>{{ text || 'Approve' }}</span>
    </button>
</template>

<script>
import { defineComponent } from "vue";

export default defineComponent({
  name: "ApproveAction",
  props: {
    text: String,
    isLoading: {
      type: Boolean,
      default: false
    },
    approve: {
      type: Function,
      default: () => { },
    },
  }
});
</script>

<style lang="scss" scoped>
.approve-action {
  width: 100%;
}
.loader {
    position:relative;
    width:20px;
    height:20px;
    border-radius:50%;
    border: 3px solid;
    border-color:  #000000 $color-orange;
    box-sizing: border-box;
    animation:spin 0.5s infinite;
    }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>