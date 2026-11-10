import { describe, expect, it } from 'vitest';
import { articleFocus, sampleWeighted, weakest, weakSpotWeights } from '../src/lib/story/weakSpots.js';

const NOW = Date.UTC(2026, 10, 4, 9, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const entry = (lapses: number, dueAt = 0, ease?: number) => ({ repetitions: 0, dueAt, lapses, source: 'grammar' as const, updatedAt: NOW, ...(ease === undefined ? {} : { ease }) });

describe('weak spots', () => {
  it('weighs recent misses above old ones and counts grammar mistakes for the noun', () => {
    const weights = weakSpotWeights({
      missed: [{ word: 'HUND', count: 2, at: NOW }, { word: 'KATZE', count: 2, at: NOW - 21 * DAY }],
      ledger: [{ item: 'NOUN:TISCH', entry: entry(2) }],
      progress: { BAUM: { repetitions: 3, dueAt: NOW - 9 * DAY, lapses: 0, ease: 1.8 } }
    }, NOW);
    expect(weights.get('HUND')!).toBeGreaterThan(weights.get('KATZE')!);
    expect(weights.get('TISCH')).toBe(4);
    expect(weights.get('BAUM')!).toBeGreaterThan(0);
    expect(weights.has('HAUS')).toBe(false);
  });

  it('asks for articles more often the more article questions are missed', () => {
    expect(articleFocus([])).toBe(0.2);
    expect(articleFocus([{ item: 'ARTICLE:HUND', entry: entry(0) }])).toBe(0.15);
    expect(articleFocus([{ item: 'ARTICLE:HUND', entry: entry(1) }, { item: 'NOUN:BAUM', entry: entry(2) }])).toBe(0.6);
  });

  it('draws distinct words, favouring weak ones without always picking the same', () => {
    const words = Array.from({ length: 30 }, (_, index) => `W${index}`);
    const weights = new Map([['W0', 50]]);
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const draws = Array.from({ length: 50 }, () => sampleWeighted(words, weights, 6, random));
    expect(draws.every((draw) => new Set(draw).size === 6)).toBe(true);
    expect(draws.filter((draw) => draw.includes('W0')).length).toBeGreaterThan(45);
    expect(new Set(draws.map((draw) => draw.join())).size).toBeGreaterThan(40);
  });

  it('finds the weakest word of an evening', () => {
    expect(weakest(['A', 'B', 'C'], new Map([['B', 3], ['C', 1]]))).toBe('B');
  });
});
