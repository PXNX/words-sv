import { deviceId, readStreak, timeZone } from '#lib/clientStreak.js';
import {
	periodicRemindersRegistered,
	publishReminderState,
	registerPeriodicReminders,
	requestReminderCheck,
	setReminderEnabled,
	unregisterPeriodicReminders
} from '#lib/pwaReminders.js';

function decodeApplicationServerKey(value: string) {
	const padding = '='.repeat((4 - value.length % 4) % 4);
	const base64 = (value + padding).replaceAll('-', '+').replaceAll('_', '/');
	const bytes = atob(base64);
	return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export function pushSupported() {
	return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Server push needs VAPID keys on the deployment. When they are missing (or the deployment has no
// database), the same reminders keep working through Periodic Background Sync in the installed PWA.
async function subscribeServer() {
	const registration = await navigator.serviceWorker.ready;
	let subscription = await registration.pushManager.getSubscription();
	if (!subscription) {
		const keyResponse = await fetch('/api/push/public-key');
		const keyBody = await keyResponse.json();
		if (!keyResponse.ok || typeof keyBody?.publicKey !== 'string') throw new Error('push_unavailable');
		subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeApplicationServerKey(keyBody.publicKey) });
	}
	const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), timeZone: timeZone(), subscription: subscription.toJSON() }) });
	if (!response.ok) throw new Error('subscription_failed');
	return subscription;
}

async function unsubscribeServer() {
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.getSubscription();
	if (!subscription) return;
	await fetch('/api/push/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) }).catch(() => undefined);
	await subscription.unsubscribe();
}

export async function enablePush() {
	if (!pushSupported()) throw new Error('unsupported');
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') throw new Error('permission_denied');

	await publishReminderState(readStreak());
	await setReminderEnabled(true);

	let server = false;
	try {
		await subscribeServer();
		server = true;
	} catch {
		server = false;
	}
	const local = server ? false : await registerPeriodicReminders();
	if (!server && !local) {
		await setReminderEnabled(false);
		throw new Error('push_unavailable');
	}
	// Exactly one delivery path, so a device never gets the same reminder twice.
	if (server) await unregisterPeriodicReminders();
	else await unsubscribeServer().catch(() => undefined);

	void requestReminderCheck();
	return true;
}

export async function disablePush() {
	await setReminderEnabled(false);
	await unregisterPeriodicReminders();
	if (!pushSupported()) return;
	try {
		await unsubscribeServer();
	} catch {
		// The browser subscription is gone or the endpoint is unavailable; the reminder state is already off.
	}
}

export async function pushEnabled() {
	if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return false;
	try {
		if (await periodicRemindersRegistered()) return true;
		if (!pushSupported()) return false;
		const registration = await navigator.serviceWorker.getRegistration();
		return Boolean(await registration?.pushManager.getSubscription());
	} catch {
		return false;
	}
}
