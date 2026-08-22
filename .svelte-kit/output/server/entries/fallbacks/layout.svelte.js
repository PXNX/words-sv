import { F as FILENAME } from "../../chunks/constants.js";
Layout[FILENAME] = "node_modules/.pnpm/@sveltejs+kit@2.70.3_@sveltejs+vite-plugin-svelte@7.3.0_svelte@5.56.10_vite@7.1.9_@type_3ff197bd1477a9f42553ae8df48fd9e1/node_modules/@sveltejs/kit/src/runtime/components/svelte-5/layout.svelte";
function Layout($$renderer, $$props) {
  $$renderer.component(
    ($$renderer2) => {
      let { children } = $$props;
      children($$renderer2);
      $$renderer2.push(`<!---->`);
    },
    Layout
  );
}
Layout.render = function() {
  throw new Error("Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information");
};
export {
  Layout as default
};
