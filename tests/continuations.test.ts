import { describe, expect, test } from 'vitest';
import { readContinuations, type ContinuationInput } from '../src/lib/today/continuations.js';
import { HANGMAN_STATE_KEY, writeHangmanState } from '../src/lib/hangman/hangman.js';
import { WORDLE_STATE_KEY, writeWordleState } from '../src/lib/wordle/wordleState.js';

const fingerprint = 'de|a1|false';

function input(saved: Record<string, string>): ContinuationInput {
	return {
		language: 'de',
		level: 'a1',
		includeLowerVocabulary: false,
		read: (key) => saved[key] ?? null
	};
}

describe('readContinuations', () => {
	test('an unfinished crossword continues with its solved count', () => {
		const saved = {
			'wordcircle-active-round-v1': JSON.stringify({
				version: 1, language: 'de', roundNumber: 2, words: ['HAUS', 'BUCH', 'STADT'], letters: ['H', 'A', 'U', 'S'], placements: [], solvedWords: ['HAUS'], startedAt: 1234
			})
		};
		expect(readContinuations(input(saved))).toEqual([{ id: 'circle', href: '/circle', detail: '1/3', savedAt: 1234 }]);
	});

	test('a fully solved crossword is not offered again', () => {
		const saved = {
			'wordcircle-active-round-v1': JSON.stringify({
				version: 1, language: 'de', roundNumber: 1, words: ['HAUS'], letters: ['H', 'A', 'U', 'S'], placements: [], solvedWords: ['HAUS']
			})
		};
		expect(readContinuations(input(saved))).toEqual([]);
	});

	test('wordle and hangman only continue while the round is still open', () => {
		const saved = {
			[WORDLE_STATE_KEY]: writeWordleState({ language: 'de', level: 'a1', target: 'HAUS', entries: [{ word: 'BUCH', marks: [] }], guess: '' }),
			[HANGMAN_STATE_KEY]: writeHangmanState({ language: 'de', level: 'a1', target: 'HAUS', guessed: ['H', 'A'] })
		};
		expect(readContinuations(input(saved)).map((entry) => [entry.id, entry.detail])).toEqual([['wordle', '1/6'], ['hangman', '2']]);
	});

	test('pronunciation and listening only continue for the same language and level', () => {
		const saved = {
			'wordcircle-pronunciation-progress-v1': JSON.stringify({ fingerprint, word: 'HAUS', heard: '', matched: false }),
			'wordcircle-listen-progress-v1': JSON.stringify({ fingerprint, storyId: 'markt', position: 12 })
		};
		expect(readContinuations(input(saved)).map((entry) => [entry.id, entry.detail])).toEqual([['pronunciation', 'HAUS'], ['listen', 'markt']]);
		expect(readContinuations({ ...input(saved), language: 'en' })).toEqual([]);
	});

	test('broken or foreign data is ignored', () => {
		expect(readContinuations(input({ [WORDLE_STATE_KEY]: 'not json', [HANGMAN_STATE_KEY]: JSON.stringify({ version: 1, language: 'en', level: 'a1', target: 'HAUS', guessed: [] }) }))).toEqual([]);
	});
});
