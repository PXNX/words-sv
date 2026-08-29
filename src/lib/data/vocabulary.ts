import { catalogDefinitions, catalogMetadata, catalogWords, vocabularyCatalogs } from './catalog';

export type Language = 'de' | 'en' | 'fr' | 'it' | 'es' | 'pt' | 'uk';
export type VocabularyLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
export type VocabularyMetadata = { type: string; gender?: 'masculine' | 'feminine' | 'neuter'; article?: string };

export const vocabularyLevels: VocabularyLevel[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

export const playableLanguages: ReadonlyArray<{ code: Language; label: string }> = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'uk', label: 'Українська' }
];

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && playableLanguages.some((language) => language.code === value);
}

export function isVocabularyLevel(value: unknown): value is VocabularyLevel {
  return typeof value === 'string' && vocabularyLevels.includes(value as VocabularyLevel);
}

export const wordPools: Record<Language, Record<VocabularyLevel, string[]>> = Object.fromEntries(
  Object.entries(vocabularyCatalogs).map(([language, catalog]) => [
    language,
    Object.fromEntries(vocabularyLevels.map((level) => [level, catalogWords(catalog, level)]))
  ])
) as Record<Language, Record<VocabularyLevel, string[]>>;

export const wordDefinitions: Record<Language, Record<string, string>> = Object.fromEntries(
  Object.entries(vocabularyCatalogs).map(([language, catalog]) => [language, catalogDefinitions(catalog)])
) as Record<Language, Record<string, string>>;

export const wordMetadata: Record<Language, Record<string, VocabularyMetadata>> = Object.fromEntries(
  Object.entries(vocabularyCatalogs).map(([language, catalog]) => [language, catalogMetadata(catalog)])
) as Record<Language, Record<string, VocabularyMetadata>>;

export const hintableBaseWords = new Set(Object.values(wordDefinitions).flatMap((definitions) => Object.keys(definitions)));
