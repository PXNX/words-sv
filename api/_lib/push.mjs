import { createHash } from 'node:crypto';
import webpush from 'web-push';

export function endpointHash(endpoint) {
	return createHash('sha256').update(endpoint).digest('hex');
}

export function normalizeSubscription(value) {
	const endpoint = typeof value?.endpoint === 'string' ? value.endpoint : '';
	const p256dh = typeof value?.keys?.p256dh === 'string' ? value.keys.p256dh : '';
	const auth = typeof value?.keys?.auth === 'string' ? value.keys.auth : '';
	if (!endpoint.startsWith('https://') || p256dh.length < 32 || auth.length < 8) return null;
	return { endpoint, keys: { p256dh, auth } };
}

export async function sendPush(subscription, payload) {
	const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
	if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('vapid_not_configured');
	webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
	return webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60, urgency: 'high' });
}
