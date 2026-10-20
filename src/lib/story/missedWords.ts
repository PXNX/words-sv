/*
 * Words the learner got wrong anywhere in the app (word quiz, grammar, a lost Wordle or Hangman
 * round). Generated stories practise these first; answering one right in a story clears it.
 */
const MISSED_WORDS_KEY = 'wordcircle-missed-words-v1';
const MAX_MISSED_WORDS = 60;

export type MissedWord = { word: string; count: number; at: number };

function storageKey(language: string) {
  return `${MISSED_WORDS_KEY}:${language}`;
}

export function readMissedWords(language: string): MissedWord[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(language)) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is MissedWord => Boolean(entry) && typeof entry.word === 'string' && typeof entry.count === 'number' && typeof entry.at === 'number');
  } catch {
    return [];
  }
}

function writeMissedWords(language: string, words: MissedWord[]) {
  try {
    localStorage.setItem(storageKey(language), JSON.stringify(words.slice(0, MAX_MISSED_WORDS)));
  } catch { /* Storage is a convenience; a full quota must not break play. */ }
}

export function recordMissedWord(language: string, word: string) {
  if (typeof localStorage === 'undefined' || !word) return;
  const key = word.toLocaleUpperCase();
  const words = readMissedWords(language);
  const previous = words.find((entry) => entry.word === key);
  const updated: MissedWord = { word: key, count: (previous?.count ?? 0) + 1, at: Date.now() };
  writeMissedWords(language, [updated, ...words.filter((entry) => entry.word !== key)]);
}

export function clearMissedWord(language: string, word: string) {
  if (typeof localStorage === 'undefined') return;
  const key = word.toLocaleUpperCase();
  const words = readMissedWords(language);
  if (words.some((entry) => entry.word === key)) writeMissedWords(language, words.filter((entry) => entry.word !== key));
}
