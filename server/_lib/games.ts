import { randomBytes } from 'node:crypto';
import * as v from 'valibot';
import type { Database } from './database.js';

// Group competition through Telegram's gaming platform (https://core.telegram.org/bots/games). The
// bot posts a game in a group (sendGame); pressing Play there makes the bot ask this server for a
// session (server/telegram/game.ts, over the bridge) and opens the mode with `?game_session=<id>` in
// Telegram's browser. Every finished round sends its score with that session (server/games/score.ts),
// and setGameScore puts it on the chat's scoreboard, which Telegram keeps and shows itself.

/** The modes offered as group games; each id is also the game's short name at @BotFather. */
export const GROUP_GAMES = ['wordle', 'hangman', 'vocab'] as const;
export type GroupGame = (typeof GROUP_GAMES)[number];
export const isGroupGame = (value: unknown): value is GroupGame => typeof value === 'string' && (GROUP_GAMES as readonly string[]).includes(value);

/** The page a Play press opens. */
export const GAME_ROUTES: Record<GroupGame, string> = { wordle: '/wordle', hangman: '/hangman', vocab: '/vocab' };

// How a round becomes a score (higher is better, the only order Telegram ranks by). The page
// computes it; the server only accepts what a real round can reach.
export const MAX_SCORES: Record<GroupGame, number> = {
	// Solved in n of six tries: (7 - n) × 100, plus up to 99 for speed.
	wordle: 699,
	// A won word: 100 plus 25 per miss left (of six), plus 10 per letter.
	hangman: 100 + 25 * 6 + 10 * 20,
	// First-try answers in a row in one session.
	vocab: 500
};

/** A session is good for a day of rounds. */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const SessionIdSchema = v.pipe(v.string(), v.regex(/^[0-9a-f]{32}$/u));

export function newSessionId(): string {
	return randomBytes(16).toString('hex');
}

export function gameUrl(origin: string, game: GroupGame, session: string): string {
	return `${origin.replace(/\/$/u, '')}${GAME_ROUTES[game]}?game=${game}&game_session=${session}`;
}

export function validScore(game: GroupGame, score: unknown): score is number {
	return typeof score === 'number' && Number.isSafeInteger(score) && score >= 0 && score <= MAX_SCORES[game];
}

const TABLE = `CREATE TABLE IF NOT EXISTS wordcircle_game_sessions (
	id CHAR(32) NOT NULL PRIMARY KEY,
	telegram_user_id BIGINT NOT NULL,
	first_name VARCHAR(64) NOT NULL DEFAULT '',
	game VARCHAR(16) NOT NULL,
	chat_id BIGINT NULL,
	message_id BIGINT NULL,
	inline_message_id VARCHAR(255) NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`;
const INDEX = 'CREATE INDEX IF NOT EXISTS wordcircle_game_sessions_created_idx ON wordcircle_game_sessions (created_at)';

let tableReady: Promise<unknown> | undefined;
export function ensureGameTables(db: Database) {
	tableReady ??= db.execute(TABLE).then(() => db.execute(INDEX)).catch((error: unknown) => {
		tableReady = undefined;
		throw error;
	});
	return tableReady;
}

/** Calls a Bot API method with the bot token; throws with Telegram's description on failure. */
export async function telegramApi<T>(method: string, params: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<T> {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	if (!token) throw new Error('telegram_not_configured');
	const response = await fetcher(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(params) });
	const body = (await response.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
	if (!body?.ok) throw new Error(body?.description ?? `telegram_${method}_failed`);
	return body.result as T;
}

export type HighScore = { position: number; score: number; user: { id: number; first_name?: string } };
export type LeaderboardRow = { position: number; name: string; score: number; me: boolean };

/** Telegram's high scores around the player, as the page shows them. */
export function leaderboardRows(scores: readonly HighScore[], userId: number): LeaderboardRow[] {
	return scores.map((entry) => ({ position: entry.position, name: entry.user.first_name ?? '', score: entry.score, me: entry.user.id === userId }));
}
