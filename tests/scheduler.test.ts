import { describe, expect, it } from 'vitest';
import {
  currentRetrievability, DAY_MS, gradeFromAnswer, intervalFor, isHardItem, isKnown, itemStage, migrateState,
  normalizeMemory, RELEARN_MS, retrievability, schedule, type SchedulerState
} from '../src/lib/review/scheduler.js';

const NOW = Date.UTC(2026, 10, 4, 9, 0, 0);
const fresh = { repetitions: 0, dueAt: 0, lapses: 0 };

describe('FSRS scheduler', () => {
  it('targets 90 % retention: the interval equals the stability', () => {
    expect(retrievability(0, 5)).toBe(1);
    expect(retrievability(5, 5)).toBeCloseTo(0.9, 5);
    expect(intervalFor(10)).toBeCloseTo(10, 5);
  });

  it('brings a miss back within minutes and counts the lapse', () => {
    const next = schedule(fresh, 'again', NOW, 'HUND');
    expect(next.dueAt).toBe(NOW + RELEARN_MS);
    expect(next.lapses).toBe(1);
    expect(next.totalLapses).toBe(1);
    expect(next.difficulty).toBeGreaterThan(schedule(fresh, 'good', NOW, 'HUND').difficulty);
  });

  it('spaces easy items further than good ones, and good further than hard', () => {
    let good = schedule(fresh, 'good', NOW, 'HUND');
    let easy = schedule(fresh, 'easy', NOW, 'HUND');
    let hard = schedule(fresh, 'hard', NOW, 'HUND');
    for (let step = 0; step < 3; step += 1) {
      good = schedule(good, 'good', good.dueAt, 'HUND');
      easy = schedule(easy, 'easy', easy.dueAt, 'HUND');
      hard = schedule(hard, 'hard', hard.dueAt, 'HUND');
    }
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
    expect(good.intervalDays).toBeGreaterThan(hard.intervalDays);
  });

  it('jitters intervals the same way every time and caps them at a year', () => {
    const state = { repetitions: 2, dueAt: NOW, lapses: 0, stability: 10, difficulty: 5, lastReviewAt: NOW - 10 * DAY_MS };
    expect(schedule(state, 'good', NOW, 'HUND')).toEqual(schedule(state, 'good', NOW, 'HUND'));
    let long = schedule(fresh, 'easy', NOW, 'Y');
    for (let step = 0; step < 30; step += 1) long = schedule(long, 'easy', long.dueAt, 'Y');
    expect(long.intervalDays).toBeLessThanOrEqual(365);
    let missed: SchedulerState = { ...fresh };
    for (let step = 0; step < 20; step += 1) missed = schedule(missed, 'again', NOW + step * DAY_MS, 'X');
    expect((missed as { difficulty: number }).difficulty).toBeLessThanOrEqual(10);
  });

  it('migrates SM-2 entries without moving their due date', () => {
    const legacy = { repetitions: 4, dueAt: NOW + 2 * DAY_MS, lapses: 0, ease: 2.5, intervalDays: 12 };
    const memory = migrateState(legacy, NOW)!;
    expect(memory.stability).toBe(12);
    expect(memory.lastReviewAt).toBe(NOW - 10 * DAY_MS);
    expect(memory.difficulty).toBeGreaterThan(3);
    expect(migrateState(fresh, NOW)).toBeNull();
    // Reviewed on time, it grows from its old interval.
    expect(schedule(legacy, 'good', legacy.dueAt, 'W').intervalDays).toBeGreaterThan(12);
  });

  it('derives stages, known words and current recall', () => {
    expect(itemStage(fresh, NOW)).toBe('new');
    expect(itemStage(schedule(fresh, 'good', NOW), NOW)).toBe('learning');
    const mature = { repetitions: 6, dueAt: NOW + 30 * DAY_MS, lapses: 0, stability: 40, difficulty: 4, lastReviewAt: NOW - DAY_MS };
    expect(itemStage(mature, NOW)).toBe('mature');
    expect(isKnown(mature, NOW)).toBe(true);
    expect(isKnown(mature, NOW + 200 * DAY_MS)).toBe(false);
    expect(itemStage({ ...mature, totalLapses: 6 }, NOW)).toBe('leech');
    expect(currentRetrievability(fresh, NOW)).toBe(0);
    expect(currentRetrievability(mature, NOW)).toBeGreaterThan(0.95);
  });

  it('validates stored memory and spots hard items', () => {
    expect(normalizeMemory({ stability: 4, difficulty: 11, lastReviewAt: 'x', totalLapses: 2 })).toEqual({ stability: 4, totalLapses: 2 });
    expect(isHardItem({ difficulty: 8 })).toBe(true);
    expect(isHardItem({ ease: 1.8 })).toBe(true);
    expect(isHardItem({})).toBe(false);
  });

  it('grades multiple-choice answers by speed on a first try only', () => {
    expect(gradeFromAnswer(false, 1000)).toBe('again');
    expect(gradeFromAnswer(true, 1500)).toBe('easy');
    expect(gradeFromAnswer(true, 5000)).toBe('good');
    expect(gradeFromAnswer(true, 15000)).toBe('hard');
    expect(gradeFromAnswer(true, 1500, false)).toBe('good');
  });
});
