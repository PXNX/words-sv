import * as v from 'valibot';
import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { ensureGameTables, SessionIdSchema, SESSION_TTL_MS, telegramApi } from '../_lib/games.js';
import { bareWord, claimTurn, cleanLines, currentRound, guess, joinPlayer, MATCH_ROUNDS, ROUND_SECONDS, saveLines, startRound, TURN_SECONDS, winsOf, type Telegram } from '../_lib/scribbleGame.js';
import type { Database, Row } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

// Live Scribble for the page opened from a group's Scribble game (server/_lib/scribbleGame.ts):
// `state` is polled about once a second and answers the player's role, the round (with the
// drawer's lines when they changed) and the match standings; the drawer `start`s a round with the
// chosen word and sends its `lines` as they grow; everybody else sends `guess`es.
const Text = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(64));
const Request = v.variant('action', [
	v.object({ action: v.literal('state'), session: SessionIdSchema, since: v.optional(v.number(), -1), locale: v.optional(v.string(), 'en') }),
	v.object({ action: v.literal('start'), session: SessionIdSchema, word: Text, answers: v.pipe(v.array(Text), v.minLength(1), v.maxLength(12)) }),
	v.object({ action: v.literal('lines'), session: SessionIdSchema, round: v.number(), lines: v.unknown() }),
	v.object({ action: v.literal('guess'), session: SessionIdSchema, text: v.pipe(v.string(), v.maxLength(64)) })
]);

type Player = { userId: number; name: string; chatId: number; gameMessageId: number };

async function player(db: Database, session: string): Promise<Player | 'unknown' | 'expired' | 'no_chat'> {
	const [[row]] = await db.execute('SELECT telegram_user_id, first_name, game, chat_id, message_id, created_at FROM wordcircle_game_sessions WHERE id = ? LIMIT 1', [session]);
	if (!row || row.game !== 'scribble') return 'unknown';
	if (Date.now() - new Date(row.created_at).getTime() > SESSION_TTL_MS) return 'expired';
	if (!row.chat_id || !row.message_id) return 'no_chat';
	return { userId: Number(row.telegram_user_id), name: String(row.first_name ?? ''), chatId: Number(row.chat_id), gameMessageId: Number(row.message_id) };
}

function roundView(round: Row | undefined, me: number, since: number) {
	if (!round) return null;
	const ended = round.solved_by !== null;
	const mine = Number(round.drawer_id) === me;
	const version = Number(round.version ?? 0);
	const elapsed = (Date.now() - new Date(round.created_at).getTime()) / 1000;
	return {
		id: Number(round.id),
		status: !ended ? 'drawing' : Number(round.solved_by) === 0 ? 'timeout' : 'solved',
		drawer: String(round.drawer_name ?? ''),
		mine,
		letters: bareWord(String(round.word)).length,
		// The word only for its drawer, or once the round is over.
		word: mine || ended ? String(round.word) : null,
		guesser: ended && Number(round.solved_by) ? String(round.guesser_name ?? '') : null,
		guessedByMe: ended && Number(round.solved_by) === me,
		points: round.points === null || round.points === undefined ? null : Number(round.points),
		secondsLeft: ended ? 0 : Math.max(0, Math.ceil(ROUND_SECONDS - elapsed)),
		version,
		lines: version !== since ? JSON.parse(String(round.lines ?? '[]')) : null
	};
}

export function createScribbleEndpoint({ databaseProvider = getDatabase, telegram = telegramApi as Telegram }: { databaseProvider?: () => Database; telegram?: Telegram } = {}) {
	return async function scribble(req: ApiRequest, res: ApiResponse) {
		if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
		try {
			const parsed = v.safeParse(Request, await readJson(req));
			if (!parsed.success) return respond(res, 400, { ok: false, error: 'invalid_request' });
			const input = parsed.output;
			const db = databaseProvider();
			await ensureGameTables(db);
			const me = await player(db, input.session);
			if (me === 'unknown') return respond(res, 404, { ok: false, error: 'unknown_session' });
			if (me === 'expired') return respond(res, 410, { ok: false, error: 'session_expired' });
			if (me === 'no_chat') return respond(res, 409, { ok: false, error: 'no_chat' });

			switch (input.action) {
				case 'state': {
					await joinPlayer(db, me.chatId, me.userId, me.name);
					const state = await claimTurn(db, me.chatId, me.gameMessageId, me.userId, input.locale.slice(0, 2) === 'de' ? 'de' : 'en');
					const round = await currentRound(db, me.chatId);
					const drawerId = state.drawer_id === null ? null : Number(state.drawer_id);
					const [[drawer]] = drawerId === null ? [[undefined]] : await db.execute('SELECT first_name FROM wordcircle_scribble_players WHERE chat_id = ? AND user_id = ?', [me.chatId, drawerId]);
					const [standings] = await db.execute('SELECT user_id, first_name, match_points FROM wordcircle_scribble_players WHERE chat_id = ? ORDER BY match_points DESC, joined_at LIMIT 8', [me.chatId]);
					const running = round && round.solved_by === null;
					return respond(res, 200, {
						ok: true,
						role: running ? (Number(round.drawer_id) === me.userId ? 'draw' : 'watch') : drawerId === me.userId ? 'draw' : 'wait',
						me: { name: me.name, wins: await winsOf(db, me.userId) },
						drawer: drawer ? String(drawer.first_name ?? '') : null,
						turnSecondsLeft: Math.max(0, Math.ceil(TURN_SECONDS - (Date.now() - new Date(state.turn_started_at).getTime()) / 1000)),
						round: roundView(round, me.userId, input.since),
						match: {
							round: Math.min(MATCH_ROUNDS, Number(state.match_rounds ?? 0) + (running ? 1 : 0)),
							of: MATCH_ROUNDS,
							standings: (standings as Row[]).map((row) => ({ name: String(row.first_name ?? ''), points: Number(row.match_points ?? 0), me: Number(row.user_id) === me.userId }))
						}
					});
				}
				case 'start': {
					const started = await startRound(db, telegram, me.chatId, me.userId, me.name, input.word, input.answers);
					if (!started.ok) return respond(res, 409, { ok: false, error: started.error });
					return respond(res, 200, { ok: true, round: Number(started.round.id) });
				}
				case 'lines': {
					const lines = cleanLines(input.lines);
					if (!lines) return respond(res, 400, { ok: false, error: 'invalid_lines' });
					const saved = await saveLines(db, me.chatId, me.userId, input.round, lines);
					return respond(res, saved ? 200 : 409, saved ? { ok: true } : { ok: false, error: 'round_over' });
				}
				case 'guess': {
					const result = await guess(db, telegram, me.chatId, me.userId, me.name, input.text);
					return respond(res, 200, { ok: true, result });
				}
				default:
					return respond(res, 400, { ok: false, error: 'invalid_request' });
			}
		} catch (error) {
			return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'scribble_unavailable' });
		}
	};
}

export default createScribbleEndpoint();
