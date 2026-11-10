import { describe, expect, expectTypeOf, it } from 'vitest';
import { ALL_FEATURE_KEYS, featureKey, isFeatureKey, labelKey, migrateFeatureKey, parseFeatureKey, type FeatureKey } from '../src/lib/grammar/taxonomy';
import { assertNever, isItemId, isLevel, itemId, type ItemId, type Skill } from '../src/lib/domain/types';

describe('grammar taxonomy', () => {
  it('builds keys from the table', () => {
    expect(featureKey('de', 'verb', 'mood', 'konjunktiv-ii')).toBe('de:verb:mood:konjunktiv-ii');
    expectTypeOf(featureKey('en', 'verb', 'aspect', 'perfect')).toEqualTypeOf<FeatureKey>();
    // @ts-expect-error konjunktiv-ii is not a case
    featureKey('de', 'noun', 'case', 'konjunktiv-ii');
    // @ts-expect-error English nouns are not in the table
    featureKey('en', 'noun', 'case', 'dativ');
  });

  it('accepts only known keys at runtime', () => {
    expect(isFeatureKey('de:noun:case:dativ')).toBe(true);
    expect(isFeatureKey('de:noun:case:ablativ')).toBe(false);
    expect(isFeatureKey(42)).toBe(false);
    expectTypeOf<'de:noun:case:dativ'>().toExtend<FeatureKey>();
    expectTypeOf<'de:noun:case:ablativ'>().not.toExtend<FeatureKey>();
  });

  it('keeps every id stable (update this snapshot only on purpose, with a rename entry)', () => {
    expect(ALL_FEATURE_KEYS.length).toBe(new Set(ALL_FEATURE_KEYS).size);
    expect(ALL_FEATURE_KEYS).toMatchInlineSnapshot(`
      [
        "de:noun:case:nominativ",
        "de:noun:case:akkusativ",
        "de:noun:case:dativ",
        "de:noun:case:genitiv",
        "de:noun:gender:maskulin",
        "de:noun:gender:feminin",
        "de:noun:gender:neutrum",
        "de:noun:number:singular",
        "de:noun:number:plural",
        "de:verb:person:1",
        "de:verb:person:2",
        "de:verb:person:3",
        "de:verb:number:singular",
        "de:verb:number:plural",
        "de:verb:tense:praesens",
        "de:verb:tense:praeteritum",
        "de:verb:tense:perfekt",
        "de:verb:tense:plusquamperfekt",
        "de:verb:tense:futur-i",
        "de:verb:tense:futur-ii",
        "de:verb:mood:indikativ",
        "de:verb:mood:konjunktiv-i",
        "de:verb:mood:konjunktiv-ii",
        "de:verb:mood:imperativ",
        "de:verb:voice:aktiv",
        "de:verb:voice:vorgangspassiv",
        "de:verb:voice:zustandspassiv",
        "de:verb:form:finit",
        "de:verb:form:infinitiv",
        "de:verb:form:partizip-i",
        "de:verb:form:partizip-ii",
        "de:verb:form:zu-infinitiv",
        "de:verb:type:schwach",
        "de:verb:type:stark",
        "de:verb:type:gemischt",
        "de:verb:type:modal",
        "de:verb:type:trennbar",
        "de:verb:type:untrennbar",
        "de:adjective:declension:stark",
        "de:adjective:declension:schwach",
        "de:adjective:declension:gemischt",
        "de:adjective:degree:positiv",
        "de:adjective:degree:komparativ",
        "de:adjective:degree:superlativ",
        "de:adjective:usage:attributiv",
        "de:adjective:usage:praedikativ",
        "de:adjective:usage:adverbial",
        "en:verb:tense:present",
        "en:verb:tense:past",
        "en:verb:tense:future",
        "en:verb:aspect:simple",
        "en:verb:aspect:continuous",
        "en:verb:aspect:perfect",
        "en:verb:aspect:perfect-continuous",
        "en:verb:voice:active",
        "en:verb:voice:passive",
        "en:adjective:degree:positive",
        "en:adjective:degree:comparative",
        "en:adjective:degree:superlative",
      ]
    `);
  });

  it('parses, migrates and labels keys', () => {
    const key = featureKey('de', 'adjective', 'declension', 'schwach');
    expect(parseFeatureKey(key)).toEqual({ lang: 'de', pos: 'adjective', category: 'declension', value: 'schwach' });
    expect(migrateFeatureKey(key)).toBe(key);
    expect(migrateFeatureKey('de:verb:mood:conjunctive')).toBeNull();
    expect(labelKey(featureKey('de', 'verb', 'mood', 'konjunktiv-ii'))).toBe('grammar_feature_de_verb_mood_konjunktiv_ii');
  });
});

describe('domain types', () => {
  it('brands item ids like the review ledger', () => {
    const id = itemId('de', ' tisch ');
    expect(id).toBe('de:TISCH');
    expect(isItemId(id)).toBe(true);
    expect(isItemId('tisch')).toBe(false);
    expectTypeOf(id).toEqualTypeOf<ItemId>();
    expectTypeOf<string>().not.toExtend<ItemId>();
  });

  it('guards levels and exhausts unions', () => {
    expect(isLevel('b2')).toBe(true);
    expect(isLevel('B2')).toBe(false);
    const describeSkill = (skill: Skill) => {
      switch (skill) {
        case 'vocab': case 'grammar': case 'reading': case 'listening': case 'speaking': case 'writing': return skill;
        default: return assertNever(skill);
      }
    };
    expect(describeSkill('reading')).toBe('reading');
    expect(() => assertNever('x' as never)).toThrow('Unexpected value: "x"');
  });
});
