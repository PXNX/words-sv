import { createHash } from 'node:crypto';
import { sendNotification, setVapidDetails } from 'web-push';

/** A Web Push subscription as the browser hands it to `pushManager.subscribe()`. */
export interface PushSubscriptionJson {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

export function endpointHash(endpoint: string) {
	return createHash('sha256').update(endpoint).digest('hex');
}

export function normalizeSubscription(value: unknown): PushSubscriptionJson | null {
	const subscription = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null | undefined;
	const endpoint = typeof subscription?.endpoint === 'string' ? subscription.endpoint : '';
	const p256dh = typeof subscription?.keys?.p256dh === 'string' ? subscription.keys.p256dh : '';
	const auth = typeof subscription?.keys?.auth === 'string' ? subscription.keys.auth : '';
	if (!endpoint.startsWith('https://') || p256dh.length < 32 || auth.length < 8) return null;
	return { endpoint, keys: { p256dh, auth } };
}

export async function sendPush(subscription: PushSubscriptionJson, payload: Record<string, unknown>) {
	const { VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
	if (!VAPID_SUBJECT || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) throw new Error('vapid_not_configured');
	setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
	return sendNotification(subscription, JSON.stringify(payload), { TTL: 60 * 60, urgency: 'high' });
}
