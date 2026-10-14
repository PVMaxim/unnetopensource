export function registerLayouts(app) {
  const layouts = import.meta.glob('./*.vue', { eager: true });

  Object.entries(layouts).forEach(([, layout]) => {
      app.component(layout?.default?.name, layout?.default);
  });
}