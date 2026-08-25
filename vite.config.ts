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
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/wordcircle-192.png', 'icons/wordcircle-512.png'],
      manifest: {
        name: 'WordCircle',
        short_name: 'WordCircle',
        description: 'Ein zweisprachiges Wisch-Wortspiel mit Wortkreis und Kreuzworträtsel.',
        theme_color: '#172A45',
        background_color: '#FFFDF7',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'de',
        icons: [
          { src: '/icons/wordcircle-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/wordcircle-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{html,js,css,png,svg,json,webmanifest}']
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: true
  }
});
