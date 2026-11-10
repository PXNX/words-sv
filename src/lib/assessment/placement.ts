/*
 * Placement test, yes/no vocabulary format (in the style of LexTALE): per CEFR level the learner
 * sees real words of that level mixed with invented ones and says whether they know each. Saying
 * "known" to an invented word counts against them, so guessing does not pay. Levels are tested
 * from A1 upwards until one is not passed; the result is the highest level passed.
 *
 * Language-independent and needs no definitions, so it works for every language with enough
 * words. Pure: randomness comes from a seeded generator so tests are repeatable.
 */
import type { Level } from '#lib/domain/types.js';

export const PLACEMENT_LEVELS: readonly Level[] = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
export const REAL_PER_LEVEL = 8;
export const FAKE_PER_LEVEL = 4;
/** Hit rate minus false-alarm rate needed to pass a level. */
export const PASS_SCORE = 0.6;
/** Levels with fewer words than this are not tested (too small to sample from). */
export const MIN_LEVEL_WORDS = 40;

export interface PlacementItem {
  text: string;
  real: boolean;
}
export interface PlacementAnswer extends PlacementItem {
  known: boolean;
}

/** Mulberry32: small, fast and good enough for shuffling test items. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other]!, copy[index]!];
  }
  return copy;
}

/**
 * Invented words that look like the language: a letter chain trained on its real words (each next
 * letter depends on the two before). Anything that happens to be a real word is thrown away.
 */
export function pseudoWords(corpus: readonly string[], count: number, random: () => number, exclude: ReadonlySet<string> = new Set()): string[] {
  const words = corpus.map((word) => word.toLocaleLowerCase()).filter((word) => /^\p{L}{4,}$/u.test(word));
  if (words.length < 20) return [];
  const next = new Map<string, string[]>();
  for (const word of words) {
    const padded = `^^${word}$`;
    for (let index = 2; index < padded.length; index += 1) {
      const key = padded.slice(index - 2, index);
      const list = next.get(key) ?? [];
      list.push(padded[index]!);
      next.set(key, list);
    }
  }
  const known = new Set([...words, ...[...exclude].map((word) => word.toLocaleLowerCase())]);
  // Inflected forms of real words are real too ("künsten", "katzen", "walked"), so strip the
  // common endings and umlauts before checking.
  const plain = (word: string) => word.replace(/ä/gu, 'a').replace(/ö/gu, 'o').replace(/ü/gu, 'u');
  const knownPlain = new Set([...known].map(plain));
  const looksReal = (word: string) => [word, ...['e', 'en', 'n', 'er', 'es', 's', 'ing', 'ed', 'ly', 'ic', 'ung'].filter((ending) => word.endsWith(ending)).map((ending) => word.slice(0, -ending.length))]
    .some((stem) => known.has(stem) || knownPlain.has(plain(stem)) || knownPlain.has(`${plain(stem)}e`));
  const result = new Set<string>();
  for (let attempt = 0; attempt < count * 60 && result.size < count; attempt += 1) {
    let word = '';
    let key = '^^';
    while (word.length < 12) {
      const options = next.get(key);
      if (!options) break;
      const letter = options[Math.floor(random() * options.length)]!;
      if (letter === '$') break;
      word += letter;
      key = key[1] + letter;
    }
    // Short inventions collide with real words too often, so they start at six letters.
    if (word.length >= 6 && word.length <= 11 && !looksReal(word)) result.add(word);
  }
  return [...result];
}

/** One level's items: real words of the level and invented ones, shuffled. */
export function placementRound(levelWords: readonly string[], corpus: readonly string[], random: () => number, exclude: ReadonlySet<string> = new Set()): PlacementItem[] {
  const real = shuffle(levelWords.filter((word) => /^\p{L}[\p{L}\-']*$/u.test(word)), random).slice(0, REAL_PER_LEVEL).map((text) => ({ text, real: true }));
  const fakes = pseudoWords(corpus, FAKE_PER_LEVEL, random, exclude).map((text) => ({ text, real: false }));
  return shuffle([...real, ...fakes], random);
}

export interface LevelScore {
  hits: number;
  real: number;
  falseAlarms: number;
  fake: number;
  /** Hit rate minus false-alarm rate, -1..1. */
  score: number;
  passed: boolean;
}

export function scoreLevel(answers: readonly PlacementAnswer[]): LevelScore {
  const real = answers.filter((answer) => answer.real);
  const fake = answers.filter((answer) => !answer.real);
  const hits = real.filter((answer) => answer.known).length;
  const falseAlarms = fake.filter((answer) => answer.known).length;
  const score = (real.length ? hits / real.length : 0) - (fake.length ? falseAlarms / fake.length : 0);
  return { hits, real: real.length, falseAlarms, fake: fake.length, score, passed: score >= PASS_SCORE };
}

/** The levels that can be tested for a language (enough words each, from A1 up without gaps). */
export function testableLevels(sizes: Partial<Record<Level, number>>): Level[] {
  const levels: Level[] = [];
  for (const level of PLACEMENT_LEVELS) {
    if ((sizes[level] ?? 0) < MIN_LEVEL_WORDS) break;
    levels.push(level);
  }
  return levels;
}

/** Highest level passed (A1 when none is), and whether testing should continue. */
export function placementResult(scores: ReadonlyArray<{ level: Level; score: LevelScore }>, testable: readonly Level[]): { level: Level; done: boolean } {
  let level: Level = 'a1';
  for (const { level: tested, score } of scores) {
    if (!score.passed) return { level, done: true };
    level = tested;
  }
  return { level, done: scores.length >= testable.length };
}
