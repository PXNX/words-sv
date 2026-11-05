/*
 * The quiet streak view on the home page: the last seven days as small dots, and one short line
 * that says what today is about. Both are derived from the streak state alone (the run of qualified
 * days ends at `lastQualifiedDay` and is `streakCount` long), so nothing extra has to be stored.
 */
import { previousDate, type ClientStreak } from './clientStreak.js';

export type StreakDayStatus = 'done' | 'missed' | 'today-open' | 'today-done';
export type StreakDay = { dateKey: string; weekday: number; status: StreakDayStatus };

/** The seven days ending today, oldest first; `weekday` is 0 (Sunday) to 6. */
export function streakWeek(state: Pick<ClientStreak, 'dateKey' | 'qualified' | 'streakCount' | 'lastQualifiedDay'>): StreakDay[] {
  const keys = [state.dateKey];
  while (keys.length < 7) keys.unshift(previousDate(keys[0]));
  // The run's first day: walk back streakCount - 1 days from its last one.
  let runStart: string | null = null;
  if (state.lastQualifiedDay && state.streakCount > 0) {
    runStart = state.lastQualifiedDay;
    for (let step = 1; step < state.streakCount; step += 1) runStart = previousDate(runStart);
  }
  const last = state.lastQualifiedDay;
  return keys.map((key) => {
    const weekday = new Date(`${key}T12:00:00.000Z`).getUTCDay();
    if (key === state.dateKey) return { dateKey: key, weekday, status: state.qualified ? 'today-done' : 'today-open' };
    const inRun = runStart !== null && last !== null && key >= runStart && key <= last;
    return { dateKey: key, weekday, status: inRun ? 'done' : 'missed' };
  });
}

/** Streak lengths worth a small cheer when today reaches them. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 150, 200, 365, 500, 1000] as const;

export type StreakNudge =
  | { kind: 'done'; count: number }
  | { kind: 'milestone'; count: number }
  | { kind: 'urgent'; count: number; minutes: number }
  | { kind: 'keep'; count: number }
  | { kind: 'start'; best: number };

// Under three hours left feels like "today, soon" without nagging all evening.
export const URGENT_MINUTES = 180;

/** The one line under the dots: calm when done, encouraging otherwise, a little urgent only late. */
export function streakNudge(state: Pick<ClientStreak, 'qualified' | 'streakCount' | 'bestStreak' | 'minutesRemaining'>): StreakNudge {
  if (state.qualified) return { kind: 'done', count: state.streakCount };
  if (state.streakCount === 0) return { kind: 'start', best: state.bestStreak };
  const next = state.streakCount + 1;
  if ((STREAK_MILESTONES as readonly number[]).includes(next)) return { kind: 'milestone', count: next };
  if (state.minutesRemaining <= URGENT_MINUTES) return { kind: 'urgent', count: state.streakCount, minutes: state.minutesRemaining };
  return { kind: 'keep', count: state.streakCount };
}

/** Whether a streak count that was just reached is one of the milestones. */
export function isStreakMilestone(count: number): boolean {
  return (STREAK_MILESTONES as readonly number[]).includes(count);
}
