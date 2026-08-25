import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    Icons({
      compiler: 'svelte',
      autoInstall: false
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'icons/wordcircle-192.svg', 'icons/wordcircle-512.svg', 'word-data-attribution.txt'],
      manifest: {
        name: 'WordCircle',
        short_name: 'WordCircle',
        description: 'Ein zweisprachiges Wisch-Wortspiel mit Wortkreis und Kreuzworträtsel.',
        theme_color: '#172A45',
        background_color: '#FFFDF7',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        start_url: '/',
        scope: '/',
        lang: 'de',
        icons: [
          { src: '/icons/wordcircle-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/wordcircle-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{html,js,css,svg,json,webmanifest,txt}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: true
  }
});
