import { deviceId, readStreak, timeZone } from '#lib/streak/clientStreak.js';
import { callApi } from '#lib/api/client.js';
import { OkSchema, PushKeySchema } from '#lib/api/schemas.js';
import { settings } from '#lib/state/settings.svelte.js';
import { reminderExtras } from '#lib/reminders/reminderSnapshot.js';
import {
	periodicRemindersRegistered,
	publishReminderState,
	registerPeriodicReminders,
	reminderLocale,
	requestReminderCheck,
	setReminderEnabled,
	unregisterPeriodicReminders
} from '#lib/pwa/pwaReminders.js';

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
		const { publicKey } = await callApi('/api/push', PushKeySchema).catch(() => {
			throw new Error('push_unavailable');
		});
		subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeApplicationServerKey(publicKey) });
	}
	await callApi('/api/push', OkSchema, { body: { action: 'subscribe', deviceId: deviceId(), timeZone: timeZone(), locale: reminderLocale(), subscription: subscription.toJSON() } }).catch(() => {
		throw new Error('subscription_failed');
	});
	return subscription;
}

async function unsubscribeServer() {
	const registration = await navigator.serviceWorker.ready;
	const subscription = await registration.pushManager.getSubscription();
	if (!subscription) return;
	await callApi('/api/push', OkSchema, { body: { action: 'unsubscribe', endpoint: subscription.endpoint } }).catch(() => undefined);
	await subscription.unsubscribe();
}

export async function enablePush() {
	if (!pushSupported()) throw new Error('unsupported');
	const permission = await Notification.requestPermission();
	if (permission !== 'granted') throw new Error('permission_denied');

	await publishReminderState(readStreak(), reminderExtras(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary, settings.firstName || 'du'));
	await setReminderEnabled(true);

	let server: boolean;
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
