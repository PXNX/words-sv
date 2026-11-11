/*
 * L1 error priors: grammar features that speakers of a first language usually find hard in German or
 * English, from how the two languages differ (no grammatical gender, no articles, no cases, no
 * progressive or perfect aspect …). They count as a few made-up attempts at a lower accuracy, so a
 * new learner's focus starts where people like them struggle, and real answers soon outweigh them.
 * The interface language stands in for the first language. Pure, so it can be tested.
 */
import { featureKey, type FeatureKey } from '#lib/grammar/taxonomy.js';
import type { FeatureStat } from './events.js';

export interface L1Prior {
  feature: FeatureKey;
  /** Expected share right before any practice. */
  accuracy: number;
}

/** How many attempts a prior is worth: three real answers weigh as much as the prior. */
export const PRIOR_WEIGHT = 3;

const GENDER_ALL = [featureKey('de', 'noun', 'gender', 'maskulin'), featureKey('de', 'noun', 'gender', 'feminin'), featureKey('de', 'noun', 'gender', 'neutrum')];
const NEUTER = featureKey('de', 'noun', 'gender', 'neutrum');
const ACCUSATIVE = featureKey('de', 'noun', 'case', 'akkusativ');
const DATIVE = featureKey('de', 'noun', 'case', 'dativ');
const GENITIVE = featureKey('de', 'noun', 'case', 'genitiv');
const ADJ_STRONG = featureKey('de', 'adjective', 'declension', 'stark');
const ADJ_MIXED = featureKey('de', 'adjective', 'declension', 'gemischt');
const SEPARABLE = featureKey('de', 'verb', 'type', 'trennbar');
const STRONG_VERBS = featureKey('de', 'verb', 'type', 'stark');
const PERFEKT = featureKey('de', 'verb', 'tense', 'perfekt');
const KONJ2 = featureKey('de', 'verb', 'mood', 'konjunktiv-ii');
const CONTINUOUS = featureKey('en', 'verb', 'aspect', 'continuous');
const PERFECT = featureKey('en', 'verb', 'aspect', 'perfect');
const PERFECT_CONTINUOUS = featureKey('en', 'verb', 'aspect', 'perfect-continuous');
const PASSIVE = featureKey('en', 'verb', 'voice', 'passive');

const hard = (features: readonly FeatureKey[], accuracy: number): L1Prior[] => features.map((feature) => ({ feature, accuracy }));

// Per language learnt, per first language. Lower accuracy = more typical trouble.
const PRIORS: Partial<Record<string, Partial<Record<string, readonly L1Prior[]>>>> = {
  de: {
    // No gender, no articles, no case endings (only the object marker rā).
    fa: [...hard(GENDER_ALL, 0.5), ...hard([ACCUSATIVE, DATIVE, ADJ_STRONG, ADJ_MIXED], 0.55), ...hard([SEPARABLE], 0.65)],
    // Two genders (no neuter), a definite article only, case endings gone in everyday speech.
    ar: [...hard([NEUTER], 0.5), ...hard([DATIVE, ADJ_STRONG, ADJ_MIXED], 0.55), ...hard([ACCUSATIVE, SEPARABLE], 0.65)],
    // Cases and three genders exist, but no articles and genders often differ; tense use differs.
    ru: [...hard(GENDER_ALL, 0.6), ...hard([ADJ_MIXED, PERFEKT], 0.6), ...hard([SEPARABLE], 0.65)],
    uk: [...hard(GENDER_ALL, 0.6), ...hard([ADJ_MIXED, PERFEKT], 0.6), ...hard([SEPARABLE], 0.65)],
    // No gender, cases only in pronouns.
    en: [...hard(GENDER_ALL, 0.55), ...hard([DATIVE, ADJ_STRONG, ADJ_MIXED], 0.55), ...hard([ACCUSATIVE, GENITIVE, KONJ2], 0.65)],
    // Two genders, no cases.
    pt: [...hard([NEUTER], 0.5), ...hard([ACCUSATIVE, DATIVE, ADJ_STRONG, ADJ_MIXED], 0.55), ...hard([SEPARABLE], 0.65)],
    // Two genders, postpositions instead of case endings.
    hi: [...hard([NEUTER], 0.5), ...hard([DATIVE, ADJ_STRONG, ADJ_MIXED], 0.55), ...hard([SEPARABLE, STRONG_VERBS], 0.65)],
    // Natural gender only, agglutinative cases.
    ml: [...hard(GENDER_ALL, 0.5), ...hard([ADJ_STRONG, ADJ_MIXED], 0.55), ...hard([SEPARABLE, STRONG_VERBS], 0.65)]
  },
  en: {
    // German uses the Perfekt for plain past events and has no progressive form.
    de: [...hard([PERFECT, CONTINUOUS], 0.55), ...hard([PERFECT_CONTINUOUS], 0.5)],
    ru: [...hard([PERFECT, PERFECT_CONTINUOUS], 0.5), ...hard([CONTINUOUS], 0.6)],
    uk: [...hard([PERFECT, PERFECT_CONTINUOUS], 0.5), ...hard([CONTINUOUS], 0.6)],
    fa: [...hard([PERFECT_CONTINUOUS], 0.5), ...hard([PERFECT, PASSIVE], 0.6)],
    ar: [...hard([PERFECT, PERFECT_CONTINUOUS], 0.5), ...hard([CONTINUOUS], 0.6)],
    pt: [...hard([PERFECT], 0.55), ...hard([PERFECT_CONTINUOUS], 0.6)],
    hi: [...hard([PERFECT, PERFECT_CONTINUOUS], 0.55), ...hard([PASSIVE], 0.65)],
    ml: [...hard([PERFECT, PERFECT_CONTINUOUS], 0.55), ...hard([PASSIVE], 0.65)]
  }
};

/** The priors for learning `target` with `firstLanguage` as the first language (empty when the same or unknown). */
export function priorsFor(firstLanguage: string, target: string): readonly L1Prior[] {
  if (firstLanguage === target) return [];
  return PRIORS[target]?.[firstLanguage] ?? [];
}

export interface PriorFeatureStat extends FeatureStat {
  /** Real answers behind the numbers; under PRIOR_WEIGHT the prior still dominates. */
  observed: number;
}

/**
 * Feature accuracy with the priors mixed in as PRIOR_WEIGHT pseudo-attempts each, weakest first.
 * `observed` holds the learner's own attempts. Pass `raw` with every attempt (featureStats(…, 1));
 * features without a prior still need `minAttempts` real answers, as in featureStats.
 */
export function blendPriors(raw: readonly FeatureStat[], priors: readonly L1Prior[], minAttempts = 3): PriorFeatureStat[] {
  const byFeature = new Map<FeatureKey, PriorFeatureStat>(raw.map((stat) => [stat.feature, { ...stat, observed: stat.attempts }]));
  for (const prior of priors) {
    const seen = byFeature.get(prior.feature);
    const attempts = (seen?.attempts ?? 0) + PRIOR_WEIGHT;
    const errors = (seen?.errors ?? 0) + PRIOR_WEIGHT * (1 - prior.accuracy);
    byFeature.set(prior.feature, { feature: prior.feature, attempts, errors, accuracy: 1 - errors / attempts, observed: seen?.attempts ?? 0 });
  }
  const withPrior = new Set(priors.map((prior) => prior.feature));
  return [...byFeature.values()].filter((stat) => withPrior.has(stat.feature) || stat.attempts >= minAttempts).sort((a, b) => a.accuracy - b.accuracy || b.observed - a.observed || a.feature.localeCompare(b.feature));
}
