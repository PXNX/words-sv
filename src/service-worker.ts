/// <reference lib="webworker" />
/*
 * WordCircle service worker, built and registered by SvelteKit (served as /service-worker.js).
 * It caches this build's files so the app opens offline, keeps the previous build's cache until the
 * new version takes over (so an open tab never loses code it still needs), and shows streak
 * reminder notifications. Navigations go to the network first, so a refresh never gets stuck on an
 * older build's cached HTML.
 */
import { self } from '$app/service-worker';
import { assets, immutable, routes } from '$app/manifest';
import { version } from '$app/env';
import { dueReminderTypes, markReminderDelivered, readReminderState, reminderNotification, wasReminderDelivered, PERIODIC_SYNC_TAG } from './lib/pwa/pwaReminders.js';

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
// The on-device model engines (WebLLM for the conversation partner, ~6 MB; Supertonic and VoxCPM with their
// ~20 MB ONNX runtime) are left out: most learners never pick them, and their models need a network
// connection for the first download anyway. They are fetched when first used.
const ON_DEMAND = [/\/(llm|supertonic|voxcpm)\.worker-[^/]+\.js$/, /\/workers\/assets\/ort-[^/]+\.wasm$/];
// Kept across versions (hashed names), and pruned on activation to what this build still uses.
const ON_DEMAND_CACHE = 'wordcircle-on-demand';
const onDemandPaths = new Set(immutable.map(({ path }) => pathnameOf(path)).filter((path) => ON_DEMAND.some((pattern) => pattern.test(path))));
// How long a navigation waits for the network before showing the cached page.
const NAVIGATION_TIMEOUT_MS = 3500;
const precached = new Set([...immutable, ...assets].map(({ path }) => pathnameOf(path)).filter((path) => !ON_DEMAND.some((pattern) => pattern.test(path))));

// Tells open tabs how far the new version's download is (UpdateAppHint shows it while Lilith fetches it).
async function reportInstallProgress(done: number, total: number) {
	for (const client of await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })) client.postMessage({ type: 'INSTALL_PROGRESS', done, total });
}
const INSTALL_BATCH = 8;

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			const files = [...precached, SHELL];
			const total = files.length + pages.length;
			let done = 0;
			// In small batches rather than one addAll, so progress can be reported; any failed file still fails the install.
			for (let index = 0; index < files.length; index += INSTALL_BATCH) {
				const batch = files.slice(index, index + INSTALL_BATCH);
				await Promise.all(batch.map((file) => cache.add(file)));
				done += batch.length;
				void reportInstallProgress(done, total);
			}
			// Not every page route has a page of its own (e.g. /stats only redirects); those fall back to the shell.
			await Promise.all(pages.map((page) => cache.add(page).catch(() => undefined)));
			void reportInstallProgress(total, total);
		})()
	);
});

// Only the update button (UpdateAppHint) asks a waiting worker to take over, right before it reloads.
self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
	if (event.data?.type === 'CHECK_REMINDERS') event.waitUntil(checkStreakReminders());
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			// Only old builds go; the natural story voices (static/voices/piper-worker.js) keep their own cache.
			for (const key of await caches.keys()) if (key.startsWith('wordcircle-') && key !== CACHE && key !== ON_DEMAND_CACHE) await caches.delete(key);
			// On-demand files survive updates, but only the ones this build still references.
			const onDemand = await caches.open(ON_DEMAND_CACHE);
			for (const request of await onDemand.keys()) if (!onDemandPaths.has(new URL(request.url).pathname)) await onDemand.delete(request);
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
			// Build output and static files never change within a version: serve them straight from the
			// cache, so the app opens instantly and never waits on a missing or flaky connection. A new
			// deployment arrives as a new worker with its own cache (see UpdateAppHint).
			//
			// Navigations are different: they must show the latest deployment even while the previous
			// worker is still active. The HTML is therefore fetched from the network first and only falls
			// back to this build's cached page (or the app shell) when offline or too slow. Newer HTML references
			// hashed assets that are not in this build's cache, so those are fetched normally as well.
			if (request.mode === 'navigate') {
				// A bad connection is worse than none: it can hang for half a minute. After a few seconds
				// the cached page is shown, and the network answer still refreshes the cache for next time.
				const cached = await cache.match(pageKey(url.pathname)) ?? await cache.match(SHELL);
				const network = fetch(request).then((response) => {
					if (response.ok) void cache.put(pageKey(url.pathname), response.clone()).catch(() => undefined);
					return response;
				});
				if (!cached) return network;
				return Promise.race([
					network.catch(() => cached),
					new Promise<Response>((resolve) => setTimeout(() => resolve(cached), NAVIGATION_TIMEOUT_MS))
				]);
			}
			if (precached.has(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}
			// Files fetched on demand (model workers, the ONNX runtime) are hashed and never change:
			// once fetched they are kept in their own cache, so they open offline afterwards too.
			if (ON_DEMAND.some((pattern) => pattern.test(url.pathname))) {
				const onDemand = await caches.open(ON_DEMAND_CACHE);
				const kept = await onDemand.match(url.pathname);
				if (kept) return kept;
				const response = await fetch(request);
				if (response.ok) void onDemand.put(url.pathname, response.clone()).catch(() => undefined);
				return response;
			}
			try {
				return await fetch(request);
			} catch (error) {
				// Offline and not precached: serve whatever this build has cached.
				const fallback = await cache.match(request);
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

// Streak reminders without a server: the app mirrors its streak into IndexedDB, and Chromium wakes
// the installed PWA here from time to time. The same check runs when the app asks for one after the
// reminder toggle is switched on.
async function checkStreakReminders() {
	const state = await readReminderState();
	if (!state?.enabled) return;
	if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
	const { types, dateKey, minutesRemaining } = dueReminderTypes(state, new Date());
	for (const type of types) {
		if (await wasReminderDelivered(dateKey, type)) continue;
		const text = reminderNotification(type, state.locale, minutesRemaining, { count: state.dueWords, title: state.readingTitle ?? undefined, nativeDigits: state.nativeDigits });
		await self.registration.showNotification(text.title, {
			body: text.body,
			icon: '/icons/wordcircle-192.png',
			badge: '/icons/wordcircle-192.png',
			tag: `wordcircle-streak-${type}`,
			data: { url: '/' }
		});
		await markReminderDelivered(dateKey, type);
	}
}

self.addEventListener('periodicsync' as string, (event) => {
	const periodicEvent = event as ExtendableEvent & { tag?: string };
	if (periodicEvent.tag !== PERIODIC_SYNC_TAG) return;
	periodicEvent.waitUntil(checkStreakReminders());
});
