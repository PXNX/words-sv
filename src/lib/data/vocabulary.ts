export type Language = 'de' | 'en' | 'fr' | 'it' | 'es' | 'pt' | 'uk';
export type VocabularyLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
export type VocabularyGender = 'masculine' | 'feminine' | 'neuter';
export type VocabularyMetadata = { spelling: string; type: string; gender?: VocabularyGender; article?: string };
type VocabularyEntry = { definition?: string; type?: string; genus?: VocabularyGender; article?: string };

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

// Each `<language>.<level>.json` file (e.g. de.a1.json) is keyed by the word's properly
// cased spelling (e.g. "Haus", "arbeiten") — the key itself is the spelling, there is no
// separate field for it. Values hold { definition, type, genus, article }. Levels are split
// into separate files so a word's full metadata lives in exactly the level file(s) it belongs to.
const levelFiles = import.meta.glob('./??.??.json', { eager: true }) as Record<
  string,
  { default: Record<string, VocabularyEntry> }
>;

function entriesFor(language: Language, level: VocabularyLevel): Record<string, VocabularyEntry> {
  return levelFiles[`./${language}.${level}.json`]?.default ?? {};
}

// Game logic (crossword letter wheels, wordle guesses) matches words case-insensitively and
// normalizes to uppercase, so pools, definitions and metadata are all indexed by the
// uppercased word; the original properly-cased spelling is preserved on the metadata entry.
export const wordPools: Record<Language, Record<VocabularyLevel, string[]>> = Object.fromEntries(
  playableLanguages.map(({ code }) => [
    code,
    Object.fromEntries(vocabularyLevels.map((level) => [level, Object.keys(entriesFor(code, level)).map((word) => word.toLocaleUpperCase())]))
  ])
) as Record<Language, Record<VocabularyLevel, string[]>>;

export const wordDefinitions: Record<Language, Record<string, string>> = Object.fromEntries(
  playableLanguages.map(({ code }) => [
    code,
    Object.fromEntries(
      vocabularyLevels
        .flatMap((level) => Object.entries(entriesFor(code, level)))
        .filter((pair): pair is [string, VocabularyEntry & { definition: string }] => typeof pair[1].definition === 'string')
        .map(([word, entry]) => [word.toLocaleUpperCase(), entry.definition])
    )
  ])
) as Record<Language, Record<string, string>>;

export const wordMetadata: Record<Language, Record<string, VocabularyMetadata>> = Object.fromEntries(
  playableLanguages.map(({ code }) => [
    code,
    Object.fromEntries(
      vocabularyLevels
        .flatMap((level) => Object.entries(entriesFor(code, level)))
        .map(([word, entry]) => [word.toLocaleUpperCase(), { spelling: word, type: entry.type ?? '', gender: entry.genus, article: entry.article }])
    )
  ])
) as Record<Language, Record<string, VocabularyMetadata>>;

export const hintableBaseWords = new Set(Object.values(wordDefinitions).flatMap((definitions) => Object.keys(definitions)));

// German nouns take their article from the entry (or, for older entries, from the gender).
const articlesByGender: Partial<Record<Language, Record<string, string>>> = {
  de: { masculine: 'der', feminine: 'die', neuter: 'das' }
};

/** The article a word is shown with, e.g. "die" for "Abfahrt"; empty when it takes none. */
export function articleFor(language: Language, word: string) {
  const entry = wordMetadata[language]?.[word];
  if (!entry || entry.type !== 'noun') return '';
  if (entry.article) return entry.article;
  return entry.gender ? articlesByGender[language]?.[entry.gender] ?? '' : '';
}

/** The properly cased word as a learner should hear it, with the article for nouns. */
export function spokenWord(language: Language, word: string) {
  const entry = wordMetadata[language]?.[word];
  const article = articleFor(language, word);
  const spelling = entry?.spelling ?? word;
  return article ? `${article} ${spelling}` : spelling;
}
