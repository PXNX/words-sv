import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  // Shown in Settings and on /changelog; scripts/release.ts bumps it in package.json.
  define: { __APP_VERSION__: JSON.stringify(version) },
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
  // The on-device conversation model runs in a module worker (src/lib/conversation/llm.worker.ts).
  worker: { format: 'es' },
  server: { host: '0.0.0.0', allowedHosts: true }
});
