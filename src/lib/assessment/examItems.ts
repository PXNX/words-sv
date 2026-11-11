/*
 * Real exam questions for the placement test and checkpoints, in the formats of the language exams:
 *   - meaning: "What does „Wohnung“ mean?" with four definitions of the same level and word type;
 *   - article: "___ Tisch" with der / die / das (German nouns, A1–A2);
 *   - grammar: a sentence gap with the right form, chosen by level (verb forms at A1, articles in
 *     context at A2, adjective endings from B1).
 * Every question offers "I don't know", which counts as wrong without the guessing penalty, and
 * levels are scored with formula scoring (right − wrong / (options − 1)), so random guessing
 * averages out to zero. Pure and seeded, so it can be tested.
 */
import { fittingNouns } from '#lib/grammar/nounClasses.js';
import type { Level } from '#lib/domain/types.js';
import type { VocabularyGender } from '#lib/data/vocabulary.js';
import { buildNounCasePrompt, isDeclinableNoun } from '#lib/grammar/cases.js';
import { buildAdjectivePrompt, isEligibleAdjective } from '#lib/grammar/adjectives.js';
import { buildVerbPrompt, verbConjugations } from '#lib/grammar/verbs.js';

export type ExamEntry = { definition?: string; type?: string; genus?: VocabularyGender; article?: string };
// 'comprehension': a question on a longer text (the mock test's reading part); `word` holds the question.
export type ExamKind = 'meaning' | 'article' | 'grammar' | 'listening' | 'comprehension';

export interface ExamItem {
  id: string;
  kind: ExamKind;
  level: Level;
  /** The word asked about (meaning, article) or the sentence around the gap (grammar). */
  word?: string;
  before?: string;
  after?: string;
  options: string[];
  correct: string;
}

/** null means "I don't know". */
export interface ExamAnswer {
  item: ExamItem;
  chosen: string | null;
}

export const MEANING_PER_LEVEL = 6;
export const FORM_PER_LEVEL = 2;
/** Words only heard, not shown: listening at the level, in every language with a voice. */
export const LISTENING_PER_LEVEL = 2;
export const EXAM_PASS_SCORE = 0.6;
const OPTIONS = 4;
const ARTICLES = ['der', 'die', 'das'] as const;

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other]!, copy[index]!];
  }
  return copy;
}
const pick = <T>(items: readonly T[], random: () => number): T | undefined => items[Math.floor(random() * items.length)];
const stem = (word: string) => word.toLocaleLowerCase('de').slice(0, Math.max(4, word.length - 3));

/**
 * A meaning question: the word and four definitions. Distractors come from the same level and word
 * type, never repeat a definition, and never mention the asked word, so only one answer fits.
 */
export function meaningItem(word: string, entries: Readonly<Record<string, ExamEntry>>, level: Level, random: () => number): ExamItem | null {
  const entry = entries[word];
  if (!entry?.definition) return null;
  const sameType = Object.entries(entries).filter(([other, candidate]) => other !== word && candidate.definition && candidate.definition !== entry.definition && candidate.type === entry.type && !candidate.definition.toLocaleLowerCase('de').includes(stem(word)));
  const pool = sameType.length >= OPTIONS - 1 ? sameType : Object.entries(entries).filter(([other, candidate]) => other !== word && candidate.definition && candidate.definition !== entry.definition);
  const distractors = shuffle(pool, random).slice(0, OPTIONS - 1).map(([, candidate]) => candidate.definition!);
  if (distractors.length < OPTIONS - 1) return null;
  return { id: `meaning:${level}:${word}`, kind: 'meaning', level, word, options: shuffle([entry.definition, ...distractors], random), correct: entry.definition };
}

/** A listening question: the word is only spoken, and the learner picks what it means. */
export function listeningItem(word: string, entries: Readonly<Record<string, ExamEntry>>, level: Level, random: () => number): ExamItem | null {
  const item = meaningItem(word, entries, level, random);
  return item ? { ...item, id: `listening:${level}:${word}`, kind: 'listening' } : null;
}

/** "___ Tisch": the article of a German noun. */
export function articleItem(word: string, entry: ExamEntry, level: Level, random: () => number): ExamItem | null {
  if (entry.type !== 'noun' || !entry.article || !(ARTICLES as readonly string[]).includes(entry.article)) return null;
  return { id: `article:${level}:${word}`, kind: 'article', level, word, options: shuffle([...ARTICLES], random), correct: entry.article };
}

/** A sentence gap that tests the grammar of the level (German). */
export function grammarItem(level: Level, entries: Readonly<Record<string, ExamEntry>>, random: () => number): ExamItem | null {
  const nouns = Object.entries(entries).filter(([word, entry]) => entry.type === 'noun' && entry.genus && isDeclinableNoun(word));
  const adjectives = Object.keys(entries).filter((word) => entries[word]!.type === 'adjective' && /^[a-zäöü]+$/u.test(word) && isEligibleAdjective(word));
  const keep = <T>(values: T[]) => shuffle(values, random);
  let prompt: { before: string; after: string; correct: string; choices: string[] } | null;
  if (level === 'a1') {
    const verb = pick(Object.keys(verbConjugations), random);
    prompt = verb ? buildVerbPrompt(verb, random, keep) : null;
  } else if (level === 'a2') {
    const noun = pick(nouns, random);
    prompt = noun ? buildNounCasePrompt(noun[0], noun[1].genus!, random, keep) : null;
  } else {
    const adjective = pick(adjectives, random);
    const noun = adjective ? pick(fittingNouns(adjective, nouns, ([word]) => word), random) : null;
    prompt = noun && adjective ? buildAdjectivePrompt(adjective, noun[0], noun[1].genus!, random, keep) : null;
  }
  if (!prompt || prompt.choices.length < 2) return null;
  return { id: `grammar:${level}:${prompt.before}|${prompt.after}`, kind: 'grammar', level, before: prompt.before, after: prompt.after, options: prompt.choices.slice(0, 5), correct: prompt.correct };
}

/** Whether a level's words carry enough definitions for meaning questions. */
export function supportsExam(entries: Readonly<Record<string, ExamEntry>>): boolean {
  return Object.values(entries).filter((entry) => entry.definition).length >= 20;
}

/** One level's questions: meaning questions plus articles and grammar for German. */
export function examRound(language: string, level: Level, entries: Readonly<Record<string, ExamEntry>>, random: () => number): ExamItem[] {
  const words = shuffle(Object.keys(entries).filter((word) => entries[word]!.definition), random);
  const items: ExamItem[] = [];
  for (const word of words) {
    if (items.length >= MEANING_PER_LEVEL) break;
    const item = meaningItem(word, entries, level, random);
    if (item) items.push(item);
  }
  for (const word of words) {
    if (items.filter((item) => item.kind === 'listening').length >= LISTENING_PER_LEVEL) break;
    if (items.some((item) => item.word === word)) continue;
    const item = listeningItem(word, entries, level, random);
    if (item) items.push(item);
  }
  if (language === 'de') {
    const forms: ExamItem[] = [];
    if (level === 'a1' || level === 'a2') {
      const noun = words.find((word) => !items.some((item) => item.word === word) && entries[word]!.type === 'noun');
      const item = noun ? articleItem(noun, entries[noun]!, level, random) : null;
      if (item) forms.push(item);
    }
    for (let attempt = 0; forms.length < FORM_PER_LEVEL && attempt < 6; attempt += 1) {
      const item = grammarItem(level, entries, random);
      if (item && !forms.some((existing) => existing.id === item.id)) forms.push(item);
    }
    items.push(...forms);
  }
  return shuffle(items, random);
}

export interface ExamLevelScore {
  right: number;
  wrong: number;
  skipped: number;
  /** Formula score, −1..1: right minus wrong / (options − 1), over all questions. */
  score: number;
  passed: boolean;
}

export function scoreExamLevel(answers: readonly ExamAnswer[]): ExamLevelScore {
  let right = 0;
  let wrong = 0;
  let skipped = 0;
  let total = 0;
  for (const { item, chosen } of answers) {
    if (chosen === null) skipped += 1;
    else if (chosen === item.correct) right += 1;
    else {
      wrong += 1;
      total -= 1 / Math.max(1, item.options.length - 1);
    }
  }
  total += right;
  const score = answers.length ? total / answers.length : 0;
  return { right, wrong, skipped, score, passed: score >= EXAM_PASS_SCORE };
}

/**
 * Adaptive order: start at the learner's level, go up after a pass and down after a fail. Stops
 * when a passed level sits right below a failed one, or at either end. Returns the next level to
 * test, or null when the result is known.
 */
export function nextExamLevel(levels: readonly Level[], results: ReadonlyMap<Level, boolean>, start: Level): Level | null {
  if (!levels.length) return null;
  const startIndex = Math.max(0, levels.indexOf(start));
  if (!results.size) return levels[startIndex]!;
  const passedIndices = levels.map((level, index) => (results.get(level) === true ? index : -1)).filter((index) => index >= 0);
  const failedIndices = levels.map((level, index) => (results.get(level) === false ? index : -1)).filter((index) => index >= 0);
  const highestPass = passedIndices.length ? Math.max(...passedIndices) : -1;
  const lowestFail = failedIndices.length ? Math.min(...failedIndices) : levels.length;
  if (lowestFail === highestPass + 1) return null;
  if (highestPass === levels.length - 1) return null;
  if (lowestFail === 0) return null;
  // Below the lowest failed level when nothing under it passed yet, else above the highest pass.
  const next = highestPass >= 0 ? highestPass + 1 : lowestFail - 1;
  return levels[next] ?? null;
}

/** The level reached: the highest level passed directly below the first failed one (A1 at least). */
export function examResult(levels: readonly Level[], results: ReadonlyMap<Level, boolean>): Level {
  let reached: Level = levels[0] ?? 'a1';
  for (const level of levels) {
    const passed = results.get(level);
    if (passed === false) break;
    if (passed === true) reached = level;
  }
  return reached;
}
