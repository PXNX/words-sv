import { describe, expect, it } from 'vitest';
import { addFlag, flagsAsText, normalizeFlags, removeFlag, type ContentFlag } from '../src/lib/content/flags';
import { dailyActivity, dayKey, modeAccuracy, returnRates } from '../src/lib/insights/insights';
import type { LearningEvent } from '../src/lib/progress/events';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date(2026, 10, 20, 15, 0, 0).getTime();
const event = (daysAgo: number, correct: boolean | null, mode: LearningEvent['mode'] = 'vocab', latencyMs?: number): LearningEvent => ({
  id: `${daysAgo}-${Math.random()}`, ts: now - daysAgo * DAY, lang: 'de', mode, skill: 'vocabulary' as LearningEvent['skill'], itemId: 'de:X' as LearningEvent['itemId'], correct,
  sessionId: 's' as LearningEvent['sessionId'], ...(latencyMs === undefined ? {} : { latencyMs })
});

describe('insights', () => {
  it('counts answers per day and keeps empty days', () => {
    const days = dailyActivity([event(0, true), event(0, false), event(2, true)], 4, now);
    expect(days.map((day) => day.answers)).toEqual([0, 1, 0, 2]);
    expect(days.at(-1)).toMatchObject({ key: dayKey(now), correct: 1 });
  });

  it('measures how often practice was followed by more practice', () => {
    const events = [event(10, true), event(9, true), event(8, true), event(3, true), event(0, true)];
    const rates = returnRates(events, now);
    expect(rates.activeDays).toBe(5);
    // Days 10, 9, 8 and 3 are old enough to know: 10 → 9 and 9 → 8 came back the next day.
    expect(rates.nextDay).toBeCloseTo(2 / 4);
    // Days 10, 9 and 8 are a week old: all three were followed by practice within seven days.
    expect(rates.withinWeek).toBe(1);
    expect(returnRates([], now)).toEqual({ activeDays: 0, nextDay: null, withinWeek: null });
  });

  it('compares the modes by right answers and typical time', () => {
    const report = modeAccuracy([event(0, true, 'vocab', 2000), event(0, false, 'vocab', 4000), event(0, true, 'vocab', 3000), event(0, true, 'grammar'), event(0, null, 'story')]);
    expect(report.map((row) => row.mode)).toEqual(['vocab', 'grammar']);
    expect(report[0]).toMatchObject({ answers: 3, medianSeconds: 3 });
    expect(report[0]!.accuracy).toBeCloseTo(2 / 3);
    expect(report[1]!.medianSeconds).toBeNull();
  });
});

describe('content flags', () => {
  const flag = (item: string, note = ''): ContentFlag => ({ item, kind: 'word', language: 'de', text: 'das Haus', note, ts: 1 });

  it('keeps one flag per item, newest first', () => {
    const flags = addFlag(addFlag([flag('de:HAUS')], flag('de:BAUM')), flag('de:HAUS', '  wrong article  '));
    expect(flags.map((entry) => entry.item)).toEqual(['de:HAUS', 'de:BAUM']);
    expect(flags[0]!.note).toBe('wrong article');
    expect(removeFlag(flags, 'de:HAUS').map((entry) => entry.item)).toEqual(['de:BAUM']);
  });

  it('drops broken entries and writes a readable report', () => {
    expect(normalizeFlags([flag('de:HAUS'), { item: '' }, null, { item: 'x', kind: 'nope', language: 'de', ts: 1 }])).toHaveLength(1);
    expect(normalizeFlags('nonsense')).toEqual([]);
    expect(flagsAsText([flag('de:HAUS', 'wrong article')])).toBe('[word · de] de:HAUS\ndas Haus\n→ wrong article');
  });
});
