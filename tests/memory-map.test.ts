import { describe, expect, it } from 'vitest';
import { buildMemoryMap, tileOpacity } from '../src/lib/progress/memoryMap';
import { reviewKey, type ReviewEntry, type ReviewLedger } from '../src/lib/review/ledger';
import { DAY_MS } from '../src/lib/review/scheduler';

const now = Date.UTC(2026, 10, 11);
const entry = (overrides: Partial<ReviewEntry>): ReviewEntry => ({ repetitions: 3, dueAt: now + DAY_MS, lapses: 0, source: 'vocab', updatedAt: now, stability: 5, difficulty: 5, lastReviewAt: now - DAY_MS, ...overrides });
const ledger: ReviewLedger = {
  [reviewKey('de', 'HAUS')]: entry({ stability: 40 }),
  [reviewKey('de', 'BAUM')]: entry({ stability: 5 }),
  [reviewKey('de', 'AUTO')]: entry({ repetitions: 1, stability: 0.5, dueAt: now - 1000 }),
  [reviewKey('de', 'ZUG')]: entry({ totalLapses: 7 }),
  [reviewKey('en', 'TREE')]: entry({ stability: 40 })
};

describe('memory map', () => {
  const map = buildMemoryMap('de', ['Tisch', 'Auto', 'Haus', 'Baum', 'Zug', 'haus', ' '], ledger, now);

  it('has one tile per word of the level', () => {
    expect(map.tiles.map((tile) => tile.word).sort()).toEqual(['AUTO', 'BAUM', 'HAUS', 'TISCH', 'ZUG']);
  });

  it('sorts words into stages and puts the best known first', () => {
    expect(map.tiles.map((tile) => tile.stage)).toEqual(['mature', 'young', 'learning', 'leech', 'new']);
    expect(map.counts).toEqual({ mature: 1, young: 1, learning: 1, leech: 1, new: 1 });
    expect(map.covered).toBeCloseTo(2 / 5);
  });

  it('marks what is due and leaves new words alone', () => {
    expect(map.due).toBe(1);
    expect(map.tiles.find((tile) => tile.word === 'AUTO')?.due).toBe(true);
    const fresh = map.tiles.find((tile) => tile.word === 'TISCH')!;
    expect(fresh).toMatchObject({ stage: 'new', strength: 0, dueAt: null, due: false });
  });

  it('only reads the learner\'s language', () => {
    expect(buildMemoryMap('en', ['tree', 'house'], ledger, now).counts).toMatchObject({ mature: 1, new: 1 });
    expect(buildMemoryMap('de', [], ledger, now)).toMatchObject({ tiles: [], due: 0, covered: 0 });
  });

  it('fades a tile with its strength but never hides it', () => {
    expect(tileOpacity({ stage: 'mature', strength: 1 })).toBe(1);
    expect(tileOpacity({ stage: 'young', strength: 0 })).toBe(0.35);
    expect(tileOpacity({ stage: 'new', strength: 0 })).toBe(1);
    expect(tileOpacity({ stage: 'young', strength: 0.5 })).toBeGreaterThan(0.35);
  });
});
