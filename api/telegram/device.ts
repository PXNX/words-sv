import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { dateKeyFor, isSupportedTimeZone, normalizeReminderLocale } from '../_lib/streak.js';
import { INVITE_EMBERS, ensureTelegramTables, newCode, startLink, verifyInitData } from '../_lib/telegram.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

const validDeviceId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(value);
const actions = new Set(['status', 'connect', 'disconnect', 'miniapp', 'signin', 'signout']);

// The app's side of Telegram: `status` returns the player's invite link and whether reminders are
// on, `connect` turns them on (straight away when the bot can already write to the player, otherwise
// through a one-time /start link), `disconnect` turns them off. `miniapp` links the device to the
// Telegram user who opened WordCircle as a Mini App, from Telegram's signed `initData`. `signin`
// returns a one-time /start link that links the device to whoever presses Start (outside the Mini
// App), and `signout` unlinks this device again: its local progress stays, the account keeps its copy.
export function createDeviceEndpoint({ databaseProvider = getDatabase }: { databaseProvider?: () => Database } = {}) {
	return async function telegramDevice(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		try {
			const { deviceId, timeZone, locale, action = 'status', initData } = await readJson(req);
			if (!validDeviceId(deviceId) || typeof timeZone !== 'string' || !isSupportedTimeZone(timeZone) || typeof action !== 'string' || !actions.has(action)) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const user = action === 'miniapp' ? verifyInitData(initData) : null;
			if (action === 'miniapp' && !user) return respond(res, 401, { ok: false, error: 'invalid_init_data' });
			const db = databaseProvider();
			await ensureTelegramTables(db);
			await db.execute('INSERT INTO wordcircle_streak_devices (device_id, timezone, locale, day_key) VALUES (?, ?, ?, ?) ON CONFLICT (device_id) DO UPDATE SET timezone = EXCLUDED.timezone, locale = EXCLUDED.locale, last_seen_at = now()', [deviceId, timeZone, normalizeReminderLocale(locale), dateKeyFor(timeZone)]);
			await db.execute('INSERT INTO wordcircle_telegram_links (device_id, invite_code) VALUES (?, ?) ON CONFLICT DO NOTHING', [deviceId, newCode(12)]);
			let connectUrl = null;
			if (action === 'miniapp' && user) {
				// A private chat's id is the user's id; the bot may only write there once the user allowed it
				// (or started the bot earlier, which already stored the chat for this same user).
				await db.execute('UPDATE wordcircle_telegram_links SET chat_id = CASE WHEN ?::int = 1 THEN ?::bigint WHEN telegram_user_id IS NOT DISTINCT FROM ?::bigint THEN chat_id ELSE NULL END, telegram_user_id = ? WHERE device_id = ?', [user.allows_write_to_pm ? 1 : 0, user.id, user.id, user.id, deviceId]);
			} else if (action === 'connect') {
				const [direct] = await db.execute('UPDATE wordcircle_telegram_links SET reminders = 1, link_code = NULL WHERE device_id = ? AND chat_id IS NOT NULL', [deviceId]);
				if (direct.affectedRows !== 1) {
					const code = newCode(12);
					await db.execute('UPDATE wordcircle_telegram_links SET link_code = ? WHERE device_id = ?', [code, deviceId]);
					connectUrl = startLink(`r_${code}`);
				}
			} else if (action === 'signin') {
				const code = newCode(12);
				await db.execute('UPDATE wordcircle_telegram_links SET link_code = ? WHERE device_id = ?', [code, deviceId]);
				connectUrl = startLink(`l_${code}`);
			} else if (action === 'signout') {
				await db.execute('UPDATE wordcircle_telegram_links SET telegram_user_id = NULL, chat_id = NULL, reminders = 0, link_code = NULL WHERE device_id = ?', [deviceId]);
			} else if (action === 'disconnect') {
				await db.execute('UPDATE wordcircle_telegram_links SET reminders = 0, link_code = NULL WHERE device_id = ?', [deviceId]);
			}
			const [[link]] = await db.execute('SELECT invite_code, chat_id, telegram_user_id, reminders FROM wordcircle_telegram_links WHERE device_id = ? LIMIT 1', [deviceId]);
			const [[invites]] = await db.execute('SELECT COUNT(*) AS count FROM wordcircle_telegram_invites WHERE inviter_device_id = ?', [deviceId]);
			return respond(res, 200, {
				ok: true,
				reminders: Boolean(link?.reminders && link?.chat_id),
				// Linked to a Telegram account: progress is saved there (api/progress/sync.ts).
				linked: Boolean(link?.telegram_user_id),
				connectUrl,
				inviteUrl: link ? startLink(`i_${link.invite_code}`) : null,
				invited: Number(invites?.count ?? 0),
				inviteEmbers: INVITE_EMBERS
			});
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'telegram_unavailable' });
		}
	};
}

export default createDeviceEndpoint();
