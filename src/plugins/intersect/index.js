export default {
  mounted(el, binding) {
    const handler = typeof binding.value === 'function' ? binding.value : binding.value?.handler;
    const customOptions = typeof binding.value === 'object' && binding.value?.options ? binding.value.options : {};
    const options = {
      root: customOptions.root || null,
      rootMargin: customOptions.rootMargin || '50px',
      threshold: typeof customOptions.threshold !== 'undefined' ? customOptions.threshold : 0.1,
    };

    const callback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && handler) {
          handler(entry, observer);
          if (binding.modifiers?.once) {
            observer.unobserve(el);
          }
        }
      });
    };

    const observer = new IntersectionObserver(callback, options);
    observer.observe(el);
    el._observer = observer;
  },
  unmounted(el) {
    if (el._observer) {
      el._observer.disconnect();
    }
  },
};