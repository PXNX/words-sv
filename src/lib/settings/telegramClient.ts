import { deviceId, timeZone } from '#lib/clientStreak.js';
import { reminderLocale } from '#lib/pwaReminders.js';

// The player's link to @word_circle_bot: streak reminders in Telegram and their invite link.
export type TelegramStatus = { reminders: boolean; connectUrl: string | null; inviteUrl: string | null; invited: number; inviteEmbers: number };

export async function telegramDevice(action: 'status' | 'connect' | 'disconnect'): Promise<TelegramStatus> {
	// The /api functions only exist on Vercel; under `vite dev` every call would just 404.
	if (import.meta.env?.DEV) throw new Error('telegram_unavailable');
	const response = await fetch('/api/telegram/device', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), timeZone: timeZone(), locale: reminderLocale(), action }) });
	const body = await response.json();
	if (!response.ok || !body?.ok) throw new Error('telegram_unavailable');
	return body;
}

// Inside the Telegram Mini App, t.me links open in Telegram itself; elsewhere in a new tab or the app.
export function openTelegramLink(url: string) {
	const webApp = (window as { Telegram?: { WebApp?: { openTelegramLink?: (url: string) => void } } }).Telegram?.WebApp;
	if (webApp?.openTelegramLink) webApp.openTelegramLink(url);
	else if (!window.open(url, '_blank')) location.href = url;
}
