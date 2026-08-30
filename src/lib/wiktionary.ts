import type { Language } from './data/vocabulary';

const WIKTIONARY_HOSTS: Record<Language, string> = {
  de: 'https://de.wiktionary.org/wiki/',
  en: 'https://en.wiktionary.org/wiki/',
  fr: 'https://fr.wiktionary.org/wiki/',
  it: 'https://it.wiktionary.org/wiki/',
  es: 'https://es.wiktionary.org/wiki/',
  pt: 'https://pt.wiktionary.org/wiki/',
  uk: 'https://uk.wiktionary.org/wiki/'
};

export function wiktionaryUrl(language: Language, spelling: string): string {
  return `${WIKTIONARY_HOSTS[language]}${encodeURIComponent(spelling)}`;
}
