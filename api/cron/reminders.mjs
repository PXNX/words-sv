import { timingSafeEqual } from 'node:crypto';
import { getDatabase } from '../_lib/database.mjs';
import { respond } from '../_lib/http.mjs';
import { sendPush } from '../_lib/push.mjs';
import { reminderNotification, reminderTypes } from '../_lib/streak.mjs';
import { appUrl, htmlMessage, sendTelegram } from '../_lib/telegram.mjs';

function constantTimeMatch(left, right) {
	const leftValue = Buffer.from(left);
	const rightValue = Buffer.from(right);
	return leftValue.length === rightValue.length && timingSafeEqual(leftValue, rightValue);
}

export function cronAuthorized(authorization, secret = process.env.CRON_SECRET ?? '') {
	if (!secret || typeof authorization !== 'string') return false;
	const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
	return Boolean(token) && constantTimeMatch(token, secret);
}

// Players who linked the bot get a Telegram message when their streak is about to expire: once a
// local day, in the last two hours before midnight. Telegram has its own once-a-day mark, so it
// arrives whether or not a push reminder went out too.
async function sendTelegramReminders(db, telegramSender, now) {
	let rows;
	try {
		[rows] = await db.execute('SELECT d.*, t.chat_id FROM wordcircle_streak_devices d INNER JOIN wordcircle_telegram_links t ON t.device_id = d.device_id WHERE t.reminders = 1 AND t.chat_id IS NOT NULL');
	} catch (error) {
		// Nobody has linked Telegram yet: /api/telegram/device creates the table on first use.
		if (error?.code === 'ER_NO_SUCH_TABLE') return { attempted: 0, delivered: 0 };
		throw error;
	}
	let attempted = 0;
	let delivered = 0;
	for (const row of rows) {
		const { summary, types } = reminderTypes(row, row.timezone, now);
		if (!types.includes('deadline')) continue;
		const [claim] = await db.execute('UPDATE wordcircle_telegram_links SET last_reminded_day = ? WHERE device_id = ? AND (last_reminded_day IS NULL OR last_reminded_day <> ?)', [summary.dateKey, row.device_id, summary.dateKey]);
		if (claim?.affectedRows !== 1) continue;
		attempted += 1;
		try {
			await telegramSender(row.chat_id, htmlMessage(reminderNotification('deadline', row.locale, summary.minutesRemaining)), appUrl());
			delivered += 1;
		} catch (error) {
			// 403: the player blocked the bot or deleted the chat.
			if (error?.statusCode === 403) await db.execute('UPDATE wordcircle_telegram_links SET reminders = 0 WHERE device_id = ?', [row.device_id]);
		}
	}
	return { attempted, delivered };
}

export function createRemindersEndpoint({ databaseProvider = getDatabase, pushSender = sendPush, telegramSender = sendTelegram, now = () => new Date() } = {}) {
	return async function remindersEndpoint(req, res) {
	if (!['GET', 'POST'].includes(req.method ?? 'GET')) {
		return respond(res, 405, { ok: false, error: 'method_not_allowed' });
	}
	if (!cronAuthorized(req.headers?.authorization)) {
		return respond(res, 401, { ok: false, error: 'unauthorized' });
	}
	try {
		const db = databaseProvider();
		const [rows] = await db.execute(`SELECT d.*, s.endpoint_hash, s.endpoint, s.p256dh_key, s.auth_key FROM wordcircle_streak_devices d INNER JOIN wordcircle_push_subscriptions s ON s.device_id = d.device_id WHERE s.enabled = 1`);
		let attempted = 0;
		let delivered = 0;
		for (const row of rows) {
			const { summary, types } = reminderTypes(row, row.timezone, now());
			for (const type of types) {
				try {
					await db.execute('INSERT INTO wordcircle_reminder_deliveries (device_id, delivery_date, delivery_type) VALUES (?, ?, ?)', [row.device_id, summary.dateKey, type]);
				} catch (error) {
					if (error?.code === 'ER_DUP_ENTRY') continue;
					throw error;
				}
				attempted += 1;
				const payload = { ...reminderNotification(type, row.locale, summary.minutesRemaining), url: '/' };
				try {
					await pushSender({ endpoint: row.endpoint, keys: { p256dh: row.p256dh_key, auth: row.auth_key } }, payload);
					delivered += 1;
				} catch (error) {
					if (error?.statusCode === 404 || error?.statusCode === 410) await db.execute('UPDATE wordcircle_push_subscriptions SET enabled = 0 WHERE endpoint_hash = ?', [row.endpoint_hash]);
				}
			}
		}
		const telegram = await sendTelegramReminders(db, telegramSender, now());
		return respond(res, 200, { ok: true, attempted, delivered, telegram });
	} catch (error) {
		return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'reminders_unavailable' });
	}
	};
}

export default createRemindersEndpoint();
