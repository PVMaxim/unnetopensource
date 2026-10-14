export default {
  mounted(el, binding) {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 1.0,
    };

    const callback = (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          binding.value(entry, observer);
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