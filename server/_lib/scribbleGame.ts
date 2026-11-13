/*
 * Scribble in a Telegram group, live. The game message (sendGame "scribble") is the table; pressing
 * Play opens WordCircle with a session. Whose turn it is decides the page's role: the drawer picks a
 * word and draws, and every stroke reaches the others within a second; everybody else watches the
 * drawing appear and types guesses (or replies to the bot's "now drawing" message in the chat).
 * The first right guess ends the round: the faster, the more points for the guesser and the drawer.
 * After MATCH_ROUNDS rounds the bot posts the match's leaderboard; its winner counts a win towards
 * the app's Scribble achievements (first win, ten wins). The turn passes in the order players joined.
 *
 * Everything here runs in the API server (server/main.ts): the endpoints call it, and `scribbleTick`
 * ends rounds nobody guessed and skips drawers who do not start.
 */
import { checkGuess } from '../../src/lib/scribble/guess.js';
import { escapeHtml } from './telegram.js';
import type { Database, Row } from './database.js';

export const ROUND_SECONDS = 90;
export const TURN_SECONDS = 120;
export const MATCH_ROUNDS = 5;
/** A finished round stays visible to the players this long. */
export const RESULT_SECONDS = 12;
export const MAX_LINE_POINTS = 24_000;

export type Telegram = <T>(method: string, params: Record<string, unknown>) => Promise<T>;
export type Line = { c: string; s: number; p: number[] };

const TEXTS = {
	de: {
		drawing: (who: string, letters: number) => `🎨 <b>${who}</b> zeichnet jetzt (${letters} Buchstaben)!\n▶️ Drückt Spielen beim Scribble-Spiel, um live zuzuschauen und zu raten – oder antwortet hier mit eurem Tipp.`,
		right: (who: string, word: string, points: number, drawer: string, drawerPoints: number) => `✅ ${who} hat es erraten: <b>${word}</b> (+${points}) · ${drawer} +${drawerPoints}`,
		timeout: (word: string) => `⏰ Zeit um! Gesucht war: <b>${word}</b>`,
		next: (who: string) => `🎨 Als Nächstes zeichnet ${who}: drück ▶️ Spielen beim Scribble-Spiel.`,
		skipped: (who: string) => `⏭ ${who} hat nicht angefangen und wird übersprungen.`,
		paused: '⏸ Scribble macht Pause. Drückt ▶️ Spielen, wenn ihr weiterzeichnen wollt.',
		matchOver: (round: number) => `🏁 <b>Runde ${round} geschafft – die Wertung:</b>`,
		champion: (who: string, wins: number) => `🏆 ${who} gewinnt! (${wins}. Sieg)`,
		firstWin: '🏅 Erfolg freigeschaltet: <b>Scribble-Sieger</b>',
		tenWins: '👑 Erfolg freigeschaltet: <b>Scribble-Legende</b> – zehn Siege!'
	},
	en: {
		drawing: (who: string, letters: number) => `🎨 <b>${who}</b> is drawing now (${letters} letters)!\n▶️ Press Play on the Scribble game to watch live and guess – or reply here with your guess.`,
		right: (who: string, word: string, points: number, drawer: string, drawerPoints: number) => `✅ ${who} got it: <b>${word}</b> (+${points}) · ${drawer} +${drawerPoints}`,
		timeout: (word: string) => `⏰ Time's up! The word was: <b>${word}</b>`,
		next: (who: string) => `🎨 Next to draw: ${who} – press ▶️ Play on the Scribble game.`,
		skipped: (who: string) => `⏭ ${who} didn't start and is skipped.`,
		paused: '⏸ Scribble is paused. Press ▶️ Play when you want to draw again.',
		matchOver: (round: number) => `🏁 <b>${round} rounds done – the standings:</b>`,
		champion: (who: string, wins: number) => `🏆 ${who} wins! (win no. ${wins})`,
		firstWin: '🏅 Achievement unlocked: <b>Scribble champion</b>',
		tenWins: '👑 Achievement unlocked: <b>Scribble legend</b> – ten wins!'
	}
};
type Texts = (typeof TEXTS)['en'];
const texts = (lang: unknown): Texts => (lang === 'de' ? TEXTS.de : TEXTS.en);

export const mention = (userId: number, name: string) => `<a href="tg://user?id=${Math.trunc(userId)}">${escapeHtml(name || '?')}</a>`;

/** The guesser's points: 100, plus up to 100 for guessing fast. The drawer gets half of that. */
export function scribblePoints(elapsedSeconds: number): { guesser: number; drawer: number } {
	const left = Math.max(0, Math.min(1, 1 - elapsedSeconds / ROUND_SECONDS));
	const guesser = 100 + Math.round(100 * left);
	return { guesser, drawer: Math.round(guesser / 2) };
}

/** The word without its article, for the letter count and the blanks the guessers see. */
export function bareWord(word: string): string {
	return word.replace(/^(der|die|das|the)\s+/iu, '');
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

export function standingsText(rows: Array<{ first_name: string; match_points: number }>): string {
	const medals = ['🥇', '🥈', '🥉'];
	return rows.map((row, index) => `${medals[index] ?? `${index + 1}.`} ${escapeHtml(row.first_name || '?')} – ${row.match_points}`).join('\n');
}

// --- Storage ------------------------------------------------------------------------------------

export async function joinPlayer(db: Database, chatId: number, userId: number, name: string) {
	await db.execute(
		'INSERT INTO wordcircle_scribble_players (chat_id, user_id, first_name) VALUES (?, ?, ?) ON CONFLICT (chat_id, user_id) DO UPDATE SET first_name = EXCLUDED.first_name',
		[chatId, userId, name.slice(0, 64)]
	);
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
export async function claimTurn(db: Database, chatId: number, gameMessageId: number, userId: number, lang: string): Promise<Row> {
	await db.execute(
		'INSERT INTO wordcircle_scribble_state (chat_id, game_message_id, drawer_id, lang) VALUES (?, ?, ?, ?) ON CONFLICT (chat_id) DO UPDATE SET lang = EXCLUDED.lang',
		[chatId, gameMessageId, userId, lang]
	);
	let state = (await getState(db, chatId))!;
	const running = await runningRound(db, chatId);
	if (state.drawer_id === null || (Number(state.drawer_id) !== userId && turnStale(state) && !running)) {
		await db.execute('UPDATE wordcircle_scribble_state SET drawer_id = ?, turn_started_at = now(), game_message_id = ? WHERE chat_id = ?', [userId, gameMessageId, chatId]);
		state = (await getState(db, chatId))!;
	}
	return state;
}

export type StartResult = { ok: true; round: Row } | { ok: false; error: 'not_your_turn' | 'round_running' };

/** The drawer picked a word: the round opens and the chat hears about it. */
export async function startRound(db: Database, telegram: Telegram, chatId: number, userId: number, name: string, word: string, answers: string[]): Promise<StartResult> {
	const state = await getState(db, chatId);
	if (!state || Number(state.drawer_id) !== userId) return { ok: false, error: 'not_your_turn' };
	if (await runningRound(db, chatId)) return { ok: false, error: 'round_running' };
	const t = texts(state.lang);
	let announcement = 0;
	try {
		const message = await telegram<{ message_id: number }>('sendMessage', {
			chat_id: chatId,
			text: t.drawing(escapeHtml(name || '?'), bareWord(word).length),
			parse_mode: 'HTML',
			reply_parameters: { message_id: Number(state.game_message_id), allow_sending_without_reply: true }
		});
		announcement = message.message_id;
	} catch {
		/* the round still runs for everyone watching in the app */
	}
	const [[round]] = await db.execute(
		'INSERT INTO wordcircle_scribble_rounds (chat_id, game_message_id, photo_message_id, drawer_id, drawer_name, word, answers) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *',
		[chatId, Number(state.game_message_id), announcement, userId, name.slice(0, 64), word, JSON.stringify(answers)]
	);
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

/**
 * A guess for the running round (from the app, or a chat reply to the round's announcement when
 * `replyTo` is given). The drawer cannot guess their own word.
 */
export async function guess(db: Database, telegram: Telegram, chatId: number, userId: number, name: string, text: string, replyTo?: number): Promise<GuessResult> {
	const round = await runningRound(db, chatId);
	if (!round || Number(round.drawer_id) === userId) return 'none';
	if (replyTo !== undefined && Number(round.photo_message_id) !== replyTo) return 'none';
	if (Date.now() - new Date(round.created_at).getTime() > ROUND_SECONDS * 1000) return 'none';
	const result = checkGuess(text, roundAnswers(round));
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
	const t = texts(state?.lang);
	const send = (text: string, replyTo?: number) =>
		telegram('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...(replyTo ? { reply_parameters: { message_id: replyTo, allow_sending_without_reply: true } } : {}) }).catch(() => undefined);

	if (guesser) {
		const points = scribblePoints((Date.now() - new Date(round.created_at).getTime()) / 1000);
		await db.execute('UPDATE wordcircle_scribble_rounds SET points = ? WHERE id = ?', [points.guesser, round.id]);
		for (const [id, name, gained] of [[guesser.id, guesser.name, points.guesser], [drawerId, String(round.drawer_name ?? ''), points.drawer]] as const) {
			const [[row]] = await db.execute(
				'INSERT INTO wordcircle_scribble_players (chat_id, user_id, first_name, points, match_points) VALUES (?, ?, ?, ?, ?) ON CONFLICT (chat_id, user_id) DO UPDATE SET points = wordcircle_scribble_players.points + EXCLUDED.points, match_points = wordcircle_scribble_players.match_points + EXCLUDED.match_points RETURNING points',
				[chatId, id, name.slice(0, 64), gained, gained]
			);
			await telegram('setGameScore', { user_id: id, score: Number(row.points), chat_id: chatId, message_id: Number(round.game_message_id), force: true }).catch(() => undefined);
		}
		await send(t.right(mention(guesser.id, guesser.name), escapeHtml(String(round.word)), points.guesser, escapeHtml(String(round.drawer_name || '?')), points.drawer), Number(round.photo_message_id) || undefined);
	} else {
		await send(t.timeout(escapeHtml(String(round.word))), Number(round.photo_message_id) || undefined);
	}

	// Count the round towards the match; after MATCH_ROUNDS, the standings and the winner.
	const [[match]] = await db.execute('UPDATE wordcircle_scribble_state SET match_rounds = match_rounds + 1, skips = 0 WHERE chat_id = ? RETURNING match_rounds', [chatId]);
	if (match && Number(match.match_rounds) >= MATCH_ROUNDS) await endMatch(db, chatId, t, send);
	await passTurn(db, telegram, chatId, drawerId, t);
	return true;
}

async function endMatch(db: Database, chatId: number, t: Texts, send: (text: string) => Promise<unknown>) {
	const [rows] = await db.execute('SELECT user_id, first_name, match_points FROM wordcircle_scribble_players WHERE chat_id = ? AND match_points > 0 ORDER BY match_points DESC, user_id LIMIT 10', [chatId]);
	const lines = [t.matchOver(MATCH_ROUNDS), standingsText(rows as Array<{ first_name: string; match_points: number }>)];
	const winner = (rows as Row[])[0];
	if (winner) {
		const [[champion]] = await db.execute(
			'INSERT INTO wordcircle_scribble_champions (telegram_user_id, first_name, wins) VALUES (?, ?, 1) ON CONFLICT (telegram_user_id) DO UPDATE SET wins = wordcircle_scribble_champions.wins + 1, first_name = EXCLUDED.first_name RETURNING wins',
			[Number(winner.user_id), String(winner.first_name ?? '')]
		);
		const wins = Number(champion.wins);
		lines.push('', t.champion(mention(Number(winner.user_id), String(winner.first_name ?? '')), wins));
		if (wins === 1) lines.push(t.firstWin);
		if (wins === 10) lines.push(t.tenWins);
	}
	await send(lines.join('\n'));
	await db.execute('UPDATE wordcircle_scribble_players SET match_points = 0 WHERE chat_id = ?', [chatId]);
	await db.execute('UPDATE wordcircle_scribble_state SET match_rounds = 0 WHERE chat_id = ?', [chatId]);
}

/** The next player after `afterUser`, in the order they joined, wrapping around. */
export async function nextPlayer(db: Database, chatId: number, afterUser: number): Promise<Row | undefined> {
	const [players] = await db.execute('SELECT user_id, first_name FROM wordcircle_scribble_players WHERE chat_id = ? ORDER BY joined_at, user_id', [chatId]);
	const list = players as Row[];
	if (list.length === 0) return undefined;
	const index = list.findIndex((player) => Number(player.user_id) === afterUser);
	return list[(index + 1) % list.length];
}

async function passTurn(db: Database, telegram: Telegram, chatId: number, afterUser: number, t: Texts) {
	const next = await nextPlayer(db, chatId, afterUser);
	const state = await getState(db, chatId);
	if (!next || !state) return;
	await db.execute('UPDATE wordcircle_scribble_state SET drawer_id = ?, turn_started_at = now() WHERE chat_id = ?', [Number(next.user_id), chatId]);
	await telegram('sendMessage', { chat_id: chatId, text: t.next(mention(Number(next.user_id), String(next.first_name ?? ''))), parse_mode: 'HTML', reply_parameters: { message_id: Number(state.game_message_id), allow_sending_without_reply: true } }).catch(() => undefined);
}

/** Every few seconds: ends rounds nobody guessed in time and skips drawers who never started. */
export async function scribbleTick(db: Database, telegram: Telegram) {
	const [expired] = await db.execute('SELECT * FROM wordcircle_scribble_rounds WHERE solved_by IS NULL AND created_at <= now() - make_interval(secs => ?)', [ROUND_SECONDS]);
	for (const round of expired as Row[]) await finishRound(db, telegram, round, null);
	const [idle] = await db.execute(
		`SELECT s.* FROM wordcircle_scribble_state s WHERE s.drawer_id IS NOT NULL AND s.turn_started_at <= now() - make_interval(secs => ?)
		 AND NOT EXISTS (SELECT 1 FROM wordcircle_scribble_rounds r WHERE r.chat_id = s.chat_id AND r.created_at >= s.turn_started_at)`,
		[TURN_SECONDS]
	);
	for (const state of idle as Row[]) {
		const chatId = Number(state.chat_id);
		const t = texts(state.lang);
		const [[count]] = await db.execute('SELECT COUNT(*) AS n FROM wordcircle_scribble_players WHERE chat_id = ?', [chatId]);
		const [[name]] = await db.execute('SELECT first_name FROM wordcircle_scribble_players WHERE chat_id = ? AND user_id = ?', [chatId, Number(state.drawer_id)]);
		const skips = Number(state.skips ?? 0) + 1;
		const next = await nextPlayer(db, chatId, Number(state.drawer_id));
		const reply = { reply_parameters: { message_id: Number(state.game_message_id), allow_sending_without_reply: true } };
		// Everyone skipped once in a row (or nobody else is there): pause until someone presses Play.
		if (!next || Number(next.user_id) === Number(state.drawer_id) || skips >= Number(count?.n ?? 0)) {
			await db.execute('UPDATE wordcircle_scribble_state SET drawer_id = NULL, skips = 0 WHERE chat_id = ?', [chatId]);
			await telegram('sendMessage', { chat_id: chatId, text: t.paused, parse_mode: 'HTML', ...reply }).catch(() => undefined);
			continue;
		}
		await db.execute('UPDATE wordcircle_scribble_state SET skips = ? WHERE chat_id = ?', [skips, chatId]);
		await telegram('sendMessage', { chat_id: chatId, text: t.skipped(escapeHtml(String(name?.first_name ?? '?'))), parse_mode: 'HTML', ...reply }).catch(() => undefined);
		await passTurn(db, telegram, chatId, Number(state.drawer_id), t);
	}
}

export async function winsOf(db: Database, userId: number): Promise<number> {
	const [[row]] = await db.execute('SELECT wins FROM wordcircle_scribble_champions WHERE telegram_user_id = ? LIMIT 1', [userId]);
	return Number(row?.wins ?? 0);
}
