import * as v from 'valibot';
import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { appUrl, bridgeAuthorized } from '../_lib/telegram.js';
import { ensureGameTables, gameUrl, isGroupGame, newSessionId, SESSION_TTL_MS, type GroupGame } from '../_lib/games.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// Called by the bot when someone presses Play on a game message in a group: stores who plays which
// game from which message and answers the page to open, with the session as its only credential.
const TelegramId = v.pipe(v.number(), v.safeInteger(), v.check((value) => value !== 0));
const Request = v.object({
	userId: TelegramId,
	firstName: v.optional(v.pipe(v.string(), v.maxLength(64)), ''),
	game: v.custom<GroupGame>(isGroupGame),
	chatId: v.optional(TelegramId),
	messageId: v.optional(v.pipe(v.number(), v.safeInteger(), v.minValue(1))),
	inlineMessageId: v.optional(v.pipe(v.string(), v.maxLength(255)))
});

export function createGameSessionEndpoint({ databaseProvider = getDatabase, origin = appUrl }: { databaseProvider?: () => Database; origin?: () => string } = {}) {
	return async function gameSession(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		if (!bridgeAuthorized(req.headers?.authorization)) return respond(res, 401, { ok: false, error: 'unauthorized' });
		try {
			const parsed = v.safeParse(Request, await readJson(req));
			if (!parsed.success || !isGroupGame(parsed.output.game) || (!parsed.output.inlineMessageId && !(parsed.output.chatId && parsed.output.messageId))) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const input = parsed.output;
			const db = databaseProvider();
			await ensureGameTables(db);
			await db.execute('DELETE FROM wordcircle_game_sessions WHERE created_at < ?', [new Date(Date.now() - SESSION_TTL_MS)]);
			const session = newSessionId();
			await db.execute('INSERT INTO wordcircle_game_sessions (id, telegram_user_id, first_name, game, chat_id, message_id, inline_message_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [session, input.userId, input.firstName, input.game, input.chatId ?? null, input.messageId ?? null, input.inlineMessageId ?? null]);
			return respond(res, 200, { ok: true, url: gameUrl(origin(), input.game, session) });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'games_unavailable' });
		}
	};
}

export default createGameSessionEndpoint();
