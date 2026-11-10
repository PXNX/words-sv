import { describe, expect, it } from 'vitest';
import {
  LEARNING_FORMAT_TAGS, formatCurrency, formatDate, formatList, formatMoment, formatNumber, formatOrdinal,
  formatRelative, formatTime, formatWeekday, isolateLtr, learningContext, resolveFormatContext, weekStart, type FormatKind
} from '../src/lib/format/format';
import { numberToWords, ordinalToWords, timeToWords } from '../src/lib/format/spoken';

// 6 November 2026, 14:30 UTC — every assertion passes an explicit time zone.
const instant = Date.UTC(2026, 10, 6, 14, 30);
const de = learningContext('de');
const en = learningContext('en');

describe('format context', () => {
  it('follows the learned language by default with Gregorian dates and Western digits', () => {
    expect(resolveFormatContext({ learningLanguage: 'de', interfaceLocale: 'fa', source: 'learning', interfaceCalendar: 'persian', interfaceDigits: 'native' }))
      .toEqual({ locale: 'de-DE', calendar: 'gregory', numberingSystem: 'latn', learning: true });
  });

  it('uses the interface locale with explicit calendar and digits when asked', () => {
    const fa = resolveFormatContext({ learningLanguage: 'de', interfaceLocale: 'fa', source: 'interface', interfaceCalendar: 'persian', interfaceDigits: 'native' });
    expect(fa).toEqual({ locale: 'fa', calendar: 'persian', numberingSystem: 'arabext', learning: false });
    expect(formatNumber(fa, 12)).toBe('۱۲');
    const ar = resolveFormatContext({ learningLanguage: 'de', interfaceLocale: 'ar', source: 'interface', interfaceCalendar: 'persian', interfaceDigits: 'latn' });
    expect(ar.calendar).toBe('gregory');
    expect(formatNumber(ar, 12)).toBe('12');
  });

  it('has one convention per learned language', () => {
    expect(Object.keys(LEARNING_FORMAT_TAGS).sort()).toEqual(['de', 'en', 'es', 'fr', 'it', 'pt', 'uk']);
  });
});

describe('formatters', () => {
  it('formats dates and times in the learned language', () => {
    expect(formatDate(de, instant, 'long', 'UTC')).toBe('6. November 2026');
    expect(formatDate(en, instant, 'long', 'UTC')).toBe('6 November 2026');
    expect(formatTime(de, instant, 'UTC')).toBe('14:30');
    expect(formatTime(en, instant, 'UTC')).toBe('14:30');
    expect(formatWeekday(de, instant, 'long', 'UTC')).toBe('Freitag');
  });

  it('formats numbers, currency, lists and relative time', () => {
    expect(formatNumber(de, 1234.56)).toBe('1.234,56');
    expect(formatNumber(en, 1234.56)).toBe('1,234.56');
    expect(formatCurrency(de, 1234.56)).toBe('1.234,56 €');
    expect(formatList(de, ['Anna', 'Ben', 'Cem'])).toBe('Anna, Ben und Cem');
    expect(formatRelative(de, -1, 'day')).toBe('gestern');
  });

  it('formats ordinals per language', () => {
    const cases: Array<[Parameters<typeof learningContext>[0], number, string]> = [
      ['de', 6, '6.'], ['en', 1, '1st'], ['en', 2, '2nd'], ['en', 3, '3rd'], ['en', 11, '11th'], ['en', 22, '22nd'],
      ['fr', 1, '1er'], ['fr', 6, '6e'], ['es', 6, '6.º'], ['it', 6, '6º'], ['uk', 6, '6-й']
    ];
    for (const [language, value, expected] of cases) expect(formatOrdinal(learningContext(language), value)).toBe(expected);
  });

  it('shows only the time for today', () => {
    expect(formatMoment(de, instant, instant + 60_000)).toMatch(/^\d{2}:\d{2}$/u);
    expect(formatMoment(de, instant, instant + 3 * 86_400_000)).toContain('Nov');
  });

  it('starts the week on Monday for the learned conventions and isolates LTR runs', () => {
    expect(weekStart(de)).toBe(1);
    expect(weekStart(en)).toBe(1);
    expect(isolateLtr('14:30')).toBe('⁦14:30⁩');
  });

  it('names every format kind', () => {
    const kinds = ['date', 'time', 'dateTime', 'weekday', 'number', 'currency', 'relative', 'list', 'ordinal'] as const satisfies readonly FormatKind[];
    expect(new Set(kinds).size).toBe(9);
  });
});

describe('spoken forms', () => {
  it('reads German numbers', () => {
    expect(numberToWords(0, 'de')).toBe('null');
    expect(numberToWords(1, 'de')).toBe('eins');
    expect(numberToWords(21, 'de')).toBe('einundzwanzig');
    expect(numberToWords(101, 'de')).toBe('einhunderteins');
    expect(numberToWords(1234.5, 'de')).toBe('eintausendzweihundertvierunddreißig Komma fünf');
    expect(numberToWords(2_000_001, 'de')).toBe('zwei Millionen eins');
    expect(numberToWords(-7, 'de')).toBe('minus sieben');
  });

  it('reads English numbers', () => {
    expect(numberToWords(21, 'en')).toBe('twenty-one');
    expect(numberToWords(1234.5, 'en')).toBe('one thousand two hundred and thirty-four point five');
    expect(numberToWords(1005, 'en')).toBe('one thousand and five');
  });

  it('reads ordinals', () => {
    expect(ordinalToWords(6, 'de')).toBe('sechste');
    expect(ordinalToWords(1, 'de')).toBe('erste');
    expect(ordinalToWords(20, 'de')).toBe('zwanzigste');
    expect(ordinalToWords(103, 'de')).toBe('einhundertdritte');
    expect(ordinalToWords(3, 'en')).toBe('third');
    expect(ordinalToWords(20, 'en')).toBe('twentieth');
    expect(ordinalToWords(42, 'en')).toBe('forty-second');
  });

  it('reads clock times colloquially', () => {
    expect(timeToWords(14, 30, 'de')).toBe('halb drei');
    expect(timeToWords(14, 15, 'de')).toBe('Viertel nach zwei');
    expect(timeToWords(14, 45, 'de')).toBe('Viertel vor drei');
    expect(timeToWords(13, 0, 'de')).toBe('ein Uhr');
    expect(timeToWords(12, 50, 'de')).toBe('zehn vor eins');
    expect(timeToWords(14, 30, 'en')).toBe('half past two');
    expect(timeToWords(9, 40, 'en')).toBe('twenty to ten');
  });
});

describe('sizes and speeds', () => {
  it('follow the format context', async () => {
    const { formatBytes } = await import('../src/lib/offline/storage');
    const { formatSpeed } = await import('../src/lib/offline/downloadSpeed');
    expect(formatBytes(1_250_000_000, de)).toBe('1,3 GB');
    expect(formatBytes(1_250_000_000, en)).toBe('1.3 GB');
    expect(formatSpeed(12_400_000, de)).toBe('12,4 MB/s');
  });
});
