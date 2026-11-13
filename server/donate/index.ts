import * as v from 'valibot';
import { getDatabase } from '../_lib/database.js';
import { DONATE_MAX, DONATE_MIN, donationPayload, validDonation } from '../_lib/donate.js';
import { telegramApi } from '../_lib/games.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { ensureTelegramTables } from '../_lib/telegram.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// A Telegram Stars invoice link for a donation of the learner's own amount (at least DONATE_MIN).
// Nothing is unlocked by it; a signed-in device ties the payment to its Telegram account.
const Request = v.object({
	deviceId: v.pipe(v.string(), v.regex(/^[a-zA-Z0-9_-]{16,64}$/u)),
	amount: v.number(),
	locale: v.optional(v.string())
});

const TEXTS: Record<string, { title: string; description: string; label: string }> = {
	en: { title: 'Support WordCircle', description: 'A voluntary donation of {amount} Stars. It unlocks nothing and is not refunded. Thank you!', label: 'Donation' },
	de: { title: 'WordCircle unterstützen', description: 'Eine freiwillige Spende von {amount} Stars. Sie schaltet nichts frei und wird nicht erstattet. Danke!', label: 'Spende' }
};

type Telegram = <T>(method: string, params: Record<string, unknown>) => Promise<T>;

export function createDonateEndpoint({ databaseProvider = getDatabase, telegram = telegramApi as Telegram }: { databaseProvider?: () => Database; telegram?: Telegram } = {}) {
	return async function donate(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		try {
			const parsed = v.safeParse(Request, await readJson(req));
			if (!parsed.success) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const { deviceId, amount, locale } = parsed.output;
			if (!validDonation(amount)) return respond(res, 400, { ok: false, error: 'invalid_amount', min: DONATE_MIN, max: DONATE_MAX });
			let userId: number | null = null;
			try {
				const db = databaseProvider();
				await ensureTelegramTables(db);
				const [[link]] = await db.execute('SELECT telegram_user_id FROM wordcircle_telegram_links WHERE device_id = ? LIMIT 1', [deviceId]);
				userId = link?.telegram_user_id ? Number(link.telegram_user_id) : null;
			} catch {
				/* without the database the donation simply is not tied to an account */
			}
			const texts = TEXTS[(locale ?? '').slice(0, 2)] ?? TEXTS.en!;
			const url = await telegram<string>('createInvoiceLink', {
				title: texts.title,
				description: texts.description.replace('{amount}', String(amount)),
				payload: donationPayload(amount, userId),
				currency: 'XTR',
				prices: [{ label: texts.label, amount }]
			});
			return respond(res, 200, { ok: true, url });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'donate_unavailable' });
		}
	};
}

export default createDonateEndpoint();
