/*
 * Scribble in a Telegram group, live. The game message (sendGame "scribble", or the same game shared
 * inline) is the table; pressing Play opens WordCircle with a session. Whose turn it is decides the
 * page's role: the drawer picks a word and draws, and every stroke reaches the others within a second;
 * everybody else watches the drawing appear and types guesses on the page. Nothing is posted to the
 * chat: the only trace there is the game message's scoreboard (setGameScore).
 * The first right guess ends the round: the faster, the more points for the guesser and the drawer.
 * After MATCH_ROUNDS rounds the pages show the winner, which counts a win towards the app's Scribble
 * achievements (first win, ten wins). The turn passes in the order players joined.
 *
 * Everything here runs in the API server (server/main.ts): the endpoints call it, and `scribbleTick`
 * ends rounds nobody guessed and skips drawers who do not start.
 */
import { createHash } from 'node:crypto';
import { checkGuess } from '../../src/lib/scribble/guess.js';
import type { Database, Row } from './database.js';

export const ROUND_SECONDS = 90;
/** Round times the drawer can choose; the group's last choice is the next default. */
export const ROUND_TIMES = [45, 60, 90, 120, 180] as const;
export const validRoundSeconds = (value: unknown): value is number => typeof value === 'number' && (ROUND_TIMES as readonly number[]).includes(value);
export const roundSeconds = (round: Row) => (validRoundSeconds(Number(round.seconds)) ? Number(round.seconds) : ROUND_SECONDS);
export const TURN_SECONDS = 120;
export const MATCH_ROUNDS = 5;
/** A finished round stays visible to the players this long. */
export const RESULT_SECONDS = 12;
/** The match's winner stays on the players' pages this long. */
export const CHAMPION_SECONDS = 60;
export const MAX_LINE_POINTS = 24_000;

export type Telegram = <T>(method: string, params: Record<string, unknown>) => Promise<T>;
export type Line = { c: string; s: number; p: number[] };

/** A table: its key in the Scribble tables and the game message its scores go to. */
export type Table = { key: number; messageId: number; inlineMessageId: string | null };

/**
 * The table's key. A game message in a group is keyed by its chat; one shared inline has no chat the
 * bot can see, so its inline message id becomes a key far below any chat id.
 */
export function tableKey(chatId: number | null | undefined, inlineMessageId: string | null | undefined): number {
	if (chatId) return chatId;
	const hash = createHash('sha256').update(String(inlineMessageId ?? '')).digest();
	return -(5e15 + hash.readUIntBE(0, 6));
}

/** setGameScore's target for a table: the inline game message, or the message in the chat. */
export function scoreTarget(state: Row | undefined, chatId: number, messageId: number): Record<string, unknown> {
	return state?.inline_message_id ? { inline_message_id: String(state.inline_message_id) } : { chat_id: chatId, message_id: messageId };
}

/** The guesser's points: 100, plus up to 100 for guessing fast. The drawer gets half of that. */
export function scribblePoints(elapsedSeconds: number, seconds = ROUND_SECONDS): { guesser: number; drawer: number } {
	const left = Math.max(0, Math.min(1, 1 - elapsedSeconds / seconds));
	const guesser = 100 + Math.round(100 * left);
	return { guesser, drawer: Math.round(guesser / 2) };
}

/** The word without its article, for the letter count and the blanks the guessers see. */
export function bareWord(word: string): string {
	return word.replace(/^(der|die|das|the)\s+/iu, '');
}

/**
 * The word as the guessers see it: one entry per character, the letter once revealed, else null;
 * spaces stay spaces. With `reveal` on, letters appear one by one in an order fixed by the round,
 * evenly over the round time, up to half of them (never the whole word).
 */
export function revealPattern(word: string, roundId: number, elapsedSeconds: number, seconds: number, reveal: boolean): Array<string | null> {
	const chars = [...bareWord(word)];
	const slots = chars.map((char, index) => ({ char, index })).filter(({ char }) => char.trim() !== '');
	const most = reveal ? Math.floor(slots.length / 2) : 0;
	const shown = most > 0 ? Math.min(most, Math.floor(Math.max(0, elapsedSeconds) / (seconds / (most + 1)))) : 0;
	// A small seeded shuffle, so every watcher sees the same letters in the same order.
	let seed = (Math.abs(Math.trunc(roundId)) * 2654435761) % 4294967296 || 1;
	const order = slots.map(({ index }) => index);
	for (let i = order.length - 1; i > 0; i--) {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		const j = seed % (i + 1);
		[order[i], order[j]] = [order[j]!, order[i]!];
	}
	const open = new Set(order.slice(0, shown));
	return chars.map((char, index) => (char.trim() === '' ? ' ' : open.has(index) ? char : null));
}

/** A player's avatar as the page sent it: a short JSON object, or nothing. The pages check its parts. */
export function cleanAvatar(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > 400) return null;
	try {
		const parsed = JSON.parse(value) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? value : null;
	} catch {
		return null;
	}
}

/** Lines from the drawer's page, checked: colours, pen sizes and whole coordinates on the 640 canvas. */
export function cleanLines(value: unknown): Line[] | null {
	if (!Array.isArray(value) || value.length > 2000) return null;
	let points = 0;
	const lines: Line[] = [];
	for (const entry of value) {
		const line = entry as Partial<Line> | null;
		if (!line || typeof line.c !== 'string' || !/^#[0-9a-f]{6}$/iu.test(line.c) || typeof line.s !== 'number' || line.s < 1 || line.s > 40 || !Array.isArray(line.p) || line.p.length % 2) return null;
		if (!line.p.every((n) => Number.isInteger(n) && n >= 0 && n <= 640)) return null;
		points += line.p.length / 2;
		if (points > MAX_LINE_POINTS) return null;
		lines.push({ c: line.c, s: line.s, p: line.p });
	}
	return lines;
}

// --- Storage ------------------------------------------------------------------------------------

export async function joinPlayer(db: Database, chatId: number, userId: number, name: string, avatar?: string | null) {
	if (avatar === undefined) {
		await db.execute(
			'INSERT INTO wordcircle_scribble_players (chat_id, user_id, first_name) VALUES (?, ?, ?) ON CONFLICT (chat_id, user_id) DO UPDATE SET first_name = EXCLUDED.first_name',
			[chatId, userId, name.slice(0, 64)]
		);
		return;
	}
	await db.execute(
		'INSERT INTO wordcircle_scribble_players (chat_id, user_id, first_name, avatar) VALUES (?, ?, ?, ?) ON CONFLICT (chat_id, user_id) DO UPDATE SET first_name = EXCLUDED.first_name, avatar = EXCLUDED.avatar',
		[chatId, userId, name.slice(0, 64), avatar]
	);
}

/** The round's latest guesses, oldest first, for the speech bubbles. */
export async function recentGuesses(db: Database, roundId: number, limit = 12): Promise<Row[]> {
	const [rows] = await db.execute('SELECT id, user_id, first_name, text, result FROM wordcircle_scribble_guesses WHERE round_id = ? ORDER BY id DESC LIMIT ?', [roundId, limit]);
	return (rows as Row[]).reverse();
}

export async function getState(db: Database, chatId: number): Promise<Row | undefined> {
	const [[state]] = await db.execute('SELECT * FROM wordcircle_scribble_state WHERE chat_id = ? LIMIT 1', [chatId]);
	return state;
}

/** The round that is running, or the one that ended in the last RESULT_SECONDS. */
export async function currentRound(db: Database, chatId: number): Promise<Row | undefined> {
	const [[round]] = await db.execute(
		`SELECT * FROM wordcircle_scribble_rounds WHERE chat_id = ? AND (solved_by IS NULL OR solved_at > now() - make_interval(secs => ?)) ORDER BY id DESC LIMIT 1`,
		[chatId, RESULT_SECONDS]
	);
	return round;
}

async function runningRound(db: Database, chatId: number): Promise<Row | undefined> {
	const [[round]] = await db.execute('SELECT * FROM wordcircle_scribble_rounds WHERE chat_id = ? AND solved_by IS NULL ORDER BY id DESC LIMIT 1', [chatId]);
	return round;
}

const turnStale = (state: Row) => Date.now() - new Date(state.turn_started_at).getTime() > TURN_SECONDS * 1000;

/**
 * Makes `userId` the drawer when nobody is, or when the drawer let the turn go stale without
 * drawing. Also opens the table on the pressed game message the first time.
 */
export async function claimTurn(db: Database, table: Table, userId: number, lang: string): Promise<Row> {
	const chatId = table.key;
	await db.execute(
		'INSERT INTO wordcircle_scribble_state (chat_id, game_message_id, inline_message_id, drawer_id, lang) VALUES (?, ?, ?, ?, ?) ON CONFLICT (chat_id) DO UPDATE SET lang = EXCLUDED.lang',
		[chatId, table.messageId, table.inlineMessageId, userId, lang]
	);
	let state = (await getState(db, chatId))!;
	const running = await runningRound(db, chatId);
	if (state.drawer_id === null || (Number(state.drawer_id) !== userId && turnStale(state) && !running)) {
		await db.execute('UPDATE wordcircle_scribble_state SET drawer_id = ?, turn_started_at = now(), game_message_id = ? WHERE chat_id = ?', [userId, table.messageId, chatId]);
		state = (await getState(db, chatId))!;
	}
	return state;
}

export type StartResult = { ok: true; round: Row } | { ok: false; error: 'not_your_turn' | 'round_running' };

/** The drawer picked a word: the round opens for everybody on the page. */
export async function startRound(db: Database, chatId: number, userId: number, name: string, word: string, answers: string[], seconds = ROUND_SECONDS, reveal = false): Promise<StartResult> {
	const state = await getState(db, chatId);
	if (!state || Number(state.drawer_id) !== userId) return { ok: false, error: 'not_your_turn' };
	if (await runningRound(db, chatId)) return { ok: false, error: 'round_running' };
	const [[round]] = await db.execute(
		'INSERT INTO wordcircle_scribble_rounds (chat_id, game_message_id, photo_message_id, drawer_id, drawer_name, word, answers, seconds, reveal) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?) RETURNING *',
		[chatId, Number(state.game_message_id), userId, name.slice(0, 64), word, JSON.stringify(answers), seconds, reveal]
	);
	await db.execute('UPDATE wordcircle_scribble_state SET round_seconds = ?, reveal = ? WHERE chat_id = ?', [seconds, reveal, chatId]);
	await db.execute("DELETE FROM wordcircle_scribble_guesses WHERE created_at < now() - interval '1 day'");
	return { ok: true, round };
}

/** The drawer's lines so far; false when the round is over or not theirs. */
export async function saveLines(db: Database, chatId: number, userId: number, roundId: number, lines: Line[]): Promise<boolean> {
	const [result] = await db.execute('UPDATE wordcircle_scribble_rounds SET lines = ?, version = version + 1 WHERE id = ? AND chat_id = ? AND drawer_id = ? AND solved_by IS NULL', [JSON.stringify(lines), roundId, chatId, userId]);
	return result.affectedRows === 1;
}

export function roundAnswers(round: Row): string[] {
	try {
		const answers = JSON.parse(round.answers ?? '[]') as unknown;
		if (Array.isArray(answers)) return answers.filter((answer): answer is string => typeof answer === 'string');
	} catch {}
	return [String(round.word ?? '')];
}

export type GuessResult = 'right' | 'close' | 'wrong' | 'none';

/** A guess typed on the page for the running round. The drawer cannot guess their own word. */
export async function guess(db: Database, telegram: Telegram, chatId: number, userId: number, name: string, text: string): Promise<GuessResult> {
	const round = await runningRound(db, chatId);
	if (!round || Number(round.drawer_id) === userId) return 'none';
	if (Date.now() - new Date(round.created_at).getTime() > roundSeconds(round) * 1000) return 'none';
	const result = checkGuess(text, roundAnswers(round));
	const shown = text.trim().slice(0, 64);
	if (shown) await db.execute('INSERT INTO wordcircle_scribble_guesses (round_id, user_id, first_name, text, result) VALUES (?, ?, ?, ?, ?)', [round.id, userId, name.slice(0, 64), shown, result]);
	if (result !== 'right') return result;
	await joinPlayer(db, chatId, userId, name);
	return (await finishRound(db, telegram, round, { id: userId, name })) ? 'right' : 'none';
}

/** Ends a round once (compare-and-set): scores a right guess, counts the match, passes the turn. */
export async function finishRound(db: Database, telegram: Telegram, round: Row, guesser: { id: number; name: string } | null): Promise<boolean> {
	const [claimed] = await db.execute('UPDATE wordcircle_scribble_rounds SET solved_by = ?, solved_at = now(), guesser_name = ? WHERE id = ? AND solved_by IS NULL', [guesser?.id ?? 0, guesser?.name.slice(0, 64) ?? null, round.id]);
	if (claimed.affectedRows !== 1) return false;
	const chatId = Number(round.chat_id);
	const drawerId = Number(round.drawer_id);
	const state = await getState(db, chatId);

	if (guesser) {
		const points = scribblePoints((Date.now() - new Date(round.created_at).getTime()) / 1000, roundSeconds(round));
		await db.execute('UPDATE wordcircle_scribble_rounds SET points = ? WHERE id = ?', [points.guesser, round.id]);
		for (const [id, name, gained] of [[guesser.id, guesser.name, points.guesser], [drawerId, String(round.drawer_name ?? ''), points.drawer]] as const) {
			const [[row]] = await db.execute(
				'INSERT INTO wordcircle_scribble_players (chat_id, user_id, first_name, points, match_points) VALUES (?, ?, ?, ?, ?) ON CONFLICT (chat_id, user_id) DO UPDATE SET points = wordcircle_scribble_players.points + EXCLUDED.points, match_points = wordcircle_scribble_players.match_points + EXCLUDED.match_points RETURNING points',
				[chatId, id, name.slice(0, 64), gained, gained]
			);
			await telegram('setGameScore', { user_id: id, score: Number(row.points), force: true, ...scoreTarget(state, chatId, Number(round.game_message_id)) }).catch(() => undefined);
		}
	}

	// Count the round towards the match; after MATCH_ROUNDS, the winner.
	const [[match]] = await db.execute('UPDATE wordcircle_scribble_state SET match_rounds = match_rounds + 1, skips = 0 WHERE chat_id = ? RETURNING match_rounds', [chatId]);
	if (match && Number(match.match_rounds) >= MATCH_ROUNDS) await endMatch(db, chatId);
	await passTurn(db, chatId, drawerId);
	return true;
}

async function endMatch(db: Database, chatId: number) {
	const [rows] = await db.execute('SELECT user_id, first_name, match_points FROM wordcircle_scribble_players WHERE chat_id = ? AND match_points > 0 ORDER BY match_points DESC, user_id LIMIT 1', [chatId]);
	const winner = (rows as Row[])[0];
	if (winner) {
		const [[champion]] = await db.execute(
			'INSERT INTO wordcircle_scribble_champions (telegram_user_id, first_name, wins) VALUES (?, ?, 1) ON CONFLICT (telegram_user_id) DO UPDATE SET wins = wordcircle_scribble_champions.wins + 1, first_name = EXCLUDED.first_name RETURNING wins',
			[Number(winner.user_id), String(winner.first_name ?? '')]
		);
		await db.execute('UPDATE wordcircle_scribble_state SET champion_name = ?, champion_points = ?, champion_wins = ?, champion_at = now() WHERE chat_id = ?', [
			String(winner.first_name ?? '').slice(0, 64),
			Number(winner.match_points),
			Number(champion.wins),
			chatId
		]);
	}
	await db.execute('UPDATE wordcircle_scribble_players SET match_points = 0 WHERE chat_id = ?', [chatId]);
	await db.execute('UPDATE wordcircle_scribble_state SET match_rounds = 0 WHERE chat_id = ?', [chatId]);
}

/** The last match's winner, while CHAMPION_SECONDS have not passed. */
export function recentChampion(state: Row | undefined): { name: string; points: number; wins: number } | null {
	if (!state?.champion_at || Date.now() - new Date(state.champion_at).getTime() > CHAMPION_SECONDS * 1000) return null;
	return { name: String(state.champion_name ?? ''), points: Number(state.champion_points ?? 0), wins: Number(state.champion_wins ?? 0) };
}

/** The next player after `afterUser`, in the order they joined, wrapping around. */
export async function nextPlayer(db: Database, chatId: number, afterUser: number): Promise<Row | undefined> {
	const [players] = await db.execute('SELECT user_id, first_name FROM wordcircle_scribble_players WHERE chat_id = ? ORDER BY joined_at, user_id', [chatId]);
	const list = players as Row[];
	if (list.length === 0) return undefined;
	const index = list.findIndex((player) => Number(player.user_id) === afterUser);
	return list[(index + 1) % list.length];
}

async function passTurn(db: Database, chatId: number, afterUser: number) {
	const next = await nextPlayer(db, chatId, afterUser);
	if (!next) return;
	await db.execute('UPDATE wordcircle_scribble_state SET drawer_id = ?, turn_started_at = now() WHERE chat_id = ?', [Number(next.user_id), chatId]);
}

/** Every few seconds: ends rounds nobody guessed in time and skips drawers who never started. */
export async function scribbleTick(db: Database, telegram: Telegram) {
	const [expired] = await db.execute('SELECT * FROM wordcircle_scribble_rounds WHERE solved_by IS NULL AND created_at + make_interval(secs => seconds) <= now()');
	for (const round of expired as Row[]) await finishRound(db, telegram, round, null);
	const [idle] = await db.execute(
		`SELECT s.* FROM wordcircle_scribble_state s WHERE s.drawer_id IS NOT NULL AND s.turn_started_at <= now() - make_interval(secs => ?)
		 AND NOT EXISTS (SELECT 1 FROM wordcircle_scribble_rounds r WHERE r.chat_id = s.chat_id AND r.created_at >= s.turn_started_at)`,
		[TURN_SECONDS]
	);
	for (const state of idle as Row[]) {
		const chatId = Number(state.chat_id);
		const [[count]] = await db.execute('SELECT COUNT(*) AS n FROM wordcircle_scribble_players WHERE chat_id = ?', [chatId]);
		const skips = Number(state.skips ?? 0) + 1;
		const next = await nextPlayer(db, chatId, Number(state.drawer_id));
		// Everyone skipped once in a row (or nobody else is there): pause until someone presses Play.
		if (!next || Number(next.user_id) === Number(state.drawer_id) || skips >= Number(count?.n ?? 0)) {
			await db.execute('UPDATE wordcircle_scribble_state SET drawer_id = NULL, skips = 0 WHERE chat_id = ?', [chatId]);
			continue;
		}
		await db.execute('UPDATE wordcircle_scribble_state SET skips = ? WHERE chat_id = ?', [skips, chatId]);
		await passTurn(db, chatId, Number(state.drawer_id));
	}
}

export async function winsOf(db: Database, userId: number): Promise<number> {
	const [[row]] = await db.execute('SELECT wins FROM wordcircle_scribble_champions WHERE telegram_user_id = ? LIMIT 1', [userId]);
	return Number(row?.wins ?? 0);
}
