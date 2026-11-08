import { describe, expect, it } from 'vitest';
import { definitionAnswerResult, definitionChoiceWords, insertLearningRepeat, pickLearningSection } from '../src/lib/vocab/learning';

const words = ['Apfel', 'Birne', 'Käse', 'Garten', 'Tee', 'Haus', 'Wasser'];

describe('pickLearningSection', () => {
  it('selects exactly six unique words (or fewer when input is scarce)', () => {
    const section = pickLearningSection(words, () => 0.5);
    expect(section.length).toBe(6);
    expect(new Set(section).size).toBe(6);
  });

  it('returns only what is available when there are fewer than six words', () => {
    const few = ['Apfel', 'Birne', 'Käse'];
    const section = pickLearningSection(few, () => 0.5);
    expect(section.length).toBe(3);
    const normalizedFew = few.map((word) => word.toUpperCase());
    expect([...new Set(section)].every((word) => normalizedFew.includes(word))).toBe(true);
  });
});

describe('definitionChoiceWords', () => {
  const definitions: Record<string, string> = {
    ACTOR: 'Performs in a play.',
    PEN: 'Writes with ink.',
    TEA: 'Hot leaf drink.',
    ADDRESS: 'Location details.'
  };
  const candidates = ['ACTOR', 'PEN', 'TEA', 'ADDRESS'];

  it('includes the correct target and two distinct curated distractors', () => {
    const choices = definitionChoiceWords('actor', candidates, definitions, () => 0.5);
    expect(choices.length).toBe(3);
    expect(choices.includes('ACTOR')).toBe(true);
    expect(new Set(choices).size).toBe(3);
    expect(choices.every((word) => definitions[word])).toBe(true);
  });

  it('returns an empty list when there is only one or no definition match', () => {
    expect(definitionChoiceWords('ghost', [], {}, () => 0.5)).toEqual([]);
    const defs = { 'ACTOR': 'In a play', 'PEN': 'Writes' };
    expect(definitionChoiceWords('actor', ['ACTOR', 'PEN'], defs, () => 0.5)).toEqual([]);
  });
});

describe('insertLearningRepeat', () => {
  it('inserts a word three steps later without replacing the current card', () => {
    const queue = ['ACTOR', 'PEN', 'TEA', 'ADDRESS'];
    expect(insertLearningRepeat(queue, 0, 'ACTOR')).toEqual(['ACTOR', 'PEN', 'TEA', 'ACTOR', 'ADDRESS']);
  });
});

describe('definitionAnswerResult', () => {
  const queue = ['ACTOR', 'PEN', 'TEA', 'ADDRESS'];
  it('returns the word as correct without requeueing', () => {
    expect(definitionAnswerResult('ACTOR', 'ACTOR', queue, 0)).toEqual({ isCorrect: true, queue: [...queue], requeued: false });
    expect(definitionAnswerResult('ACTOR', 'ACTOR', queue, 0, true)).toEqual({ isCorrect: true, queue: [...queue], requeued: true });
  });

  it('detects a wrong answer and requeues only the first missed target', () => {
    expect(definitionAnswerResult('PEN', 'ACTOR', queue, 0)).toEqual({ isCorrect: false, queue: ['ACTOR', 'PEN', 'TEA', 'ACTOR', 'ADDRESS'], requeued: true });
    expect(definitionAnswerResult('TEA', 'ACTOR', queue, 0, true)).toEqual({ isCorrect: false, queue: [...queue], requeued: true });
  });
});