// A learner's local data as v1.0.0 wrote it (tests/fixtures/v1.0.0, made with
// scripts/snapshot-local-data.ts) must still read back in the current version: nothing lost,
// nothing reset by a format change.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, test } from 'vitest';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/v1.0.0/local-storage.json', import.meta.url), 'utf8')) as Record<string, string>;
const store = new Map<string, string>();
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, String(value)); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => { store.clear(); },
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() { return store.size; }
} as Storage;

const { readReviewLedger, dueReviewEntries } = await import('../src/lib/review/ledger.js');
const { readActivity, completedIds } = await import('../src/lib/progress/activity.js');
const { readStreak, readDailyGoal, previousDate } = await import('../src/lib/streak/clientStreak.js');
const { readMissedWords } = await import('../src/lib/story/missedWords.js');
const { parseAvatar } = await import('../src/lib/profile/avatar.js');
const { readLevelStates } = await import('../src/lib/vocab/spacedRepetition.js');
const { loadLevel } = await import('../src/lib/data/vocabulary.js');
await loadLevel('de', 'a1');

const SAVED_DAY = JSON.parse(fixture['wordcircle-streak-state-v1']!).dateKey as string;
const noonOf = (key: string) => new Date(`${key}T12:00:00.000Z`);
const nextDay = (key: string) => new Date(noonOf(key).getTime() + 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  store.clear();
  for (const [key, value] of Object.entries(fixture)) store.set(key, value);
});

describe('v1.0.0 local data', () => {
  test('the fixture covers the learner state worth protecting', () => {
    expect(Object.keys(fixture)).toEqual(expect.arrayContaining([
      'wordcircle-review-ledger-v1', 'wordcircle-activity-v1', 'wordcircle-streak-state-v1',
      'wordcircle-vocabulary-review-v2:de:a1', 'wordcircle-avatar-v1', 'wordcircle-first-name-v1'
    ]));
  });

  test('the review ledger keeps every item with its schedule', () => {
    const ledger = readReviewLedger();
    const raw = JSON.parse(fixture['wordcircle-review-ledger-v1']!) as Record<string, { dueAt: number; repetitions: number; lapses: number; source: string }>;
    expect(Object.keys(ledger).sort()).toEqual(Object.keys(raw).sort());
    for (const [key, entry] of Object.entries(raw)) {
      expect(ledger[key]).toMatchObject({ dueAt: entry.dueAt, repetitions: entry.repetitions, lapses: entry.lapses, source: entry.source });
    }
    expect(ledger['de:FENSTER']?.source).toBe('reading');
    const due = dueReviewEntries('de', Date.parse('2026-11-30T00:00:00Z'), ledger);
    expect(due.length).toBe(Object.keys(raw).length);
  });

  test('vocabulary progress per level survives', () => {
    const { states } = readLevelStates('de', 'a1');
    const answered = states.filter((state) => state !== undefined);
    // HAUS, BAUM, HUND, WASSER and BROT are A1 words; KATZE was stored too but is not in the pool.
    expect(answered).toHaveLength(5);
    expect(answered.some((state) => state.repetitions >= 3)).toBe(true);
    expect(answered.some((state) => (state.lapses ?? 0) > 0)).toBe(true);
  });

  test('activity, completed texts and stories are still counted', () => {
    const events = readActivity();
    expect(events).toHaveLength(JSON.parse(fixture['wordcircle-activity-v1']!).length);
    expect(completedIds(events, 'reading')).toEqual(['de-a1-cafe']);
    expect(completedIds(events, 'story')).toEqual(['de-a1-market']);
  });

  test('the streak, its best and the daily goal carry over', () => {
    expect(readDailyGoal()).toBe(8);
    const sameDay = readStreak(noonOf(SAVED_DAY));
    expect(sameDay).toMatchObject({ streakCount: 4, bestStreak: 9, qualified: true, vocabCorrect: 8 });
    const tomorrow = readStreak(noonOf(nextDay(SAVED_DAY)));
    expect(tomorrow).toMatchObject({ streakCount: 4, bestStreak: 9, qualified: false, lastQualifiedDay: SAVED_DAY });
    expect(previousDate(nextDay(SAVED_DAY))).toBe(SAVED_DAY);
  });

  test('profile: name, character and words to repeat', () => {
    expect(localStorage.getItem('wordcircle-first-name-v1')).toBe('Alex');
    expect(parseAvatar(localStorage.getItem('wordcircle-avatar-v1'))).toEqual(JSON.parse(fixture['wordcircle-avatar-v1']!));
    expect(readMissedWords('de').map((entry) => entry.word).sort()).toEqual(['FENSTER', 'TÜR']);
  });
});
