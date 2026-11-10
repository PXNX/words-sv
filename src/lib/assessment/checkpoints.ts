/*
 * Checkpoints: every placement test is stored, and four weeks after the last one the next is due.
 * The last three results show whether "known" really stays known. Pure parts plus a small
 * localStorage store; results never leave the device.
 */
import { isLevel, LEVELS, type LangCode, type Level } from '#lib/domain/types.js';
import { isLanguage } from '#lib/data/vocabulary.js';

export const CHECKPOINT_INTERVAL_MS = 28 * 24 * 60 * 60 * 1000;
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

/** Due when there is no result yet or the last one is four weeks old. */
export function checkpointDue(results: readonly CheckpointResult[], lang: LangCode, now: number): boolean {
  const last = checkpointsFor(results, lang)[0];
  return !last || now - last.at >= CHECKPOINT_INTERVAL_MS;
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
