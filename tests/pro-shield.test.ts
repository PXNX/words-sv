import { describe, expect, it } from 'vitest';
import { isoWeek, proCovers, useProShield } from '../src/lib/streak/proShield';
import { isoWeek as serverIsoWeek, stateForToday } from '../server/_lib/streak.js';

const PRO = Date.UTC(2026, 11, 31);

describe('Pro streak shield', () => {
  it('numbers ISO weeks the same way on the device and on the server', () => {
    for (const day of ['2026-11-09', '2026-11-15', '2021-01-03', '2024-12-30', '2026-01-01']) expect(isoWeek(day)).toBe(serverIsoWeek(day));
    expect(isoWeek('2026-11-16')).toBe('2026-W47');
    expect(isoWeek('2024-12-30')).toBe('2025-W01');
  });

  it('bridges one missed day per week while Pro runs', () => {
    expect(useProShield('2026-11-11', PRO, null)).toEqual({ lastQualifiedDay: '2026-11-11', proShieldWeek: '2026-W46' });
    expect(useProShield('2026-11-12', PRO, '2026-W46')).toBeNull();
    expect(useProShield('2026-11-17', PRO, '2026-W46')).not.toBeNull();
    expect(useProShield('2026-11-11', null, null)).toBeNull();
    expect(proCovers(Date.UTC(2026, 10, 10), '2026-11-11')).toBe(false);
  });

  it('keeps the streak on the server before using a freeze', () => {
    const stored = { day_key: '2026-11-10', last_qualified_day: '2026-11-10', streak_count: 12, freezes: 1 };
    // Today is the 12th: the 11th was missed.
    const now = new Date('2026-11-12T10:00:00Z');
    const withPro = stateForToday(stored, 'UTC', now, PRO);
    expect(withPro).toMatchObject({ streakCount: 12, lastQualifiedDay: '2026-11-11', freezes: 1, proShieldWeek: '2026-W46' });
    const without = stateForToday(stored, 'UTC', now);
    expect(without).toMatchObject({ streakCount: 12, freezes: 0, proShieldWeek: null });
    const shieldUsed = stateForToday({ ...stored, pro_shield_week: '2026-W46' }, 'UTC', now, PRO);
    expect(shieldUsed).toMatchObject({ freezes: 0, proShieldWeek: '2026-W46' });
  });
});
