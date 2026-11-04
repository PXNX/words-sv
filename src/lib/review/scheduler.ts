/*
 * When to show a word or grammar item again: one spaced-repetition scheduler for every mode, in
 * the SM-2 family (the algorithm behind most flashcard apps), tuned for short multiple-choice
 * practice:
 *
 * - Each item has an ease (how easily it is remembered, 1.3–3.0, starting at 2.5). Intervals grow
 *   by that factor, so easy items fade into the background quickly and hard ones stay close.
 * - Answers are graded again / hard / good / easy. A miss comes back within minutes (relearning in
 *   the same sitting beats waiting a day) and costs ease; a slow right answer is "hard", a quick
 *   one "easy" (see gradeFromAnswer), and the learner can still correct the grade by hand.
 * - Intervals get a small, stable jitter per item, so words learned together do not all come due
 *   on the same day forever.
 *
 * Pure: storage lives in vocab/spacedRepetition.ts and review/ledger.ts.
 */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type SchedulerState = {
  repetitions: number;
  dueAt: number;
  // Misses not yet earned back; the strongest "show this first" signal elsewhere in the app.
  lapses: number;
  ease?: number;
  intervalDays?: number;
};

export const DAY_MS = 24 * 60 * 60 * 1000;
export const RELEARN_MS = 10 * 60 * 1000;
const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const MAX_INTERVAL_DAYS = 365;

// A stable number in [-1, 1) per item and step, so the jitter is the same on every device.
function jitter(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ((hash >>> 0) / 4294967296) * 2 - 1;
}

/** The next state after an answer. `seed` (usually the item key) makes the jitter stable. */
export function schedule(state: SchedulerState, grade: Grade, now: number, seed = ''): Required<SchedulerState> {
  const ease = state.ease ?? DEFAULT_EASE;
  const previous = state.intervalDays ?? 0;
  if (grade === 'again') {
    return { repetitions: 0, lapses: state.lapses + 1, ease: Math.max(MIN_EASE, ease - 0.2), intervalDays: 0, dueAt: now + RELEARN_MS };
  }
  const repetitions = state.repetitions + 1;
  let nextEase = ease;
  let days: number;
  if (grade === 'hard') {
    nextEase = Math.max(MIN_EASE, ease - 0.15);
    days = Math.max(1, previous * 1.2);
  } else if (grade === 'good') {
    days = repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.max(previous + 1, previous * ease);
  } else {
    nextEase = Math.min(MAX_EASE, ease + 0.15);
    days = repetitions === 1 ? 3 : repetitions === 2 ? 6 : Math.max(previous + 1, previous * ease * 1.3);
  }
  // ±8% jitter from three days on; shorter steps stay exact so early practice feels predictable.
  if (days >= 3) days *= 1 + 0.08 * jitter(`${seed}|${repetitions}`);
  days = Math.min(MAX_INTERVAL_DAYS, days);
  // A right answer earns back a lapse, unless it was a struggle.
  const lapses = grade === 'hard' ? state.lapses : Math.max(0, state.lapses - 1);
  return { repetitions, lapses, ease: Math.round(nextEase * 100) / 100, intervalDays: Math.round(days * 100) / 100, dueAt: now + Math.round(days * DAY_MS) };
}

/**
 * Grades a multiple-choice answer by how it went: wrong is "again"; right on a repeat card is
 * "good" at most; on a first try, a quick answer is "easy" and a long hesitation "hard".
 */
export function gradeFromAnswer(correct: boolean, answerMs: number | null, firstAttempt = true): Grade {
  if (!correct) return 'again';
  if (!firstAttempt || answerMs === null) return 'good';
  if (answerMs < 3000) return 'easy';
  if (answerMs > 9000) return 'hard';
  return 'good';
}
