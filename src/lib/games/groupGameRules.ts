// Pure rules for Telegram group games (the server checks the same limits in server/_lib/games.ts):
// which modes are group games, how a finished round becomes a score (higher is better, the only
// order Telegram ranks by), and reading the session from the page the Play button opened.

export const GROUP_GAMES = ['wordle', 'hangman', 'vocab', 'scribble'] as const;
export type GroupGame = (typeof GROUP_GAMES)[number];
export type GroupGameSession = { game: GroupGame; session: string };

const isGroupGame = (value: unknown): value is GroupGame => typeof value === 'string' && (GROUP_GAMES as readonly string[]).includes(value);

/** `?game=wordle&game_session=<32 hex>` from the Play button's link, or null for any other visit. */
export function sessionFromUrl(url: URL): GroupGameSession | null {
  const game = url.searchParams.get('game');
  const session = url.searchParams.get('game_session') ?? '';
  return isGroupGame(game) && /^[0-9a-f]{32}$/u.test(session) ? { game, session } : null;
}

/** Wordle solved in `attempts` of six tries: 600 for one try, 100 for six. */
export function wordleScore(attempts: number): number {
  return attempts >= 1 && attempts <= 6 ? (7 - attempts) * 100 : 0;
}

/** A won Hangman word: 100, plus 25 per miss left, plus 10 per letter (long words are harder). */
export function hangmanScore(missesLeft: number, letters: number): number {
  return 100 + 25 * Math.max(0, Math.min(6, missesLeft)) + 10 * Math.max(0, Math.min(20, letters));
}

/** Vocabulary: the run of first-try answers, capped where the server caps it. */
export function vocabScore(run: number): number {
  return Math.max(0, Math.min(500, Math.floor(run)));
}
