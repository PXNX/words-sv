import { describe, expect, it } from 'vitest';
import { buildTenseGapPrompt, TENSE_GAPS, tenseGapsFor } from '../src/lib/grammar/tenseGaps';

describe('tense gap sentences', () => {
  it('have unique ids, one right answer and distinct wrong answers', () => {
    expect(new Set(TENSE_GAPS.map((gap) => gap.id)).size).toBe(TENSE_GAPS.length);
    for (const gap of TENSE_GAPS) {
      expect(gap.wrong).not.toContain(gap.correct);
      expect(new Set(gap.wrong).size).toBe(gap.wrong.length);
      expect(gap.features.length).toBeGreaterThan(0);
      expect(`${gap.before}${gap.after}`).not.toContain('___');
    }
  });

  it('grows with the level', () => {
    expect(tenseGapsFor('a1')).toEqual([]);
    expect(tenseGapsFor('a2').length).toBeLessThan(tenseGapsFor('b1').length);
    expect(tenseGapsFor('c2')).toHaveLength(TENSE_GAPS.length);
  });

  it('builds a prompt with the right answer among the choices', () => {
    const prompt = buildTenseGapPrompt('k2-haben', () => 0.5, (values) => values)!;
    expect(prompt.correct).toBe('hätte');
    expect(prompt.choices).toEqual(['hätte', 'hatte', 'habe']);
    expect(buildTenseGapPrompt('missing', Math.random, (values) => values)).toBeNull();
  });
});
