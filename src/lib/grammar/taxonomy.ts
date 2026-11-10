// Typed grammar-feature taxonomy: the single source of truth for every grammar feature id.
// Ids are stable, ASCII and language-neutral; they are persisted in events and review state,
// so never rename one in place — add an entry to FEATURE_RENAMES instead. Display labels come
// from the message files through `labelKey`, never from the ids themselves.

export const GRAMMAR = {
  de: {
    noun: {
      case: ['nominativ', 'akkusativ', 'dativ', 'genitiv'],
      gender: ['maskulin', 'feminin', 'neutrum'],
      number: ['singular', 'plural']
    },
    verb: {
      person: ['1', '2', '3'],
      number: ['singular', 'plural'],
      tense: ['praesens', 'praeteritum', 'perfekt', 'plusquamperfekt', 'futur-i', 'futur-ii'],
      mood: ['indikativ', 'konjunktiv-i', 'konjunktiv-ii', 'imperativ'],
      voice: ['aktiv', 'vorgangspassiv', 'zustandspassiv'],
      form: ['finit', 'infinitiv', 'partizip-i', 'partizip-ii', 'zu-infinitiv'],
      type: ['schwach', 'stark', 'gemischt', 'modal', 'trennbar', 'untrennbar']
    },
    adjective: {
      declension: ['stark', 'schwach', 'gemischt'],
      degree: ['positiv', 'komparativ', 'superlativ'],
      usage: ['attributiv', 'praedikativ', 'adverbial']
    }
  },
  en: {
    verb: {
      tense: ['present', 'past', 'future'],
      aspect: ['simple', 'continuous', 'perfect', 'perfect-continuous'],
      voice: ['active', 'passive']
    },
    adjective: { degree: ['positive', 'comparative', 'superlative'] }
  }
} as const satisfies Record<string, Partial<Record<string, Record<string, readonly string[]>>>>;

type G = typeof GRAMMAR;
type Values<T> = T extends readonly (infer U)[] ? U : never;
export type GrammarLang = keyof G;
export type PosOf<L extends GrammarLang> = keyof G[L] & string;
export type CategoryOf<L extends GrammarLang, P extends PosOf<L>> = keyof G[L][P] & string;
export type ValueOf<L extends GrammarLang, P extends PosOf<L>, C extends CategoryOf<L, P>> = Values<G[L][P][C]>;

/** `"de:verb:mood:konjunktiv-ii"` and friends, derived from GRAMMAR (never hand-written). */
export type FeatureKey = {
  [L in GrammarLang]: {
    [P in PosOf<L>]: {
      [C in CategoryOf<L, P>]: `${L}:${P}:${C}:${ValueOf<L, P, C> & string}`;
    }[CategoryOf<L, P>];
  }[PosOf<L>];
}[GrammarLang];

/** The only cast in the module; every call site is checked against the table. */
export function featureKey<L extends GrammarLang, P extends PosOf<L>, C extends CategoryOf<L, P>>(
  lang: L,
  pos: P,
  category: C,
  value: ValueOf<L, P, C>
): FeatureKey {
  return `${lang}:${pos}:${category}:${String(value)}` as FeatureKey;
}

/** Feature values an item of one language and part of speech can carry. */
export type Answer<L extends GrammarLang, P extends PosOf<L>> = { [C in CategoryOf<L, P>]?: ValueOf<L, P, C> };

function buildAllKeys(): readonly FeatureKey[] {
  const keys: string[] = [];
  for (const [lang, parts] of Object.entries(GRAMMAR)) {
    for (const [pos, categories] of Object.entries(parts as Record<string, Record<string, readonly string[]>>)) {
      for (const [category, values] of Object.entries(categories)) {
        for (const value of values) keys.push(`${lang}:${pos}:${category}:${value}`);
      }
    }
  }
  return Object.freeze(keys) as readonly FeatureKey[];
}

export const ALL_FEATURE_KEYS: readonly FeatureKey[] = buildAllKeys();
const KEY_SET: ReadonlySet<string> = new Set(ALL_FEATURE_KEYS);

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === 'string' && KEY_SET.has(value);
}

/** Old id → current id. Add an entry whenever an id changes; stored data is migrated through it. */
export const FEATURE_RENAMES: Readonly<Record<string, FeatureKey>> = {};

/** Maps a stored id (possibly renamed) to a current key, or null if it is unknown. */
export function migrateFeatureKey(value: string): FeatureKey | null {
  if (isFeatureKey(value)) return value;
  return FEATURE_RENAMES[value] ?? null;
}

export function parseFeatureKey(key: FeatureKey): { lang: GrammarLang; pos: string; category: string; value: string } {
  const [lang, pos, category, ...rest] = key.split(':');
  return { lang: lang as GrammarLang, pos: pos!, category: category!, value: rest.join(':') };
}

/** Message key for a feature's display label, e.g. `grammar_feature_de_verb_mood_konjunktiv_ii`. */
export function labelKey(key: FeatureKey): `grammar_feature_${string}` {
  return `grammar_feature_${key.replace(/[^a-z0-9]+/gu, '_')}`;
}
