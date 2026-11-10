import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// German is the base locale; English is kept complete; the other locales may fall back to German
// for missing keys but must never carry keys German does not have, or different placeholders.
const LOCALES = ['de', 'en', 'fa', 'pt', 'ru', 'ar', 'uk', 'hi', 'ml'] as const;
const messages = Object.fromEntries(LOCALES.map((locale) => [locale, JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')) as Record<string, string>]));
const base = messages.de!;
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/gu)].map((match) => match[1]).sort();

describe('interface messages', () => {
  it('has every German key in English', () => {
    expect(Object.keys(base).filter((key) => !(key in messages.en!))).toEqual([]);
  });

  for (const locale of LOCALES) {
    it(`${locale}: has no keys missing from German and the same placeholders`, () => {
      const entries = Object.entries(messages[locale]!).filter(([key]) => key !== '$schema');
      expect(entries.filter(([key]) => !(key in base)).map(([key]) => key)).toEqual([]);
      expect(entries.filter(([key, text]) => key in base && placeholders(text).join() !== placeholders(base[key]!).join()).map(([key]) => key)).toEqual([]);
      expect(entries.filter(([, text]) => typeof text !== 'string' || !text.trim()).map(([key]) => key)).toEqual([]);
    });
  }
});
