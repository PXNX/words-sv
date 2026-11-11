import { describe, expect, it } from 'vitest';
import { buildAdjectivePrompt } from '../src/lib/grammar/adjectives';
import { buildNounCasePrompt } from '../src/lib/grammar/cases';
import { adjectiveFits, fittingNouns, isDescriptive, nounClass } from '../src/lib/grammar/nounClasses';

const keep = <T>(values: T[]) => values;
const same = (noun: string) => noun;

describe('noun classes', () => {
  it('sorts nouns into people, things and the rest', () => {
    expect(nounClass('Lehrer')).toBe('person');
    expect(nounClass('Fahrrad')).toBe('thing');
    expect(nounClass('Prozent')).toBe('other');
  });

  it('knows which adjectives describe which', () => {
    expect(adjectiveFits('jung', 'person')).toBe(true);
    expect(adjectiveFits('jung', 'thing')).toBe(false);
    expect(adjectiveFits('billig', 'thing')).toBe(true);
    expect(adjectiveFits('billig', 'person')).toBe(false);
    expect(adjectiveFits('abstrakt', 'other')).toBe(true);
    expect(isDescriptive('jung')).toBe(true);
    expect(isDescriptive('abstrakt')).toBe(false);
  });

  it('pairs an adjective with nouns it describes', () => {
    const nouns = ['Prozent', 'Lehrer', 'Fahrrad', 'Formular'];
    expect(fittingNouns('jung', nouns, same)).toEqual(['Lehrer']);
    expect(fittingNouns('billig', nouns, same)).toEqual(['Fahrrad']);
    expect(fittingNouns('abstrakt', nouns, same)).toEqual(['Prozent', 'Formular']);
    expect(fittingNouns('abstrakt', ['Lehrer'], same)).toEqual(['Lehrer']);
  });
});

describe('generated sentences fit their noun', () => {
  const sentences = (build: (random: () => number) => { before: string; after: string }) => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 400; seed += 1) {
      let state = seed * 7919 + 13;
      const random = () => ((state = (state * 1103515245 + 12345) % 2147483648) / 2147483648);
      const prompt = build(random);
      seen.add(`${prompt.before}___ ${prompt.after}`);
    }
    return [...seen];
  };

  it('never helps, thanks or follows an abstract noun', () => {
    for (const sentence of sentences((random) => buildNounCasePrompt('Prozent', 'neuter', random, keep))) {
      expect(sentence).not.toMatch(/helfe|dankt|folgen|gehört|steht dort|verschwunden/u);
    }
  });

  it('does not buy or lose a person', () => {
    for (const sentence of sentences((random) => buildNounCasePrompt('Lehrer', 'masculine', random, keep))) {
      expect(sentence).not.toMatch(/kauft|verloren|brauchen/u);
    }
  });

  it('uses neutral sentences when the adjective does not describe the noun', () => {
    for (const sentence of sentences((random) => buildAdjectivePrompt('jung', 'Fahrrad', 'neuter', random, keep))) {
      expect(sentence).toMatch(/Thema|Das ist|sprechen heute über|denke oft an|beginnen heute mit|fragt nach/u);
    }
  });

  it('keeps weak masculine nouns declined', () => {
    const dative = sentences((random) => buildNounCasePrompt('Kollege', 'masculine', random, keep)).filter((sentence) => /helfe|gehört|dankt/u.test(sentence));
    expect(dative.length).toBeGreaterThan(0);
    for (const sentence of dative) expect(sentence).toContain('Kollegen');
  });
});

describe('case reasons', () => {
  it('names the preposition, the dative verb or the case question', async () => {
    const { caseReason } = await import('../src/lib/grammar/cases');
    expect(caseReason('Wir sprechen mit ', 'dative')).toEqual({ cue: 'mit', case: 'dative' });
    expect(caseReason('Wir stehen vor ', 'dative')).toEqual({ cue: 'Wo? vor', case: 'dative' });
    expect(caseReason('Ich helfe ', 'dative')).toEqual({ cue: 'helfen', case: 'dative' });
    expect(caseReason('Ich schreibe ', 'dative')).toEqual({ cue: 'Wem?', case: 'dative' });
    expect(caseReason('Ich sehe ', 'accusative')).toEqual({ cue: 'Wen oder was?', case: 'accusative' });
    expect(caseReason('Wir sprechen heute über ', 'accusative')).toEqual({ cue: 'über', case: 'accusative' });
    expect(caseReason('', 'nominative')).toEqual({ cue: 'Wer oder was?', case: 'nominative' });
  });

  it('comes with every generated case prompt', () => {
    const prompt = buildNounCasePrompt('Lehrer', 'masculine', () => 0.4, keep);
    expect(prompt.why?.case).toBeDefined();
    expect(buildAdjectivePrompt('nett', 'Lehrer', 'masculine', () => 0.4, keep).why).toBeDefined();
  });
});
