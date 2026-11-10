/*
 * The learning event log: one append-only record per answer or attempt, the source of truth for
 * every progress number (mastery, retention, readiness, time on task). Pure model here; storage
 * lives in eventLog.ts. Raw events are kept for 12 months, then folded into daily aggregates.
 */
import { isItemId, isLevel, isSkill, type ItemId, type LangCode, type Level, type SessionId, type Skill } from '#lib/domain/types.js';
import { isLanguage } from '#lib/data/vocabulary.js';
import { isFeatureKey, type FeatureKey } from '#lib/grammar/taxonomy.js';
import type { Grade } from '#lib/review/scheduler.js';

export const EVENT_MODES = [
  'vocab', 'reading', 'listen', 'speak', 'write', 'grammar', 'forms', 'story', 'mock', 'duel', 'dictionary',
  'circle', 'wordle', 'hangman', 'alltag', 'conversation', 'placement', 'checkpoint'
] as const;
export type EventMode = (typeof EVENT_MODES)[number];

export interface LearningEvent {
  id: string;
  /** Epoch ms. */
  ts: number;
  lang: LangCode;
  mode: EventMode;
  skill: Skill;
  itemId: ItemId;
  level?: Level;
  /** null for rubric-scored items and completions. */
  correct: boolean | null;
  /** 0..1 for rubric and pronunciation items. */
  score?: number;
  latencyMs?: number;
  rating?: Grade;
  featureErrors?: FeatureKey[];
  sessionId: SessionId;
  /** Lets the retention report compare items shown with and without pictures or animations. */
  presentation?: { image: boolean; animation: boolean };
}

export type LearningEventInput = Omit<LearningEvent, 'id' | 'ts' | 'sessionId'> & Partial<Pick<LearningEvent, 'id' | 'ts' | 'sessionId'>>;

export const RAW_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

const GRADES: readonly Grade[] = ['again', 'hard', 'good', 'easy'];
const isMode = (value: unknown): value is EventMode => typeof value === 'string' && (EVENT_MODES as readonly string[]).includes(value);

/** Validates a stored event (IndexedDB reads are untrusted); null when it cannot be used. */
export function normalizeLearningEvent(value: unknown): LearningEvent | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const ts = Number(raw.ts);
  if (typeof raw.id !== 'string' || !raw.id || !Number.isSafeInteger(ts) || ts <= 0) return null;
  if (!isLanguage(raw.lang) || !isMode(raw.mode) || !isSkill(raw.skill) || !isItemId(raw.itemId) || typeof raw.sessionId !== 'string') return null;
  const correct = raw.correct === true || raw.correct === false ? raw.correct : null;
  const score = Number(raw.score);
  const latencyMs = Number(raw.latencyMs);
  const featureErrors = Array.isArray(raw.featureErrors) ? raw.featureErrors.filter(isFeatureKey) : [];
  const presentation = raw.presentation && typeof raw.presentation === 'object' ? raw.presentation as Record<string, unknown> : null;
  return {
    id: raw.id,
    ts,
    lang: raw.lang,
    mode: raw.mode,
    skill: raw.skill,
    itemId: raw.itemId,
    correct,
    sessionId: raw.sessionId as SessionId,
    ...(isLevel(raw.level) ? { level: raw.level } : {}),
    ...(raw.score !== undefined && score >= 0 && score <= 1 ? { score } : {}),
    ...(raw.latencyMs !== undefined && Number.isFinite(latencyMs) && latencyMs >= 0 ? { latencyMs } : {}),
    ...(GRADES.includes(raw.rating as Grade) ? { rating: raw.rating as Grade } : {}),
    ...(featureErrors.length ? { featureErrors } : {}),
    ...(presentation ? { presentation: { image: presentation.image === true, animation: presentation.animation === true } } : {})
  };
}

/** Per day, language, skill and level: what compaction keeps once raw events expire. */
export interface DailyAggregate {
  /** `YYYY-MM-DD` in UTC. */
  day: string;
  lang: LangCode;
  skill: Skill;
  level: Level | 'none';
  attempts: number;
  correct: number;
  scored: number;
  scoreSum: number;
}

export function aggregateKey(aggregate: Pick<DailyAggregate, 'day' | 'lang' | 'skill' | 'level'>): string {
  return `${aggregate.day}|${aggregate.lang}|${aggregate.skill}|${aggregate.level}`;
}

/** Adds events to existing aggregates (pure; returns a new map). */
export function aggregateEvents(events: readonly LearningEvent[], existing: ReadonlyMap<string, DailyAggregate> = new Map()): Map<string, DailyAggregate> {
  const result = new Map(existing);
  for (const event of events) {
    const base = { day: new Date(event.ts).toISOString().slice(0, 10), lang: event.lang, skill: event.skill, level: event.level ?? 'none' as const };
    const key = aggregateKey(base);
    const current = result.get(key) ?? { ...base, attempts: 0, correct: 0, scored: 0, scoreSum: 0 };
    result.set(key, {
      ...current,
      attempts: current.attempts + 1,
      correct: current.correct + (event.correct === true ? 1 : 0),
      scored: current.scored + (event.score !== undefined ? 1 : 0),
      scoreSum: current.scoreSum + (event.score ?? 0)
    });
  }
  return result;
}

/** Splits events into those to keep raw and the aggregates that replace expired ones. */
export function compactEvents(events: readonly LearningEvent[], aggregates: ReadonlyMap<string, DailyAggregate>, now: number): { keep: LearningEvent[]; expired: LearningEvent[]; aggregates: Map<string, DailyAggregate> } {
  const cutoff = now - RAW_RETENTION_MS;
  const keep: LearningEvent[] = [];
  const expired: LearningEvent[] = [];
  for (const event of events) (event.ts < cutoff ? expired : keep).push(event);
  return { keep, expired, aggregates: aggregateEvents(expired, aggregates) };
}

/** Which skill an answer in a mode trains (the default when a writer does not say). */
export function skillForMode(mode: EventMode): Skill {
  switch (mode) {
    case 'reading': case 'story': return 'reading';
    case 'listen': return 'listening';
    case 'speak': case 'conversation': return 'speaking';
    case 'write': return 'writing';
    case 'grammar': case 'forms': return 'grammar';
    case 'vocab': case 'circle': case 'wordle': case 'hangman': case 'alltag': case 'dictionary': case 'duel': case 'mock': case 'placement': case 'checkpoint': return 'vocab';
  }
}

/** Accuracy per skill over a window, the raw input for skill state and readiness. */
export function accuracyBySkill(events: readonly LearningEvent[], since = 0): Partial<Record<Skill, { attempts: number; correct: number }>> {
  const result: Partial<Record<Skill, { attempts: number; correct: number }>> = {};
  for (const event of events) {
    if (event.ts < since || event.correct === null) continue;
    const entry = (result[event.skill] ??= { attempts: 0, correct: 0 });
    entry.attempts += 1;
    if (event.correct) entry.correct += 1;
  }
  return result;
}

/** Feature errors counted over a window, most frequent first (the error profile). */
export function featureErrorProfile(events: readonly LearningEvent[], since = 0): Array<{ feature: FeatureKey; count: number }> {
  const counts = new Map<FeatureKey, number>();
  for (const event of events) {
    if (event.ts < since) continue;
    for (const feature of event.featureErrors ?? []) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  }
  return [...counts].map(([feature, count]) => ({ feature, count })).sort((a, b) => b.count - a.count || a.feature.localeCompare(b.feature));
}

