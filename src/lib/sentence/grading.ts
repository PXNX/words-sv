/*
 * Self-graded sentence composition: the user writes a short German text on a
 * prompt topic and the model grades it by hand against the target language.
 *
 * The grading happens in this module (no worker, no LLM API): the model is
 * a series of weighted rules plus counts of common mistakes (articles, prepositions,
 * verb order, missing/spurious words). A partial score gives each mistake its
 * relative weight; an overall quality verdict comes from a threshold curve so
 * that small errors never collapse a good answer.
 */
import type { Language } from '#lib/data/vocabulary.js';

/** One graded result: parts measured in score and weight, plus a verdict. */
export interface GradeResult {
  /** Zero-to-one fraction of the usable part. */
  score: number;
  /** The targeted weighting of each sub-factor, for fine-grained feedback. */
  weights: Record<WeightKey, number>;
  /** Each factor's rating, like "Article wrong" or "Too short". */
  factors: string[];
  /** High / ok / low, on the question of whether the whole paragraph was correct. */
  verdict: 'high' | 'ok' | 'low';
}

export type WeightKey =
  | 'article'
  | 'preposition'
  | 'adjective'
  | 'verb'
  | 'syntax'
  | 'length'
  | 'spelling';

// Maximum penalisation per category; capped so a single slip doesn't
// dominate an otherwise fine paragraph.
const BASE_WEIGHTS: Record<WeightKey, number> = {
  article: 0.15,
  preposition: 0.12,
  adjective: 0.10,
  verb: 0.12,
  syntax: 0.14,
  length: 0.10,
  spelling: 0.18
};

/**
 * Grades `text` against `target` (German) using a rule-based scorer.
 *
 * Grammar factors get their own weight; common mistakes bump the penalty per
 * instance; length and spelling are derived from simple rules. The verdict falls
 * off at the bottom so an almost-right answer isn't locked into "low" just because
 * one article slipped.
 */
export function grade(text: string, lang: Language, target = 'de'): GradeResult {
  const factors: string[] = [];
  // Start with the article penalty so a missing article is always flagged.
  const detail: Record<WeightKey, number> = { ...BASE_WEIGHTS, article: BASE_WEIGHTS.article + 0.2 };

  const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const words = normalized.split(' ').filter((w) => w && /^\p{L}+$/u.test(w));

  // Articles: check the three forms der/die/das used as determiners
  const articleCount = countArticles(words);
  if (articleCount > 0) {
    detail.article += Math.min(articleCount - 1, 3) * 0.1;
    factors.push(`Wrong article count (found ${articleCount}, expect 1–3)`);
  } else if (!hasPluralArticle(normalized)) {
    factors.push('Missing article before the noun');
    detail.article = BASE_WEIGHTS.article + 0.2;
  }

  // Prepositions: wrong case bumps things up
  const prepCount = countPrepositions(words);
  if (prepCount > 0) {
    detail.preposition += Math.min(prepCount - 1, 2) * 0.08;
    factors.push(`Wrong preposition count (${prepCount})`);
  }

  // Verbs: uninflected or missing subjects push the verb weight higher
  const verbCount = countVerbs(words);
  if (verbCount > 0) {
    detail.verb += Math.min(verbCount - 1, 3) * 0.07;
    factors.push(`Verb issues (need at least 1)`);
  }

  // Adjectives in weak position after indefinite articles: the article factor
  // covers most of this; here we just note any plural adjective without an article
  // behind it is suspicious
  const adjCount = countAdjectives(words);
  if (adjCount > 0 && !hasArticleBeforeNoun(words)) {
    detail.adjective += 0.05;
    factors.push('Adjective without definite article');
  }

  // Syntax: run-on strings, comma splices, double spaces are flagged as layout issues
  if (/([^ .]+)(, )([^ .]+)/.test(normalized)) {
    detail.syntax += 0.1;
    factors.push('Comma splice');
  }
  if (/\s\s/.test(normalized)) {
    detail.syntax += 0.05;
    factors.push('Double spaces');
  }
  if (!/\s/.test(normalized)) {
    detail.length = BASE_WEIGHTS.length; // no structure
    factors.push('No spaces — need sentences');
  }

  // Length: too short gets capped, but a longer answer needs more structure
  if (words.length < 6) {
    detail.length = BASE_WEIGHTS.length + 0.1;
    factors.push('Too short');
  } else if (words.length < 15) {
    detail.length = BASE_WEIGHTS.length;
  }

  // Spelling: any non-target letter bumps the spelling table, but small
  // orthographic slips stay minor
  const badChars = [...normalized].filter((c) => !/[a-zäöüß]/iu.test(c)).length;
  if (badChars > 0) {
    detail.spelling += Math.min(badChars, 5) * 0.04;
    if (badChars > 2) factors.push('Spelling errors');
  }

  const score = clamp(1 - detail.article - detail.preposition - detail.adjective - detail.verb - detail.syntax - detail.length - detail.spelling, 0, 1);

  const verdict = score >= 0.7 ? 'high' : score >= 0.45 ? 'ok' : 'low';
  return {
    score,
    weights: { ...detail },
    factors,
    verdict
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// --- word detectors ----------------------------------------------------------

const PREPS = new Set(['in', 'an', 'auf', 'zu', 'für', 'mit', 'von', 'gegen']);
const ARTICLES_SET = new Set(['der', 'die', 'das', 'ein', 'eine']);

function hasPluralArticle(text: string): boolean {
  return /\b(der|die|das)\b/.test(text);
}

function countArticles(words: string[]): number {
  let found = 0;
  for (const w of words) {
    if (ARTICLES_SET.has(w)) found++;
  }
  return found;
}

function hasArticleBeforeNoun(words: string[]): boolean {
  // A noun should be preceded by an article; check the first word pair.
  for (let i = 1; i < words.length; i += 1) {
    if (ARTICLES_SET.has(words[i - 1]!)) return true;
  }
  return false;
}

function countPrepositions(words: string[]): number {
  return words.reduce((n, w) => PREPS.has(w) ? n + 1 : n, 0);
}

function countVerbs(words: string[]): number {
  // Very cheap heuristic: count words that look like verbs (simple heuristic)
  return words.filter((w) => /[a-zA-Zäöüẞ][a-zA-Zäöü]*$/u.test(w)).length;
}

function countAdjectives(words: string[]): number {
  return words.filter((w) => /[a-zA-Zäöü][a-zA-Zäöü]{2}$/u.test(w)).length;
}

/** Tests the lightweight endpoints available; marks required skills for today. */
export const isPassableForToday = (lang: Language): { skills: string[]; exists: boolean } => {
  // Check if sentence grading mode is available (we always have the rule-based scorer)
  const exists = true;
  const skills = ['vocab', 'grammar', 'reading', 'story', 'listen', 'sentence'];
  return { exists, skills };
};

/** The empty default grade sentinel so callers can keep a blank space. */
export const emptyGrade = (): GradeResult => ({
  score: 0,
  weights: { article: 0, preposition: 0, adjective: 0, verb: 0, syntax: 0, length: 0, spelling: 0 },
  factors: [],
  verdict: 'low'
});
