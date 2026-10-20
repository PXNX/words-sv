import { vocabularyLevels, type Language } from '#lib/data/vocabulary.js';

export const GRAMMAR_REVIEW_STORAGE_PREFIX = 'wordcircle-grammar-review-v1';

// Only languages whose nouns carry a grammatical-gender article in the vocabulary data
// (see `article` in `#lib/data/vocabulary.js`) can offer a gap-fill article exercise.
export const grammarArticles: Partial<Record<Language, string[]>> = {
  de: ['der', 'die', 'das'],
  fr: ['le', 'la', 'l’'],
  it: ['il', 'la', 'l’'],
  es: ['el', 'la'],
  pt: ['o', 'a']
};

// The blank always sits at the start of the sentence, directly before the noun.
export const gapSentenceSuffixes: Partial<Record<Language, (word: string) => string>> = {
  de: (word) => `${word} ist hier.`,
  fr: (word) => `${word} est ici.`,
  it: (word) => `${word} è qui.`,
  es: (word) => `${word} está aquí.`,
  pt: (word) => `${word} está aqui.`
};

export function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function articleChoiceOptions(correctArticle: string, universe: string[], random: () => number, size = 3): string[] {
  const distractors = universe.filter((article) => article !== correctArticle);
  return shuffled([correctArticle, ...shuffled(distractors, random).slice(0, size - 1)], random);
}

// Picks a random subset of keys for one practice section. Unlike `pickLearningSection`
// (vocab/learning.ts), this doesn't require the entries to be bare dictionary words — grammar
// queue entries are `kind:WORD` keys, so no letters-only filter is applied here.
export function pickRandomSection(keys: string[], random: () => number, size: number): string[] {
  return shuffled(keys, random).slice(0, Math.min(size, keys.length));
}

export type LanguageGrammarProgress = { itemsPracticed: number; totalRepetitions: number };

// Sums the grammar review progress the grammar page stores per language and level.
export function readGrammarProgressByLanguage(languages: readonly Language[]): Partial<Record<Language, LanguageGrammarProgress>> {
  const result: Partial<Record<Language, LanguageGrammarProgress>> = {};
  if (typeof localStorage === 'undefined') return result;
  for (const language of languages) {
    const repetitionsByKey = new Map<string, number>();
    for (const level of vocabularyLevels) {
      let stored: unknown;
      try { stored = JSON.parse(localStorage.getItem(`${GRAMMAR_REVIEW_STORAGE_PREFIX}:${language}:${level}`) ?? '{}'); } catch { continue; }
      if (!stored || typeof stored !== 'object') continue;
      for (const [key, value] of Object.entries(stored)) {
        const repetitions = (value as { repetitions?: unknown })?.repetitions;
        if (typeof repetitions === 'number' && repetitions > 0) repetitionsByKey.set(key, Math.max(repetitionsByKey.get(key) ?? 0, repetitions));
      }
    }
    if (repetitionsByKey.size === 0) continue;
    result[language] = { itemsPracticed: repetitionsByKey.size, totalRepetitions: [...repetitionsByKey.values()].reduce((sum, count) => sum + count, 0) };
  }
  return result;
}
