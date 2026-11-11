import { describe, expect, it } from 'vitest';
import { connectorsFor, LEVEL_TARGETS, scoreRubric } from '../src/lib/sentence/levelRubric.js';

const A2_TEXT = 'Am Samstag stehe ich spät auf. Zuerst frühstücke ich mit meiner Familie, dann gehe ich in den Park. Ich spiele dort Fußball, weil das Wetter schön ist. Am Abend koche ich eine Suppe und lese ein Buch. Das Wochenende ist kurz, aber sehr schön.';

describe('level rubric', () => {
  it('asks for longer texts and more linking words the higher the level', () => {
    expect(LEVEL_TARGETS.a1.minWords).toBeLessThan(LEVEL_TARGETS.b1.minWords);
    expect(LEVEL_TARGETS.b1.connectors).toBeLessThan(LEVEL_TARGETS.c1.connectors);
    expect(connectorsFor('de', 'a1')).toContain('und');
    expect(connectorsFor('de', 'a1')).not.toContain('obwohl');
    expect(connectorsFor('de', 'b1')).toContain('obwohl');
    expect(connectorsFor('fr', 'b1')).toEqual([]);
  });

  it('rates the same text at A2 but below B2', () => {
    const a2 = scoreRubric(A2_TEXT, 'de', 'a2');
    const b2 = scoreRubric(A2_TEXT, 'de', 'b2');
    expect(a2.band).not.toBe('below');
    expect(b2.band).toBe('below');
    expect(a2.total).toBeGreaterThan(b2.total);
    expect(a2.connectorsUsed).toEqual(expect.arrayContaining(['und', 'aber', 'weil', 'dann', 'zuerst']));
  });

  it('takes points off for small sentence starts, a missing full stop and nouns written small', () => {
    const clean = scoreRubric('Ich habe einen Hund. Er ist klein und frech.', 'de', 'a1');
    const sloppy = scoreRubric('ich habe einen hund. er ist klein und frech', 'de', 'a1');
    const accuracy = (score: typeof clean) => score.criteria.find((criterion) => criterion.key === 'accuracy')!;
    expect(accuracy(clean).points).toBe(3);
    expect(accuracy(sloppy).points).toBeLessThan(accuracy(clean).points);
  });

  it('scores languages without linking words on three criteria', () => {
    const score = scoreRubric('Je mange une pomme. Elle est rouge.', 'fr', 'a1');
    expect(score.criteria.map((criterion) => criterion.key)).toEqual(['task', 'range', 'accuracy']);
  });

  it('gives nothing for an empty text', () => {
    const score = scoreRubric('', 'en', 'b1');
    expect(score.total).toBe(0);
    expect(score.band).toBe('below');
  });
});
