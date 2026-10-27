import { randomBytes, timingSafeEqual } from 'node:crypto';
import { FREEZE_EVERY, MAX_FREEZES } from './streak.mjs';

// @word_circle_bot (the ptb-words repo) polls for updates on its own server. It forwards `/start`
// deep links to /api/telegram/start, and this deployment only ever *sends* through the Bot API, so
// the two never compete for updates.
// Every new player who starts the bot through a player's invite link earns that player this many
// embers; there is no limit on how many friends can be invited.
export const INVITE_EMBERS = 2;

export function botUsername() {
	return process.env.TELEGRAM_BOT_USERNAME || 'word_circle_bot';
}

export function startLink(payload) {
	return `https://t.me/${botUsername()}?start=${payload}`;
}

// Codes ride in /start payloads, which Telegram limits to [A-Za-z0-9_-]{1,64}.
export function newCode(bytes) {
	return randomBytes(bytes).toString('base64url');
}

export function bridgeAuthorized(authorization, secret = process.env.TELEGRAM_BRIDGE_SECRET ?? '') {
	if (!secret || typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
	const token = Buffer.from(authorization.slice(7));
	const expected = Buffer.from(secret);
	return token.length === expected.length && timingSafeEqual(token, expected);
}

/** `r_<code>` turns on reminders for the device that made the code; `i_<code>` is a player's invite. */
export function parseStartPayload(payload) {
	const match = typeof payload === 'string' ? /^([ri])_([A-Za-z0-9_-]{8,40})$/.exec(payload) : null;
	return match ? { kind: match[1] === 'r' ? 'reminders' : 'invite', code: match[2] } : null;
}

/** Adds invite embers; like the daily ember, every full set forges a freeze while there is room for
 * one, and the embers left over carry on. Only with both freezes stocked does the set stay full. */
export function addEmbers(embers, freezes, count) {
	let nextEmbers = embers + count;
	let nextFreezes = freezes;
	while (nextEmbers >= FREEZE_EVERY && nextFreezes < MAX_FREEZES) {
		nextFreezes += 1;
		nextEmbers -= FREEZE_EVERY;
	}
	return { embers: Math.min(FREEZE_EVERY, nextEmbers), freezes: nextFreezes };
}

export async function sendTelegram(chatId, text, buttonUrl) {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	if (!token) throw new Error('telegram_not_configured');
	const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			chat_id: chatId,
			text,
			parse_mode: 'HTML',
			...(buttonUrl ? { reply_markup: { inline_keyboard: [[{ text: '📚 WordCircle', web_app: { url: buttonUrl } }]] } } : {})
		})
	});
	if (!response.ok) {
		const error = new Error('telegram_send_failed');
		error.statusCode = response.status;
		throw error;
	}
}

export function appUrl() {
	return (process.env.APP_URL || 'https://words-sv.vercel.app').replace(/\/+$/, '') + '/';
}

const escapeHtml = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function htmlMessage({ title, body }) {
	return `<b>${escapeHtml(title)}</b>\n${escapeHtml(body)}`;
}

/** @type {Record<string, (count: number) => { title: string, body: string }>} */
const INVITE_THANKS = {
	en: (count) => ({ title: 'A friend joined WordCircle', body: `Thanks for inviting them! You got ${count} embers.` }),
	de: (count) => ({ title: 'Ein Freund ist WordCircle beigetreten', body: `Danke für die Einladung! Deine Glut wächst um ${count}.` }),
	ar: (count) => ({ title: 'انضم صديق إلى WordCircle', body: `شكرًا على الدعوة! حصلت على ${count} جمرات.` }),
	fa: (count) => ({ title: 'یک دوست به WordCircle پیوست', body: `ممنون از دعوتت! ${count} اخگر گرفتی.` }),
	hi: (count) => ({ title: 'एक दोस्त WordCircle से जुड़ा', body: `न्योता देने के लिए धन्यवाद! तुम्हें ${count} अंगारे मिले।` }),
	ml: (count) => ({ title: 'ഒരു സുഹൃത്ത് WordCircle-ൽ ചേർന്നു', body: `ക്ഷണിച്ചതിന് നന്ദി! നിനക്ക് ${count} കനലുകൾ കിട്ടി.` }),
	pt: (count) => ({ title: 'Um amigo entrou no WordCircle', body: `Obrigado pelo convite! Você ganhou ${count} brasas.` }),
	ru: (count) => ({ title: 'Друг присоединился к WordCircle', body: `Спасибо за приглашение! Ты получил ${count} угольков.` }),
	uk: (count) => ({ title: 'Друг приєднався до WordCircle', body: `Дякуємо за запрошення! Ти отримав ${count} жарини.` })
};

export function inviteThanks(locale, count) {
	return (INVITE_THANKS[locale] ?? INVITE_THANKS.en)(count);
}

const TABLES = [
	`CREATE TABLE IF NOT EXISTS wordcircle_telegram_links (
		device_id VARCHAR(64) NOT NULL PRIMARY KEY,
		invite_code VARCHAR(24) NOT NULL UNIQUE,
		link_code VARCHAR(24) NULL UNIQUE,
		chat_id BIGINT NULL,
		telegram_user_id BIGINT NULL,
		reminders TINYINT(1) NOT NULL DEFAULT 0,
		last_reminded_day CHAR(10) NULL,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
		INDEX wordcircle_telegram_links_user_idx (telegram_user_id),
		CONSTRAINT wordcircle_telegram_links_device_fk FOREIGN KEY (device_id) REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS wordcircle_telegram_invites (
		telegram_user_id BIGINT NOT NULL PRIMARY KEY,
		inviter_device_id VARCHAR(64) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		INDEX wordcircle_telegram_invites_inviter_idx (inviter_device_id),
		CONSTRAINT wordcircle_telegram_invites_device_fk FOREIGN KEY (inviter_device_id) REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE
	)`
];
// Freezes forged from invite embers on the server; /api/streak/progress adds them on top of the
// device's own count once, since the device otherwise wins with its lower, locally used-up count.
const INVITE_FREEZES_COLUMN = 'ALTER TABLE wordcircle_streak_devices ADD COLUMN invite_freezes TINYINT UNSIGNED NOT NULL DEFAULT 0';

let tablesReady;
/** Creates the Telegram tables on first use, like the reward columns in /api/streak/progress. */
export function ensureTelegramTables(db) {
	tablesReady ??= (async () => {
		for (const statement of TABLES) await db.execute(statement);
		await db.execute(INVITE_FREEZES_COLUMN).catch((error) => { if (error?.code !== 'ER_DUP_FIELDNAME') throw error; });
	})().catch((error) => { tablesReady = undefined; throw error; });
	return tablesReady;
}
