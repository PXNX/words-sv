// Everyday number drills for the Alltag mode: clock times, dates, numbers and prices, written as
// digits and to be matched with how they are said ("14:30" → "halb drei", "3,50 €" → "drei Euro
// fünfzig"). German and English, from format/spoken.ts; distractors are nearby values, so the
// learner has to read the words, not just spot a different shape. Pure, seeded by `random`.
import { numberToWords, ordinalToWords, timeToWords, type SpokenLanguage } from '#lib/format/spoken.js';

export type EverydayKind = 'time' | 'date' | 'number' | 'price';
export type EverydayItem = { kind: EverydayKind; prompt: string; correct: string; options: string[] };

const MONTHS: Record<SpokenLanguage, string[]> = {
  de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

const int = (random: () => number, min: number, max: number) => min + Math.floor(random() * (max - min + 1));

function shuffle<T>(values: readonly T[], random: () => number): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other]!, copy[index]!];
  }
  return copy;
}

/** The correct words and three distinct near misses from `near` (tried until there are three). */
function withOptions(kind: EverydayKind, prompt: string, correct: string, near: () => string, random: () => number): EverydayItem {
  const wrong = new Set<string>();
  for (let attempt = 0; wrong.size < 3 && attempt < 40; attempt += 1) {
    const option = near();
    if (option !== correct) wrong.add(option);
  }
  return { kind, prompt, correct, options: shuffle([correct, ...wrong], random) };
}

const pad = (value: number) => String(value).padStart(2, '0');

export function timeItem(language: SpokenLanguage, random: () => number): EverydayItem {
  const hours = int(random, 0, 23);
  const minutes = [0, 15, 30, 45, 5, 10, 20, 40, 50, 55][int(random, 0, 9)]!;
  const shift = () => {
    const delta = [-60, 60, -30, 30, -15, 15, 120][int(random, 0, 6)]!;
    const total = (hours * 60 + minutes + delta + 24 * 60) % (24 * 60);
    return timeToWords(Math.floor(total / 60), total % 60, language);
  };
  return withOptions('time', `${pad(hours)}:${pad(minutes)}`, timeToWords(hours, minutes, language), shift, random);
}

function dateWords(language: SpokenLanguage, day: number, month: number): string {
  return language === 'de' ? `der ${ordinalToWords(day, 'de')} ${MONTHS.de[month]}` : `the ${ordinalToWords(day, 'en')} of ${MONTHS.en[month]}`;
}

export function dateItem(language: SpokenLanguage, random: () => number): EverydayItem {
  const day = int(random, 1, 28);
  const month = int(random, 0, 11);
  const prompt = language === 'de' ? `${day}.${month + 1}.` : `${MONTHS.en[month]!.slice(0, 3)} ${day}`;
  const near = () => (random() < 0.5 ? dateWords(language, Math.max(1, Math.min(28, day + [-1, 1, 10, -10, 2][int(random, 0, 4)]!)), month) : dateWords(language, day, (month + int(random, 1, 11)) % 12));
  return withOptions('date', prompt, dateWords(language, day, month), near, random);
}

export function numberItem(language: SpokenLanguage, random: () => number): EverydayItem {
  const value = int(random, 13, 999);
  // Swapped digits are the classic trap in German (einundzwanzig vs. zwölf … 12 vs. 21).
  const swapped = Number(String(value).split('').reverse().join(''));
  const near = () => numberToWords(random() < 0.4 && swapped !== value ? swapped : Math.max(1, value + [-10, 10, -1, 1, 100, -100][int(random, 0, 5)]!), language);
  return withOptions('number', String(value), numberToWords(value, language), near, random);
}

function priceWords(language: SpokenLanguage, euros: number, cents: number): string {
  if (language === 'de') return cents ? `${numberToWords(euros, 'de')} Euro ${numberToWords(cents, 'de')}` : `${numberToWords(euros, 'de')} Euro`;
  return cents ? `${numberToWords(euros, 'en')} euros ${numberToWords(cents, 'en')}` : `${numberToWords(euros, 'en')} euros`;
}

export function priceItem(language: SpokenLanguage, random: () => number): EverydayItem {
  const euros = int(random, 1, 49);
  const cents = [0, 50, 99, 20, 75, 10][int(random, 0, 5)]!;
  const prompt = language === 'de' ? `${euros},${pad(cents)} €` : `€${euros}.${pad(cents)}`;
  const near = () => (random() < 0.5 ? priceWords(language, Math.max(1, euros + [-1, 1, 10, -10][int(random, 0, 3)]!), cents) : priceWords(language, euros, [0, 50, 99, 20, 75, 10, 90][int(random, 0, 6)]!));
  return withOptions('price', prompt, priceWords(language, euros, cents), near, random);
}

const MAKERS: Record<EverydayKind, (language: SpokenLanguage, random: () => number) => EverydayItem> = { time: timeItem, date: dateItem, number: numberItem, price: priceItem };

/** `count` drills, cycling through the four kinds. */
export function everydayRound(language: SpokenLanguage, count: number, random: () => number): EverydayItem[] {
  const kinds = Object.keys(MAKERS) as EverydayKind[];
  return Array.from({ length: count }, (_, index) => MAKERS[kinds[index % kinds.length]!](language, random));
}
