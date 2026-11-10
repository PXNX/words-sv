import { describe, expect, it } from 'vitest';
import { confidenceFor, examReadiness, EXAMS, forecastWeeks, levelCoverage, readiness, readinessPercent, retainedAccuracy, rubricAverage } from '../src/lib/progress/skillState';
import type { LearningEvent } from '../src/lib/progress/events';
import { itemId, type SessionId } from '../src/lib/domain/types';

const NOW = Date.UTC(2026, 10, 10, 9);
const DAY = 86_400_000;
const event = (overrides: Partial<LearningEvent>): LearningEvent => ({ id: 'x', ts: NOW, lang: 'de', mode: 'vocab', skill: 'vocab', itemId: itemId('de', 'a'), correct: true, sessionId: 's' as SessionId, ...overrides });

describe('skill state', () => {
  it('measures coverage and mastery from scheduler states', () => {
    const known = { repetitions: 6, dueAt: NOW + 30 * DAY, lapses: 0, stability: 40, difficulty: 4, lastReviewAt: NOW - DAY };
    const learning = { repetitions: 1, dueAt: NOW + DAY, lapses: 0, stability: 3, difficulty: 5, lastReviewAt: NOW };
    expect(levelCoverage([known, learning, undefined, { repetitions: 0, dueAt: 0, lapses: 0 }], 10, NOW)).toEqual({ coverage: 0.2, mastery: 0.1, total: 10, started: 2, known: 1 });
  });

  it('weights recent answers more and ignores old or unscored ones', () => {
    const events = [event({ correct: true }), event({ correct: false, ts: NOW - 20 * DAY }), event({ correct: false, ts: NOW - 40 * DAY }), event({ correct: null })];
    const estimate = retainedAccuracy(events, NOW);
    expect(estimate.attempts).toBe(2);
    expect(estimate.accuracy!).toBeGreaterThan(0.75);
    expect(retainedAccuracy([], NOW).accuracy).toBeNull();
    expect(rubricAverage([event({ skill: 'writing', score: 0.6 }), event({ skill: 'writing', score: 0.8, ts: NOW - 1 })], 'writing')).toBeCloseTo(0.7);
  });

  it('gives ranges that narrow with data', () => {
    expect(confidenceFor(0)).toBe(0);
    const unsure = readiness('reading', { coverage: 0.8, accuracy: 0.9, attempts: 5 });
    const sure = readiness('reading', { coverage: 0.8, accuracy: 0.9, attempts: 200 });
    expect(unsure.point).toBeCloseTo(0.72);
    expect(unsure.high - unsure.low).toBeGreaterThan(sure.high - sure.low);
    expect(readinessPercent(sure)).toEqual({ low: 65, high: 75 });
    expect(readiness('writing', { coverage: 1, accuracy: 0.8, attempts: 50, rubric: 0.4 }).point).toBeCloseTo(0.6);
  });

  it('weights exam sections and forecasts with a range', () => {
    const full = { low: 0.6, high: 0.8, point: 0.7, confidence: 0.9 };
    const exam = examReadiness({ reading: full, listening: full, writing: full, speaking: full }, EXAMS['goethe-b1'].weights);
    expect(exam.point).toBeCloseTo(0.7);
    expect(examReadiness({ reading: full }, EXAMS['goethe-b1'].weights).point).toBeCloseTo(0.175);
    expect(forecastWeeks([0.1, 0.2, 0.25, 0.35], 0.75)).toEqual({ weeks: 5, low: 4, high: 8 });
    expect(forecastWeeks([0.3, 0.3], 0.75)).toBeNull();
    expect(forecastWeeks([0.8], 0.75)).toBeNull();
  });
});
