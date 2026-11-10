import { describe, expect, it } from 'vitest';
import { buildNounCasePrompt, buildNounPropertyPrompt } from '../src/lib/grammar/cases';
import { buildVerbPrompt } from '../src/lib/grammar/verbs';
import { buildAdjectivePrompt } from '../src/lib/grammar/adjectives';
import { isFeatureKey } from '../src/lib/grammar/taxonomy';

const keep = <T>(values: T[]) => values;

describe('grammar prompts name the features they test', () => {
  it('tags nouns with case and gender', () => {
    const prompt = buildNounCasePrompt('Hund', 'masculine', () => 0.99, keep);
    expect(prompt.features).toEqual(['de:noun:case:dativ', 'de:noun:gender:maskulin']);
    expect(buildNounPropertyPrompt('Katze', 'feminine', () => 0, keep).features).toEqual(['de:noun:case:nominativ', 'de:noun:gender:feminin', 'de:noun:number:singular']);
  });

  it('tags verbs with person, number and tense, and adjectives with their declension', () => {
    expect(buildVerbPrompt('SEIN', () => 0.6, keep)!.features).toEqual(['de:verb:person:1', 'de:verb:number:plural', 'de:verb:tense:praesens']);
    const adjective = buildAdjectivePrompt('klein', 'Haus', 'neuter', () => 0.1, keep);
    expect(adjective.features![0]).toBe('de:adjective:declension:schwach');
    for (const key of adjective.features!) expect(isFeatureKey(key)).toBe(true);
  });
});
