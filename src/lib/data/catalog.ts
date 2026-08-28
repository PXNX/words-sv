import catalogDe from './catalog.de.json';
import catalogEn from './catalog.en.json';
import catalogEs from './catalog.es.json';
import catalogFr from './catalog.fr.json';
import catalogIt from './catalog.it.json';
import catalogPt from './catalog.pt.json';
import catalogUk from './catalog.uk.json';

export type CatalogLevel = 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
export type CatalogGender = 'masculine' | 'feminine' | 'neuter';
export type CatalogEntry = {
  levels: CatalogLevel[];
  definition?: string;
  type?: string | null;
  gender?: CatalogGender;
  article?: string;
  rarity?: { source: string; dudenClass?: number; label?: string };
  sources?: string[];
};
export type VocabularyCatalog = Record<string, CatalogEntry>;

export const vocabularyCatalogs = {
  de: catalogDe as VocabularyCatalog,
  en: catalogEn as VocabularyCatalog,
  fr: catalogFr as VocabularyCatalog,
  it: catalogIt as VocabularyCatalog,
  es: catalogEs as VocabularyCatalog,
  pt: catalogPt as VocabularyCatalog,
  uk: catalogUk as VocabularyCatalog
} as const;

export function catalogWords(catalog: VocabularyCatalog, level: CatalogLevel) {
  return Object.entries(catalog)
    .filter(([, entry]) => entry.levels.includes(level))
    .map(([word]) => word);
}

export function catalogDefinitions(catalog: VocabularyCatalog) {
  return Object.fromEntries(
    Object.entries(catalog).filter(([, entry]) => typeof entry.definition === 'string').map(([word, entry]) => [word, entry.definition])
  ) as Record<string, string>;
}

export function catalogMetadata(catalog: VocabularyCatalog) {
  return Object.fromEntries(
    Object.entries(catalog)
      .filter(([, entry]) => entry.type || entry.gender || entry.article)
      .map(([word, entry]) => [word, { type: entry.type ?? '', gender: entry.gender, article: entry.article }])
  ) as Record<string, { type: string; gender?: CatalogGender; article?: string }>;
}
