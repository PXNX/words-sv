import { deviceId, timeZone } from './clientStreak';

function decodeApplicationServerKey(value: string) {
	const padding = '='.repeat((4 - value.length % 4) % 4);
	const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/');
	const bytes = atob(base64);
	return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }

export async function enablePush() {
	if (!pushSupported()) throw new Error('unsupported');
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') throw new Error('permission_denied');
	const keyResponse = await fetch('/api/push/public-key');
	const keyBody = await keyResponse.json();
	if (!keyResponse.ok || typeof keyBody?.publicKey !== 'string') throw new Error('push_unavailable');
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeApplicationServerKey(keyBody.publicKey) });
	const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), timeZone: timeZone(), subscription: subscription.toJSON() }) });
	if (!response.ok) throw new Error('subscription_failed');
	return subscription;
}

export async function disablePush() {
	if (!pushSupported()) return;
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.getSubscription();
	if (!subscription) return;
	await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
	await subscription.unsubscribe();
}

export async function pushEnabled() {
	if (!pushSupported()) return false;
	const registration = await navigator.serviceWorker.ready;
	return Boolean(await registration.pushManager.getSubscription());
}
