import { deviceId, timeZone } from '#lib/clientStreak.js';
import { reminderLocale } from '#lib/pwaReminders.js';
import { interfaceLocales, settings } from '#lib/state/settings.svelte.js';
import type { MiniAppLaunch } from '#lib/telegramMiniApp.js';

// The player's link to @word_circle_bot: streak reminders in Telegram and their invite link.
export type TelegramStatus = { reminders: boolean; connectUrl: string | null; inviteUrl: string | null; invited: number; inviteEmbers: number };

export async function telegramDevice(action: 'status' | 'connect' | 'disconnect' | 'miniapp', initData?: string): Promise<TelegramStatus> {
	// The /api functions only exist on Vercel; under `vite dev` every call would just 404.
	if (import.meta.env?.DEV) throw new Error('telegram_unavailable');
	const response = await fetch('/api/telegram/device', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), timeZone: timeZone(), locale: reminderLocale(), action, initData }) });
	const body = await response.json();
	if (!response.ok || !body?.ok) throw new Error('telegram_unavailable');
	return body;
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
	void telegramDevice('miniapp', launch.initData).catch(() => undefined);
}

// Inside the Telegram Mini App, t.me links open in Telegram itself; elsewhere in a new tab or the app.
export function openTelegramLink(url: string) {
	const webApp = (window as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp;
	if (webApp?.openTelegramLink) webApp.openTelegramLink(url);
	else if (!window.open(url, '_blank')) location.href = url;
}
