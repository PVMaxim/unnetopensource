<template>
  <span class="logo-text">
    <span class="logo-text__united">United</span>
    <span class="logo-text__wallet">wallet</span>
  </span>
</template>

<script>
export default {
  name: 'LogoText'
}
</script>

<style scoped lang="scss">
.logo-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Inter Tight', sans-serif;
  font-size: 20px;
  letter-spacing: -0.02em;
  white-space: nowrap;
  user-select: none;
  line-height: 1;
  height: 40px;

  &__united {
    color: $color-white;
    font-weight: 700;
  }

  &__wallet {
    color: $color-gray;
    font-weight: 400;
  }
}
</style>