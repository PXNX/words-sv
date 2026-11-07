import { createHash } from 'node:crypto';
import { sendNotification, setVapidDetails } from 'web-push';

/** A Web Push subscription as the browser hands it to `pushManager.subscribe()`. @typedef {{ endpoint: string, keys: { p256dh: string, auth: string } }} PushSubscriptionJson */

/** @param {string} endpoint */
export function endpointHash(endpoint) {
	return createHash('sha256').update(endpoint).digest('hex');
}

/**
 * @param {unknown} value
 * @returns {PushSubscriptionJson | null}
 */
export function normalizeSubscription(value) {
	const subscription = /** @type {{ endpoint?: unknown, keys?: { p256dh?: unknown, auth?: unknown } }} */ (value);
	const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint : '';
	const p256dh = typeof subscription?.keys?.p256dh === 'string' ? subscription.keys.p256dh : '';
	const auth = typeof subscription?.keys?.auth === 'string' ? subscription.keys.auth : '';
	if (!endpoint.startsWith('https://') || p256dh.length < 32 || auth.length < 8) return null;
	return { endpoint, keys: { p256dh, auth } };
}

/**
 * @param {PushSubscriptionJson} subscription
 * @param {Record<string, unknown>} payload
 */
export async function sendPush(subscription, payload) {
	const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
	if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('vapid_not_configured');
	setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
	return sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60, urgency: 'high' });
}
