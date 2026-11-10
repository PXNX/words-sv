import { describe, expect, it } from 'vitest';
import { dateItem, everydayRound, numberItem, priceItem, timeItem } from '../src/lib/vocab/everyday';

function seeded(seed: number) {
  let state = seed;
  return () => ((state = (state * 1_103_515_245 + 12_345) % 2_147_483_648) / 2_147_483_648);
}

describe('everyday drills', () => {
  it('says times, dates, numbers and prices the way people do', () => {
    const r = seeded(3);
    for (let round = 0; round < 30; round += 1) {
      for (const make of [timeItem, dateItem, numberItem, priceItem]) {
        for (const language of ['de', 'en'] as const) {
          const item = make(language, r);
          expect(item.options).toContain(item.correct);
          expect(new Set(item.options).size).toBe(item.options.length);
          expect(item.options.length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('writes the expected forms', () => {
    const fixed = (values: number[]) => { let index = 0; return () => values[index++ % values.length]!; };
    // 14:30 → halb drei.
    expect(timeItem('de', fixed([14 / 24 + 0.001, 0.2 + 0.001, 0.5])).correct).toBe('halb drei');
    expect(priceItem('de', fixed([2 / 49 + 0.001, 1 / 6 + 0.001, 0.5])).correct).toMatch(/^(zwei|drei) Euro fünfzig$/u);
  });

  it('cycles through the four kinds', () => {
    expect(everydayRound('en', 8, seeded(1)).map((item) => item.kind)).toEqual(['time', 'date', 'number', 'price', 'time', 'date', 'number', 'price']);
  });
});
