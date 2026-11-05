import { describe, expect, it } from 'vitest';
import { changedEntries, collectSnapshot, isSyncedKey, mergeEntry, mergeSnapshots, snapshotFingerprint } from '../src/lib/sync/progressMerge.js';

function storage(entries: Record<string, string>) {
  const keys = Object.keys(entries);
  return { length: keys.length, key: (index: number) => keys[index] ?? null, getItem: (key: string) => entries[key] ?? null };
}

describe('progress snapshot', () => {
  it('collects the app entries that belong to the learner, not to the device', () => {
    const snapshot = collectSnapshot(storage({
      'wordcircle-review-ledger-v1': '{}',
      'wordcircle-first-name-v1': 'Ana',
      'wordcircle-streak-device-v1': 'secret-device-id',
      'wordcircle-theme': 'dark',
      'other-app': 'x'
    }));
    expect(snapshot).toEqual({ 'wordcircle-review-ledger-v1': '{}', 'wordcircle-first-name-v1': 'Ana' });
    expect(isSyncedKey('wordcircle-chat-model-v1')).toBe(false);
  });
});

describe('progress merge', () => {
  it('keeps the newer version of every review entry and adds the ones only one side has', () => {
    const local = JSON.stringify({ 'de:HUND': { repetitions: 2, updatedAt: 10 }, 'de:KATZE': { repetitions: 1, updatedAt: 50 } });
    const remote = JSON.stringify({ 'de:HUND': { repetitions: 5, updatedAt: 40 }, 'de:BAUM': { repetitions: 3, updatedAt: 30 } });
    expect(JSON.parse(mergeEntry('wordcircle-review-ledger-v1', local, remote))).toEqual({
      'de:HUND': { repetitions: 5, updatedAt: 40 },
      'de:KATZE': { repetitions: 1, updatedAt: 50 },
      'de:BAUM': { repetitions: 3, updatedAt: 30 }
    });
  });

  it('joins activity timelines in order without duplicates', () => {
    const local = JSON.stringify([{ kind: 'vocab', at: 1 }, { kind: 'wordle', at: 5 }]);
    const remote = JSON.stringify([{ kind: 'vocab', at: 1 }, { kind: 'story', at: 3 }]);
    expect(JSON.parse(mergeEntry('wordcircle-activity-v1', local, remote)).map((event: { at: number }) => event.at)).toEqual([1, 3, 5]);
  });

  it('joins unlocked rewards', () => {
    expect(JSON.parse(mergeEntry('wordcircle-cosmetics-v1', '["vocab"]', '["wordle","vocab"]'))).toEqual(['vocab', 'wordle']);
  });

  it('takes the newer day of the streak whole, keeping the best streak ever', () => {
    const today = JSON.stringify({ dateKey: '2026-11-05', vocabCorrect: 2, streakCount: 3, bestStreak: 3 });
    const yesterday = JSON.stringify({ dateKey: '2026-11-04', vocabCorrect: 12, streakCount: 9, bestStreak: 20 });
    expect(JSON.parse(mergeEntry('wordcircle-streak-state-v1', yesterday, today))).toEqual({ dateKey: '2026-11-05', vocabCorrect: 2, streakCount: 3, bestStreak: 20 });
  });

  it('adds up a shared day by keeping the higher counters and every finished mode', () => {
    const a = JSON.stringify({ dateKey: '2026-11-05', vocabCorrect: 2, wordleCompleted: true, circleCompleted: false });
    const b = JSON.stringify({ dateKey: '2026-11-05', vocabCorrect: 6, wordleCompleted: false, circleCompleted: true });
    expect(JSON.parse(mergeEntry('wordcircle-streak-state-v1', a, b))).toEqual({ dateKey: '2026-11-05', vocabCorrect: 6, wordleCompleted: true, circleCompleted: true });
  });

  it('keeps this device’s settings but the higher counters', () => {
    expect(mergeEntry('wordcircle-language-v1', 'de', 'fr')).toBe('de');
    expect(mergeEntry('wordcircle-daily-goal-v1', '5', '12')).toBe('5');
    expect(mergeEntry('wordcircle-completed-rounds-v1', '4', '9')).toBe('9');
  });

  it('fills a fresh device from the account and reports only what changes', () => {
    const local = { 'wordcircle-interface-locale-v1': 'en' };
    const remote = { 'wordcircle-first-name-v1': 'Ana', 'wordcircle-interface-locale-v1': 'de', 'wordcircle-streak-device-v1': 'not-mine' };
    const merged = mergeSnapshots(local, remote);
    expect(merged).toEqual({ 'wordcircle-first-name-v1': 'Ana', 'wordcircle-interface-locale-v1': 'en' });
    expect(changedEntries(local, merged)).toEqual({ 'wordcircle-first-name-v1': 'Ana' });
    expect(mergeSnapshots(local, null)).toEqual(local);
  });

  it('fingerprints snapshots independent of key order', () => {
    expect(snapshotFingerprint({ a: '1', b: '2' })).toBe(snapshotFingerprint({ b: '2', a: '1' }));
    expect(snapshotFingerprint({ a: '1' })).not.toBe(snapshotFingerprint({ a: '2' }));
  });
});
