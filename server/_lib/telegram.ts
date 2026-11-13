import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import * as v from 'valibot';
import { FREEZE_EVERY, MAX_FREEZES } from './streak.js';

// @word_circle_bot (the ptb-words repo) polls for updates on its own server. It forwards `/start`
// deep links to /api/telegram/start, and this deployment only ever *sends* through the Bot API, so
// the two never compete for updates.
// Every new player who starts the bot through a player's invite link earns that player this many
// embers; there is no limit on how many friends can be invited.
export const INVITE_EMBERS = 2;

export function botUsername() {
	return process.env.TELEGRAM_BOT_USERNAME || 'word_circle_bot';
}

export function startLink(payload: string) {
	return `https://t.me/${botUsername()}?start=${payload}`;
}

// Codes ride in /start payloads, which Telegram limits to [A-Za-z0-9_-]{1,64}.
export function newCode(bytes: number) {
	return randomBytes(bytes).toString('base64url');
}

export function bridgeAuthorized(authorization: unknown, secret = process.env.TELEGRAM_BRIDGE_SECRET ?? '') {
	if (!secret || typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) return false;
	const token = Buffer.from(authorization.slice(7));
	const expected = Buffer.from(secret);
	return token.length === expected.length && timingSafeEqual(token, expected);
}

// The `user` field of signed Mini App launch data; other fields Telegram adds are kept.
const InitDataUser = v.looseObject({
	id: v.pipe(v.number(), v.safeInteger(), v.minValue(1)),
	first_name: v.optional(v.string()),
	language_code: v.optional(v.string()),
	allows_write_to_pm: v.optional(v.boolean())
});
export type TelegramUser = v.InferOutput<typeof InitDataUser>;

/** The Telegram user behind a Mini App launch, once Telegram's signature over `initData` checks out
 * against the bot token; null for anything forged, unsigned or older than `maxAgeSeconds`. */
export function verifyInitData(initData: unknown, token = process.env.TELEGRAM_BOT_TOKEN ?? '', now = Date.now(), maxAgeSeconds = 24 * 60 * 60): TelegramUser | null {
	if (!token || typeof initData !== 'string' || initData.length > 4096) return null;
	const params = new URLSearchParams(initData);
	const hash = params.get('hash') ?? '';
	params.delete('hash');
	const checkString = [...params.entries()].map(([key, value]) => `${key}=${value}`).sort().join('\n');
	const secret = createHmac('sha256', 'WebAppData').update(token).digest();
	const expected = createHmac('sha256', secret).update(checkString).digest('hex');
	if (hash.length !== expected.length || !timingSafeEqual(Buffer.from(hash), Buffer.from(expected))) return null;
	const authDate = Number(params.get('auth_date'));
	if (!Number.isFinite(authDate) || now / 1000 - authDate > maxAgeSeconds) return null;
	try {
		const user = v.safeParse(InitDataUser, JSON.parse(params.get('user') ?? ''));
		return user.success ? user.output : null;
	} catch {
		return null;
	}
}

/** `r_<code>` turns on reminders for the device that made the code, `l_<code>` signs that device in
 * (links it to the Telegram account, so its progress is saved there); `i_<code>` is a player's invite. */
export function parseStartPayload(payload: unknown): { kind: 'reminders' | 'login' | 'invite'; code: string } | null {
	const match = typeof payload === 'string' ? /^([ril])_([A-Za-z0-9_-]{8,40})$/.exec(payload) : null;
	if (!match) return null;
	// The regex captures exactly two groups, so both are defined when `match` is non-null.
	const kind = match[1] === 'r' ? 'reminders' : match[1] === 'l' ? 'login' : 'invite';
	return { kind, code: match[2] ?? '' };
}

/** Adds invite embers; like the daily ember, every full set forges a freeze while there is room for
 * one, and the embers left over carry on. Only with both freezes stocked does the set stay full. */
export function addEmbers(embers: number, freezes: number, count: number) {
	let nextEmbers = embers + count;
	let nextFreezes = freezes;
	while (nextEmbers >= FREEZE_EVERY && nextFreezes < MAX_FREEZES) {
		nextFreezes += 1;
		nextEmbers -= FREEZE_EVERY;
	}
	return { embers: Math.min(FREEZE_EVERY, nextEmbers), freezes: nextFreezes };
}

export async function sendTelegram(chatId: number | string, text: string, buttonUrl?: string) {
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
		throw Object.assign(new Error('telegram_send_failed'), { statusCode: response.status });
	}
}

export function appUrl() {
	return (process.env.APP_URL || 'https://words-sv.vercel.app').replace(/\/+$/, '') + '/';
}

export const escapeHtml = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export function htmlMessage({ title, body }: { title: string; body: string }) {
	return `<b>${escapeHtml(title)}</b>\n${escapeHtml(body)}`;
}

const INVITE_THANKS: Record<string, (count: number) => { title: string; body: string }> = {
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

export function inviteThanks(locale: string, count: number) {
	// Every supported locale has a thanks message; unknown ones fall back to English.
	const chosen = INVITE_THANKS[locale] ?? INVITE_THANKS.en;
	return chosen ? chosen(count) : { title: 'A friend joined WordCircle', body: `Thanks for inviting them! You got ${count} embers.` };
}

// Friends who joined through one invite link that bring the inviter's character its exclusive top
// (the app unlocks it from the invite count; this only says so in Telegram).
export const INVITE_REWARD_TARGET = 10;
const INVITE_MILESTONE: Record<string, (count: number) => { title: string; body: string }> = {
	en: (count) => ({ title: `${count} friends joined through you!`, body: 'Your character has earned an exclusive Telegram-blue top. Open WordCircle to put it on.' }),
	de: (count) => ({ title: `${count} Freunde sind über dich dabei!`, body: 'Deine Figur hat ein exklusives Oberteil in Telegram-Blau verdient. Öffne WordCircle und zieh es an.' })
};
export function inviteMilestone(locale: string, count: number) {
	return (INVITE_MILESTONE[locale] ?? INVITE_MILESTONE.en!)(count);
}

const TABLES = [
	`CREATE TABLE IF NOT EXISTS wordcircle_telegram_links (
		device_id VARCHAR(64) NOT NULL PRIMARY KEY,
		invite_code VARCHAR(24) NOT NULL UNIQUE,
		link_code VARCHAR(24) NULL UNIQUE,
		chat_id BIGINT NULL,
		telegram_user_id BIGINT NULL,
		reminders SMALLINT NOT NULL DEFAULT 0,
		last_reminded_day CHAR(10) NULL,
		updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
		CONSTRAINT wordcircle_telegram_links_device_fk FOREIGN KEY (device_id) REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS wordcircle_telegram_invites (
		telegram_user_id BIGINT NOT NULL PRIMARY KEY,
		inviter_device_id VARCHAR(64) NOT NULL,
		created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
		CONSTRAINT wordcircle_telegram_invites_device_fk FOREIGN KEY (inviter_device_id) REFERENCES wordcircle_streak_devices(device_id) ON DELETE CASCADE
	)`,
	'CREATE INDEX IF NOT EXISTS wordcircle_telegram_links_user_idx ON wordcircle_telegram_links (telegram_user_id)',
	'CREATE INDEX IF NOT EXISTS wordcircle_telegram_invites_inviter_idx ON wordcircle_telegram_invites (inviter_device_id)'
];
// Freezes forged from invite embers on the server; /api/streak/progress adds them on top of the
// device's own count once, since the device otherwise wins with its lower, locally used-up count.
const INVITE_FREEZES_COLUMN = 'ALTER TABLE wordcircle_streak_devices ADD COLUMN IF NOT EXISTS invite_freezes SMALLINT NOT NULL DEFAULT 0';

let tablesReady: Promise<void> | undefined;
/** Creates the Telegram tables on first use, like the reward columns in /api/streak/progress. */
export function ensureTelegramTables(db: { execute: (sql: string, params?: unknown[]) => Promise<unknown> }) {
	tablesReady ??= (async () => {
		for (const statement of TABLES) await db.execute(statement);
		await db.execute(INVITE_FREEZES_COLUMN);
	})().catch((error: unknown) => { tablesReady = undefined; throw error; });
	return tablesReady;
}
