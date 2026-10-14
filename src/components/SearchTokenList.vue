<template>
  <div v-if="inputData === null && errorSearch === null && searchTokensLength >= 3" class="loader-box">
    <Loading/>
  </div>
  <div v-else-if="typeof errorSearch === 'string'" class="error-box" v-html="errorSearch"></div>
  <SearchTokenListItem v-else :tokenObject="item" v-for="(item, index) in inputData" :key="item.root" :windowSize=windowSize></SearchTokenListItem>
</template>

<script>
import { defineComponent, ref, computed } from 'vue'
import SearchTokenListItem from "@/components/SearchTokenListItem.vue";
import Loading from '@/components/Loading.vue';

export default defineComponent({
  name: 'SearchTokenList',
    props: {
      inputData: {
        type: [Array, Object, null],
        default: null,
        required: true
      },
      errorSearch: {
        type: [String, null],
        default: null,
        required: false
      },
      searchTokensLength: {
        type: [Number, null],
        default: null,
        required: false
      },
      minHeight: {
        type: [String, null],
        default: null,
        required: false
      },
    },
    components: {
      SearchTokenListItem,
      Loading
    },

    setup() {
      const windowSize = computed(() => { 
        let viewportWidth = window.innerWidth;
        window.addEventListener("resize", () => {
        viewportWidth = window.innerWidth;
        })

        return viewportWidth
      });
      return { windowSize }
    }
})
</script>

<style scoped lang="scss">
.loader-box, .error-box {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: v-bind(minHeight);
}

.error-box {
  color: $color-red;
}
</style>