<template>
  <svg
    :class="customClass"
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="16"
      cy="16"
      r="16"
      fill="#FF9800"
    />
    <path
      d="M17.8333 23.2L17.8333 7L27 16L21.5 16L21.5 23.2L17.8333 23.2Z"
      fill="black"
    />
    <path
      d="M5 16L10.5 16L10.5 8.8L14.1666 8.8L14.1666 25L5 16Z"
      fill="black"
    />
  </svg>

</template>

<script>
export default {
  name: "SwapIcon",
  props: {
    customClass: {
      type: String,
      default: "",
    },
  },
};
</script>