import { describe, expect, it } from 'vitest';
import { FAKE_PER_LEVEL, placementResult, placementRound, pseudoWords, REAL_PER_LEVEL, scoreLevel, seededRandom, testableLevels } from '../src/lib/assessment/placement';
import de from '../src/lib/data/de.a1.json';

const corpus = Object.keys(de);

describe('placement test', () => {
  it('invents German-looking words that are not real words', () => {
    const fakes = pseudoWords(corpus, 20, seededRandom(1));
    expect(fakes).toHaveLength(20);
    const real = new Set(corpus.map((word) => word.toLocaleLowerCase()));
    for (const fake of fakes) {
      expect(real.has(fake)).toBe(false);
      expect(fake).toMatch(/^\p{L}{6,11}$/u);
    }
    expect(pseudoWords(corpus, 5, seededRandom(1))).toEqual(pseudoWords(corpus, 5, seededRandom(1)));
  });

  it('mixes real and invented words per level', () => {
    const round = placementRound(corpus, corpus, seededRandom(7));
    expect(round.filter((item) => item.real)).toHaveLength(REAL_PER_LEVEL);
    expect(round.filter((item) => !item.real)).toHaveLength(FAKE_PER_LEVEL);
  });

  it('punishes saying yes to invented words', () => {
    const honest = scoreLevel([...Array(8).fill({ text: 'x', real: true, known: true }), ...Array(4).fill({ text: 'y', real: false, known: false })]);
    expect(honest).toMatchObject({ score: 1, passed: true });
    const guesser = scoreLevel([...Array(8).fill({ text: 'x', real: true, known: true }), ...Array(4).fill({ text: 'y', real: false, known: true })]);
    expect(guesser).toMatchObject({ score: 0, passed: false });
  });

  it('places at the highest passed level and stops at the first miss', () => {
    const pass = scoreLevel([{ text: 'a', real: true, known: true }]);
    const fail = scoreLevel([{ text: 'a', real: true, known: false }]);
    const all = testableLevels({ a1: 700, a2: 400, b1: 1000, b2: 200, c1: 60, c2: 3 });
    expect(all).toEqual(['a1', 'a2', 'b1', 'b2', 'c1']);
    expect(placementResult([{ level: 'a1', score: pass }, { level: 'a2', score: pass }], all)).toEqual({ level: 'a2', done: false });
    expect(placementResult([{ level: 'a1', score: pass }, { level: 'a2', score: fail }], all)).toEqual({ level: 'a1', done: true });
    expect(placementResult([{ level: 'a1', score: fail }], all)).toEqual({ level: 'a1', done: true });
    expect(testableLevels({ a1: 16 })).toEqual([]);
  });
});
