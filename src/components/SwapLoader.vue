<template>
    <div class="swap-loader">
        <Loading
            v-if="isLoading"
            :messageLoad="messageLoad"
            :titleLoad=titleLoad
        />
    </div>
</template>

<script>
import Loading from "@/components/Loading.vue";
import { computed } from "vue";
import { useStore } from "vuex";
export default {
    name: "SwapLoader",
    components: {
        Loading
    },
    setup(){
        const store = useStore();
        const isLoading = computed(() => store.state.swap.isLoading);
        const titleLoad = computed(() => store.state.swap.titleLoad);
        const messageLoad = computed(() => store.state.swap.messageLoad);

        return {
            isLoading,
            titleLoad,
            messageLoad
        }
    }

}
</script>

<style scoped lang="scss">
.swap-loader {
    min-height: 50vh;
    display: flex;
    justify-content: center;
    flex-direction: column;
    align-items: center;
}
</style>