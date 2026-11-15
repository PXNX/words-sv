import { describe, expect, it, vi } from 'vitest';
import streakProgress from '../server/streak/progress.js';
import { responseCapture } from './support/api';

// An in-memory stand-in for the streak table: SELECT returns the stored row, the upsert stores the
// columns it was given, and a missing column fails like Postgres until the migration has run.
const table = new Map<string, Record<string, unknown>>();
let columns = new Set<string>();
const execute = vi.fn(async (sql: string, values: unknown[] = []) => {
  if (sql.startsWith('SELECT')) return [table.has(String(values[0])) ? [table.get(String(values[0]))] : []];
  if (sql.startsWith('ALTER')) {
    for (const [, name] of sql.matchAll(/ADD COLUMN (?:IF NOT EXISTS )?(\w+)/gu)) columns.add(name!);
    return [{}];
  }
  if (sql.startsWith('INSERT')) {
    const names = /\(([^)]+)\)/u.exec(sql)![1]!.split(', ');
    const missing = names.find((name) => !columns.has(name));
    if (missing) throw Object.assign(new Error(`Unknown column '${missing}'`), { code: '42703' });
    table.set(String(values[0]), Object.fromEntries(names.map((name, index) => [name, values[index]])));
    return [{}];
  }
  return [{}];
});
vi.mock('../server/_lib/database.js', () => ({ getDatabase: () => ({ execute }) }));

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

describe('best streak', () => {
  it('stays a number when an event leaves it unset', async () => {
    await post({ event: 'reward_collected' });
    const row = [...table.values()].at(-1)!;
    expect(Number.isFinite(row.best_streak)).toBe(true);
  });
});

describe('device snapshot', () => {
  const all = ['device_id', 'timezone', 'locale', 'day_key', 'vocab_correct', 'circle_completed', 'definitions_completed', 'wordle_completed', 'reading_completed', 'story_completed', 'grammar_correct', 'listen_completed', 'pronunciation_attempts', 'hangman_completed', 'taboo_completed', 'alltag_correct', 'sentence_completed', 'pro_shield_week', 'native_digits', 'current_qualified', 'last_qualified_day', 'streak_count', 'best_streak', 'vocabulary_goal', 'freezes', 'qualified_days', 'reward_collected', 'embers'];
  const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

  it('counts an answer once although the snapshot already includes it', async () => {
    table.clear();
    columns = new Set(all);
    for (let answer = 1; answer <= 3; answer += 1) {
      const { body } = await post({ event: 'vocab_correct', snapshot: { dateKey: day(0), vocabCorrect: answer, vocabularyGoal: 8 } });
      expect(body.streak.vocabCorrect).toBe(answer);
    }
  });

  it('keeps the progress of a snapshot that is further along', async () => {
    table.clear();
    columns = new Set(all);
    const { body } = await post({ event: 'vocab_correct', snapshot: { dateKey: day(0), vocabCorrect: 8, vocabularyGoal: 8 } });
    expect(body.streak).toMatchObject({ vocabCorrect: 8, qualified: true, streakCount: 1 });
  });

  it('keeps the streak and the freeze after a day played offline', async () => {
    table.clear();
    columns = new Set(all);
    table.set(deviceId, { device_id: deviceId, day_key: day(-2), last_qualified_day: day(-2), current_qualified: 1, streak_count: 5, best_streak: 5, freezes: 1, qualified_days: 5, vocabulary_goal: 8 });
    const { body } = await post({ event: 'sync', snapshot: { dateKey: day(0), lastQualifiedDay: day(-1), streakCount: 6, freezes: 1, qualifiedDays: 6, vocabularyGoal: 8 } });
    expect(body.streak).toMatchObject({ streakCount: 6, lastQualifiedDay: day(-1), freezes: 1, qualified: false, canProtectStreak: true });
  });

  it('still spends a freeze for a day nobody played', async () => {
    table.clear();
    columns = new Set(all);
    table.set(deviceId, { device_id: deviceId, day_key: day(-2), last_qualified_day: day(-2), current_qualified: 1, streak_count: 5, best_streak: 5, freezes: 1, qualified_days: 5, vocabulary_goal: 8 });
    const { body } = await post({ event: 'sync', snapshot: { dateKey: day(0), lastQualifiedDay: day(-1), streakCount: 5, freezes: 0, qualifiedDays: 5, vocabularyGoal: 8 } });
    expect(body.streak).toMatchObject({ streakCount: 5, freezes: 0 });
  });
});
