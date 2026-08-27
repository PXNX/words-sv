import { evaluateWordleGuess, normalizePlayableWord } from './modes.js';

export const WORDLE_STATE_KEY = 'wordcircle-wordle-state-v1';
const STATE_VERSION = 1;

/** @typedef {'correct' | 'present' | 'absent'} WordleMark */
/** @typedef {{ word: string, marks: WordleMark[] }} WordleEntry */
/** @typedef {{ language: string, level: string, candidates: string[] }} WordleContext */
/** @typedef {{ target: string, entries: WordleEntry[], guess: string }} WordleSnapshot */

/** @param {unknown} actual @param {WordleMark[]} expected */
function sameMarks(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((mark, index) => mark === expected[index]);
}

/**
 * Parse and validate a locally saved in-progress game. Completed and exhausted
 * games deliberately do not restore: the next load starts a fresh Wordle.
 */
/** @param {unknown} serialized @param {WordleContext} context @returns {WordleSnapshot | null} */
export function readWordleState(serialized, context) {
  const { language, level, candidates } = context;
  if (typeof serialized !== 'string' || !serialized) return null;

  try {
    const state = JSON.parse(serialized);
    if (!state || state.version !== STATE_VERSION || state.language !== language || state.level !== level) return null;
    if (typeof state.target !== 'string' || !candidates.includes(state.target)) return null;
    if (!Array.isArray(state.entries) || state.entries.length >= 6) return null;
    if (typeof state.guess !== 'string' || state.guess !== normalizePlayableWord(state.guess) || Array.from(state.guess).length > 4) return null;

    const used = new Set();
    for (const entry of state.entries) {
      if (!entry || typeof entry.word !== 'string' || !Array.isArray(entry.marks)) return null;
      if (!candidates.includes(entry.word) || entry.word === state.target || used.has(entry.word)) return null;
      if (!sameMarks(entry.marks, evaluateWordleGuess(state.target, entry.word))) return null;
      used.add(entry.word);
    }

    return {
      target: state.target,
      guess: state.guess,
      entries: state.entries.map(/** @param {WordleEntry} entry */ (entry) => ({ word: entry.word, marks: [...entry.marks] }))
    };
  } catch {
    return null;
  }
}

/** @param {WordleSnapshot & { language: string, level: string }} state */
export function writeWordleState(state) {
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
