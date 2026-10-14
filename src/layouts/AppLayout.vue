<script>
import { computed, defineComponent } from 'vue';
import { useRoute } from 'vue-router';

export default defineComponent({
    name: 'AppLayout',
    components: { 
    },
    setup() {
        const route = useRoute();
        const layout = computed(() => {
            let layout = route?.meta?.layout;
            if (layout) {
                return `${layout}Layout`;
            }
            return 'DefaultLayout';
        });

        return {
            layout
        };
    },
});
</script>

<template>
    <component :is="layout">
        <RouterView />
    </component>
</template>