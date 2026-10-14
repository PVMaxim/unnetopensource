<template>
  <Teleport defer to="body">
    <div ref="badgeRef" class="branch-badge">{{ branchLabel }}</div>
  </Teleport>
</template>

<script>
import { defineComponent, computed, onMounted, ref } from "vue";

export default defineComponent({
  name: "DevBadge",
  setup() {
    const badgeRef = ref(null);

    const branchLabel = computed(() => {
      if (typeof GIT_BRANCH !== 'undefined' && GIT_BRANCH && GIT_BRANCH !== 'unknown') {
        return GIT_BRANCH;
      }
      return typeof ENVIRONMENT !== 'undefined' ? ENVIRONMENT : 'unknown';
    });

    onMounted(() => {
      if (badgeRef.value && badgeRef.value.parentNode) {
        const parent = badgeRef.value.parentNode;
        parent.insertBefore(badgeRef.value, parent.firstChild);
      }
    });

    return {
      badgeRef,
      branchLabel
    };
  }
});
</script>

<style scoped lang="scss">
  .branch-badge {
    position: absolute;
    top: 5px;
    left: 60%;
    background-color: $color-black-38;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: $color-white;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 500;
    font-family: monospace;
    pointer-events: none;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
</style>
