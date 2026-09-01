import { evaluateWordleGuess, normalizePlayableWord } from './wordleWords';
import type { WordleMark } from './keyboardLayouts';

export const WORDLE_STATE_KEY = 'wordcircle-wordle-state-v1';
const STATE_VERSION = 1;

export type WordleEntry = { word: string; marks: WordleMark[] };
export type WordleContext = { language: string; level: string; wordLength?: number; candidates: string[] };
export type WordleSnapshot = { target: string; entries: WordleEntry[]; guess: string };

function sameMarks(actual: unknown, expected: WordleMark[]): boolean {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((mark, index) => mark === expected[index]);
}

/**
 * Parse and validate a locally saved in-progress game. Completed and exhausted
 * games deliberately do not restore: the next load starts a fresh Wordle.
 */
export function readWordleState(serialized: string | null | undefined, context: WordleContext): WordleSnapshot | null {
  const { language, level, wordLength = 5, candidates } = context;
  if (typeof serialized !== 'string' || !serialized) return null;

  try {
    const state = JSON.parse(serialized) as Partial<WordleSnapshot & { version: number; language: string; level: string }>;
    if (!state || state.version !== STATE_VERSION || state.language !== language || state.level !== level) return null;
    if (typeof state.target !== 'string' || !candidates.includes(state.target)) return null;
    if (!Array.isArray(state.entries) || state.entries.length >= 6) return null;
    if (typeof state.guess !== 'string' || state.guess !== normalizePlayableWord(state.guess) || Array.from(state.guess).length >= wordLength) return null;

    const used = new Set<string>();
    for (const entry of state.entries) {
      if (!entry || typeof entry.word !== 'string' || !Array.isArray(entry.marks)) return null;
      if (!candidates.includes(entry.word) || entry.word === state.target || used.has(entry.word)) return null;
      if (Array.from(entry.word).length !== wordLength || !sameMarks(entry.marks, evaluateWordleGuess(state.target, entry.word))) return null;
      used.add(entry.word);
    }

    return {
      target: state.target,
      guess: state.guess,
      entries: state.entries.map((entry) => ({ word: entry.word, marks: [...entry.marks] }))
    };
  } catch {
    return null;
  }
}

export function writeWordleState(state: WordleSnapshot & { language: string; level: string }): string {
  const { language, level, target, entries, guess } = state;
  return JSON.stringify({
    version: STATE_VERSION,
    language,
    level,
    target,
    entries: entries.map((entry) => ({ word: entry.word, marks: [...entry.marks] })),
    guess
  });
}
