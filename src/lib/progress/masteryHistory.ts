/*
 * One snapshot per week of how much of the current level the learner knows, per language and
 * level, so /progress can forecast when a level will be mastered (skillState.forecastWeeks).
 * Kept in localStorage; at most a year of weeks per language and level.
 */
import { isLevel, type LangCode, type Level } from '#lib/domain/types.js';
import { isLanguage } from '#lib/data/vocabulary.js';

export const MASTERY_HISTORY_KEY = 'wordcircle-mastery-history-v1';
const MAX_WEEKS = 52;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface MasterySnapshot {
  /** Monday 00:00 UTC of the week. */
  week: number;
  lang: LangCode;
  level: Level;
  /** Share of the level's words that are known, 0..1. */
  mastery: number;
}

export function weekStartUtc(now: number): number {
  const date = new Date(now);
  const day = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day);
}

/** Replaces this week's snapshot for the language and level (pure). */
export function recordSnapshot(history: readonly MasterySnapshot[], lang: LangCode, level: Level, mastery: number, now: number): MasterySnapshot[] {
  const week = weekStartUtc(now);
  const others = history.filter((entry) => !(entry.lang === lang && entry.level === level && entry.week === week));
  const mine = [...others.filter((entry) => entry.lang === lang && entry.level === level), { week, lang, level, mastery }].sort((a, b) => a.week - b.week).slice(-MAX_WEEKS);
  return [...others.filter((entry) => entry.lang !== lang || entry.level !== level), ...mine];
}

/** Weekly mastery values, oldest first, with missing weeks carried forward. */
export function weeklySeries(history: readonly MasterySnapshot[], lang: LangCode, level: Level): number[] {
  const mine = history.filter((entry) => entry.lang === lang && entry.level === level).sort((a, b) => a.week - b.week);
  if (!mine.length) return [];
  const series: number[] = [];
  let index = 0;
  for (let week = mine[0]!.week; week <= mine.at(-1)!.week; week += WEEK_MS) {
    while (index < mine.length - 1 && mine[index + 1]!.week <= week) index += 1;
    series.push(mine[index]!.mastery);
  }
  return series;
}

export function parseHistory(raw: string | null): MasterySnapshot[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      const { week, lang, level, mastery } = (entry ?? {}) as Record<string, unknown>;
      return Number.isSafeInteger(week) && isLanguage(lang) && isLevel(level) && typeof mastery === 'number' && mastery >= 0 && mastery <= 1 ? [{ week: week as number, lang, level, mastery }] : [];
    });
  } catch {
    return [];
  }
}

/** Records this week's snapshot in storage and returns the whole history. */
export function storeSnapshot(lang: LangCode, level: Level, mastery: number, now = Date.now()): MasterySnapshot[] {
  let history: MasterySnapshot[] = [];
  try {
    history = recordSnapshot(parseHistory(localStorage.getItem(MASTERY_HISTORY_KEY)), lang, level, mastery, now);
    localStorage.setItem(MASTERY_HISTORY_KEY, JSON.stringify(history));
  } catch {}
  return history;
}
