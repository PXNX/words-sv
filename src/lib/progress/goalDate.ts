// The learner's goal date for their level ("ready by 15 March"): how many weeks are left and whether
// the forecast (weeks until 80 % of the level is known, as a range) gets there in time. Pure.

export type GoalPace = { weeksLeft: number; verdict: 'on_track' | 'tight' | 'behind' | 'unknown' | 'passed' };

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` from a date input, or null for anything else. */
export function parseGoalDate(value: unknown): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) ? value : null;
}

/**
 * On track when even the slow end of the forecast is in time, tight when only its middle is,
 * behind when not even the fast end is; unknown without a forecast yet.
 */
export function goalPace(goal: string, now: number, forecast: { weeks: number; low: number; high: number } | null): GoalPace {
  const weeksLeft = Math.ceil((Date.parse(`${goal}T23:59:59Z`) - now) / WEEK_MS);
  if (weeksLeft <= 0) return { weeksLeft: 0, verdict: 'passed' };
  if (!forecast) return { weeksLeft, verdict: 'unknown' };
  if (forecast.high <= weeksLeft) return { weeksLeft, verdict: 'on_track' };
  if (forecast.weeks <= weeksLeft) return { weeksLeft, verdict: 'tight' };
  return { weeksLeft, verdict: forecast.low <= weeksLeft ? 'tight' : 'behind' };
}
