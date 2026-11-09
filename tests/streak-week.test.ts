import { describe, expect, it } from 'vitest';
import { isStreakMilestone, streakNudge, streakWeek } from '../src/lib/streak/streakWeek.js';

describe('streak week', () => {
  it('marks the current run as done and today as open until it qualifies', () => {
    const week = streakWeek({ dateKey: '2026-11-05', qualified: false, streakCount: 3, lastQualifiedDay: '2026-11-04' });
    expect(week.map((day) => day.dateKey)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']);
    expect(week.map((day) => day.status)).toEqual(['missed', 'missed', 'missed', 'done', 'done', 'done', 'today-open']);
    // 2026-11-05 is a Thursday.
    expect(week[6]!.weekday).toBe(4);
  });

  it('counts today in the run once it is qualified', () => {
    const week = streakWeek({ dateKey: '2026-11-05', qualified: true, streakCount: 9, lastQualifiedDay: '2026-11-05' });
    expect(week.map((day) => day.status)).toEqual(['done', 'done', 'done', 'done', 'done', 'done', 'today-done']);
  });

  it('shows no run without a streak', () => {
    const week = streakWeek({ dateKey: '2026-11-05', qualified: false, streakCount: 0, lastQualifiedDay: '2026-10-01' });
    expect(week.slice(0, 6).every((day) => day.status === 'missed')).toBe(true);
  });
});

describe('streak nudge', () => {
  const base = { qualified: false, streakCount: 4, bestStreak: 10, minutesRemaining: 600 };

  it('is calm once the day is done', () => {
    expect(streakNudge({ ...base, qualified: true, streakCount: 5 })).toEqual({ kind: 'done', count: 5 });
  });

  it('invites a fresh start without a streak', () => {
    expect(streakNudge({ ...base, streakCount: 0 })).toEqual({ kind: 'start', best: 10 });
  });

  it('looks forward to a milestone today would reach', () => {
    expect(streakNudge({ ...base, streakCount: 6 })).toEqual({ kind: 'milestone', count: 7 });
  });

  it('only gets urgent in the last hours of the day', () => {
    expect(streakNudge(base)).toEqual({ kind: 'keep', count: 4 });
    expect(streakNudge({ ...base, minutesRemaining: 90 })).toEqual({ kind: 'urgent', count: 4, minutes: 90 });
  });

  it('knows the milestones', () => {
    expect(isStreakMilestone(7)).toBe(true);
    expect(isStreakMilestone(8)).toBe(false);
  });
});
