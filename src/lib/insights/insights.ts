// Numbers for the insights page, all from the learner's own event log on this device: how much
// was practised each day, how often a day of practice was followed by another, and how the modes
// compare. Pure functions over events, so they are tested without a database.
import type { EventMode, LearningEvent } from '#lib/progress/events.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day of a timestamp, as YYYY-MM-DD. */
export function dayKey(ts: number): string {
  const date = new Date(ts);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type DayActivity = { key: string; ts: number; answers: number; correct: number };

/** One entry per day for the last `days` days, oldest first, empty days included. */
export function dailyActivity(events: readonly LearningEvent[], days: number, now: number = Date.now()): DayActivity[] {
  const byDay = new Map<string, { answers: number; correct: number }>();
  for (const event of events) {
    const entry = byDay.get(dayKey(event.ts)) ?? { answers: 0, correct: 0 };
    entry.answers += 1;
    if (event.correct) entry.correct += 1;
    byDay.set(dayKey(event.ts), entry);
  }
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const ts = start.getTime() - (days - 1 - index) * DAY_MS;
    const key = dayKey(ts);
    return { key, ts, ...(byDay.get(key) ?? { answers: 0, correct: 0 }) };
  });
}

export type ReturnRates = { activeDays: number; nextDay: number | null; withinWeek: number | null };

/**
 * Of the days with practice, the share that was followed by practice the very next day and the
 * share followed by practice within a week. Days too recent to know yet are left out.
 */
export function returnRates(events: readonly LearningEvent[], now: number = Date.now()): ReturnRates {
  const days = [...new Set(events.map((event) => dayKey(event.ts)))].sort();
  const active = new Set(days);
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const noon = (key: string) => new Date(`${key}T12:00:00`).getTime();
  let nextKnown = 0, nextHit = 0, weekKnown = 0, weekHit = 0;
  for (const key of days) {
    const age = Math.round((today.getTime() - noon(key)) / DAY_MS);
    if (age >= 1) {
      nextKnown += 1;
      if (active.has(dayKey(noon(key) + DAY_MS))) nextHit += 1;
    }
    if (age >= 7) {
      weekKnown += 1;
      if (Array.from({ length: 7 }, (_, offset) => dayKey(noon(key) + (offset + 1) * DAY_MS)).some((later) => active.has(later))) weekHit += 1;
    }
  }
  return { activeDays: days.length, nextDay: nextKnown ? nextHit / nextKnown : null, withinWeek: weekKnown ? weekHit / weekKnown : null };
}

export type ModeAccuracy = { mode: EventMode; answers: number; accuracy: number; medianSeconds: number | null };

/** Right answers per mode, busiest mode first; completions without a right or wrong are left out. */
export function modeAccuracy(events: readonly LearningEvent[]): ModeAccuracy[] {
  const byMode = new Map<EventMode, { answers: number; correct: number; latencies: number[] }>();
  for (const event of events) {
    if (event.correct === null) continue;
    const entry = byMode.get(event.mode) ?? { answers: 0, correct: 0, latencies: [] };
    entry.answers += 1;
    if (event.correct) entry.correct += 1;
    if (event.latencyMs !== undefined && event.latencyMs > 0) entry.latencies.push(event.latencyMs);
    byMode.set(event.mode, entry);
  }
  return [...byMode.entries()]
    .map(([mode, entry]) => {
      const sorted = [...entry.latencies].sort((a, b) => a - b);
      const median = sorted.length ? sorted[Math.floor(sorted.length / 2)]! / 1000 : null;
      return { mode, answers: entry.answers, accuracy: entry.correct / entry.answers, medianSeconds: median };
    })
    .sort((a, b) => b.answers - a.answers);
}
