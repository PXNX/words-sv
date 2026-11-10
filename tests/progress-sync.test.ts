import { describe, expect, it } from 'vitest';
import { createSyncEndpoint } from '../api/progress/sync.js';
import { responseCapture } from './support/api';

type Snapshot = { revision: number; snapshot: string };
type Fakes = {
  links?: Record<string, number>;
  snapshots?: Record<string, Snapshot>;
};

// The few statements the sync endpoint runs, against in-memory links and snapshots.
function fakeDatabase({ links = {}, snapshots = {} }: Fakes = {}) {
  return {
    snapshots,
    async execute(sql: string, params: any[] = []) {
      if (/^\s*(CREATE|ALTER)/.test(sql)) return [{}];
      if (sql.startsWith('SELECT telegram_user_id FROM wordcircle_telegram_links')) return [links[params[0]] ? [{ telegram_user_id: links[params[0]] }] : []];
      if (sql.startsWith('SELECT revision, snapshot')) return [snapshots[params[0]] ? [snapshots[params[0]]] : []];
      if (sql.startsWith('INSERT IGNORE INTO wordcircle_progress_snapshots')) {
        if (snapshots[params[0]]) return [{ affectedRows: 0 }];
        snapshots[params[0]] = { revision: 1, snapshot: params[1] };
        return [{ affectedRows: 1 }];
      }
      if (sql.startsWith('UPDATE wordcircle_progress_snapshots')) {
        const row = snapshots[params[2]];
        if (!row || row.revision !== params[3]) return [{ affectedRows: 0 }];
        Object.assign(row, { revision: row.revision + 1, snapshot: params[0] });
        return [{ affectedRows: 1 }];
      }
      throw new Error(`unexpected sql: ${sql}`);
    }
  };
}

const DEVICE = 'device-aaaaaaaaaaaaaaaa';
const OTHER = 'device-bbbbbbbbbbbbbbbb';

async function call(db: ReturnType<typeof fakeDatabase>, body: Record<string, unknown>) {
  const res = responseCapture();
  await createSyncEndpoint({ databaseProvider: () => db })({ method: 'POST', body }, res);
  return res.result;
}

describe('progress sync', () => {
  it('tells an unlinked device that nothing is saved', async () => {
    const result = await call(fakeDatabase(), { deviceId: DEVICE, action: 'pull' });
    expect(result.body).toEqual({ ok: true, linked: false });
  });

  it('takes the first snapshot of an account and returns it to every linked device', async () => {
    const db = fakeDatabase({ links: { [DEVICE]: 42, [OTHER]: 42 } });
    expect((await call(db, { deviceId: DEVICE, action: 'pull' })).body).toMatchObject({ linked: true, revision: 0, snapshot: null });
    const pushed = await call(db, { deviceId: DEVICE, action: 'push', baseRevision: 0, snapshot: { 'wordcircle-first-name-v1': 'Ana' } });
    expect(pushed.body).toMatchObject({ ok: true, revision: 1 });
    const pulled = await call(db, { deviceId: OTHER, action: 'pull' });
    expect(pulled.body).toMatchObject({ linked: true, revision: 1, snapshot: { 'wordcircle-first-name-v1': 'Ana' } });
  });

  it('refuses a stale push and hands back the current snapshot to merge', async () => {
    const db = fakeDatabase({ links: { [DEVICE]: 42 }, snapshots: { '42': { revision: 3, snapshot: '{"a":"1"}' } } });
    const result = await call(db, { deviceId: DEVICE, action: 'push', baseRevision: 2, snapshot: { a: '2' } });
    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({ error: 'conflict', revision: 3, snapshot: { a: '1' } });
    expect(db.snapshots['42']!.revision).toBe(3);
  });

  it('rejects bad requests and oversized snapshots', async () => {
    const db = fakeDatabase({ links: { [DEVICE]: 42 } });
    expect((await call(db, { deviceId: 'short', action: 'pull' })).statusCode).toBe(400);
    expect((await call(db, { deviceId: DEVICE, action: 'push', baseRevision: 0, snapshot: [] })).statusCode).toBe(400);
    expect((await call(db, { deviceId: DEVICE, action: 'push', baseRevision: 0, snapshot: { big: 'x'.repeat(2_100_000) } })).statusCode).toBe(413);
  });
});