// How a word is asked in the word quiz. A round shows every word twice: first as recognition
// (pick the meaning, the heard word or the pictured word), then, once the word is no longer new,
// as recall (type it, write it from dictation or build it from letter tiles). Recall is harder
// and remembered longer, so it is kept for words that have been seen before. The learner's
// preferred style decides which kind comes first; the other channels still appear, because a word
// that was heard, seen and produced sticks better than one met the same way every time.
import type { LearningStyle } from '#lib/today/homeModes.js';

export const PROMPT_KINDS = ['meaning', 'listen', 'picture', 'type', 'dictation', 'build'] as const;
export type PromptKind = (typeof PROMPT_KINDS)[number];

/** Kinds answered by producing the word instead of choosing it. */
export function isRecall(kind: PromptKind): boolean {
  return kind === 'type' || kind === 'dictation' || kind === 'build';
}

export type PromptInput = {
  style: LearningStyle;
  /** 1 for a word's first card in the round, 2 for its second. */
  pass: 1 | 2;
  /** The card's position in the round, to alternate kinds without chance. */
  index: number;
  /** Successful reviews so far; 0 means the word is new to the learner. */
  repetitions: number;
  hasPicture: boolean;
  canHear: boolean;
  /** Short single words can be built from tiles. */
  buildable: boolean;
  /** What the first card asked, so the second one uses another channel. */
  firstKind?: PromptKind | undefined;
};

const RECOGNITION: Record<LearningStyle, readonly PromptKind[]> = {
  mixed: ['picture', 'meaning', 'listen'],
  hear: ['listen', 'picture', 'meaning'],
  see: ['picture', 'meaning', 'listen'],
  write: ['meaning', 'picture', 'listen'],
  do: ['picture', 'meaning', 'listen']
};
const RECALL: Record<LearningStyle, readonly PromptKind[]> = {
  mixed: ['build', 'type', 'dictation'],
  hear: ['dictation', 'build', 'type'],
  see: ['build', 'type', 'dictation'],
  write: ['type', 'dictation', 'build'],
  do: ['build', 'type', 'dictation']
};

function possible(kind: PromptKind, input: PromptInput): boolean {
  if (kind === 'picture') return input.hasPicture;
  if (kind === 'listen' || kind === 'dictation') return input.canHear;
  if (kind === 'build') return input.buildable;
  return true;
}

export function pickPromptKind(input: PromptInput): PromptKind {
  const recognition = RECOGNITION[input.style].filter((kind) => possible(kind, input));
  if (input.pass === 1) {
    // The preferred kind leads two cards out of three; the third rotates through the others.
    const rotate = input.style === 'mixed' ? input.index : input.index % 3 === 2 ? 1 + Math.floor(input.index / 3) : 0;
    return recognition[rotate % recognition.length] ?? 'meaning';
  }
  if (input.repetitions < 1) {
    // Still new: a second recognition card through another channel instead of recall.
    return recognition.find((kind) => kind !== input.firstKind) ?? recognition[0] ?? 'meaning';
  }
  const recall = RECALL[input.style].filter((kind) => possible(kind, input));
  const rotate = input.style === 'mixed' ? input.index : input.index % 3 === 2 ? 1 : 0;
  return recall[rotate % recall.length] ?? 'type';
}

const ARTICLES: Record<string, readonly string[]> = {
  de: ['der', 'die', 'das', 'ein', 'eine'],
  en: ['the', 'a', 'an', 'to'],
  fr: ['le', 'la', 'les', 'un', 'une'],
  es: ['el', 'la', 'los', 'las', 'un', 'una'],
  it: ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una'],
  pt: ['o', 'a', 'os', 'as', 'um', 'uma']
};

function tidy(text: string, language: string): string {
  let value = text.normalize('NFC').trim().toLocaleLowerCase(language).replace(/\s+/gu, ' ');
  const [first, ...rest] = value.split(' ');
  if (rest.length && first && (ARTICLES[language] ?? []).includes(first)) value = rest.join(' ');
  // French and Italian elide the article: l'ami.
  return value.replace(/^l['’]/u, '');
}
// Typed without a German keyboard: ae, oe, ue and ss stand for ä, ö, ü and ß.
function germanAscii(text: string): string {
  return text.replace(/ä/gu, 'ae').replace(/ö/gu, 'oe').replace(/ü/gu, 'ue').replace(/ß/gu, 'ss');
}
function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Letters apart, counting a swap of two neighbours as one slip. */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => (row === 0 ? col : col === 0 ? row : 0)));
  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      let best = Math.min(table[row - 1]![col]! + 1, table[row]![col - 1]! + 1, table[row - 1]![col - 1]! + cost);
      if (row > 1 && col > 1 && a[row - 1] === b[col - 2] && a[row - 2] === b[col - 1]) best = Math.min(best, table[row - 2]![col - 2]! + 1);
      table[row]![col] = best;
    }
  }
  return table[rows - 1]![cols - 1]!;
}

export type TypedResult = 'exact' | 'close' | 'wrong';

/**
 * Grades a typed word. Capitals and a leading article do not matter. `close` is right in
 * substance (a missing accent, or one slip in a word of five letters or more) and counts as
 * correct but shaky; anything further off is wrong.
 */
export function checkTyped(expected: string, typed: string, language: string): TypedResult {
  const want = tidy(expected, language);
  const got = tidy(typed, language);
  if (!got) return 'wrong';
  if (got === want) return 'exact';
  if (language === 'de' && germanAscii(got) === germanAscii(want)) return 'exact';
  if (plain(got) === plain(want)) return 'close';
  return want.length >= 5 && editDistance(got, want) <= 1 ? 'close' : 'wrong';
}

/** Whether a word can be built from tiles: one word, not too long, more than two letters. */
export function isBuildable(word: string): boolean {
  const letters = [...word.trim()];
  return letters.length >= 3 && letters.length <= 12 && !/[\s\-.'’/]/u.test(word.trim());
}

/** The word's letters in a shuffled order that is never the word itself (when it has two different letters). */
export function scrambleLetters(word: string, random: () => number = Math.random): string[] {
  const letters = [...word.trim()];
  if (new Set(letters).size < 2) return letters;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const shuffled = [...letters];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!];
    }
    if (shuffled.join('') !== letters.join('')) return shuffled;
  }
  // Chance kept returning the word: rotate it by one instead.
  return [...letters.slice(1), letters[0]!];
}
