// The Telegram group game this page was opened for (if any), and reporting finished rounds to the
// group's scoreboard. Telegram opens the Play link in its own browser; the session in the link is
// remembered for the tab, since the app's navigation drops the query.
import * as v from 'valibot';
import { callApi } from '#lib/api/client.js';
import { sessionFromUrl, type GroupGame, type GroupGameSession } from './groupGameRules.js';

const KEY = 'wordcircle-group-game-v1';

export const LeaderboardSchema = v.object({
  ok: v.literal(true),
  newBest: v.boolean(),
  leaderboard: v.array(v.object({ position: v.number(), name: v.string(), score: v.number(), me: v.boolean() }))
});
export type GroupScoreResult = v.InferOutput<typeof LeaderboardSchema> & { score: number };

export const groupGame = $state<{ session: GroupGameSession | null; last: GroupScoreResult | null }>({ session: null, last: null });

/** Reads the session from the page's URL (or the tab's memory) once at start. */
export function initGroupGame(url: URL) {
  let session = sessionFromUrl(url);
  try {
    if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
    else {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Partial<GroupGameSession> | null;
      // Checked like a fresh link, so a tampered value is simply ignored.
      if (saved) session = sessionFromUrl(new URL(`/?game=${encodeURIComponent(String(saved.game))}&game_session=${encodeURIComponent(String(saved.session))}`, url));
    }
  } catch {}
  groupGame.session = session;
}

/** Sends a finished round's score when this page plays `game` for a group; no-op otherwise. */
export async function reportGroupScore(game: GroupGame, score: number): Promise<void> {
  const session = groupGame.session;
  if (!session || session.game !== game || score <= 0) return;
  try {
    const result = await callApi('/api/games/score', LeaderboardSchema, { body: { session: session.session, game, score } });
    groupGame.last = { ...result, score };
  } catch {
    /* the round still counts for the learner; only the group board missed it */
  }
}
