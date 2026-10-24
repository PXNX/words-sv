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
const germanWords: Record<string, string> = { WLAN: 'Weh-Lahn', Ick: 'Ik', ick: 'ik' };

// The text as the voice should say it; what is shown on screen stays as written. `written` maps a
// position in the spoken text back to the written one, so the word being spoken can be highlighted.
export function pronounceable(sentence: string, language: Language): { text: string; written: (spoken: number) => number } {
  if (language !== 'de') return { text: sentence, written: (spoken) => spoken };
  // Every word said differently from how it is written: where it is in the spoken and the written text.
  const swaps: { spoken: number; said: number; written: number; length: number }[] = [];
  let shift = 0;
  const text = sentence.replace(/(?<!\p{L})\p{L}+(?!\p{L})/gu, (word, at: number) => {
    const said = germanWords[word] ?? (/^[A-ZÄÖÜ]{2,}$/u.test(word) ? [...word].map((letter) => germanLetters[letter]).join(' ') : word);
    if (said !== word) {
      swaps.push({ spoken: at + shift, said: said.length, written: at, length: word.length });
      shift += said.length - word.length;
    }
    return said;
  });
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
