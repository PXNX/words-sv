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

// The lazy messages (src/lib/i18n/messages.ts) answer a call by looking the key up verbatim in the
// locale's message module, so a key paraglide had to rename is never found and renders as ''. It
// renames camelCase (`home_fullText` becomes `home_fulltext1`) and reserved words (`continue`
// becomes `_continue`). Snake_case needs no renaming, so every key stays snake_case.
it('uses only message keys paraglide leaves alone, so the lazy messages can find them', () => {
  const renamed = Object.keys(base).filter((key) => key !== '$schema' && !/^[a-z][a-z0-9_]*$/u.test(key));
  expect(renamed).toEqual([]);
});

// Persian and Arabic write the cast's names in their own script and the brand Telegram in Latin,
// the same in every message.
describe('names in Persian and Arabic', () => {
  for (const locale of ['fa', 'ar']) {
    it(`${locale} spells the cast in its own script and Telegram in Latin`, () => {
      const messages = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')) as Record<string, unknown>;
      const offenders = Object.entries(messages)
        .filter(([, text]) => typeof text === 'string' && (/(?<![A-Za-z@/_.])(Mia|Tom|Lilith|Kumar)(?![A-Za-z_])/u.test(text) || /تلگرام|تيليجرام|تلغرام|تليغرام/u.test(text)))
        .map(([key]) => key);
      expect(offenders).toEqual([]);
    });
  }
});
