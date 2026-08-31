import type { Language } from '$lib/data/vocabulary';

export const GRAMMAR_REVIEW_STORAGE_PREFIX = 'wordcircle-grammar-review-v1';

// Only languages whose nouns carry a grammatical-gender article in the vocabulary data
// (see `article` in `$lib/data/vocabulary`) can offer a gap-fill article exercise.
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

function shuffled<T>(values: T[], random: () => number): T[] {
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
