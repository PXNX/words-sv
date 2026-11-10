import { describe, expect, it } from 'vitest';
import { goalPace, parseGoalDate } from '../src/lib/progress/goalDate';

const NOW = Date.UTC(2026, 10, 10, 12);

describe('goal date', () => {
  it('reads only real dates', () => {
    expect(parseGoalDate('2027-03-15')).toBe('2027-03-15');
    expect(parseGoalDate('15.03.2027')).toBeNull();
    expect(parseGoalDate(7)).toBeNull();
  });

  it('compares the weeks left with the forecast range', () => {
    expect(goalPace('2026-12-31', NOW, { weeks: 4, low: 3, high: 6 })).toEqual({ weeksLeft: 8, verdict: 'on_track' });
    expect(goalPace('2026-12-08', NOW, { weeks: 4, low: 3, high: 6 }).verdict).toBe('tight');
    expect(goalPace('2026-11-20', NOW, { weeks: 4, low: 3, high: 6 }).verdict).toBe('behind');
    expect(goalPace('2026-12-31', NOW, null).verdict).toBe('unknown');
    expect(goalPace('2026-11-01', NOW, null)).toEqual({ weeksLeft: 0, verdict: 'passed' });
  });
});
