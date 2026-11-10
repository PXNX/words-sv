import { getDatabase } from '../_lib/database.js';
import { isMethod, respond } from '../_lib/http.js';
import { isSupportedTimeZone, streakSummary } from '../_lib/streak.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

export default async function streakStatus(req: ApiRequest, res: ApiResponse) {
	if (!isMethod(req, 'GET')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
	const { deviceId, timeZone } = req.query ?? {};
	if (typeof deviceId !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(deviceId) || typeof timeZone !== 'string' || !isSupportedTimeZone(timeZone)) return respond(res, 400, { ok: false, error: 'invalid_request' });
	try {
		const [rows] = await getDatabase().execute('SELECT * FROM wordcircle_streak_devices WHERE device_id = ? LIMIT 1', [deviceId]);
		return respond(res, 200, { ok: true, streak: streakSummary(rows[0], timeZone) });
	} catch (error) {
		return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'streak_unavailable' });
	}
}
