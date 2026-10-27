import { getDatabase } from '../_lib/database.mjs';
import { isMethod, readJson, respond } from '../_lib/http.mjs';
import { FREEZE_EVERY, normalizeReminderLocale } from '../_lib/streak.mjs';
import { INVITE_EMBERS, addEmbers, appUrl, bridgeAuthorized, ensureTelegramTables, htmlMessage, inviteThanks, parseStartPayload, sendTelegram } from '../_lib/telegram.mjs';

const validId = (value) => Number.isSafeInteger(value) && value !== 0;

// Called by the ptb-words bot for every `/start r_…` or `/start i_…` it receives. Answers with what
// happened, so the bot can reply in the player's language:
// reminders_on | expired | invited | known | own_invite | unknown.
export function createStartEndpoint({ databaseProvider = getDatabase, telegramSender = sendTelegram } = {}) {
	return async function telegramStart(req, res) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		if (!bridgeAuthorized(req.headers?.authorization)) return respond(res, 401, { ok: false, error: 'unauthorized' });
		try {
			const { payload, userId, chatId } = await readJson(req);
			const start = parseStartPayload(payload);
			if (!start || !validId(userId) || !validId(chatId)) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const db = databaseProvider();
			await ensureTelegramTables(db);
			if (start.kind === 'reminders') {
				const [result] = await db.execute('UPDATE wordcircle_telegram_links SET chat_id = ?, telegram_user_id = ?, reminders = 1, link_code = NULL WHERE link_code = ?', [chatId, userId, start.code]);
				return respond(res, 200, { ok: true, result: result.affectedRows === 1 ? 'reminders_on' : 'expired' });
			}
			return respond(res, 200, { ok: true, result: await creditInvite(db, start.code, userId, telegramSender) });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'telegram_unavailable' });
		}
	};
}

async function creditInvite(db, code, userId, telegramSender) {
	const [[inviter]] = await db.execute('SELECT device_id, chat_id, telegram_user_id FROM wordcircle_telegram_links WHERE invite_code = ? LIMIT 1', [code]);
	if (!inviter) return 'unknown';
	if (Number(inviter.telegram_user_id) === userId) return 'own_invite';
	// Only players new to WordCircle count: someone who already linked the bot to the app is not.
	const [[linked]] = await db.execute('SELECT device_id FROM wordcircle_telegram_links WHERE telegram_user_id = ? LIMIT 1', [userId]);
	if (linked) return 'known';
	try {
		await db.execute('INSERT INTO wordcircle_telegram_invites (telegram_user_id, inviter_device_id) VALUES (?, ?)', [userId, inviter.device_id]);
	} catch (error) {
		if (error?.code === 'ER_DUP_ENTRY') return 'known';
		throw error;
	}
	// Compare-and-set, so two friends joining at once both count.
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const [[device]] = await db.execute('SELECT embers, freezes, qualified_days, locale FROM wordcircle_streak_devices WHERE device_id = ? LIMIT 1', [inviter.device_id]);
		if (!device) break;
		const embers = device.embers === null || device.embers === undefined ? Number(device.qualified_days ?? 0) % FREEZE_EVERY : Number(device.embers);
		const freezes = Number(device.freezes ?? 0);
		const next = addEmbers(embers, freezes, INVITE_EMBERS);
		const [result] = await db.execute('UPDATE wordcircle_streak_devices SET embers = ?, freezes = ?, invite_freezes = LEAST(2, invite_freezes + ?) WHERE device_id = ? AND embers <=> ? AND freezes = ?', [next.embers, next.freezes, next.freezes - freezes, inviter.device_id, device.embers ?? null, freezes]);
		if (result.affectedRows !== 1) continue;
		if (inviter.chat_id) await telegramSender(inviter.chat_id, htmlMessage(inviteThanks(normalizeReminderLocale(device.locale), INVITE_EMBERS)), appUrl()).catch(() => undefined);
		break;
	}
	return 'invited';
}

export default createStartEndpoint();
