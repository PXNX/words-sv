import { describe, expect, it } from 'vitest';
import { articleItem, examResult, examRound, FORM_PER_LEVEL, grammarItem, meaningItem, MEANING_PER_LEVEL, nextExamLevel, scoreExamLevel, supportsExam, type ExamItem, LISTENING_PER_LEVEL } from '../src/lib/assessment/examItems';
import { seededRandom } from '../src/lib/assessment/placement';
import a1 from '../src/lib/data/de.a1.json';
import b1 from '../src/lib/data/de.b1.json';
import type { Level } from '../src/lib/domain/types';

type Entries = Record<string, { definition?: string; type?: string; genus?: 'masculine' | 'feminine' | 'neuter'; article?: string }>;
const de1 = a1 as Entries;
const de3 = b1 as Entries;

describe('exam questions', () => {
  it('asks for a meaning with four distinct definitions of the same word type', () => {
    const item = meaningItem('Abfahrt', de1, 'a1', seededRandom(1))!;
    expect(item.options).toHaveLength(4);
    expect(new Set(item.options).size).toBe(4);
    expect(item.options).toContain(de1.Abfahrt!.definition);
    for (const option of item.options) {
      const word = Object.keys(de1).find((key) => de1[key]!.definition === option)!;
      expect(de1[word]!.type).toBe('noun');
    }
  });

  it('asks for German articles and level-appropriate grammar', () => {
    expect(articleItem('Abfahrt', de1.Abfahrt!, 'a1', seededRandom(2))).toMatchObject({ correct: 'die', options: expect.arrayContaining(['der', 'die', 'das']) });
    expect(articleItem('aber', de1.aber!, 'a1', seededRandom(2))).toBeNull();
    for (const [level, entries] of [['a1', de1], ['a2', de1], ['b1', de3]] as const) {
      const item = grammarItem(level, entries, seededRandom(3))!;
      expect(item.options).toContain(item.correct);
      expect(item.before !== undefined || item.after !== undefined).toBe(true);
    }
  });

  it('builds a level round of meaning, listening and form questions', () => {
    const round = examRound('de', 'a1', de1, seededRandom(4));
    expect(round.filter((item) => item.kind === 'meaning')).toHaveLength(MEANING_PER_LEVEL);
    expect(round.filter((item) => item.kind === 'listening')).toHaveLength(LISTENING_PER_LEVEL);
    expect(round.filter((item) => item.kind === 'article' || item.kind === 'grammar')).toHaveLength(FORM_PER_LEVEL);
    // A listened word is never also asked in writing.
    const listened = round.filter((item) => item.kind === 'listening').map((item) => item.word);
    expect(round.some((item) => item.kind === 'meaning' && listened.includes(item.word))).toBe(false);
    expect(new Set(round.map((item) => item.id)).size).toBe(round.length);
    expect(supportsExam(de1)).toBe(true);
    // A pack without definitions (words only) cannot ask meaning questions yet.
    expect(supportsExam({ Apfel: {}, Birne: {} })).toBe(false);
  });
});

describe('exam scoring', () => {
  const item: ExamItem = { id: 'x', kind: 'meaning', level: 'a1', options: ['a', 'b', 'c', 'd'], correct: 'a' };
  it('cancels random guessing out and does not punish "I don\'t know"', () => {
    const guessing = scoreExamLevel([{ item, chosen: 'a' }, { item, chosen: 'b' }, { item, chosen: 'c' }, { item, chosen: 'd' }]);
    expect(guessing.score).toBeCloseTo(0);
    const honest = scoreExamLevel([{ item, chosen: 'a' }, { item, chosen: 'a' }, { item, chosen: 'a' }, { item, chosen: null }]);
    expect(honest).toMatchObject({ right: 3, skipped: 1, score: 0.75, passed: true });
  });
});

describe('adaptive levels', () => {
  const levels: Level[] = ['a1', 'a2', 'b1', 'b2', 'c1'];
  const run = (start: Level, knows: Level) => {
    const results = new Map<Level, boolean>();
    let next = nextExamLevel(levels, results, start);
    let steps = 0;
    while (next && steps < 10) {
      results.set(next, levels.indexOf(next) <= levels.indexOf(knows));
      next = nextExamLevel(levels, results, start);
      steps += 1;
    }
    return { level: examResult(levels, results), steps };
  };

  it('finds the level from any start in few steps', () => {
    expect(run('b1', 'a2')).toEqual({ level: 'a2', steps: 2 });
    expect(run('a2', 'b2')).toEqual({ level: 'b2', steps: 4 });
    expect(run('a1', 'c1')).toEqual({ level: 'c1', steps: 5 });
    expect(run('b1', 'a1')).toEqual({ level: 'a1', steps: 3 });
  });
});
