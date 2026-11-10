import { describe, expect, it, vi } from 'vitest';
import streakProgress from '../api/streak/progress.js';
import { responseCapture } from './support/api';

// An in-memory stand-in for the streak table: SELECT returns the stored row, the upsert stores the
// columns it was given, and a missing column fails like MySQL until the migration has run.
const table = new Map<string, Record<string, unknown>>();
let columns = new Set<string>();
const execute = vi.fn(async (sql: string, values: unknown[] = []) => {
  if (sql.startsWith('SELECT')) return [table.has(String(values[0])) ? [table.get(String(values[0]))] : []];
  if (sql.startsWith('ALTER')) {
    for (const [, name] of sql.matchAll(/ADD COLUMN (\w+)/gu)) columns.add(name!);
    return [{}];
  }
  if (sql.startsWith('INSERT')) {
    const names = /\(([^)]+)\)/u.exec(sql)![1]!.split(', ');
    const missing = names.find((name) => !columns.has(name));
    if (missing) throw Object.assign(new Error(`Unknown column '${missing}'`), { code: 'ER_BAD_FIELD_ERROR' });
    table.set(String(values[0]), Object.fromEntries(names.map((name, index) => [name, values[index]])));
    return [{}];
  }
  return [{}];
});
vi.mock('../api/_lib/database.js', () => ({ getDatabase: () => ({ execute }) }));

const deviceId = 'device_0123456789abcdef';
async function post(body: Record<string, unknown>) {
  const res = responseCapture();
  await streakProgress({ method: 'POST', body: { deviceId, timeZone: 'UTC', ...body } }, res);
  return res.result;
}

describe('streak progress endpoint', () => {
  it('accepts the writing goal and keeps it, migrating an older table first', async () => {
    columns = new Set(['device_id', 'timezone', 'locale', 'day_key', 'vocab_correct', 'circle_completed', 'definitions_completed', 'wordle_completed', 'reading_completed', 'story_completed', 'grammar_correct', 'listen_completed', 'pronunciation_attempts', 'hangman_completed', 'alltag_correct', 'current_qualified', 'last_qualified_day', 'streak_count', 'best_streak', 'vocabulary_goal', 'freezes', 'qualified_days']);
    const first = await post({ event: 'sentence_completed' });
    expect(first).toMatchObject({ statusCode: 200, body: { ok: true, streak: { sentenceCompleted: true, qualified: true, streakCount: 1 } } });
    expect(columns.has('sentence_completed')).toBe(true);
    const again = await post({ event: 'sync' });
    expect(again.body.streak.sentenceCompleted).toBe(true);
  });

  it('rejects unknown events', async () => {
    expect((await post({ event: 'made_up' })).statusCode).toBe(400);
  });
});
