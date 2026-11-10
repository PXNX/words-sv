import { describe, expect, it } from 'vitest';
import { parseHistory, recordSnapshot, weeklySeries, weekStartUtc } from '../src/lib/progress/masteryHistory';

const WEEK = 7 * 86_400_000;
const MONDAY = Date.UTC(2026, 10, 9);

describe('mastery history', () => {
  it('keys snapshots by the Monday of their week', () => {
    expect(weekStartUtc(Date.UTC(2026, 10, 15, 22))).toBe(MONDAY);
    expect(weekStartUtc(MONDAY)).toBe(MONDAY);
  });

  it('keeps one snapshot per week and carries missing weeks forward', () => {
    let history = recordSnapshot([], 'de', 'a1', 0.1, MONDAY);
    history = recordSnapshot(history, 'de', 'a1', 0.15, MONDAY + 86_400_000);
    history = recordSnapshot(history, 'de', 'a1', 0.3, MONDAY + 2 * WEEK);
    history = recordSnapshot(history, 'en', 'a1', 0.9, MONDAY);
    expect(weeklySeries(history, 'de', 'a1')).toEqual([0.15, 0.15, 0.3]);
    expect(weeklySeries(history, 'de', 'a2')).toEqual([]);
    expect(parseHistory(JSON.stringify([...history, { week: 'x' }]))).toHaveLength(3);
  });
});
