/*
 * When to show a word or grammar item again: one spaced-repetition scheduler for every mode,
 * based on FSRS-5 (Free Spaced Repetition Scheduler, the model behind modern Anki).
 *
 * - Each item has a stability S (days until recall probability drops to 90 %) and a
 *   difficulty D (1–10). Retrievability R = (1 + F·t/S)^-0.5 is the chance of recalling it now.
 * - Answers are graded again / hard / good / easy. A miss comes back within minutes (relearning
 *   in the same sitting beats waiting a day) and lowers stability; right answers grow it more the
 *   lower R was at review time.
 * - Intervals target 90 % retention, get a small stable jitter per item and are capped at a year.
 * - Entries written by the older SM-2 scheduler (`ease`, `intervalDays`) are migrated on their
 *   next review without losing their due date (see migrateState).
 *
 * Pure: storage lives in vocab/spacedRepetition.ts and review/ledger.ts.
 */
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type SchedulerState = {
  repetitions: number;
  dueAt: number;
  // Misses not yet earned back; the strongest "show this first" signal elsewhere in the app.
  lapses: number;
  // FSRS memory; missing on entries that were never reviewed under FSRS.
  stability?: number;
  difficulty?: number;
  lastReviewAt?: number;
  // Every miss ever, for leech detection (lapses above is earned back by right answers).
  totalLapses?: number;
  intervalDays?: number;
  // Legacy SM-2 ease, read only for migration.
  ease?: number;
};

export type ScheduledState = Required<Omit<SchedulerState, 'ease'>>;

export const DAY_MS = 24 * 60 * 60 * 1000;
export const RELEARN_MS = 10 * 60 * 1000;
export const TARGET_RETENTION = 0.9;
const MAX_INTERVAL_DAYS = 365;
const DECAY = -0.5;
const FACTOR = 19 / 81;
// FSRS-5 default parameters.
const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621] as const;
const GRADE_VALUE: Record<Grade, 1 | 2 | 3 | 4> = { again: 1, hard: 2, good: 3, easy: 4 };

const w = (index: number) => W[index]!;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round2 = (value: number) => Math.round(value * 100) / 100;

// A stable number in [-1, 1) per item and step, so the jitter is the same on every device.
function jitter(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ((hash >>> 0) / 4294967296) * 2 - 1;
}

/** Probability of recalling an item `elapsedDays` after its last review. */
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return (1 + (FACTOR * Math.max(0, elapsedDays)) / stability) ** DECAY;
}

/** Days until retrievability falls to `retention` (equals S at 90 %). */
export function intervalFor(stability: number, retention = TARGET_RETENTION): number {
  return (stability / FACTOR) * (retention ** (1 / DECAY) - 1);
}

function initialStability(grade: number) { return w(grade - 1); }
function initialDifficulty(grade: number) { return clamp(w(4) - Math.exp(w(5) * (grade - 1)) + 1, 1, 10); }

function nextDifficulty(difficulty: number, grade: number) {
  const delta = -w(6) * (grade - 3);
  const damped = difficulty + (delta * (10 - difficulty)) / 9;
  // Mean reversion towards the difficulty of a first "easy".
  return clamp(w(7) * initialDifficulty(4) + (1 - w(7)) * damped, 1, 10);
}

function recallStability(difficulty: number, stability: number, r: number, grade: number) {
  const hardPenalty = grade === 2 ? w(15) : 1;
  const easyBonus = grade === 4 ? w(16) : 1;
  return stability * (1 + Math.exp(w(8)) * (11 - difficulty) * stability ** -w(9) * (Math.exp(w(10) * (1 - r)) - 1) * hardPenalty * easyBonus);
}

function forgetStability(difficulty: number, stability: number, r: number) {
  const next = w(11) * difficulty ** -w(12) * ((stability + 1) ** w(13) - 1) * Math.exp(w(14) * (1 - r));
  return Math.min(next, stability);
}

function shortTermStability(stability: number, grade: number) {
  return stability * Math.exp(w(17) * (grade - 3 + w(18)));
}

/**
 * FSRS memory for an entry: its own if present, else derived from SM-2 fields (interval as
 * stability, ease mapped onto difficulty), else null for an item never answered.
 */
export function migrateState(state: SchedulerState, now: number): { stability: number; difficulty: number; lastReviewAt: number } | null {
  if (state.stability && state.stability > 0 && state.difficulty) {
    return { stability: state.stability, difficulty: clamp(state.difficulty, 1, 10), lastReviewAt: state.lastReviewAt ?? now };
  }
  if (state.repetitions <= 0 && !state.intervalDays) return state.lapses > 0 ? { stability: w(0), difficulty: initialDifficulty(1), lastReviewAt: now } : null;
  const interval = Math.max(state.intervalDays ?? state.repetitions, 0.5);
  const ease = clamp(state.ease ?? 2.5, 1.3, 3);
  const difficulty = clamp(10 - ((ease - 1.3) / 1.7) * 9, 1, 10);
  const lastReviewAt = state.dueAt > 0 ? state.dueAt - interval * DAY_MS : now;
  return { stability: interval, difficulty, lastReviewAt: Math.min(lastReviewAt, now) };
}

/** The next state after an answer. `seed` (usually the item key) makes the jitter stable. */
export function schedule(state: SchedulerState, grade: Grade, now: number, seed = ''): ScheduledState {
  const g = GRADE_VALUE[grade];
  const memory = migrateState(state, now);
  let stability: number;
  let difficulty: number;
  if (!memory) {
    stability = initialStability(g);
    difficulty = initialDifficulty(g);
  } else {
    const elapsedDays = Math.max(0, (now - memory.lastReviewAt) / DAY_MS);
    const r = retrievability(elapsedDays, memory.stability);
    difficulty = nextDifficulty(memory.difficulty, g);
    if (elapsedDays < 1) stability = shortTermStability(memory.stability, g);
    else stability = g === 1 ? forgetStability(memory.difficulty, memory.stability, r) : recallStability(memory.difficulty, memory.stability, r, g);
  }
  stability = clamp(stability, 0.1, 36500);
  const totalLapses = (state.totalLapses ?? 0) + (g === 1 ? 1 : 0);
  if (g === 1) {
    return { repetitions: 0, lapses: state.lapses + 1, totalLapses, stability: round2(stability), difficulty: round2(difficulty), lastReviewAt: now, intervalDays: 0, dueAt: now + RELEARN_MS };
  }
  const repetitions = state.repetitions + 1;
  let days = Math.max(1, intervalFor(stability));
  // ±5% jitter from three days on; shorter steps stay exact so early practice feels predictable.
  if (days >= 3) days *= 1 + 0.05 * jitter(`${seed}|${repetitions}`);
  days = Math.min(MAX_INTERVAL_DAYS, Math.round(days * 100) / 100);
  // A right answer earns back a lapse, unless it was a struggle.
  const lapses = g === 2 ? state.lapses : Math.max(0, state.lapses - 1);
  return { repetitions, lapses, totalLapses, stability: round2(stability), difficulty: round2(difficulty), lastReviewAt: now, intervalDays: days, dueAt: now + Math.round(days * DAY_MS) };
}

export type ItemStage = 'new' | 'learning' | 'young' | 'mature' | 'leech';
export const LEECH_LAPSES = 6;
export const KNOWN_RETRIEVABILITY = 0.9;
export const KNOWN_STABILITY_DAYS = 21;

/** new → learning → young → mature; leech once an item has been missed too often. */
export function itemStage(state: SchedulerState, now: number): ItemStage {
  if ((state.totalLapses ?? 0) >= LEECH_LAPSES) return 'leech';
  const memory = migrateState(state, now);
  if (!memory) return 'new';
  if (state.repetitions < 2 || memory.stability < 1) return 'learning';
  return memory.stability >= KNOWN_STABILITY_DAYS ? 'mature' : 'young';
}

/** "Known": still recalled with ≥ 90 % probability and stable for at least three weeks. */
export function isKnown(state: SchedulerState, now: number): boolean {
  const memory = migrateState(state, now);
  if (!memory || state.lapses > 0) return false;
  return memory.stability >= KNOWN_STABILITY_DAYS && retrievability((now - memory.lastReviewAt) / DAY_MS, memory.stability) >= KNOWN_RETRIEVABILITY;
}

/** Current recall probability (0 for never-answered items). */
export function currentRetrievability(state: SchedulerState, now: number): number {
  const memory = migrateState(state, now);
  return memory ? retrievability((now - memory.lastReviewAt) / DAY_MS, memory.stability) : 0;
}

/** A difficult item: FSRS difficulty from 7 on, or a low SM-2 ease on older entries. */
export function isHardItem(state: Pick<SchedulerState, 'difficulty' | 'ease'>): boolean {
  if (state.difficulty !== undefined) return state.difficulty >= 7;
  return state.ease !== undefined && state.ease < 2.1;
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

/** The optional scheduler memory fields of a stored entry, validated (used by both stores). */
export function normalizeMemory(value: Partial<Record<keyof SchedulerState, unknown>>): Pick<SchedulerState, 'stability' | 'difficulty' | 'lastReviewAt' | 'totalLapses' | 'intervalDays' | 'ease'> {
  const number = (raw: unknown) => (raw === undefined || raw === null ? Number.NaN : Number(raw));
  const stability = number(value.stability);
  const difficulty = number(value.difficulty);
  const lastReviewAt = number(value.lastReviewAt);
  const totalLapses = number(value.totalLapses);
  const intervalDays = number(value.intervalDays);
  const ease = number(value.ease);
  return {
    ...(stability > 0 && stability <= 36500 ? { stability } : {}),
    ...(difficulty >= 1 && difficulty <= 10 ? { difficulty } : {}),
    ...(Number.isSafeInteger(lastReviewAt) && lastReviewAt > 0 ? { lastReviewAt } : {}),
    ...(Number.isSafeInteger(totalLapses) && totalLapses >= 0 ? { totalLapses } : {}),
    ...(intervalDays >= 0 && intervalDays <= 3650 ? { intervalDays } : {}),
    ...(ease >= 1 && ease <= 5 ? { ease } : {})
  };
}
