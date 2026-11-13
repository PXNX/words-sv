import * as v from 'valibot';
import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { bridgeAuthorized } from '../_lib/telegram.js';
import { checkoutProblem, ensureStoreTables, parseStorePayload, PRO_PERIOD_SECONDS } from '../_lib/store.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// Store payments, forwarded by the bot (which receives every Telegram update): `check` answers the
// pre-checkout query (right product, price, currency and buyer), `paid` records a successful
// payment once per charge; Pro runs until the subscription's expiry (or 30 days from now).
const Request = v.variant('action', [
	v.object({ action: v.literal('check'), payload: v.string(), currency: v.string(), amount: v.number(), userId: v.number() }),
	v.object({ action: v.literal('paid'), payload: v.string(), currency: v.string(), amount: v.number(), userId: v.number(), chargeId: v.pipe(v.string(), v.minLength(1), v.maxLength(255)), subscriptionExpiration: v.optional(v.nullable(v.number())) })
]);

export function createPurchaseEndpoint({ databaseProvider = getDatabase, now = () => Date.now() }: { databaseProvider?: () => Database; now?: () => number } = {}) {
	return async function purchase(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		if (!bridgeAuthorized(req.headers?.authorization)) return respond(res, 401, { ok: false, error: 'unauthorized' });
		try {
			const parsed = v.safeParse(Request, await readJson(req));
			if (!parsed.success) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const input = parsed.output;
			const problem = checkoutProblem(input.payload, input.currency, input.amount, input.userId);
			if (input.action === 'check' || problem) return respond(res, 200, { ok: true, problem });
			const { product, userId } = parseStorePayload(input.payload)!;
			const db = databaseProvider();
			await ensureStoreTables(db);
			await db.execute('INSERT INTO wordcircle_purchases (charge_id, telegram_user_id, product, stars) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', [input.chargeId, userId, product.id, product.stars]);
			if (product.kind === 'pro') {
				const until = new Date(input.subscriptionExpiration ? input.subscriptionExpiration * 1000 : now() + PRO_PERIOD_SECONDS * 1000);
				await db.execute('INSERT INTO wordcircle_pro (telegram_user_id, pro_until) VALUES (?, ?) ON CONFLICT (telegram_user_id) DO UPDATE SET pro_until = GREATEST(wordcircle_pro.pro_until, EXCLUDED.pro_until)', [userId, until]);
			}
			return respond(res, 200, { ok: true, problem: null, product: product.id });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'store_unavailable' });
		}
	};
}

export default createPurchaseEndpoint();
