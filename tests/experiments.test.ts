import { describe, expect, it } from 'vitest';
import { EXPERIMENTS, assignVariant, bucket, parseOverrides, presentationReport } from '../src/lib/experiments/experiments';
import type { LearningEvent } from '../src/lib/progress/events';

const DAY = 24 * 60 * 60 * 1000;
const event = (itemId: string, ts: number, correct: boolean, animation?: boolean): LearningEvent => ({
  id: `${itemId}-${ts}`, ts, lang: 'de', mode: 'grammar', skill: 'grammar', itemId: itemId as LearningEvent['itemId'], correct, sessionId: 's' as LearningEvent['sessionId'],
  ...(animation === undefined ? {} : { presentation: { image: false, animation } })
});

describe('experiment assignment', () => {
  it('gives a device the same variant every time', () => {
    const experiment = EXPERIMENTS['teaching-animations'];
    expect(assignVariant(experiment, 'device-a')).toBe(assignVariant(experiment, 'device-a'));
    expect(bucket('device-a', 'x')).toBeGreaterThanOrEqual(0);
    expect(bucket('device-a', 'x')).toBeLessThan(1);
  });

  it('splits devices roughly by weight', () => {
    const experiment = EXPERIMENTS['teaching-animations'];
    const on = Array.from({ length: 2000 }, (_, index) => assignVariant(experiment, `device-${index}`)).filter((id) => id === 'on').length;
    expect(on).toBeGreaterThan(850);
    expect(on).toBeLessThan(1150);
    expect(assignVariant({ key: 'k', question: '', variants: [{ id: 'a', weight: 0 }, { id: 'b', weight: 1 }] }, 'device')).toBe('b');
    expect(assignVariant({ key: 'k', question: '', variants: [{ id: 'a', weight: 0 }] }, 'device')).toBe('a');
  });

  it('reads overrides from the address and ignores unknown ones', () => {
    expect(parseOverrides('?exp=teaching-animations:off')).toEqual({ 'teaching-animations': 'off' });
    expect(parseOverrides('?exp=teaching-animations:purple,other:on')).toEqual({});
    expect(parseOverrides('')).toEqual({});
  });
});

describe('presentation report', () => {
  it('credits a later answer to how the card before it was shown', () => {
    const events = [
      event('a', 0, false, true), event('a', DAY, true, true), event('a', 2 * DAY, true),
      event('b', 0, false, false), event('b', DAY, false, false),
      event('c', 0, true, true), event('c', 1000, true, true)
    ];
    const report = presentationReport(events, 'animation');
    expect(report.with).toEqual({ answers: 2, correct: 2, accuracy: 1 });
    expect(report.without).toEqual({ answers: 1, correct: 0, accuracy: 0 });
    expect(report.lift).toBe(1);
  });

  it('has no lift until both arms have answers', () => {
    expect(presentationReport([event('a', 0, true, true), event('a', DAY, true, true)], 'animation').lift).toBeNull();
    expect(presentationReport([], 'image')).toEqual({ with: { answers: 0, correct: 0, accuracy: null }, without: { answers: 0, correct: 0, accuracy: null }, lift: null });
  });
});
