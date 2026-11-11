/*
 * A writing rubric per language level, in the shape the CEFR scales use: four criteria scored 0–3.
 *
 *   - task:      length within the range the level asks for;
 *   - range:     vocabulary variety and longer words, more expected the higher the level;
 *   - accuracy:  sentence ends, capital letters (German nouns too) and spacing;
 *   - coherence: distinct linking words, more and harder ones from B1 on (German and English;
 *                other languages are scored on the first three criteria).
 *
 * The same text can be "at the level" for A2 and "below" for B2. Pure, so it can be tested.
 */
import type { Level } from '#lib/domain/types.js';

export type RubricCriterion = 'task' | 'range' | 'accuracy' | 'coherence';
export type RubricBand = 'below' | 'at' | 'above';

export interface LevelTarget {
  minWords: number;
  maxWords: number;
  /** Share of different words (types / tokens) a text at the level reaches. */
  variety: number;
  /** Share of words with 7+ letters a text at the level reaches. */
  longWords: number;
  /** Distinct linking words expected. */
  connectors: number;
}

export interface RubricScore {
  level: Level;
  criteria: Array<{ key: RubricCriterion; points: number; value: number; expected: number }>;
  /** 0..1 over the criteria that apply. */
  total: number;
  band: RubricBand;
  /** Linking words found, for the feedback. */
  connectorsUsed: string[];
}

export const MAX_POINTS = 3;

export const LEVEL_TARGETS: Record<Level, LevelTarget> = {
  a1: { minWords: 20, maxWords: 60, variety: 0.5, longWords: 0.05, connectors: 1 },
  a2: { minWords: 35, maxWords: 90, variety: 0.55, longWords: 0.08, connectors: 2 },
  b1: { minWords: 70, maxWords: 150, variety: 0.58, longWords: 0.12, connectors: 3 },
  b2: { minWords: 120, maxWords: 220, variety: 0.6, longWords: 0.16, connectors: 4 },
  c1: { minWords: 180, maxWords: 300, variety: 0.62, longWords: 0.2, connectors: 5 },
  c2: { minWords: 220, maxWords: 380, variety: 0.64, longWords: 0.23, connectors: 6 }
};

// Linking words by the level they belong to; a level counts its own and all easier ones.
const CONNECTORS: Partial<Record<string, Partial<Record<Level, readonly string[]>>>> = {
  de: {
    a1: ['und', 'aber', 'oder', 'dann', 'auch'],
    a2: ['weil', 'denn', 'danach', 'zuerst', 'später', 'wenn', 'dass'],
    b1: ['obwohl', 'deshalb', 'deswegen', 'trotzdem', 'außerdem', 'damit', 'als', 'während', 'nachdem', 'bevor'],
    b2: ['jedoch', 'allerdings', 'dennoch', 'daher', 'somit', 'zwar', 'einerseits', 'andererseits', 'sodass', 'falls', 'indem'],
    c1: ['zudem', 'folglich', 'demnach', 'hingegen', 'wohingegen', 'insofern', 'infolgedessen', 'nichtsdestotrotz'],
    c2: ['mithin', 'gleichwohl', 'ungeachtet', 'insbesondere', 'schließlich']
  },
  en: {
    a1: ['and', 'but', 'or', 'then', 'also'],
    a2: ['because', 'so', 'first', 'after', 'later', 'when', 'if'],
    b1: ['although', 'however', 'therefore', 'while', 'before', 'since', 'unless', 'finally'],
    b2: ['moreover', 'furthermore', 'nevertheless', 'whereas', 'despite', 'consequently', 'instead', 'meanwhile'],
    c1: ['nonetheless', 'notwithstanding', 'hence', 'thus', 'accordingly', 'conversely'],
    c2: ['albeit', 'whereby', 'insofar', 'thereby', 'henceforth']
  }
};

const LEVELS: readonly Level[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];

/** The linking words a level may use in `lang`, easiest first; empty when the language has none. */
export function connectorsFor(lang: string, level: Level): string[] {
  const table = CONNECTORS[lang];
  if (!table) return [];
  return LEVELS.slice(0, LEVELS.indexOf(level) + 1).flatMap((entry) => table[entry] ?? []);
}

const wordsOf = (text: string) => text.trim().split(/\s+/u).map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);

/** Points for how close `value` gets to `target` (3 at the target, 0 under a third of it). */
function towards(value: number, target: number): number {
  if (target <= 0) return MAX_POINTS;
  const ratio = value / target;
  return ratio >= 1 ? 3 : ratio >= 2 / 3 ? 2 : ratio >= 1 / 3 ? 1 : 0;
}

function taskPoints(words: number, target: LevelTarget): number {
  if (words < target.minWords / 2) return 0;
  if (words < target.minWords) return 1;
  return words > target.maxWords * 1.5 ? 1 : words > target.maxWords ? 2 : 3;
}

function accuracyIssues(text: string, lang: string): { issues: number; sentences: number } {
  const trimmed = text.trim();
  const sentences = trimmed.match(/[^.!?…]+[.!?…]+["“”»«„'’)]*|[^.!?…]+$/gu)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  let issues = 0;
  for (const sentence of sentences) {
    const first = sentence.replace(/^["“„'’(«»]+/u, '').charAt(0);
    if (first && first.toLocaleLowerCase() === first && first.toLocaleUpperCase() !== first) issues += 1;
  }
  if (trimmed && !/[.!?…]["“”»«„'’)]*$/u.test(trimmed)) issues += 1;
  if (/[^\S\n]{2,}/u.test(trimmed) || /\s[,.!?]/u.test(trimmed)) issues += 1;
  if (lang === 'de') {
    // A lower-case word right after an article that is not an adjective (no -e/-en/-er/-es/-em
    // ending) is most likely a noun written small. der/die/das are left out: they are pronouns too.
    issues += (trimmed.match(/\b(?:den|dem|des|ein|eine|einen|einem|einer)\s+(?!und\b|oder\b|nicht\b)[a-zäöü][a-zäöüß]{3,}(?=[\s.,!?])/gu) ?? [])
      .filter((match) => !/(?:e|en|er|es|em)$/u.test(match.split(/\s+/u)[1] ?? '')).length;
  }
  return { issues, sentences: sentences.length };
}

function bandOf(total: number): RubricBand {
  return total >= 0.85 ? 'above' : total >= 0.6 ? 'at' : 'below';
}

/** Scores `text` against the rubric of `level` in `lang`. */
export function scoreRubric(text: string, lang: string, level: Level): RubricScore {
  const target = LEVEL_TARGETS[level];
  const words = wordsOf(text);
  const lower = words.map((word) => word.toLocaleLowerCase(lang));
  const variety = lower.length ? new Set(lower).size / lower.length : 0;
  const longShare = lower.length ? lower.filter((word) => [...word].length >= 7).length / lower.length : 0;
  const criteria: RubricScore['criteria'] = [];

  criteria.push({ key: 'task', points: taskPoints(words.length, target), value: words.length, expected: target.minWords });
  // Short texts repeat few words by nature, so variety only counts from ten words on.
  const varietyPoints = lower.length < 10 ? Math.min(1, lower.length ? 1 : 0) : towards(variety, target.variety);
  const longPoints = towards(longShare, target.longWords);
  criteria.push({ key: 'range', points: Math.round((varietyPoints + longPoints) / 2), value: Math.round(variety * 100), expected: Math.round(target.variety * 100) });

  const { issues, sentences } = accuracyIssues(text, lang);
  const accuracy = !words.length ? 0 : Math.max(0, MAX_POINTS - Math.ceil((issues / Math.max(1, sentences)) * 3));
  criteria.push({ key: 'accuracy', points: accuracy, value: issues, expected: 0 });

  const available = connectorsFor(lang, level);
  const connectorsUsed = available.filter((connector) => lower.includes(connector));
  if (available.length) criteria.push({ key: 'coherence', points: towards(connectorsUsed.length, target.connectors), value: connectorsUsed.length, expected: target.connectors });

  // A text far too short for the level has not done the task, however clean it is.
  const points = criteria.reduce((sum, criterion) => sum + criterion.points, 0) / (criteria.length * MAX_POINTS);
  const total = criteria[0]!.points === 0 ? Math.min(points, 0.5) : points;
  return { level, criteria, total, band: bandOf(total), connectorsUsed };
}

/**
 * The rubric for a spoken answer (a speech-recognition transcript): task, vocabulary and coherence,
 * without accuracy, since a transcript has no capitals or punctuation of the speaker's own. Speech at
 * a level is about half as long as writing in the same time.
 */
export function scoreSpokenRubric(transcript: string, lang: string, level: Level): RubricScore {
  const target = LEVEL_TARGETS[level];
  const spokenTarget: LevelTarget = { ...target, minWords: Math.round(target.minWords / 2), maxWords: target.maxWords };
  const words = wordsOf(transcript).map((word) => word.toLocaleLowerCase(lang));
  const variety = words.length ? new Set(words).size / words.length : 0;
  const longShare = words.length ? words.filter((word) => [...word].length >= 7).length / words.length : 0;
  const criteria: RubricScore['criteria'] = [{ key: 'task', points: taskPoints(words.length, spokenTarget), value: words.length, expected: spokenTarget.minWords }];
  const varietyPoints = words.length < 10 ? Math.min(1, words.length ? 1 : 0) : towards(variety, target.variety);
  criteria.push({ key: 'range', points: Math.round((varietyPoints + towards(longShare, target.longWords)) / 2), value: Math.round(variety * 100), expected: Math.round(target.variety * 100) });
  const available = connectorsFor(lang, level);
  const connectorsUsed = available.filter((connector) => words.includes(connector));
  if (available.length) criteria.push({ key: 'coherence', points: towards(connectorsUsed.length, target.connectors), value: connectorsUsed.length, expected: target.connectors });
  const points = criteria.reduce((sum, criterion) => sum + criterion.points, 0) / (criteria.length * MAX_POINTS);
  const total = criteria[0]!.points === 0 ? Math.min(points, 0.5) : points;
  return { level, criteria, total, band: bandOf(total), connectorsUsed };
}
