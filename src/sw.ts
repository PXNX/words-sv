/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

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
