import { isLetterWord, normalizePlayableWord } from '../wordle/wordleWords';
import type { KeyboardLayout } from '../wordle/keyboardLayouts';

/** Wrong letters allowed before the figure is complete and the round is lost. */
export const HANGMAN_LIVES = 6;
export const HANGMAN_STATE_KEY = 'wordcircle-hangman-state-v1';
const STATE_VERSION = 1;

/** Every letter the on-screen keyboard offers for this layout. */
export function layoutLetters(layout: KeyboardLayout): Set<string> {
  return new Set([...layout.rows.flatMap((row) => Array.from(row)), ...layout.extras]);
}

/**
 * Words that can be played: four to eight letters, and only letters the keyboard can type, so a
 * word like "CAFÉ" on the German keyboard (which has no É) never becomes an unwinnable round.
 */
export function hangmanCandidates(words: string[], layout: KeyboardLayout): string[] {
  const letters = layoutLetters(layout);
  return [...new Set(words.map(normalizePlayableWord).filter((word) => isLetterWord(word, 4, 8) && Array.from(word).every((letter) => letters.has(letter))))];
}

export function wrongLetters(target: string, guessed: readonly string[]): string[] {
  const letters = new Set(Array.from(target));
  return guessed.filter((letter) => !letters.has(letter));
}

export function isHangmanWon(target: string, guessed: readonly string[]): boolean {
  if (!target) return false;
  const guessedSet = new Set(guessed);
  return Array.from(target).every((letter) => guessedSet.has(letter));
}

export function isHangmanLost(target: string, guessed: readonly string[]): boolean {
  return wrongLetters(target, guessed).length >= HANGMAN_LIVES && !isHangmanWon(target, guessed);
}

/**
 * Maps a physical key press to a keyboard letter, or null when it is not one of the layout's
 * letters. Handles lowercase, dead-key composed letters (é) and the German ß, which plays as "SS"
 * in the uppercased words and so is not a letter of its own here.
 */
export function letterFromKey(key: string, layout: KeyboardLayout): string | null {
  const letter = key.normalize('NFC').toLocaleUpperCase();
  if (Array.from(letter).length !== 1) return null;
  return layoutLetters(layout).has(letter) ? letter : null;
}

export type HangmanSnapshot = { target: string; guessed: string[] };

/**
 * Parses a saved round. Only an unfinished round for the same language and level, whose word is
 * still a candidate and whose guesses are distinct keyboard letters, comes back; anything else
 * starts a fresh word.
 */
export function readHangmanState(serialized: string | null | undefined, context: { language: string; level: string; candidates: readonly string[]; layout: KeyboardLayout }): HangmanSnapshot | null {
  if (typeof serialized !== 'string' || !serialized) return null;
  try {
    const state = JSON.parse(serialized) as Partial<HangmanSnapshot & { version: number; language: string; level: string }>;
    if (!state || state.version !== STATE_VERSION || state.language !== context.language || state.level !== context.level) return null;
    if (typeof state.target !== 'string' || !context.candidates.includes(state.target)) return null;
    if (!Array.isArray(state.guessed)) return null;
    const letters = layoutLetters(context.layout);
    const guessed = state.guessed;
    if (!guessed.every((letter) => typeof letter === 'string' && letters.has(letter)) || new Set(guessed).size !== guessed.length) return null;
    if (isHangmanWon(state.target, guessed) || isHangmanLost(state.target, guessed)) return null;
    return { target: state.target, guessed: [...guessed] };
  } catch {
    return null;
  }
}

export function writeHangmanState(state: HangmanSnapshot & { language: string; level: string }): string {
  return JSON.stringify({ version: STATE_VERSION, language: state.language, level: state.level, target: state.target, guessed: [...state.guessed] });
}
