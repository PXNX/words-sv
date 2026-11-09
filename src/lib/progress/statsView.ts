/*
 * The numbers behind the stats page that the activity log can answer directly: minutes per day for
 * the last week, lifetime totals, and which modes were played. Like the milestones this is a pure
 * view, so it only ever shows what really happened on this device (or came with the saved progress).
 */
import { activeMinutes, type ActivityEvent, type ActivityKind } from './activity.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight of the day `at` falls on. */
function dayStart(at: number): number {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export type DayActivity = { start: number; minutes: number; events: number; today: boolean };

/** The last `days` local days, oldest first, with the minutes and events of each. */
export function dailyActivity(events: readonly ActivityEvent[], now = Date.now(), days = 7): DayActivity[] {
  const today = dayStart(now);
  const result: DayActivity[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    // Step back a day at noon, so a daylight-saving change cannot skip or repeat a day.
    const start = dayStart(today - offset * DAY_MS + DAY_MS / 2);
    const end = dayStart(start + DAY_MS + DAY_MS / 2) - 1;
    const inDay = events.filter((event) => event.at >= start && event.at <= end);
    result.push({ start, minutes: inDay.length ? activeMinutes(inDay as ActivityEvent[]) : 0, events: inDay.length, today: start === today });
  }
  return result;
}

export type LifetimeTotals = { minutes: number; daysPractised: number; sessions: number };

// The same gap activeMinutes uses between two sessions.
const SESSION_GAP_MS = 5 * 60 * 1000;

export function lifetimeTotals(events: readonly ActivityEvent[]): LifetimeTotals {
  if (events.length === 0) return { minutes: 0, daysPractised: 0, sessions: 0 };
  const times = events.map((event) => event.at).sort((a, b) => a - b);
  let sessions = 1;
  for (let index = 1; index < times.length; index += 1) if (times[index]! - times[index - 1]! > SESSION_GAP_MS) sessions += 1;
  return { minutes: activeMinutes(events as ActivityEvent[]), daysPractised: new Set(times.map(dayStart)).size, sessions };
}

export type ModeShare = { kind: ActivityKind; count: number; share: number };

/** How often each mode was played since `since`, most played first (bonus events left out). */
export function modeShares(events: readonly ActivityEvent[], since = 0): ModeShare[] {
  const counts = new Map<ActivityKind, number>();
  for (const event of events) if (event.at >= since && event.kind !== 'tricky_cleared') counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  return [...counts.entries()].map(([kind, count]) => ({ kind, count, share: total ? count / total : 0 })).sort((a, b) => b.count - a.count);
}
