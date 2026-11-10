/*
 * Skill and level state (coverage, mastery, retained accuracy, confidence) and the readiness
 * score built on it. Pure functions over scheduler states and learning events; readiness is
 * always a range that narrows as more data supports it, never a single falsely precise number.
 */
import type { Level, Skill } from '#lib/domain/types.js';
import { isKnown, itemStage, type SchedulerState } from '#lib/review/scheduler.js';
import type { LearningEvent } from './events.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const ACCURACY_WINDOW_DAYS = 30;
const ACCURACY_HALF_LIFE_DAYS = 10;
const CONFIDENCE_SCALE = 40;

export interface LevelCoverage {
  /** Share of the level's items that are at least `learning`. */
  coverage: number;
  /** Share of the level's items that are `known`. */
  mastery: number;
  total: number;
  started: number;
  known: number;
}

/** Coverage and mastery of one level from the states of its items (missing = new). */
export function levelCoverage(states: Iterable<SchedulerState | undefined>, total: number, now: number): LevelCoverage {
  let started = 0;
  let known = 0;
  for (const state of states) {
    if (!state || itemStage(state, now) === 'new') continue;
    started += 1;
    if (isKnown(state, now)) known += 1;
  }
  return { coverage: total ? Math.min(1, started / total) : 0, mastery: total ? Math.min(1, known / total) : 0, total, started, known };
}

export interface AccuracyEstimate {
  /** Recency-weighted share of correct answers, or null without data. */
  accuracy: number | null;
  attempts: number;
}

/** Success rate over the last 30 days, weighted towards recent answers (10-day half-life). */
export function retainedAccuracy(events: readonly LearningEvent[], now: number, filter: { skill?: Skill; level?: Level } = {}): AccuracyEstimate {
  const since = now - ACCURACY_WINDOW_DAYS * DAY_MS;
  let weight = 0;
  let correct = 0;
  let attempts = 0;
  for (const event of events) {
    if (event.ts < since || event.ts > now || event.correct === null) continue;
    if (filter.skill && event.skill !== filter.skill) continue;
    if (filter.level && event.level !== filter.level) continue;
    const w = 0.5 ** ((now - event.ts) / DAY_MS / ACCURACY_HALF_LIFE_DAYS);
    weight += w;
    if (event.correct) correct += w;
    attempts += 1;
  }
  return { accuracy: weight > 0 ? correct / weight : null, attempts };
}

/** Average of the last three rubric scores (writing, speaking), or null. */
export function rubricAverage(events: readonly LearningEvent[], skill: Skill): number | null {
  const scores = events.filter((event) => event.skill === skill && event.score !== undefined).sort((a, b) => b.ts - a.ts).slice(0, 3);
  return scores.length ? scores.reduce((sum, event) => sum + event.score!, 0) / scores.length : null;
}

/** 0..1: how much data supports an estimate (≈ 0.63 at 40 answers, ≈ 0.92 at 100). */
export function confidenceFor(attempts: number): number {
  return 1 - Math.exp(-Math.max(0, attempts) / CONFIDENCE_SCALE);
}

export interface ReadinessRange {
  low: number;
  high: number;
  point: number;
  confidence: number;
}

const PRODUCTIVE: ReadonlySet<Skill> = new Set(['writing', 'speaking']);

/**
 * readiness = coverage × retained accuracy for receptive skills and grammar; writing and speaking
 * blend in the rubric average. The range is ±25 points with no data and narrows with confidence.
 */
export function readiness(skill: Skill, input: { coverage: number; accuracy: number | null; attempts: number; rubric?: number | null }): ReadinessRange {
  const confidence = confidenceFor(input.attempts);
  const accuracy = input.accuracy ?? 0.5;
  let point = input.coverage * accuracy;
  if (PRODUCTIVE.has(skill) && input.rubric !== undefined && input.rubric !== null) point = point * 0.5 + input.rubric * 0.5;
  else if (PRODUCTIVE.has(skill) && input.attempts === 0) point = input.coverage * 0.5;
  const spread = 0.05 + 0.2 * (1 - confidence);
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return { low: clamp(point - spread), high: clamp(point + spread), point: clamp(point), confidence };
}

/** Section weights of an exam, summing to 1. */
export type ExamWeights = Partial<Record<Skill, number>>;

export const EXAMS = {
  'goethe-b1': { level: 'b1', weights: { reading: 0.25, listening: 0.25, writing: 0.25, speaking: 0.25 } },
  'telc-b1': { level: 'b1', weights: { reading: 0.25, grammar: 0.1, listening: 0.25, writing: 0.15, speaking: 0.25 } },
  'testdaf': { level: 'c1', weights: { reading: 0.25, listening: 0.25, writing: 0.25, speaking: 0.25 } },
  'cambridge-b2': { level: 'b2', weights: { reading: 0.2, grammar: 0.2, listening: 0.2, writing: 0.2, speaking: 0.2 } },
  'ielts': { level: 'b2', weights: { reading: 0.25, listening: 0.25, writing: 0.25, speaking: 0.25 } }
} as const satisfies Record<string, { level: Level; weights: ExamWeights }>;
export type ExamId = keyof typeof EXAMS;

export function isExamId(value: unknown): value is ExamId {
  return typeof value === 'string' && value in EXAMS;
}

/** Weighted readiness over an exam's sections; missing skills count as zero with low confidence. */
export function examReadiness(perSkill: Partial<Record<Skill, ReadinessRange>>, weights: ExamWeights): ReadinessRange {
  let low = 0;
  let high = 0;
  let point = 0;
  let confidence = 0;
  let total = 0;
  for (const [skill, weight] of Object.entries(weights) as Array<[Skill, number]>) {
    const range = perSkill[skill] ?? { low: 0, high: 0.25, point: 0, confidence: 0 };
    low += range.low * weight;
    high += range.high * weight;
    point += range.point * weight;
    confidence += range.confidence * weight;
    total += weight;
  }
  return total ? { low: low / total, high: high / total, point: point / total, confidence: confidence / total } : { low: 0, high: 0, point: 0, confidence: 0 };
}

/**
 * Weeks until `target` at the current pace, from weekly samples (oldest first) of the metric.
 * Returns null without a positive trend; the range spans the slowest and fastest recent week.
 */
export function forecastWeeks(weekly: readonly number[], target: number): { weeks: number; low: number; high: number } | null {
  if (weekly.length < 2) return null;
  const current = weekly.at(-1)!;
  if (current >= target) return { weeks: 0, low: 0, high: 0 };
  const gains = weekly.slice(1).map((value, index) => value - weekly[index]!);
  const average = gains.reduce((sum, gain) => sum + gain, 0) / gains.length;
  if (average <= 0) return null;
  const positive = gains.filter((gain) => gain > 0);
  const fastest = Math.max(...positive);
  const slowest = Math.min(...positive);
  const remaining = target - current;
  // Tolerate float noise so 0.4 / 0.05 stays 8 weeks, not 9.
  const weeks = (gain: number) => Math.ceil(remaining / gain - 1e-9);
  return { weeks: weeks(average), low: weeks(fastest), high: weeks(Math.min(slowest, average)) };
}

/** "65–75 %" style label parts, rounded to 5 points so the range never looks more exact than it is. */
export function readinessPercent(range: ReadinessRange): { low: number; high: number } {
  const round5 = (value: number) => Math.round((value * 100) / 5) * 5;
  const low = round5(range.low);
  return { low, high: Math.max(low + 5, round5(range.high)) };
}
