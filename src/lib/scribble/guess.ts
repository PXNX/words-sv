/*
 * When a Scribble guess counts: case, accents, punctuation and a leading article do not matter, and
 * one typo is fine in a long word. No imports, so the API server (server/_lib/scribbleGame.ts) uses
 * the very same rules as the app.
 */
const ARTICLES = new Set(['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'the', 'a', 'an', 'to']);

/** Lowercase, without accents, punctuation or a leading article: "Die Äpfel!" → "apfel". */
export function foldGuess(value: string): string {
  const words = value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .replaceAll('ß', 'ss')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/u)
    .filter(Boolean);
  if (words.length > 1 && ARTICLES.has(words[0]!)) words.shift();
  return words.join(' ');
}

/** Levenshtein distance, stopping early once it is above `limit`. */
export function editDistance(left: string, right: string, limit = 3): number {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= right.length; j += 1) {
      const value = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + (left[i - 1] === right[j - 1] ? 0 : 1));
      current.push(value);
      best = Math.min(best, value);
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[right.length]!;
}

export type GuessResult = 'right' | 'close' | 'wrong';

/** Right when it matches an answer (one typo allowed from 6 letters), close when it is one or two letters off. */
export function checkGuess(guess: string, answers: readonly string[]): GuessResult {
  const folded = foldGuess(guess);
  if (!folded) return 'wrong';
  let close = false;
  for (const answer of answers) {
    const target = foldGuess(answer);
    if (!target) continue;
    if (folded === target) return 'right';
    const distance = editDistance(folded, target, 2);
    if (distance === 1 && target.length >= 6) return 'right';
    if (distance <= 2 && target.length >= 4) close = true;
  }
  return close ? 'close' : 'wrong';
}

