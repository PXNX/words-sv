/*
 * Rule-based writing grader for the composition modes.
 *
 * Two modes share one scorer:
 *   - `short` — one or two sentences on a simple topic.
 *   - `full`  — a whole paragraph (or several) on a richer topic.
 *
 * There is no network and no LLM here: the score is built from measurable writing
 * signals — length, sentence and paragraph structure, sentence-initial capitals,
 * German noun capitalisation, comma use, vocabulary variety and spacing. Each
 * factor is returned as a message key so the UI can localise the feedback.
 */
import type { Language } from '#lib/data/vocabulary.js';

export type GradeMode = 'short' | 'full';

export type GradeFactorKey =
  | 'lengthTooShort'
  | 'lengthGood'
  | 'lengthTooLong'
  | 'noSentenceEnd'
  | 'sentenceCountLow'
  | 'sentenceCountGood'
  | 'startNotCapitalized'
  | 'nounsNotCapitalized'
  | 'commasMissing'
  | 'varietyLow'
  | 'varietyGood'
  | 'paragraphSingle'
  | 'paragraphGood'
  | 'spacingOdd'
  | 'allGood';

export type GradeFactor = {
  key: GradeFactorKey;
  /** Actual count (words, sentences, paragraphs, commas …). */
  value?: number;
  /** What the mode expected, where it matters. */
  expected?: number;
};

export interface GradeResult {
  /** Zero-to-one fraction of the achievable score. */
  score: number;
  /** Feedback factors, worst first. */
  factors: GradeFactor[];
  verdict: 'high' | 'ok' | 'low';
  words: number;
  sentences: number;
  paragraphs: number;
}

type Analysis = {
  words: string[];
  sentences: string[];
  paragraphs: string[];
  commas: number;
  uniqueRatio: number;
};

const MIN_WORDS: Record<GradeMode, number> = { short: 5, full: 30 };
const GOOD_WORDS: Record<GradeMode, number> = { short: 10, full: 60 };
const MAX_WORDS: Record<GradeMode, number> = { short: 45, full: 220 };
const MIN_SENTENCES: Record<GradeMode, number> = { short: 1, full: 3 };
const GOOD_SENTENCES: Record<GradeMode, number> = { short: 2, full: 5 };

function analyze(text: string): Analysis {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/u).filter(Boolean);
  // Sentence boundaries: terminal punctuation, keeping the mark with the sentence.
  const sentences = trimmed.match(/[^.!?…]+[.!?…]+["“”»«„'’)]*|[^.!?…]+$/gu)?.map((s) => s.trim()).filter(Boolean) ?? [];
  // Paragraphs are separated by one or more blank lines.
  const paragraphs = trimmed.split(/\n\s*\n/u).map((p) => p.trim()).filter(Boolean);
  const commas = (trimmed.match(/,/gu) ?? []).length;
  const unique = new Set(words.map((word) => word.toLocaleLowerCase()));
  const uniqueRatio = words.length ? unique.size / words.length : 0;
  return { words, sentences, paragraphs, commas, uniqueRatio };
}

/** Uppercase letter check that also accepts umlauts and sharp s. */
function startsUppercase(sentence: string): boolean {
  const first = sentence.replace(/^["“„'’(]+/u, '').charAt(0);
  return first.toLocaleUpperCase() === first && first.toLocaleLowerCase() !== first;
}

/** Heuristic: a capitalised word that is not sentence-initial is probably a German noun. */
function capitalizedNouns(words: string[], sentences: string[]): number {
  const initial = new Set<string>();
  for (const sentence of sentences) {
    const first = sentence.replace(/^["“„'’(]+/u, '').split(/\s+/u)[0];
    if (first) initial.add(first);
  }
  let nouns = 0;
  for (const word of words) {
    const bare = word.replace(/[^A-Za-zÄÖÜäöüß]/gu, '');
    if (bare.length < 2) continue;
    if (initial.has(word)) continue;
    if (bare.charAt(0).toLocaleUpperCase() === bare.charAt(0) && bare.charAt(0).toLocaleLowerCase() !== bare.charAt(0)) nouns += 1;
  }
  return nouns;
}

/**
 * Grades `text` in the given mode. `lang` is accepted for symmetry with the rest
 * of the app; the rules are German-centric because every mode writes German.
 */
export function grade(text: string, lang: Language, mode: GradeMode = 'short'): GradeResult {
  const { words, sentences, paragraphs, commas, uniqueRatio } = analyze(text);
  const factors: GradeFactor[] = [];
  let score = 1;

  // --- length --------------------------------------------------------------
  if (words.length < MIN_WORDS[mode]) {
    const gap = MIN_WORDS[mode] - words.length;
    score -= Math.min(0.45, 0.08 * gap);
    factors.push({ key: 'lengthTooShort', value: words.length, expected: MIN_WORDS[mode] });
  } else if (words.length >= GOOD_WORDS[mode]) {
    factors.push({ key: 'lengthGood', value: words.length, expected: GOOD_WORDS[mode] });
  }
  if (words.length > MAX_WORDS[mode]) {
    score -= 0.1;
    factors.push({ key: 'lengthTooLong', value: words.length, expected: MAX_WORDS[mode] });
  }

  // --- sentences -----------------------------------------------------------
  if (sentences.length < MIN_SENTENCES[mode]) {
    score -= 0.25;
    factors.push({ key: 'sentenceCountLow', value: sentences.length, expected: MIN_SENTENCES[mode] });
  } else if (sentences.length >= GOOD_SENTENCES[mode]) {
    factors.push({ key: 'sentenceCountGood', value: sentences.length, expected: GOOD_SENTENCES[mode] });
  }
  const last = text.trim();
  if (last && !/[.!?…]["“”»«„'’)]*$/u.test(last)) {
    score -= 0.15;
    factors.push({ key: 'noSentenceEnd' });
  }

  // --- capitalisation ------------------------------------------------------
  const starts = sentences.filter((sentence) => sentence.length > 0);
  const badStarts = starts.filter((sentence) => !startsUppercase(sentence)).length;
  if (badStarts > 0) {
    score -= Math.min(0.25, 0.06 * badStarts);
    factors.push({ key: 'startNotCapitalized', value: badStarts, expected: starts.length });
  }
  // German nouns are capitalised; expect roughly one noun per five words.
  const nouns = capitalizedNouns(words, sentences);
  const expectedNouns = Math.floor(words.length / 6);
  if (expectedNouns > 0 && nouns < expectedNouns) {
    score -= 0.12;
    factors.push({ key: 'nounsNotCapitalized', value: nouns, expected: expectedNouns });
  }

  // --- commas and variety --------------------------------------------------
  const expectedCommas = mode === 'full' ? Math.max(1, Math.floor(sentences.length / 2)) : 0;
  if (commas < expectedCommas) {
    score -= 0.08;
    factors.push({ key: 'commasMissing', value: commas, expected: expectedCommas });
  }
  if (words.length >= GOOD_WORDS[mode] && uniqueRatio < 0.45) {
    score -= 0.1;
    factors.push({ key: 'varietyLow', value: Math.round(uniqueRatio * 100), expected: 45 });
  } else if (words.length >= GOOD_WORDS[mode]) {
    factors.push({ key: 'varietyGood', value: Math.round(uniqueRatio * 100), expected: 45 });
  }

  // --- paragraphs (full mode only) ----------------------------------------
  if (mode === 'full') {
    if (paragraphs.length < 1) {
      score -= 0.1;
    } else if (paragraphs.length === 1) {
      // A single paragraph is fine, just nudge the learner toward structure.
      factors.push({ key: 'paragraphSingle', value: 1 });
    } else {
      factors.push({ key: 'paragraphGood', value: paragraphs.length });
    }
  }

  // --- spacing -------------------------------------------------------------
  // Blank lines between paragraphs are intentional; only stray spaces and tabs count.
  if (/[^\S\n]{2,}/u.test(text) || /[ \t]+$/mu.test(text) || /^[ \t]+|[ \t]+$/u.test(text)) {
    score -= 0.05;
    factors.push({ key: 'spacingOdd' });
  }

  // An under-length answer cannot count as a very good one, however clean it is.
  if (words.length < MIN_WORDS[mode]) score = Math.min(score, 0.7);

  score = clamp(score, 0, 1);
  if (factors.length === 0) factors.push({ key: 'allGood' });

  const verdict: GradeResult['verdict'] = score >= 0.75 ? 'high' : score >= 0.5 ? 'ok' : 'low';
  return { score, factors, verdict, words: words.length, sentences: sentences.length, paragraphs: paragraphs.length };
}

function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value;
}
