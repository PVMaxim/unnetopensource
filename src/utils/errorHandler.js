import { ref } from 'vue';

export const isOpen = ref(false);
export const title = ref("");
export const subtitle = ref("");
export const handlerClick = ref();

export const handler = () => {
    isOpen.value = false;
    title.value = "";
    subtitle.value = "";
    handlerClick.value?.();
    handlerClick.value = undefined;
};

export const open = (newTitle, newSubtitle, newHandlerClick) => {
    isOpen.value = true;
    title.value = newTitle;
    subtitle.value = newSubtitle;
    handlerClick.value = newHandlerClick;
};