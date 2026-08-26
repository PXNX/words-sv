import { getDatabase } from '../_lib/database.mjs';
import { isMethod, readJson, respond } from '../_lib/http.mjs';
import { endpointHash, normalizeSubscription } from '../_lib/push.mjs';
import { dateKeyFor, isSupportedTimeZone } from '../_lib/streak.mjs';

const validDeviceId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(value);

export default async function subscribe(req, res) {
	if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
	try {
		const { deviceId, timeZone, subscription } = await readJson(req);
		const normalized = normalizeSubscription(subscription);
		if (!validDeviceId(deviceId) || !isSupportedTimeZone(timeZone) || !normalized) return respond(res, 400, { ok: false, error: 'invalid_subscription' });
		const db = getDatabase();
		await db.execute('INSERT INTO wordcircle_streak_devices (device_id, timezone, day_key) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE timezone = VALUES(timezone)', [deviceId, timeZone, dateKeyFor(timeZone)]);
		await db.execute(`INSERT INTO wordcircle_push_subscriptions (endpoint_hash, device_id, endpoint, p256dh_key, auth_key, enabled) VALUES (?, ?, ?, ?, ?, 1) ON DUPLICATE KEY UPDATE device_id = VALUES(device_id), endpoint = VALUES(endpoint), p256dh_key = VALUES(p256dh_key), auth_key = VALUES(auth_key), enabled = 1`, [endpointHash(normalized.endpoint), deviceId, normalized.endpoint, normalized.keys.p256dh, normalized.keys.auth]);
		return respond(res, 201, { ok: true, subscribed: true });
	} catch (error) {
		return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'subscription_unavailable' });
	}
}
