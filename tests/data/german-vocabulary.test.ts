import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

type Entry = { type?: string; definition?: string; genus?: string; article?: string };
const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const;
const files = Object.fromEntries(levels.map((level) => [level, JSON.parse(readFileSync(new URL(`../../src/lib/data/de.${level}.json`, import.meta.url), 'utf8')) as Record<string, Entry>]));
const ARTICLE: Record<string, string> = { masculine: 'der', feminine: 'die', neuter: 'das' };
const TYPES = new Set(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'numeral', 'article', 'interjection', 'particle']);

describe('German vocabulary files', () => {
  for (const level of levels) {
    it(`${level}: every entry has a known type and a full-sentence definition`, () => {
      const problems = Object.entries(files[level]!).filter(([, entry]) => !TYPES.has(entry.type ?? '') || !entry.definition || entry.definition.trim().length < 8);
      expect(problems.map(([word]) => word)).toEqual([]);
    });

    it(`${level}: nouns are capitalised with a matching gender and article, other words are not`, () => {
      const problems = Object.entries(files[level]!).filter(([word, entry]) => entry.type === 'noun'
        ? word[0] !== word[0]!.toLocaleUpperCase('de') || !entry.genus || ARTICLE[entry.genus] !== entry.article
        : Boolean(entry.genus || entry.article) || word[0] !== word[0]!.toLocaleLowerCase('de'));
      expect(problems.map(([word]) => word)).toEqual([]);
    });
  }

  it('teaches every word at one level only', () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const level of levels) for (const word of Object.keys(files[level]!)) {
      if (seen.has(word)) duplicates.push(`${word} (${seen.get(word)}, ${level})`);
      seen.set(word, level);
    }
    expect(duplicates).toEqual([]);
  });

  it('lists verbs from A2 on as infinitives, not conjugated forms or participles', () => {
    const problems = levels.slice(1).flatMap((level) => Object.entries(files[level]!)
      .filter(([word, entry]) => entry.type === 'verb' && (!/n$/u.test(word) || /Form von/u.test(entry.definition ?? '')))
      .map(([word]) => `${level}:${word}`));
    expect(problems).toEqual([]);
  });
});
