import { describe, expect, it } from 'vitest';
import { blendPriors, priorsFor, PRIOR_WEIGHT } from '../src/lib/progress/l1Priors';
import type { FeatureStat } from '../src/lib/progress/events';
import { featureKey } from '../src/lib/grammar/taxonomy';

const NEUTER = featureKey('de', 'noun', 'gender', 'neutrum');
const DATIVE = featureKey('de', 'noun', 'case', 'dativ');
const PERFEKT = featureKey('de', 'verb', 'tense', 'perfekt');

describe('L1 error priors', () => {
  it('expects gender trouble from Persian and Arabic speakers learning German, and none for the same language', () => {
    expect(priorsFor('fa', 'de').map((prior) => prior.feature)).toContain(NEUTER);
    expect(priorsFor('ar', 'de').map((prior) => prior.feature)).toContain(NEUTER);
    expect(priorsFor('de', 'de')).toEqual([]);
    expect(priorsFor('xx', 'de')).toEqual([]);
    expect(priorsFor('de', 'en').map((prior) => prior.feature)).toContain(featureKey('en', 'verb', 'aspect', 'continuous'));
  });

  it('puts a prior feature first for a new learner', () => {
    const blended = blendPriors([], priorsFor('ar', 'de'));
    expect(blended[0]!.feature).toBe(NEUTER);
    expect(blended[0]!.observed).toBe(0);
    expect(blended[0]!.attempts).toBe(PRIOR_WEIGHT);
  });

  it('lets real answers outweigh the prior', () => {
    const raw: FeatureStat[] = [{ feature: NEUTER, attempts: 20, errors: 0, accuracy: 1 }, { feature: PERFEKT, attempts: 6, errors: 4, accuracy: 1 / 3 }];
    const blended = blendPriors(raw, priorsFor('ar', 'de'));
    const neuter = blended.find((stat) => stat.feature === NEUTER)!;
    expect(neuter.accuracy).toBeGreaterThan(0.9);
    expect(neuter.observed).toBe(20);
    expect(blended[0]!.feature).toBe(PERFEKT);
  });

  it('keeps the minimum number of real answers for features without a prior', () => {
    const raw: FeatureStat[] = [{ feature: PERFEKT, attempts: 1, errors: 1, accuracy: 0 }, { feature: DATIVE, attempts: 1, errors: 1, accuracy: 0 }];
    const blended = blendPriors(raw, priorsFor('ar', 'de'));
    expect(blended.some((stat) => stat.feature === PERFEKT)).toBe(false);
    expect(blended.find((stat) => stat.feature === DATIVE)?.observed).toBe(1);
  });
});
