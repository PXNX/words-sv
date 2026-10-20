import type { Language } from '#lib/data/vocabulary.js';

/*
 * Prepares story text for speech synthesis. Onomatopoeia ("klirr!", "toc, toc", "Miau!") is not
 * read out: the text is cut there and the beat's sound effect plays in its place. What is left is
 * split into sentences, so each one can get the intonation of its kind (question, exclamation, …).
 */
export type SpeechPart = { kind: 'say'; text: string } | { kind: 'sound' };
export type Intonation = 'statement' | 'question' | 'exclamation' | 'trailing';

const sounds: Record<Language, string> = {
  de: 'klirr|krach|klopf(?:[, ]+klopf)*|poch(?:[, ]+poch)*|miau|wuff|wau|ding[- ]dong|schepper',
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

// Sentences end in . ! ? or … followed by a space (or the end); neighbouring sentences of the same
// kind stay together, since every utterance adds a small pause.
export function sentenceGroups(text: string): string[] {
  const sentences = text.match(/.+?(?:[.!?…]+["“”»«„'’)]*(?=\s|$)|$)/gsu)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
  const groups: string[] = [];
  let previous: Intonation | null = null;
  for (const sentence of sentences) {
    const intonation = intonationOf(sentence);
    if (groups.length && intonation === previous) groups[groups.length - 1] += ` ${sentence}`;
    else groups.push(sentence);
    previous = intonation;
  }
  return groups;
}
