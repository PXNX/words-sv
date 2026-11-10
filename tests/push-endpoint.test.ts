import { afterEach, describe, expect, it } from 'vitest';
import { createPushEndpoint } from '../api/push/index.js';
import { endpointHash } from '../api/_lib/push.js';
import { responseCapture } from './support/api';

// One route for Web Push: GET hands out the VAPID public key, POST subscribes a device or turns its
// subscription off. A deployment may hold only a handful of serverless functions, so all three live
// in api/push/index.ts.
function fakeDatabase() {
  const statements: Array<{ sql: string; params: unknown[] }> = [];
  return {
    statements,
    async execute(sql: string, params: unknown[] = []) {
      statements.push({ sql, params });
      return [{}];
    }
  };
}

const deviceId = 'device_0123456789abcdef';
const subscription = { endpoint: 'https://push.example/abc', keys: { p256dh: 'p'.repeat(40), auth: 'a'.repeat(12) } };

async function call(request: { method?: string; body?: unknown }, db = fakeDatabase()) {
  const res = responseCapture();
  await createPushEndpoint({ databaseProvider: () => db as never })(request, res);
  return { result: res.result, db };
}

afterEach(() => {
  delete process.env.VAPID_PUBLIC_KEY;
});

describe('push endpoint', () => {
  it('hands out the VAPID public key, and says when push is not configured', async () => {
    process.env.VAPID_PUBLIC_KEY = 'BPublicKeyForTests';
    expect((await call({ method: 'GET' })).result).toMatchObject({ statusCode: 200, body: { publicKey: 'BPublicKeyForTests' } });

    delete process.env.VAPID_PUBLIC_KEY;
    expect((await call({ method: 'GET' })).result).toMatchObject({ statusCode: 503, body: { error: 'push_unavailable' } });
  });

  it('subscribes a device: the streak row learns its time zone and the subscription is stored', async () => {
    const { result, db } = await call({ method: 'POST', body: { action: 'subscribe', deviceId, timeZone: 'Europe/Berlin', locale: 'de', subscription } });
    expect(result).toMatchObject({ statusCode: 201, body: { ok: true, subscribed: true } });
    expect(db.statements).toHaveLength(2);
    expect(db.statements[0]!.params.slice(0, 2)).toEqual([deviceId, 'Europe/Berlin']);
    expect(db.statements[1]!.params.slice(0, 3)).toEqual([endpointHash(subscription.endpoint), deviceId, subscription.endpoint]);
  });

  it('rejects a subscription it cannot use and writes nothing', async () => {
    const invalid = [
      { action: 'subscribe', deviceId: 'short', timeZone: 'Europe/Berlin', subscription },
      { action: 'subscribe', deviceId, timeZone: 'Mars/Olympus', subscription },
      { action: 'subscribe', deviceId, timeZone: 'Europe/Berlin', subscription: { endpoint: 'http://insecure.example', keys: subscription.keys } },
      { action: 'unsubscribe', endpoint: 'http://insecure.example' },
      { action: 'delete_everything' },
      {}
    ];
    for (const body of invalid) {
      const { result, db } = await call({ method: 'POST', body });
      expect(result).toMatchObject({ statusCode: 400 });
      expect(db.statements).toEqual([]);
    }
  });

  it('turns a subscription off by its endpoint hash', async () => {
    const { result, db } = await call({ method: 'POST', body: { action: 'unsubscribe', endpoint: subscription.endpoint } });
    expect(result).toMatchObject({ statusCode: 200, body: { ok: true, subscribed: false } });
    expect(db.statements).toHaveLength(1);
    expect(db.statements[0]!.sql).toContain('enabled = 0');
    expect(db.statements[0]!.params).toEqual([endpointHash(subscription.endpoint)]);
  });

  it('answers a database failure with 503 and any other method with 405', async () => {
    const failing = { async execute() { throw new Error('database_unavailable'); } };
    expect((await call({ method: 'POST', body: { action: 'unsubscribe', endpoint: subscription.endpoint } }, failing as never)).result).toMatchObject({ statusCode: 503, body: { error: 'database_unavailable' } });
    expect((await call({ method: 'PUT' })).result).toMatchObject({ statusCode: 405 });
  });
});
