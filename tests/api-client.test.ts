import { describe, expect, it } from 'vitest';
import { ApiError, callApi } from '../src/lib/api/client';
import { PushKeySchema, StreakReplySchema, SyncReplySchema, TelegramStatusSchema } from '../src/lib/api/schemas';

function reply(status: number, body: unknown, calls: RequestInit[] = []): typeof fetch {
  return (async (_path: string, init: RequestInit) => {
    calls.push(init);
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
}

const status = { ok: true, reminders: true, linked: false, connectUrl: null, inviteUrl: 'https://t.me/x', invited: 2, inviteEmbers: 3 };

describe('api client', () => {
  it('posts JSON and returns the validated reply', async () => {
    const calls: RequestInit[] = [];
    const result = await callApi('/api/telegram/device', TelegramStatusSchema, { body: { action: 'status' }, fetcher: reply(200, status, calls) });
    expect(result).toEqual(status);
    expect(calls[0]).toMatchObject({ method: 'POST', body: '{"action":"status"}' });
  });

  it('GETs without a body', async () => {
    const calls: RequestInit[] = [];
    await callApi('/api/push', PushKeySchema, { fetcher: reply(200, { publicKey: 'abc' }, calls) });
    expect(calls[0]?.method).toBeUndefined();
  });

  it('turns a server error into its code', async () => {
    await expect(callApi('/api/progress/sync', SyncReplySchema, { body: {}, fetcher: reply(503, { ok: false, error: 'database_unavailable' }) }))
      .rejects.toMatchObject({ code: 'database_unavailable', status: 503 });
  });

  it('accepts listed statuses such as a sync conflict', async () => {
    const result = await callApi('/api/progress/sync', SyncReplySchema, { body: {}, accept: [409], fetcher: reply(409, { ok: false, error: 'conflict', revision: 4, snapshot: { a: '1' } }) });
    expect(result).toMatchObject({ error: 'conflict', revision: 4 });
  });

  it('rejects replies that do not match the schema, and HTML error pages', async () => {
    await expect(callApi('/api/telegram/device', TelegramStatusSchema, { fetcher: reply(200, { ok: true, linked: 'yes' }) })).rejects.toBeInstanceOf(ApiError);
    await expect(callApi('/api/push', PushKeySchema, { fetcher: reply(200, '<html>Gateway</html>') })).rejects.toMatchObject({ code: 'invalid_response' });
    await expect(callApi('/api/push', PushKeySchema, { fetcher: reply(502, '<html>Gateway</html>') })).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('keeps the streak fields it knows and drops the rest', async () => {
    const { streak } = await callApi('/api/streak/progress', StreakReplySchema, {
      fetcher: reply(200, { ok: true, streak: { dateKey: '2026-11-10', qualified: true, streakCount: 3, lastQualifiedDay: '2026-11-10', canProtectStreak: false } })
    });
    expect(streak).toEqual({ dateKey: '2026-11-10', qualified: true, streakCount: 3, lastQualifiedDay: '2026-11-10' });
  });
});
