/// <reference lib="webworker" />
/*
 * WordCircle service worker, built and registered by SvelteKit (served as /service-worker.js).
 * It caches this build's files so the app opens offline, keeps the previous build's cache until the
 * new version takes over (so an open tab never loses code it still needs), and shows streak
 * reminder notifications.
 */
import { self } from '$app/service-worker';
import { assets, immutable } from '$app/manifest';
import { version } from '$app/env';

const CACHE = `wordcircle-${version}`;
// The app shell: every route renders from it, so offline navigation works for all pages.
const SHELL = '/';
const PRECACHE = [...immutable, ...assets].map(({ path }) => new URL(path, self.location.origin).pathname);
const precached = new Set(PRECACHE);

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(PRECACHE);
			await cache.add(SHELL);
		})()
	);
});

// Only the update button (UpdateAppHint) asks a waiting worker to take over, right before it reloads.
self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			// Build output and static files never change within a version: serve them from the cache.
			if (precached.has(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}
			try {
				const response = await fetch(request);
				if (response.ok && request.mode === 'navigate' && url.pathname === SHELL) await cache.put(SHELL, response.clone());
				return response;
			} catch (error) {
				// Offline: pages fall back to the app shell, everything else to whatever was cached.
				const fallback = request.mode === 'navigate' ? await cache.match(SHELL) : await cache.match(request);
				if (fallback) return fallback;
				throw error;
			}
		})()
	);
});

type PushPayload = { title?: string; body?: string; url?: string };

function payloadFrom(event: PushEvent): PushPayload {
	try {
		return event.data?.json() ?? {};
	} catch {
		return { body: event.data?.text() ?? '' };
	}
}

self.addEventListener('push', (event) => {
	const payload = payloadFrom(event);
	event.waitUntil(self.registration.showNotification(payload.title ?? 'WordCircle', {
		body: payload.body ?? '',
		icon: '/icons/wordcircle-192.png',
		badge: '/icons/wordcircle-192.png',
		data: { url: payload.url ?? '/' }
	}));
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const destination = new URL(event.notification.data?.url ?? '/', self.location.origin).href;
	event.waitUntil((async () => {
		const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
		const existing = windows.find((client) => client.url.startsWith(self.location.origin));
		if (existing) return existing.focus();
		return self.clients.openWindow(destination);
	})());
});
