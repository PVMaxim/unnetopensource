import { Directive } from 'vue';

export const clickOutside: Directive = {
  beforeMount(elem, binding) {
    let startedSource = false;

    elem.clickStarted = (e: Event) => {
      if (elem.contains(e.target)) {
        startedSource = true;
      }
    }

    elem.clickOutsideHandler = (e: Event) => {
      if (!elem.contains(e.target) && binding.value && !startedSource) {
        binding.value(e);
      }
      startedSource = false;
    }

    document.addEventListener('mousedown', elem.clickStarted);
    document.addEventListener('mouseup', elem.clickOutsideHandler);
  },
  unmounted(elem) {
    document.removeEventListener('mouseup', elem.clickOutsideHandler);
    document.removeEventListener('mousedown', elem.clickOutsideHandler);
  },
}

export default clickOutside;