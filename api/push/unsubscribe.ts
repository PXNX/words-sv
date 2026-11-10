import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { endpointHash } from '../_lib/push.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

export default async function unsubscribe(req: ApiRequest, res: ApiResponse) {
	if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
	try {
		const { endpoint } = await readJson(req);
		if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) return respond(res, 400, { ok: false, error: 'invalid_subscription' });
		await getDatabase().execute('UPDATE wordcircle_push_subscriptions SET enabled = 0 WHERE endpoint_hash = ?', [endpointHash(endpoint)]);
		return respond(res, 200, { ok: true, subscribed: false });
	} catch (error) {
		return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'subscription_unavailable' });
	}
}
