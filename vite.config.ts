import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit({
      preprocess: vitePreprocess(),
      // Also checked whenever the app regains focus; drives the update hint on the home screen
      version: { pollInterval: 5 * 60 * 1000 },
      // src/service-worker.ts is built and registered by SvelteKit itself (served as /service-worker.js)
      adapter: adapter({ fallback: 'index.html' })
    }),
    Icons({ compiler: 'svelte', autoInstall: false }),

    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide',
      emitTsDeclarations: true
    })
  ],
  server: { host: '0.0.0.0', allowedHosts: true }
});
