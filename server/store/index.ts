import * as v from 'valibot';
import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { ensureTelegramTables } from '../_lib/telegram.js';
import { telegramApi } from '../_lib/games.js';
import { ensureStoreTables, PRO_PERIOD_SECONDS, storePayload, storeProduct } from '../_lib/store.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// The store for a device signed in with Telegram: `status` lists what its Telegram account bought
// and until when Pro runs; `invoice` makes a Telegram Stars invoice link for one product (Pro as a
// 30-day subscription). Payments reach the bot, which records them here (server/telegram/purchase.ts).
const Request = v.object({
	deviceId: v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]{16,64}$/u)),
	action: v.picklist(['status', 'invoice']),
	product: v.optional(v.string()),
	locale: v.optional(v.string())
});

const TITLES: Record<string, Record<string, string>> = {
	en: { pro: 'WordCircle Pro', set: 'Character set', item: 'Character item', description: 'For your WordCircle character. Thank you for supporting WordCircle!', proDescription: 'One missed day a week does not break your streak. Renews every 30 days; cancel any time in Telegram.' },
	de: { pro: 'WordCircle Pro', set: 'Figuren-Set', item: 'Figuren-Teil', description: 'Für deine WordCircle-Figur. Danke, dass du WordCircle unterstützt!', proDescription: 'Ein verpasster Tag pro Woche unterbricht deine Serie nicht. Verlängert sich alle 30 Tage; jederzeit in Telegram kündbar.' }
};


type Telegram = <T>(method: string, params: Record<string, unknown>) => Promise<T>;

export function createStoreEndpoint({ databaseProvider = getDatabase, telegram = telegramApi as Telegram }: { databaseProvider?: () => Database; telegram?: Telegram } = {}) {
	return async function store(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		try {
			const parsed = v.safeParse(Request, await readJson(req));
			if (!parsed.success) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const { deviceId, action, locale } = parsed.output;
			const db = databaseProvider();
			await ensureTelegramTables(db);
			await ensureStoreTables(db);
			const [[link]] = await db.execute('SELECT telegram_user_id FROM wordcircle_telegram_links WHERE device_id = ? LIMIT 1', [deviceId]);
			const userId = link?.telegram_user_id ? Number(link.telegram_user_id) : null;
			if (!userId) return respond(res, 200, { ok: true, linked: false, bought: [], proUntil: null });
			if (action === 'invoice') {
				const found = storeProduct(parsed.output.product);
				if (!found) return respond(res, 400, { ok: false, error: 'unknown_product' });
				const texts = TITLES[(locale ?? '').slice(0, 2)] ?? TITLES.en!;
				const title = found.kind === 'pro' ? texts.pro! : `${texts[found.kind]}`;
				const url = await telegram<string>('createInvoiceLink', {
					title,
					description: found.kind === 'pro' ? texts.proDescription : texts.description,
					payload: storePayload(found.id, userId),
					currency: 'XTR',
					prices: [{ label: title, amount: found.stars }],
					...(found.kind === 'pro' ? { subscription_period: PRO_PERIOD_SECONDS } : {})
				});
				return respond(res, 200, { ok: true, url });
			}
			const [purchases] = await db.execute('SELECT DISTINCT product FROM wordcircle_purchases WHERE telegram_user_id = ?', [userId]);
			const [[pro]] = await db.execute('SELECT pro_until FROM wordcircle_pro WHERE telegram_user_id = ? LIMIT 1', [userId]);
			const proUntil = pro?.pro_until ? new Date(pro.pro_until).getTime() : null;
			return respond(res, 200, { ok: true, linked: true, bought: (purchases as Array<{ product: string }>).map((row) => row.product).filter((id) => id !== 'pro'), proUntil: proUntil && proUntil > Date.now() ? proUntil : null });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'store_unavailable' });
		}
	};
}

export default createStoreEndpoint();
