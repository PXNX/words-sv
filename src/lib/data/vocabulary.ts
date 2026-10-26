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

// Each `<language>.<level>.json` file is keyed by the word's properly cased spelling
// (e.g. "Haus", "arbeiten") — the key itself is the spelling, there is no separate field
// for it. Values hold { definition, type, genus, article }. Levels are split into separate
// files so a word's full metadata lives in exactly the level file(s) it belongs to.
//
// The files are fetched from the CDN at runtime (see `loadLevel`) instead of being bundled
// into the JavaScript. That keeps the initial bundle small and lets the browser cache the
// vocabulary across visits; only the language the learner actually uses is ever fetched.
const levelFiles = import.meta.glob('./??.??.json') as Record<string, () => Promise<{ default: Record<string, VocabularyEntry> }>>;

const cache = new Map<string, Record<string, VocabularyEntry>>();
let warmPromise: Promise<void> | null = null;

export async function loadLevel(language: Language, level: VocabularyLevel): Promise<Record<string, VocabularyEntry>> {
  const key = `${language}.${level}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const loader = levelFiles[`./${language}.${level}.json`];
  const data: Record<string, VocabularyEntry> = loader ? (await loader()).default ?? {} : {};
  cache.set(key, data);
  return data;
}

/** Warms the cache for one language so its pools, definitions and metadata are available
 * synchronously. Called at app startup for the learner's current language. */
export async function warmLanguage(language: Language): Promise<void> {
  if (warmPromise) return warmPromise;
  warmPromise = (async () => {
    await Promise.all(vocabularyLevels.map((level) => loadLevel(language, level)));
  })();
  await warmPromise;
}

function entriesFor(language: Language, level: VocabularyLevel): Record<string, VocabularyEntry> {
  return cache.get(`${language}.${level}`) ?? {};
}

// Game logic (crossword letter wheels, wordle guesses) matches words case-insensitively and
// normalizes to uppercase, so pools, definitions and metadata are all indexed by the
// uppercased word; the original properly-cased spelling is preserved on the metadata entry.
export const wordPools: Record<Language, Record<VocabularyLevel, string[]>> = new Proxy(
  {} as Record<Language, Record<VocabularyLevel, string[]>>,
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      const language = prop as Language;
      return new Proxy({} as Record<VocabularyLevel, string[]>, {
        get(_t, p) {
          if (typeof p !== 'string') return undefined;
          const level = p as VocabularyLevel;
          return Object.keys(entriesFor(language, level)).map((word) => word.toLocaleUpperCase());
        }
      });
    }
  }
);

export const wordDefinitions: Record<Language, Record<string, string>> = new Proxy(
  {} as Record<Language, Record<string, string>>,
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      const language = prop as Language;
      const result: Record<string, string> = {};
      for (const level of vocabularyLevels) {
        for (const [word, entry] of Object.entries(entriesFor(language, level))) {
          if (typeof entry.definition === 'string') result[word.toLocaleUpperCase()] = entry.definition;
        }
      }
      return result;
    }
  }
);

export const wordMetadata: Record<Language, Record<string, VocabularyMetadata>> = new Proxy(
  {} as Record<Language, Record<string, VocabularyMetadata>>,
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      const language = prop as Language;
      const result: Record<string, VocabularyMetadata> = {};
      for (const level of vocabularyLevels) {
        for (const [word, entry] of Object.entries(entriesFor(language, level))) {
          result[word.toLocaleUpperCase()] = { spelling: word, type: entry.type ?? '', gender: entry.genus, article: entry.article };
        }
      }
      return result;
    }
  }
);

// All words that have a definition anywhere — used to decide which words are hintable.
// Built lazily from the cache, so it only contains warmed languages.
export const hintableBaseWords = new Set<string>();

export function refreshHintableBaseWords(): void {
  hintableBaseWords.clear();
  for (const { code } of playableLanguages) {
    for (const level of vocabularyLevels) {
      for (const [word, entry] of Object.entries(entriesFor(code, level))) {
        if (typeof entry.definition === 'string') hintableBaseWords.add(word.toLocaleUpperCase());
      }
    }
  }
}

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