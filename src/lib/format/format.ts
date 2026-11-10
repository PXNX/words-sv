// Locale-aware formatting. Dates, times, numbers and lists follow the learned language by
// default, so everyday exposure doubles as practice; learners can switch back to the app
// language in Settings. Feature code formats through this module, never with toLocaleString().
import type { LangCode } from '#lib/domain/types.js';

/** One fixed convention per learned language; adding a language means adding one entry. */
export const LEARNING_FORMAT_TAGS = {
  de: 'de-DE',
  en: 'en-GB',
  fr: 'fr-FR',
  it: 'it-IT',
  es: 'es-ES',
  pt: 'pt-PT',
  uk: 'uk-UA'
} as const satisfies Record<LangCode, string>;

export type FormatSource = 'learning' | 'interface';
export type FormatCalendar = 'gregory' | 'persian';
/** `latn` = 0–9, `native` = the interface locale's own digits (e.g. Persian or Arabic-Indic). */
export type FormatDigits = 'latn' | 'native';

export interface FormatContext {
  readonly locale: string;
  readonly calendar: FormatCalendar;
  readonly numberingSystem: string;
  /** True when the formatted values belong to the learned language (wrap them LTR in RTL UIs). */
  readonly learning: boolean;
}

export interface FormatPreferences {
  learningLanguage: LangCode;
  interfaceLocale: string;
  source: FormatSource;
  interfaceCalendar: FormatCalendar;
  interfaceDigits: FormatDigits;
}

const NATIVE_DIGITS: Readonly<Record<string, string>> = { fa: 'arabext', ar: 'arab', hi: 'deva', ml: 'mlym' };

export function nativeDigitsFor(locale: string): string | null {
  return NATIVE_DIGITS[locale.split('-')[0]!] ?? null;
}

/** Interface locales where the calendar and digit choice is offered explicitly. */
export function offersCalendarChoice(locale: string): boolean {
  return locale.split('-')[0] === 'fa';
}

export function resolveFormatContext(preferences: FormatPreferences): FormatContext {
  if (preferences.source === 'learning') {
    // Learned-language content: always Gregorian calendar and Western digits.
    return { locale: LEARNING_FORMAT_TAGS[preferences.learningLanguage], calendar: 'gregory', numberingSystem: 'latn', learning: true };
  }
  const native = nativeDigitsFor(preferences.interfaceLocale);
  return {
    locale: preferences.interfaceLocale,
    calendar: offersCalendarChoice(preferences.interfaceLocale) ? preferences.interfaceCalendar : 'gregory',
    numberingSystem: preferences.interfaceDigits === 'native' && native ? native : 'latn',
    learning: false
  };
}

/** Context for content in the learned language itself (exercises), regardless of the setting. */
export function learningContext(language: LangCode): FormatContext {
  return resolveFormatContext({ learningLanguage: language, interfaceLocale: 'en', source: 'learning', interfaceCalendar: 'gregory', interfaceDigits: 'latn' });
}

export type FormatKind = 'date' | 'time' | 'dateTime' | 'weekday' | 'number' | 'currency' | 'relative' | 'list' | 'ordinal';

const cache = new Map<string, unknown>();
function cached<T>(key: string, create: () => T): T {
  let value = cache.get(key) as T | undefined;
  if (!value) {
    value = create();
    cache.set(key, value);
  }
  return value;
}
function localeTag(context: FormatContext) {
  return `${context.locale}-u-ca-${context.calendar}-nu-${context.numberingSystem}`;
}

export type DateStyle = 'short' | 'medium' | 'long' | 'dayMonth' | 'dayMonthShort';
const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { dateStyle: 'short' },
  medium: { dateStyle: 'medium' },
  long: { dateStyle: 'long' },
  dayMonth: { day: 'numeric', month: 'long' },
  dayMonthShort: { day: 'numeric', month: 'short' }
};

function dateTimeFormat(context: FormatContext, options: Intl.DateTimeFormatOptions) {
  return cached(`dt|${localeTag(context)}|${JSON.stringify(options)}`, () => new Intl.DateTimeFormat(localeTag(context), options));
}
// The learned languages all use the 24-hour clock in their fixed conventions.
function hourOptions(context: FormatContext): Intl.DateTimeFormatOptions {
  return context.learning ? { hourCycle: 'h23' } : {};
}

export function formatDate(context: FormatContext, value: Date | number, style: DateStyle = 'long', timeZone?: string): string {
  return dateTimeFormat(context, { ...DATE_OPTIONS[style], ...(timeZone ? { timeZone } : {}) }).format(value);
}

export function formatTime(context: FormatContext, value: Date | number, timeZone?: string): string {
  return dateTimeFormat(context, { hour: '2-digit', minute: '2-digit', ...hourOptions(context), ...(timeZone ? { timeZone } : {}) }).format(value);
}

export function formatDateTime(context: FormatContext, value: Date | number, timeZone?: string): string {
  return dateTimeFormat(context, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...hourOptions(context), ...(timeZone ? { timeZone } : {}) }).format(value);
}

/** Today shows only the time, any other day the short date and time. */
export function formatMoment(context: FormatContext, value: number, now = Date.now()): string {
  const sameDay = new Date(value).toDateString() === new Date(now).toDateString();
  return sameDay ? formatTime(context, value) : formatDateTime(context, value);
}

export function formatWeekday(context: FormatContext, value: Date | number, width: 'narrow' | 'short' | 'long' = 'short', timeZone?: string): string {
  return dateTimeFormat(context, { weekday: width, ...(timeZone ? { timeZone } : {}) }).format(value);
}

export function formatNumber(context: FormatContext, value: number, options: Intl.NumberFormatOptions = {}): string {
  return cached(`n|${localeTag(context)}|${JSON.stringify(options)}`, () => new Intl.NumberFormat(localeTag(context), options)).format(value);
}

export function formatPercent(context: FormatContext, share: number, digits = 0): string {
  return formatNumber(context, share, { style: 'percent', maximumFractionDigits: digits });
}

export function formatCurrency(context: FormatContext, value: number, currency = 'EUR'): string {
  return formatNumber(context, value, { style: 'currency', currency });
}

export function formatRelative(context: FormatContext, value: number, unit: Intl.RelativeTimeFormatUnit): string {
  return cached(`r|${localeTag(context)}`, () => new Intl.RelativeTimeFormat(localeTag(context), { numeric: 'auto' })).format(value, unit);
}

export function formatList(context: FormatContext, items: readonly string[], type: Intl.ListFormatType = 'conjunction'): string {
  return cached(`l|${context.locale}|${type}`, () => new Intl.ListFormat(context.locale, { style: 'long', type })).format(items);
}

export function plural(context: FormatContext, count: number, type: Intl.PluralRuleType = 'cardinal'): Intl.LDMLPluralRule {
  return cached(`p|${context.locale}|${type}`, () => new Intl.PluralRules(context.locale, { type })).select(count);
}

const EN_ORDINAL: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'st', two: 'nd', few: 'rd', other: 'th' };

/** "6." (de), "6th" (en), "6e" (fr), "6.º" (es, pt), "6º" (it), "6-й" (uk). */
export function formatOrdinal(context: FormatContext, value: number): string {
  const number = formatNumber(context, value, { maximumFractionDigits: 0 });
  switch (context.locale.split('-')[0]) {
    case 'en': return `${number}${EN_ORDINAL[plural(context, value, 'ordinal')] ?? 'th'}`;
    case 'fr': return `${number}${value === 1 ? 'er' : 'e'}`;
    case 'es': case 'pt': return `${number}.º`;
    case 'it': return `${number}º`;
    case 'uk': return `${number}-й`;
    default: return `${number}.`;
  }
}

/** First day of the week (1 = Monday … 7 = Sunday) for calendars and recaps. */
export function weekStart(context: FormatContext): number {
  const locale = new Intl.Locale(context.locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
  return locale.getWeekInfo?.().firstDay ?? locale.weekInfo?.firstDay ?? 1;
}

/** Unicode isolate so learned-language numbers and dates keep their order inside RTL text. */
export function isolateLtr(text: string): string {
  return `⁦${text}⁩`;
}
