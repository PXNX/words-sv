// Retired service worker. Older builds registered /sw.js; the app now uses SvelteKit's /service-worker.js.
// Browsers still checking /sw.js for updates get this file, which clears the old caches, unregisters
// itself and reloads open tabs, so stale copies of the app stop requesting files that no longer exist.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) if (!key.startsWith('wordcircle-')) await caches.delete(key);
			await self.registration.unregister();
			for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
		})()
	);
});
