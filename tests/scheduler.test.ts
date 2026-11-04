import { describe, expect, it } from 'vitest';
import { DAY_MS, gradeFromAnswer, RELEARN_MS, schedule, type SchedulerState } from '../src/lib/review/scheduler.js';

const NOW = Date.UTC(2026, 10, 4, 9, 0, 0);
const fresh = { repetitions: 0, dueAt: 0, lapses: 0 };

describe('scheduler', () => {
  it('brings a miss back within minutes and lowers its ease', () => {
    const next = schedule(fresh, 'again', NOW, 'HUND');
    expect(next.dueAt).toBe(NOW + RELEARN_MS);
    expect(next.lapses).toBe(1);
    expect(next.ease).toBeLessThan(2.5);
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

  it('keeps the first steps exact and jitters later ones a little, the same way every time', () => {
    expect(schedule(fresh, 'good', NOW, 'HUND').dueAt).toBe(NOW + DAY_MS);
    const third = schedule({ repetitions: 2, dueAt: 0, lapses: 0, ease: 2.5, intervalDays: 3 }, 'good', NOW, 'HUND');
    expect(Math.abs(third.intervalDays - 7.5)).toBeLessThanOrEqual(7.5 * 0.08);
    expect(schedule({ repetitions: 2, dueAt: 0, lapses: 0, ease: 2.5, intervalDays: 3 }, 'good', NOW, 'HUND')).toEqual(third);
  });

  it('never lets ease fall below 1.3 or intervals pass a year', () => {
    let state: SchedulerState = { ...fresh };
    for (let step = 0; step < 20; step += 1) state = schedule(state, 'again', NOW, 'X');
    expect(state.ease).toBeGreaterThanOrEqual(1.3);
    let long = schedule(fresh, 'easy', NOW, 'Y');
    for (let step = 0; step < 30; step += 1) long = schedule(long, 'easy', long.dueAt, 'Y');
    expect(long.intervalDays).toBeLessThanOrEqual(365);
  });

  it('grades multiple-choice answers by speed on a first try only', () => {
    expect(gradeFromAnswer(false, 1000)).toBe('again');
    expect(gradeFromAnswer(true, 1500)).toBe('easy');
    expect(gradeFromAnswer(true, 5000)).toBe('good');
    expect(gradeFromAnswer(true, 15000)).toBe('hard');
    expect(gradeFromAnswer(true, 1500, false)).toBe('good');
  });
});
