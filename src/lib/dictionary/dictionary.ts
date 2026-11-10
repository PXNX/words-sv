// The offline dictionary: every word of the learning language's level files in one index, searched
// by spelling (an inflected form finds its base word through the reading lookup), by meaning, and
// for German compounds by their parts ("Kinderzimmer" → Kind + Zimmer). Pure apart from the
// vocabulary cache the page fills first with loadLevel().
import type { Language, VocabularyEntry, VocabularyLevel } from '#lib/data/vocabulary.js';

export type DictionaryEntry = {
  /** Upper-case key, as everywhere else in the app. */
  word: string;
  spelling: string;
  level: VocabularyLevel;
  type: string;
  article?: string | undefined;
  definition: string;
};

export type DictionaryIndex = { language: Language; entries: DictionaryEntry[]; byWord: Map<string, DictionaryEntry> };

/** One index over all levels; a word listed at two levels keeps the lower one. */
export function buildIndex(language: Language, levels: ReadonlyArray<readonly [VocabularyLevel, Readonly<Record<string, VocabularyEntry>>]>): DictionaryIndex {
  const byWord = new Map<string, DictionaryEntry>();
  for (const [level, words] of levels) {
    for (const [spelling, entry] of Object.entries(words)) {
      const word = spelling.toLocaleUpperCase();
      if (byWord.has(word)) continue;
      byWord.set(word, { word, spelling, level, type: entry.type ?? '', article: entry.article, definition: entry.definition ?? '' });
    }
  }
  const entries = [...byWord.values()].sort((a, b) => a.spelling.localeCompare(b.spelling, language));
  return { language, entries, byWord };
}

/** Accents and case do not matter when searching ("uber" finds "über"). */
export function fold(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replace(/ß/gu, 'ss').toLocaleLowerCase();
}

export type SearchHit = { entry: DictionaryEntry; match: 'exact' | 'form' | 'prefix' | 'contains' | 'meaning' };

/**
 * Ranked hits for `query`: the word itself, then the base word of an inflected form (`baseOf`,
 * the reading lookup), then words starting with it, containing it, and finally meanings that
 * mention it. At most `limit` hits.
 */
export function search(index: DictionaryIndex, query: string, baseOf: (value: string) => string | null = () => null, limit = 40): SearchHit[] {
  const needle = fold(query.trim().replace(/^(der|die|das|the|a|an|le|la|les|el|los|las|il|lo|gli|o|os|as)\s+/iu, ''));
  if (!needle) return [];
  const hits: SearchHit[] = [];
  const seen = new Set<string>();
  const add = (entry: DictionaryEntry | undefined, match: SearchHit['match']) => {
    if (!entry || seen.has(entry.word) || hits.length >= limit) return;
    seen.add(entry.word);
    hits.push({ entry, match });
  };
  for (const entry of index.entries) if (fold(entry.spelling) === needle) add(entry, 'exact');
  const base = baseOf(query.trim());
  if (base) add(index.byWord.get(base), 'form');
  for (const entry of index.entries) if (fold(entry.spelling).startsWith(needle)) add(entry, 'prefix');
  for (const entry of index.entries) if (fold(entry.spelling).includes(needle)) add(entry, 'contains');
  if (needle.length >= 3) {
    const wordInMeaning = new RegExp(`(^|[^\\p{L}])${needle.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}`, 'u');
    for (const entry of index.entries) if (wordInMeaning.test(fold(entry.definition))) add(entry, 'meaning');
  }
  return hits;
}

// Linking elements between the parts of a German compound ("Arbeit-s-platz", "Sonne-n-schein").
const LINKS = ['', 's', 'es', 'n', 'en', 'er', 'e'];
const MIN_PART = 3;

/**
 * The known words a German compound is made of, longest last part first ("HAUSTÜR" → HAUS + TÜR);
 * null when it is not a compound of known words. `known` holds upper-case keys.
 */
export function splitCompound(word: string, known: ReadonlySet<string>): string[] | null {
  const upper = word.toLocaleUpperCase();
  const memo = new Map<number, string[] | null>();
  // The parts from `start` to the end; a part may be followed by a linking element.
  const from = (start: number): string[] | null => {
    if (start === upper.length) return [];
    if (memo.has(start)) return memo.get(start)!;
    let best: string[] | null = null;
    for (let end = upper.length; end >= start + MIN_PART; end -= 1) {
      const part = upper.slice(start, end);
      if (!known.has(part)) continue;
      for (const link of LINKS) {
        if (link && !upper.startsWith(link.toLocaleUpperCase(), end)) continue;
        const next = end + link.length;
        if (next !== upper.length && upper.length - next < MIN_PART) continue;
        const rest = next === upper.length && link ? null : from(next);
        if (rest === null) continue;
        const candidate = [part, ...rest];
        if (!best || candidate.length < best.length) best = candidate;
      }
      if (best && best.length === 1) break;
    }
    memo.set(start, best);
    return best;
  };
  const parts = from(0);
  // A word that is itself known is not shown as its own split.
  return parts && parts.length >= 2 ? parts : null;
}
