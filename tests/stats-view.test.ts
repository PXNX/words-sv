import { describe, expect, it } from 'vitest';
import { dailyActivity, lifetimeTotals, modeShares } from '../src/lib/progress/statsView.js';
import type { ActivityEvent } from '../src/lib/progress/activity.js';

const minute = 60_000;
const now = new Date(2026, 10, 6, 18, 0).getTime();
const at = (daysAgo: number, hour: number, min = 0) => new Date(2026, 10, 6 - daysAgo, hour, min).getTime();

describe('stats view', () => {
  it('splits the last week into local days, today last', () => {
    const events: ActivityEvent[] = [
      { kind: 'vocab', at: at(0, 9) }, { kind: 'vocab', at: at(0, 9, 4) },
      { kind: 'wordle', at: at(2, 20) },
      { kind: 'story', at: at(9, 10) }
    ];
    const week = dailyActivity(events, now);
    expect(week).toHaveLength(7);
    expect(week[6]).toMatchObject({ today: true, minutes: 4, events: 2 });
    expect(week[4]).toMatchObject({ today: false, minutes: 1, events: 1 });
    expect(week.reduce((sum, day) => sum + day.events, 0)).toBe(3);
  });

  it('counts lifetime minutes, days and sessions', () => {
    const events: ActivityEvent[] = [
      { kind: 'vocab', at: at(1, 9) }, { kind: 'vocab', at: at(1, 9) + 3 * minute },
      { kind: 'grammar', at: at(1, 15) },
      { kind: 'story', at: at(0, 8) }
    ];
    expect(lifetimeTotals(events)).toEqual({ minutes: 5, daysPractised: 2, sessions: 3 });
    expect(lifetimeTotals([])).toEqual({ minutes: 0, daysPractised: 0, sessions: 0 });
  });

  it('ranks the modes played, leaving out bonus events', () => {
    const events: ActivityEvent[] = [
      { kind: 'vocab', at: 10 }, { kind: 'vocab', at: 20 }, { kind: 'wordle', at: 30 }, { kind: 'tricky_cleared', at: 40 }
    ];
    expect(modeShares(events).map(({ kind, count }) => [kind, count])).toEqual([['vocab', 2], ['wordle', 1]]);
    expect(modeShares(events, 25).map(({ kind }) => kind)).toEqual(['wordle']);
  });
});
