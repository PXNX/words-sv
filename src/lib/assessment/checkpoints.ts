/*
 * Checkpoints: every placement test is stored, and the next is due after an interval that follows
 * the daily word goal (checkpointIntervalDays).
 * The last three results show whether "known" really stays known. Pure parts plus a small
 * localStorage store; results never leave the device.
 */
import { isLevel, LEVELS, type LangCode, type Level } from '#lib/domain/types.js';
import { isLanguage } from '#lib/data/vocabulary.js';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Words per day × days between checkpoints: about 120 new words of practice per checkpoint. */
const WORDS_PER_CHECKPOINT = 120;
const MIN_INTERVAL_DAYS = 7;
const MAX_INTERVAL_DAYS = 28;

/**
 * Days until the next checkpoint for a daily word goal: a learner aiming for 12 words a day has
 * enough new material for a meaningful test after 10 days, one aiming for 5 after 24.
 */
export function checkpointIntervalDays(dailyGoal: number): number {
  const goal = Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : 8;
  return Math.min(MAX_INTERVAL_DAYS, Math.max(MIN_INTERVAL_DAYS, Math.round(WORDS_PER_CHECKPOINT / goal)));
}
export const CHECKPOINT_INTERVAL_MS = checkpointIntervalDays(8) * DAY_MS;
export const CHECKPOINTS_KEY = 'wordcircle-checkpoints-v1';
const MAX_STORED = 40;

export interface CheckpointResult {
  at: number;
  lang: LangCode;
  level: Level;
  /** Hit rate minus false-alarm rate per tested level. */
  scores: Partial<Record<Level, number>>;
}

export function parseCheckpoints(raw: string | null): CheckpointResult[] {
  try {
    const value: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const { at, lang, level, scores } = entry as Record<string, unknown>;
      if (!Number.isSafeInteger(at) || !isLanguage(lang) || !isLevel(level)) return [];
      const clean: Partial<Record<Level, number>> = {};
      if (scores && typeof scores === 'object') for (const key of LEVELS) {
        const score = Number((scores as Record<string, unknown>)[key]);
        if (Number.isFinite(score) && score >= -1 && score <= 1) clean[key] = score;
      }
      return [{ at: at as number, lang, level, scores: clean }];
    });
  } catch {
    return [];
  }
}

/** The results of one language, newest first. */
export function checkpointsFor(results: readonly CheckpointResult[], lang: LangCode): CheckpointResult[] {
  return results.filter((result) => result.lang === lang).sort((a, b) => b.at - a.at);
}

/** Due when there is no result yet or the interval for the daily goal has passed. */
export function checkpointDue(results: readonly CheckpointResult[], lang: LangCode, now: number, dailyGoal = 8): boolean {
  const last = checkpointsFor(results, lang)[0];
  return !last || now - last.at >= checkpointIntervalDays(dailyGoal) * DAY_MS;
}

/** When the next checkpoint is due (now when there is none yet). */
export function nextCheckpointAt(results: readonly CheckpointResult[], lang: LangCode, dailyGoal = 8): number | null {
  const last = checkpointsFor(results, lang)[0];
  return last ? last.at + checkpointIntervalDays(dailyGoal) * DAY_MS : null;
}

/** The last three results, oldest first, with the change from one to the next in levels. */
export function checkpointTrend(results: readonly CheckpointResult[], lang: LangCode): Array<CheckpointResult & { change: number }> {
  const recent = checkpointsFor(results, lang).slice(0, 3).reverse();
  return recent.map((result, index) => ({ ...result, change: index ? LEVELS.indexOf(result.level) - LEVELS.indexOf(recent[index - 1]!.level) : 0 }));
}

export function readCheckpoints(): CheckpointResult[] {
  try {
    return parseCheckpoints(localStorage.getItem(CHECKPOINTS_KEY));
  } catch {
    return [];
  }
}

export function saveCheckpoint(result: CheckpointResult): CheckpointResult[] {
  const next = [...readCheckpoints(), result].slice(-MAX_STORED);
  try {
    localStorage.setItem(CHECKPOINTS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
