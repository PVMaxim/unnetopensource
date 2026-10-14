const IconsList = import.meta.glob('./*.vue');

export function registerTokensIcon(app) {
  Object.entries(IconsList).forEach(([path, loader]) => {
    loader().then((module) => {
      const component = module.default;
      if (component?.name) {
        app.component(component.name, component);
      }
    });
  });
}