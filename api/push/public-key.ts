import { isMethod, respond } from '../_lib/http.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

export default async function publicKey(req: ApiRequest, res: ApiResponse) {
	if (!isMethod(req, 'GET')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
	const key = process.env.VAPID_PUBLIC_KEY;
	if (!key) return respond(res, 503, { ok: false, error: 'push_unavailable' });
	return respond(res, 200, { ok: true, publicKey: key });
}
