import { describe, expect, it } from 'vitest';
import { gameUrl, leaderboardRows, MAX_SCORES, validScore } from '../api/_lib/games.js';
import { createGameSessionEndpoint } from '../api/telegram/game.js';
import { createGameScoreEndpoint } from '../api/games/score.js';
import { responseCapture } from './support/api';

const secret = 'bridge-secret-for-tests-0123456789';

function fakeDatabase() {
  const sessions = new Map<string, Record<string, unknown>>();
  return {
    sessions,
    async execute(sql: string, params: unknown[] = []): Promise<any> {
      if (sql.startsWith('CREATE') || sql.startsWith('DELETE')) return [{}];
      if (sql.startsWith('INSERT INTO wordcircle_game_sessions')) {
        const [id, telegram_user_id, first_name, game, chat_id, message_id, inline_message_id] = params;
        sessions.set(String(id), { telegram_user_id, first_name, game, chat_id, message_id, inline_message_id, created_at: new Date() });
        return [{}];
      }
      if (sql.startsWith('SELECT telegram_user_id')) return [sessions.has(String(params[0])) ? [sessions.get(String(params[0]))] : []];
      throw new Error(`unexpected statement: ${sql}`);
    }
  };
}

describe('group game scoring rules', () => {
  it('accepts only scores a real round can reach', () => {
    expect(validScore('wordle', 600)).toBe(true);
    expect(validScore('wordle', MAX_SCORES.wordle + 1)).toBe(false);
    expect(validScore('vocab', -1)).toBe(false);
    expect(validScore('hangman', 1.5)).toBe(false);
  });

  it('builds the page link and the leaderboard rows', () => {
    expect(gameUrl('https://words-sv.vercel.app/', 'wordle', 'abc')).toBe('https://words-sv.vercel.app/wordle?game=wordle&game_session=abc');
    expect(leaderboardRows([{ position: 1, score: 600, user: { id: 7, first_name: 'Anna' } }, { position: 2, score: 300, user: { id: 9 } }], 9)).toEqual([
      { position: 1, name: 'Anna', score: 600, me: false },
      { position: 2, name: '', score: 300, me: true }
    ]);
  });
});

describe('group game endpoints', () => {
  it('opens a session for the bot and puts a round on the scoreboard', async () => {
    process.env.TELEGRAM_BRIDGE_SECRET = secret;
    const db = fakeDatabase();
    const res = responseCapture();
    await createGameSessionEndpoint({ databaseProvider: () => db, origin: () => 'https://app.test/' })({ method: 'POST', headers: { authorization: `Bearer ${secret}` }, body: { userId: 42, firstName: 'Ben', game: 'wordle', chatId: -100, messageId: 5 } }, res);
    expect(res.result.statusCode).toBe(200);
    const session = new URL(res.result.body.url).searchParams.get('game_session')!;
    expect(session).toMatch(/^[0-9a-f]{32}$/u);

    const calls: Array<[string, Record<string, unknown>]> = [];
    const telegram = async <T,>(method: string, params: Record<string, unknown>): Promise<T> => {
      calls.push([method, params]);
      if (method === 'setGameScore' && params.score === 100) throw new Error('Bad Request: BOT_SCORE_NOT_MODIFIED');
      return (method === 'getGameHighScores' ? [{ position: 1, score: 500, user: { id: 42, first_name: 'Ben' } }] : true) as T;
    };
    const score = async (body: Record<string, unknown>) => {
      const reply = responseCapture();
      await createGameScoreEndpoint({ databaseProvider: () => db, telegram })({ method: 'POST', body }, reply);
      return reply.result;
    };
    const first = await score({ session, game: 'wordle', score: 500 });
    expect(first).toMatchObject({ statusCode: 200, body: { newBest: true, leaderboard: [{ name: 'Ben', score: 500, me: true }] } });
    expect(calls[0]).toEqual(['setGameScore', { user_id: 42, score: 500, chat_id: -100, message_id: 5 }]);
    expect((await score({ session, game: 'wordle', score: 100 })).body.newBest).toBe(false);
    expect((await score({ session, game: 'hangman', score: 100 })).statusCode).toBe(404);
    expect((await score({ session, game: 'wordle', score: 9999 })).statusCode).toBe(400);
  });

  it('only the bot may open sessions', async () => {
    const res = responseCapture();
    await createGameSessionEndpoint({ databaseProvider: () => fakeDatabase() })({ method: 'POST', headers: {}, body: {} }, res);
    expect(res.result.statusCode).toBe(401);
  });
});
