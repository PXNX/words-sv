import { describe, expect, it } from 'vitest';
import { grade } from '../src/lib/sentence/grading.js';
import { FULL_PROMPTS, SHORT_PROMPTS, fullPromptForToday, shortPromptForToday } from '../src/lib/sentence/prompt.js';

describe('sentence grader', () => {
  it('scores a well-formed short answer high', () => {
    const result = grade(
      'Heute Morgen bin ich früh aufgestanden und habe einen Kaffee getrunken. Danach ging ich zur Arbeit.',
      'de',
      'short'
    );
    expect(result.words).toBeGreaterThanOrEqual(10);
    expect(result.sentences).toBe(2);
    expect(result.verdict).toBe('high');
    expect(result.factors.map((factor) => factor.key)).toContain('sentenceCountGood');
  });

  it('flags an answer that is too short', () => {
    const result = grade('Ich bin müde.', 'de', 'short');
    expect(result.factors.map((factor) => factor.key)).toContain('lengthTooShort');
    expect(result.verdict).not.toBe('high');
  });

  it('flags a missing final punctuation mark', () => {
    const result = grade('Gestern war ich im Kino und der Film war wirklich sehr gut', 'de', 'short');
    expect(result.factors.map((factor) => factor.key)).toContain('noSentenceEnd');
  });

  it('does not penalise blank lines between paragraphs', () => {
    const text = [
      'In meinem Viertel leben viele ältere Menschen, die jeden Tag zusammen Kaffee trinken.',
      'An der Ecke steht ein kleines Café, in dem es leckere Kuchen gibt. Das Wohngebiet ist sehr ruhig, aber die Hauptstraße ist manchmal laut.',
      'Ich mag diese Mischung aus Ruhe und Leben und bleibe gern hier.'
    ].join('\n\n');
    const result = grade(text, 'de', 'full');
    expect(result.paragraphs).toBe(3);
    expect(result.factors.map((factor) => factor.key)).toContain('paragraphGood');
    expect(result.factors.map((factor) => factor.key)).not.toContain('spacingOdd');
  });

  it('asks for more structure when a full text is a single short block', () => {
    const result = grade('Ich mag diese Stadt sehr. Sie ist ruhig und schön.', 'de', 'full');
    const keys = result.factors.map((factor) => factor.key);
    expect(keys).toContain('lengthTooShort');
    expect(keys).toContain('sentenceCountLow');
  });

  it('returns a clamped score and a matching verdict band', () => {
    const result = grade('a', 'de', 'short');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(['high', 'ok', 'low']).toContain(result.verdict);
  });
});

describe('writing prompts', () => {
  it('picks a stable prompt for today from each list', () => {
    const short = shortPromptForToday();
    const full = fullPromptForToday();
    expect(SHORT_PROMPTS).toContain(short);
    expect(FULL_PROMPTS).toContain(full);
    expect(shortPromptForToday()).toBe(short);
    expect(fullPromptForToday()).toBe(full);
  });

  it('gives every full-text prompt a reference answer and a word target', () => {
    for (const prompt of FULL_PROMPTS) {
      expect(prompt.reference.trim().length).toBeGreaterThan(20);
      expect(prompt.targetWords).toBeGreaterThan(0);
    }
  });

  it('keeps the prompt ids unique', () => {
    const ids = [...SHORT_PROMPTS, ...FULL_PROMPTS].map((prompt) => prompt.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
