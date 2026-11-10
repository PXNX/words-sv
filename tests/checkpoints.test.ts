import { describe, expect, it } from 'vitest';
import { checkpointDue, checkpointIntervalDays, checkpointTrend, CHECKPOINT_INTERVAL_MS, nextCheckpointAt, parseCheckpoints, type CheckpointResult } from '../src/lib/assessment/checkpoints';

const NOW = Date.UTC(2026, 10, 10);
const result = (at: number, level: CheckpointResult['level'], lang: CheckpointResult['lang'] = 'de'): CheckpointResult => ({ at, lang, level, scores: { a1: 1 } });

describe('checkpoints', () => {
  it('validates stored results', () => {
    expect(parseCheckpoints(JSON.stringify([result(1, 'a2'), { at: 'x' }, { at: 2, lang: 'xx', level: 'a1' }, { at: 3, lang: 'en', level: 'b1', scores: { a1: 5, a2: 0.5 } }])))
      .toEqual([result(1, 'a2'), { at: 3, lang: 'en', level: 'b1', scores: { a2: 0.5 } }]);
    expect(parseCheckpoints('nope')).toEqual([]);
  });

  it('is due without a result and four weeks after the last one, per language', () => {
    expect(checkpointDue([], 'de', NOW)).toBe(true);
    const results = [result(NOW - CHECKPOINT_INTERVAL_MS + 1000, 'a2'), result(NOW - 2 * CHECKPOINT_INTERVAL_MS, 'b1', 'en')];
    expect(checkpointDue(results, 'de', NOW)).toBe(false);
    expect(checkpointDue(results, 'en', NOW)).toBe(true);
  });

  it('comes due sooner the more words a day the learner aims for', () => {
    expect([5, 8, 12].map(checkpointIntervalDays)).toEqual([24, 15, 10]);
    expect(checkpointIntervalDays(1)).toBe(28);
    expect(checkpointIntervalDays(50)).toBe(7);
    const results = [result(NOW - 12 * 86_400_000, 'a2')];
    expect(checkpointDue(results, 'de', NOW, 12)).toBe(true);
    expect(checkpointDue(results, 'de', NOW, 5)).toBe(false);
    expect(nextCheckpointAt(results, 'de', 5)).toBe(NOW + 12 * 86_400_000);
    expect(nextCheckpointAt([], 'de', 5)).toBeNull();
  });

  it('shows the last three results with their change', () => {
    const results = [result(1, 'a1'), result(2, 'a1'), result(3, 'a2'), result(4, 'b1'), result(5, 'c1', 'en')];
    expect(checkpointTrend(results, 'de').map((entry) => [entry.level, entry.change])).toEqual([['a1', 0], ['a2', 1], ['b1', 1]]);
  });
});
