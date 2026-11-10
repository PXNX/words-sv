import { deviceId, timeZone } from '#lib/streak/clientStreak.js';
import { callApi } from '#lib/api/client.js';
import { TelegramStatusSchema } from '#lib/api/schemas.js';
import { reminderLocale } from '#lib/pwa/pwaReminders.js';
import { interfaceLocales, settings } from '#lib/state/settings.svelte.js';
import type { MiniAppLaunch } from '#lib/settings/telegramMiniApp.js';
import { noteLinked } from '#lib/sync/cloudSync.svelte.js';

// Connecting runs through the bot (a /start link), which links this device to the player's Telegram
// account: reminders turn on and progress is saved there from then on.
export async function connectTelegram(): Promise<TelegramStatus> {
	const status = await telegramDevice('connect');
	noteLinked(status.linked);
	if (!status.reminders && status.connectUrl) openTelegramLink(status.connectUrl);
	return status;
}

// The player's link to @word_circle_bot: streak reminders in Telegram and their invite link.
export type TelegramStatus = { reminders: boolean; linked: boolean; connectUrl: string | null; inviteUrl: string | null; invited: number; inviteEmbers: number };

export type TelegramAction = 'status' | 'connect' | 'disconnect' | 'miniapp' | 'signin' | 'signout';

export async function telegramDevice(action: TelegramAction, initData?: string): Promise<TelegramStatus> {
	// The /api functions only exist on Vercel; under `vite dev` every call would just 404.
	if (import.meta.env?.DEV) throw new Error('telegram_unavailable');
	try {
		return await callApi('/api/telegram/device', TelegramStatusSchema, { body: { deviceId: deviceId(), timeZone: timeZone(), locale: reminderLocale(), action, initData } });
	} catch {
		throw new Error('telegram_unavailable');
	}
}

const SIGN_IN_POLL_MS = 2500;
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Signs this device in to the player's Telegram account: opens a one-time link to the bot, and once
 * the player pressed Start there, the device is linked and its progress moves to the account. Resolves
 * true when linked (checked every few seconds and whenever the app is shown again), false on timeout.
 */
export async function signInWithTelegram(signal?: AbortSignal): Promise<boolean> {
	const started = await telegramDevice('signin');
	if (started.linked) {
		noteLinked(true);
		return true;
	}
	if (started.connectUrl) openTelegramLink(started.connectUrl);
	const until = Date.now() + SIGN_IN_TIMEOUT_MS;
	while (Date.now() < until && !signal?.aborted) {
		await new Promise((resolve) => setTimeout(resolve, SIGN_IN_POLL_MS));
		if (typeof document !== 'undefined' && document.visibilityState === 'hidden') continue;
		const status = await telegramDevice('status').catch(() => null);
		if (status?.linked) {
			noteLinked(true);
			return true;
		}
	}
	return false;
}

/** Unlinks this device: its local progress stays, and the account keeps the copy saved so far. */
export async function signOutOfTelegram(): Promise<TelegramStatus> {
	const status = await telegramDevice('signout');
	noteLinked(false);
	return status;
}

// Opened as the Mini App, the player's Telegram profile fills in what they have not set yet: their
// first name (so the intro skips asking for it) and, before they pick one, the interface language.
// The server checks Telegram's signature and links the device to their Telegram account, so turning
// on Telegram reminders needs no detour through the bot.
export function adoptMiniAppProfile(launch: MiniAppLaunch) {
	if (!settings.firstName && launch.user.first_name) settings.setFirstName(launch.user.first_name);
	const language = launch.user.language_code?.toLowerCase().split('-')[0];
	const locale = interfaceLocales.find((entry) => entry.code === language);
	if (locale && !settings.hasStoredInterfaceLocale()) settings.setInterfaceLocale(locale.code);
	// Linked now: the progress made so far moves to the Telegram account (sync/cloudSync.svelte.ts).
	void telegramDevice('miniapp', launch.initData).then((status) => noteLinked(status.linked), () => undefined);
}

// Inside the Telegram Mini App, t.me links open in Telegram itself; elsewhere in a new tab or the app.
export function openTelegramLink(url: string) {
	const webApp = (window as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp;
	if (webApp?.openTelegramLink) webApp.openTelegramLink(url);
	else if (!window.open(url, '_blank')) location.href = url;
}
