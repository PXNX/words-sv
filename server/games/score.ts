import * as v from 'valibot';
import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { ensureGameTables, isGroupGame, leaderboardRows, SessionIdSchema, SESSION_TTL_MS, telegramApi, validScore, type HighScore } from '../_lib/games.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// A finished round of a group game: puts the score on the group's Telegram scoreboard (Telegram keeps
// each player's best and posts a message for a new one) and answers the leaderboard around the
// player. The session from the Play press is the credential; the page has no Telegram login there.
const Request = v.object({ session: SessionIdSchema, game: v.string(), score: v.number() });

type Telegram = <T>(method: string, params: Record<string, unknown>) => Promise<T>;

export function createGameScoreEndpoint({ databaseProvider = getDatabase, telegram = telegramApi as Telegram }: { databaseProvider?: () => Database; telegram?: Telegram } = {}) {
	return async function gameScore(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		try {
			const parsed = v.safeParse(Request, await readJson(req));
			if (!parsed.success || !isGroupGame(parsed.output.game) || !validScore(parsed.output.game, parsed.output.score)) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const { session, game, score } = parsed.output;
			const db = databaseProvider();
			await ensureGameTables(db);
			const [[row]] = await db.execute('SELECT telegram_user_id, game, chat_id, message_id, inline_message_id, created_at FROM wordcircle_game_sessions WHERE id = ? LIMIT 1', [session]);
			if (!row || row.game !== game) return respond(res, 404, { ok: false, error: 'unknown_session' });
			if (Date.now() - new Date(row.created_at).getTime() > SESSION_TTL_MS) return respond(res, 410, { ok: false, error: 'session_expired' });
			const userId = Number(row.telegram_user_id);
			const target = row.inline_message_id ? { inline_message_id: row.inline_message_id } : { chat_id: Number(row.chat_id), message_id: Number(row.message_id) };
			let newBest = true;
			try {
				await telegram('setGameScore', { user_id: userId, score, ...target });
			} catch (error) {
				// Telegram keeps the better score it already has.
				if (!(error instanceof Error && /BOT_SCORE_NOT_MODIFIED/iu.test(error.message))) throw error;
				newBest = false;
			}
			const scores = await telegram<HighScore[]>('getGameHighScores', { user_id: userId, ...target }).catch((): HighScore[] => []);
			return respond(res, 200, { ok: true, newBest, leaderboard: leaderboardRows(scores, userId) });
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'games_unavailable' });
		}
	};
}

export default createGameScoreEndpoint();
