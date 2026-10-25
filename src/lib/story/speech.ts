import type { Language } from '#lib/data/vocabulary.js';

/*
 * Prepares story text for speech synthesis. Onomatopoeia ("klirr!", "toc, toc", "Miau!") is not
 * read out: the text is cut there and the beat's sound effect plays in its place. What is left is
 * split into sentences, so each one can get the intonation of its kind (question, exclamation, …).
 */
export type SpeechPart = { kind: 'say'; text: string } | { kind: 'sound' };
export type Intonation = 'statement' | 'question' | 'exclamation' | 'trailing';

const sounds: Record<Language, string> = {
  de: 'klirr|krach|klopf(?:[, ]+klopf)*|poch(?:[, ]+poch)*|miau|wuff|wau|ding[- ]dong|schepper|piep(?:[, ]+piep)*|tschilp|muh+|wieher+|törö+|s{3,}|zisch|brumm+|wusch',
  en: 'crash|knock(?:[, ]+knock)*|meow|miaow|woof|ding[- ]dong|bang',
  fr: 'crac|toc(?:[, ]+toc)*|miaou|ouaf|wouf|ding[- ]dong|boum',
  it: 'crash|toc(?:[, ]+toc)*|miao|bau|din[- ]don',
  es: 'crac|toc(?:[, ]+toc)*|miau|guau|din[- ]don',
  pt: 'crash|toc(?:[, ]+toc)*|miau|au(?:[, ]+au)*|ding[- ]dong',
  uk: 'дзень|бах|тук(?:-тук)*|няв|гав|дзелень'
};
const patterns = Object.fromEntries(Object.entries(sounds).map(([language, words]) => [
  language,
  // The word with its own exclamation marks, commas or dots, and an opening "¡" in Spanish.
  new RegExp(`¡?(?<!\\p{L})(?:${words})(?!\\p{L})[\\s!.,…]*`, 'giu')
])) as Record<Language, RegExp>;

// Dashes, commas and spaces left dangling where a sound was cut out.
function tidy(text: string) {
  return text.replace(/^[\s,–—-]+|[\s,–—-]+$/gu, '');
}

export function splitSounds(text: string, language: Language): SpeechPart[] {
  const parts: SpeechPart[] = [];
  const pattern = patterns[language];
  let from = 0;
  const pushText = (chunk: string) => {
    const clean = tidy(chunk);
    if (/\p{L}/u.test(clean)) parts.push({ kind: 'say', text: clean });
  };
  for (const match of text.matchAll(pattern)) {
    pushText(text.slice(from, match.index));
    // "Miau! Miau!" is one sound, not two in a row.
    if (parts.at(-1)?.kind !== 'sound') parts.push({ kind: 'sound' });
    from = (match.index ?? 0) + match[0].length;
  }
  pushText(text.slice(from));
  return parts;
}

export function intonationOf(sentence: string): Intonation {
  const end = sentence.replace(/["“”»«„'’)\s]+$/u, '');
  if (/\?$/.test(end)) return 'question';
  if (/!$/.test(end)) return 'exclamation';
  if (/(…|\.\.\.)$/.test(end)) return 'trailing';
  return 'statement';
}

// Sentences end in . ! ? or … followed by a space (or the end). Each one is spoken on its own, with
// its own melody and a breath before the next.
export function sentences(text: string): string[] {
  return text.match(/.+?(?:[.!?…]+["“”»«„'’)]*(?=\s|$)|$)/gsu)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
}

// A spaced dash is a thinking break, not a sentence end: both sides are spoken as their own phrase,
// with a short silence between them.
export function speechChunks(text: string): string[] {
  return text.split(/\s+[—–]\s+/u).map(tidy).filter((chunk) => /\p{L}/u.test(chunk));
}

// German letter names, so "ICE" is read "Ih Zeh Eh" and not with the English "I C E" the voices
// fall back to. Abbreviations spoken as a word go in `germanWords`, as does Berlin dialect that the
// voices would otherwise spell out letter by letter ("Ick" → "I C K").
const germanLetters: Record<string, string> = {
  A: 'Ah', B: 'Beh', C: 'Zeh', D: 'Deh', E: 'Eh', F: 'Eff', G: 'Geh', H: 'Hah', I: 'Ih', J: 'Jott', K: 'Kah', L: 'Ell', M: 'Emm',
  N: 'Enn', O: 'Oh', P: 'Peh', Q: 'Kuh', R: 'Err', S: 'Ess', T: 'Teh', U: 'Uh', V: 'Fau', W: 'Weh', X: 'Ix', Y: 'Üpsilon', Z: 'Zett',
  Ä: 'Äh', Ö: 'Öh', Ü: 'Üh'
};
const germanWords: Record<string, string> = {
  WLAN: 'Weh-Lahn', Ick: 'Ik', ick: 'ik',
  // "Röschen" is the diminutive of "Rose": Rös-chen, not Rö-schen. The hyphen keeps the s and ch
  // apart, so the voice does not turn them into the "sch" sound.
  Röschen: 'Rös-chen', Dornröschen: 'Dornrös-chen', Dornröschenschloss: 'Dornrös-chenschloss'
};

const germanUnits = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const germanStems = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
const germanTens = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];

function germanBelowHundred(value: number): string {
  if (value < 20) return germanUnits[value];
  const unit = value % 10;
  const ten = germanTens[Math.floor(value / 10)];
  return unit ? `${germanStems[unit]}und${ten}` : ten;
}
function germanBelowThousand(value: number): string {
  if (value < 100) return germanBelowHundred(value);
  const hundred = Math.floor(value / 100);
  const rest = value % 100;
  return `${germanStems[hundred]}hundert${rest ? germanBelowHundred(rest) : ''}`;
}
function germanBelowMillion(value: number): string {
  if (value < 1000) return germanBelowThousand(value);
  const thousand = Math.floor(value / 1000);
  const rest = value % 1000;
  return `${germanBelowThousand(thousand)}tausend${rest ? germanBelowThousand(rest) : ''}`;
}
function germanNumber(value: number): string {
  if (value < 1_000_000) return germanBelowMillion(value);
  const million = Math.floor(value / 1_000_000);
  const rest = value % 1_000_000;
  const words = million === 1 ? 'eine Million' : `${germanBelowThousand(million)} Millionen`;
  return rest ? `${words} ${germanBelowMillion(rest)}` : words;
}

export function pronounceable(sentence: string, language: Language): { text: string; written: (spoken: number) => number } {
  if (language === 'en') {
    return { text: sentence.replace(/(\d)\.(\d{3})/g, '$1,$2'), written: (spoken) => spoken };
  }
  if (language !== 'de') return { text: sentence, written: (spoken) => spoken };
  // Words and numbers that are said differently from how they are written. Grouped German numbers
  // ("3 800", "240.000") become words, so no voice can read the separator as "Punkt" or split them.
  const tokenPattern = /(?<!\p{L})(?:\d{1,3}(?:[.\s\u00A0\u202F]\d{3})+(?!\d)|\d{4,}|\p{L}+)(?!\p{L})/gu;
  const swaps: { spoken: number; said: number; written: number; length: number }[] = [];
  let text = '';
  let last = 0;
  for (const match of sentence.matchAll(tokenPattern)) {
    const original = match[0];
    const at = match.index ?? 0;
    text += sentence.slice(last, at);
    let said = original;
    if (/^\d/.test(original)) {
      const digits = original.replace(/[.\s\u00A0\u202F]/g, '');
      const value = Number(digits);
      if (Number.isSafeInteger(value) && value >= 1000) said = germanNumber(value);
    } else {
      said = germanWords[original] ?? (/^[A-ZÄÖÜ]{2,}$/u.test(original) ? [...original].map((letter) => germanLetters[letter]).join(' ') : original);
    }
    if (said !== original) {
      swaps.push({ spoken: text.length, said: said.length, written: at, length: original.length });
    }
    text += said;
    last = at + original.length;
  }
  text += sentence.slice(last);
  return {
    text,
    written: (spoken) => {
      let offset = 0;
      for (const swap of swaps) {
        if (spoken < swap.spoken) break;
        // Anywhere inside "Ih Zeh Eh" is the written "ICE".
        if (spoken < swap.spoken + swap.said) return swap.written;
        offset = swap.written + swap.length - (swap.spoken + swap.said);
      }
      return spoken + offset;
    }
  };
}

export type Word = { start: number; end: number };
// The words of a text with their positions; numbers and contractions ("geht’s") count as one word.
export function wordsOf(text: string): Word[] {
  return [...text.matchAll(/[\p{L}\p{N}](?:[\p{L}\p{N}’'-]*[\p{L}\p{N}])?/gu)].map((match) => ({ start: match.index, end: match.index + match[0].length }));
}

export const pauseAfter: Record<Intonation, number> = { statement: 520, question: 620, exclamation: 580, trailing: 750 };
