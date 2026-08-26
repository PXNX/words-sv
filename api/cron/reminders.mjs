import { timingSafeEqual } from 'node:crypto';
import { getDatabase } from '../_lib/database.mjs';
import { respond } from '../_lib/http.mjs';
import { sendPush } from '../_lib/push.mjs';
import { reminderTypes } from '../_lib/streak.mjs';

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

export function createRemindersEndpoint({ databaseProvider = getDatabase, pushSender = sendPush, now = () => new Date() } = {}) {
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
				const payload = type === 'deadline'
					? { title: 'Keep your WordCircle streak', body: `Only ${summary.minutesRemaining} minutes remain to qualify today.`, url: '/' }
					: { title: 'Continue your WordCircle streak', body: 'A new learning day has started.', url: '/' };
				try {
					await pushSender({ endpoint: row.endpoint, keys: { p256dh: row.p256dh_key, auth: row.auth_key } }, payload);
					delivered += 1;
				} catch (error) {
					if (error?.statusCode === 404 || error?.statusCode === 410) await db.execute('UPDATE wordcircle_push_subscriptions SET enabled = 0 WHERE endpoint_hash = ?', [row.endpoint_hash]);
				}
			}
		}
		return respond(res, 200, { ok: true, attempted, delivered });
	} catch (error) {
		return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'reminders_unavailable' });
	}
	};
}

export default createRemindersEndpoint();
