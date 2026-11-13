import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { endpointHash, normalizeSubscription } from '../_lib/push.js';
import { dateKeyFor, isSupportedTimeZone, normalizeReminderLocale } from '../_lib/streak.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// Web Push in one function: a deployment may hold only a handful of serverless functions, so the
// key, the subscription and its removal share a route. `GET` answers the VAPID public key the
// browser needs before `pushManager.subscribe()`; `POST` with `action: 'subscribe'` stores a
// device's subscription and with `action: 'unsubscribe'` turns it off.
const validDeviceId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,64}$/u.test(value);

export function createPushEndpoint({ databaseProvider = getDatabase }: { databaseProvider?: () => Database } = {}) {
	return async function push(req: ApiRequest, res: ApiResponse) {
		if (isMethod(req, 'GET')) {
			const key = process.env.VAPID_PUBLIC_KEY;
			if (!key) return respond(res, 503, { ok: false, error: 'push_unavailable' });
			return respond(res, 200, { ok: true, publicKey: key });
		}
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		try {
			const body = await readJson(req);
			if (body.action === 'unsubscribe') {
				const { endpoint } = body;
				if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) return respond(res, 400, { ok: false, error: 'invalid_subscription' });
				await databaseProvider().execute('UPDATE wordcircle_push_subscriptions SET enabled = 0 WHERE endpoint_hash = ?', [endpointHash(endpoint)]);
				return respond(res, 200, { ok: true, subscribed: false });
			}
			if (body.action === 'subscribe') {
				const { deviceId, timeZone, subscription, locale } = body;
				const normalized = normalizeSubscription(subscription);
				if (!validDeviceId(deviceId) || typeof timeZone !== 'string' || !isSupportedTimeZone(timeZone) || !normalized) return respond(res, 400, { ok: false, error: 'invalid_subscription' });
				const db = databaseProvider();
				await db.execute('INSERT INTO wordcircle_streak_devices (device_id, timezone, locale, day_key) VALUES (?, ?, ?, ?) ON CONFLICT (device_id) DO UPDATE SET timezone = EXCLUDED.timezone, locale = EXCLUDED.locale, last_seen_at = now()', [deviceId, timeZone, normalizeReminderLocale(locale), dateKeyFor(timeZone)]);
				await db.execute(`INSERT INTO wordcircle_push_subscriptions (endpoint_hash, device_id, endpoint, p256dh_key, auth_key, enabled) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT (endpoint_hash) DO UPDATE SET device_id = EXCLUDED.device_id, endpoint = EXCLUDED.endpoint, p256dh_key = EXCLUDED.p256dh_key, auth_key = EXCLUDED.auth_key, enabled = 1, updated_at = now()`, [endpointHash(normalized.endpoint), deviceId, normalized.endpoint, normalized.keys.p256dh, normalized.keys.auth]);
				return respond(res, 201, { ok: true, subscribed: true });
			}
			return respond(res, 400, { ok: false, error: 'invalid_action' });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'subscription_unavailable' });
		}
	};
}

export default createPushEndpoint();
