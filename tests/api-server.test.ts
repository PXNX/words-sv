import { describe, expect, it, vi } from 'vitest';

const execute = vi.fn(async (sql: string) => {
  if (sql.startsWith('SELECT * FROM wordcircle_streak_devices')) return [[]];
  return [Object.assign([], { affectedRows: 0 })];
});
vi.mock('../server/_lib/database.js', () => ({ getDatabase: () => ({ execute }) }));

const { handle, routeFor } = await import('../server/main.js');
const { proxy } = await import('../api/proxy.js');
const { numberPlaceholders } = await vi.importActual<typeof import('../server/_lib/database.js')>('../server/_lib/database.js');

describe('API server', () => {
  it('finds an endpoint after the last /api/, whatever prefix comes first', () => {
    expect(routeFor('/api/streak/status')).toBeTypeOf('function');
    expect(routeFor('/wordcircle/api/telegram/device/')).toBeTypeOf('function');
    expect(routeFor('/api/nothing')).toBeUndefined();
    expect(routeFor('/streak/status')).toBeUndefined();
  });

  it('answers 404 for unknown paths and 400 for broken JSON', async () => {
    expect((await handle(new Request('http://x/api/nope'))).status).toBe(404);
    const broken = await handle(new Request('http://x/api/progress/sync', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } }));
    expect(broken.status).toBe(400);
  });

  it('runs an endpoint with the query and answers its JSON', async () => {
    const response = await handle(new Request('http://x/api/streak/status?deviceId=device_0123456789abcdef&timeZone=UTC'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it('refuses the cron job without its secret', async () => {
    expect((await handle(new Request('http://x/api/cron/reminders', { method: 'POST' }))).status).toBe(401);
  });
});

describe('database placeholders', () => {
  it('numbers ? in order and leaves quoted ones alone', () => {
    expect(numberPlaceholders("SELECT * FROM t WHERE a = ? AND b = '?' AND c = ?")).toBe("SELECT * FROM t WHERE a = $1 AND b = '?' AND c = $2");
  });
});

describe('Vercel proxy', () => {
  it('answers 503 until API_ORIGIN is set', async () => {
    expect((await proxy(new Request('https://app/api/proxy?path=streak/status'), '')).status).toBe(503);
  });

  it('forwards path, query, method, body and authorization to the API server', async () => {
    const fetchMock = vi.fn(async (_url: URL, _init: RequestInit) => Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await proxy(new Request('https://app/api/proxy?path=telegram/start&x=1', { method: 'POST', body: '{"a":1}', headers: { authorization: 'Bearer s', cookie: 'no' } }), 'https://server.example/wordcircle/');
    vi.unstubAllGlobals();
    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toBe('https://server.example/wordcircle/api/telegram/start?x=1');
    expect(init.method).toBe('POST');
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe('{"a":1}');
    const headers = init.headers as Headers;
    expect(headers.get('authorization')).toBe('Bearer s');
    expect(headers.get('cookie')).toBeNull();
  });

  it('rejects odd paths', async () => {
    expect((await proxy(new Request('https://app/api/proxy?path=../etc'), 'https://server.example')).status).toBe(404);
  });
});
