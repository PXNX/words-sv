import { describe, expect, it, vi } from 'vitest';
import { createScribbleEndpoint, scribbleCaption } from '../server/games/scribble.js';
import { responseCapture } from './support/api';

const session = 'a'.repeat(32);
const image = `data:image/jpeg;base64,${Buffer.from('jpeg-bytes').toString('base64')}`;
const NOW = Date.parse('2026-11-13T12:00:00Z');

function setup({ drawer = 42, running = false, game = 'scribble', chat = -100 as number | null } = {}) {
  const inserts: unknown[][] = [];
  const execute = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (sql.startsWith('SELECT telegram_user_id')) return [[{ telegram_user_id: 42, first_name: 'Ana<', game, chat_id: chat, message_id: chat ? 7 : null, created_at: new Date(NOW - 60_000) }]];
    if (sql.startsWith('SELECT drawer_id')) return [[{ drawer_id: drawer, game_message_id: 7 }]];
    if (sql.startsWith('SELECT id FROM wordcircle_scribble_rounds')) return [running ? [{ id: 1 }] : []];
    if (sql.startsWith('INSERT INTO wordcircle_scribble_rounds')) inserts.push(params);
    return [Object.assign([], { affectedRows: 1 })];
  });
  const sendPhoto = vi.fn(async () => ({ message_id: 99 }));
  const endpoint = createScribbleEndpoint({ databaseProvider: () => ({ execute }), sendPhoto, now: () => NOW });
  return { endpoint, sendPhoto, inserts };
}

async function post(endpoint: ReturnType<typeof setup>['endpoint'], body: Record<string, unknown>) {
  const res = responseCapture();
  await endpoint({ method: 'POST', body: { session, word: 'der Apfel', answers: ['Apfel', 'der Apfel', 'apple'], image, ...body } }, res);
  return res.result;
}

describe('Scribble drawings', () => {
  it('posts the drawer\'s picture to the group and opens the round', async () => {
    const { endpoint, sendPhoto, inserts } = setup();
    expect(await post(endpoint, {})).toMatchObject({ statusCode: 200, body: { ok: true } });
    expect(sendPhoto).toHaveBeenCalledWith(-100, expect.any(Blob), expect.stringContaining('Ana&lt;'), 7);
    expect(inserts[0]).toEqual([-100, 7, 99, 42, 'Ana<', 'der Apfel', JSON.stringify(['Apfel', 'der Apfel', 'apple'])]);
  });

  it('refuses players whose turn it is not, a second drawing while one runs, and inline games', async () => {
    expect(await post(setup({ drawer: 7 }).endpoint, {})).toMatchObject({ statusCode: 409, body: { error: 'not_your_turn' } });
    expect(await post(setup({ running: true }).endpoint, {})).toMatchObject({ statusCode: 409, body: { error: 'round_running' } });
    expect(await post(setup({ chat: null }).endpoint, {})).toMatchObject({ statusCode: 409, body: { error: 'no_chat' } });
    expect(await post(setup({ game: 'wordle' }).endpoint, {})).toMatchObject({ statusCode: 404 });
  });

  it('refuses bad input', async () => {
    const { endpoint, sendPhoto } = setup();
    expect(await post(endpoint, { image: 'https://example.com/x.png' })).toMatchObject({ statusCode: 400 });
    expect(await post(endpoint, { answers: [] })).toMatchObject({ statusCode: 400 });
    expect(sendPhoto).not.toHaveBeenCalled();
  });

  it('counts letters without the article in the caption', () => {
    expect(scribbleCaption('Ana', 5)).toContain('(5)');
  });
});
