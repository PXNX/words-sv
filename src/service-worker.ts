/// <reference lib="webworker" />
/*
 * WordCircle service worker, built and registered by SvelteKit (served as /service-worker.js).
 * It caches this build's files so the app opens offline, keeps the previous build's cache until the
 * new version takes over (so an open tab never loses code it still needs), and shows streak
 * reminder notifications.
 */
import { self } from '$app/service-worker';
import { assets, immutable, routes } from '$app/manifest';
import { version } from '$app/env';

const CACHE = `wordcircle-${version}`;
// The app shell: routes without a prerendered page of their own render from it.
const SHELL = '/';
const pathnameOf = (path: string) => new URL(path, self.location.origin).pathname;
// '/wordle/' and '/wordle/index.html' are the same page as '/wordle'.
const pageKey = (pathname: string) => pathname.replace(/\/index\.html$/, '/').replace(/(.)\/+$/, '$1');
// Every page without route parameters (all prerendered), so each route opens offline with its own HTML.
// `prerendered` from $app/manifest can't be used: the worker is built before prerendering, so it is empty.
const pages = routes
	.filter((route) => route.page && !route.id.includes('['))
	.map((route) => pageKey(route.id.replace(/\/\([^)]+\)/g, '') || SHELL))
	.filter((page) => page !== SHELL);
const precached = new Set([...immutable, ...assets].map(({ path }) => pathnameOf(path)));

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll([...precached]);
			await cache.add(SHELL);
			// Not every page route has a page of its own (e.g. /stats only redirects); those fall back to the shell.
			await Promise.all(pages.map((page) => cache.add(page).catch(() => undefined)));
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
			// Only old builds go; the natural story voices (static/voices/piper-worker.js) keep their own cache.
			for (const key of await caches.keys()) if (key.startsWith('wordcircle-') && key !== CACHE) await caches.delete(key);
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
			// Pages, build output and static files never change within a version: serve them straight from the
			// cache, so the app opens instantly and never waits on a missing or flaky connection. A new
			// deployment arrives as a new worker with its own cache (see UpdateAppHint).
			if (request.mode === 'navigate') {
				const cached = (await cache.match(pageKey(url.pathname))) ?? (await cache.match(SHELL));
				if (cached) return cached;
			} else if (precached.has(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}
			try {
				return await fetch(request);
			} catch (error) {
				// Offline and not precached: pages fall back to the app shell, everything else to whatever was cached.
				const fallback = await cache.match(request.mode === 'navigate' ? SHELL : request);
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
