import * as v from 'valibot';
import { getDatabase } from '../_lib/database.js';
import { telegramApi } from '../_lib/games.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { guess, type Telegram } from '../_lib/scribbleGame.js';
import { bridgeAuthorized } from '../_lib/telegram.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// A Scribble guess typed in the group chat as a reply to the bot's "now drawing" message, forwarded
// by the bot (which receives replies to its messages even with privacy mode on).
const TelegramId = v.pipe(v.number(), v.safeInteger(), v.check((value) => value !== 0));
const Request = v.object({
	chatId: TelegramId,
	replyTo: v.pipe(v.number(), v.safeInteger(), v.minValue(1)),
	userId: TelegramId,
	firstName: v.optional(v.pipe(v.string(), v.maxLength(64)), ''),
	text: v.pipe(v.string(), v.maxLength(200))
});

export function createScribbleGuessEndpoint({ databaseProvider = getDatabase, telegram = telegramApi as Telegram }: { databaseProvider?: () => Database; telegram?: Telegram } = {}) {
	return async function scribbleGuess(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		if (!bridgeAuthorized(req.headers?.authorization)) return respond(res, 401, { ok: false, error: 'unauthorized' });
		try {
			const parsed = v.safeParse(Request, await readJson(req));
			if (!parsed.success) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const { chatId, replyTo, userId, firstName, text } = parsed.output;
			return respond(res, 200, { ok: true, result: await guess(databaseProvider(), telegram, chatId, userId, firstName, text, replyTo) });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'scribble_unavailable' });
		}
	};
}

export default createScribbleGuessEndpoint();
