import { describe, expect, it } from 'vitest';
import { buildNounCasePrompt, declineNoun, isDeclinableNoun } from '../src/lib/grammar/cases';
import { adjectiveStem, inflectAdjective, isEligibleAdjective } from '../src/lib/grammar/adjectives';
import { verbConjugations } from '../src/lib/grammar/verbs';

const keep = <T>(values: T[]) => values;

describe('German noun forms', () => {
  it('adds -n/-en to weak masculine nouns outside the nominative', () => {
    expect(declineNoun('Junge', 'masculine', 'nominative')).toBe('Junge');
    expect(declineNoun('Junge', 'masculine', 'accusative')).toBe('Jungen');
    expect(declineNoun('Herr', 'masculine', 'dative')).toBe('Herrn');
    expect(declineNoun('Nachbar', 'masculine', 'accusative')).toBe('Nachbarn');
    expect(declineNoun('Student', 'masculine', 'dative')).toBe('Studenten');
    expect(declineNoun('Familienname', 'masculine', 'accusative')).toBe('Familiennamen');
  });

  it('leaves ordinary nouns alone', () => {
    expect(declineNoun('Hund', 'masculine', 'dative')).toBe('Hund');
    expect(declineNoun('Moment', 'masculine', 'accusative')).toBe('Moment');
    expect(declineNoun('Salat', 'masculine', 'accusative')).toBe('Salat');
    expect(declineNoun('Kunde', 'feminine', 'dative')).toBe('Kunde');
  });

  it('puts the declined noun into the case sentence', () => {
    // 0.4 picks the accusative, the definite article and the first accusative template.
    const prompt = buildNounCasePrompt('Junge', 'masculine', () => 0.4, keep);
    expect(prompt.correct).toBe('den');
    expect(prompt.after).toContain('Jungen');
  });

  it('leaves out nouns that decline like adjectives', () => {
    expect(isDeclinableNoun('Bekannte')).toBe(false);
    expect(isDeclinableNoun('Erwachsene')).toBe(false);
    expect(isDeclinableNoun('Hund')).toBe(true);
  });
});

describe('German adjective endings', () => {
  it('builds the stem endings attach to', () => {
    expect(adjectiveStem('dunkel')).toBe('dunkl');
    expect(adjectiveStem('teuer')).toBe('teur');
    expect(adjectiveStem('sauer')).toBe('saur');
    expect(adjectiveStem('müde')).toBe('müd');
    expect(adjectiveStem('hoch')).toBe('hoh');
    expect(adjectiveStem('parallel')).toBe('parallel');
    expect(adjectiveStem('bitter')).toBe('bitter');
  });

  it('inflects without doubling or dropping letters', () => {
    expect(inflectAdjective('rot', 'en')).toBe('roten');
    expect(inflectAdjective('müde', 'en')).toBe('müden');
    expect(inflectAdjective('leise', 'e')).toBe('leise');
    expect(inflectAdjective('teuer', 'es')).toBe('teures');
    expect(inflectAdjective('sauber', 'er')).toBe('sauberer');
  });

  it('only drills adjectives that can stand before a noun', () => {
    for (const word of ['schade', 'egal', 'allein', 'neuen', 'viel', 'lila']) expect(isEligibleAdjective(word)).toBe(false);
    for (const word of ['rot', 'teuer', 'müde', 'dunkel']) expect(isEligibleAdjective(word)).toBe(true);
  });
});

describe('verb example sentences', () => {
  it('never tie the rest of the sentence to one person', () => {
    // A reflexive or personal pronoun right after the verb only fits one of the six pronouns.
    for (const [verb, entry] of Object.entries(verbConjugations)) {
      expect(entry.after, verb).not.toMatch(/^(mir|mich|dir|dich|sich|uns|euch)\b/u);
    }
  });
});
