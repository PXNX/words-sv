// The app already saves an unfinished round for most modes; the start page only used to surface the
// reading and story ones. This module reads those saved rounds and turns them into "keep playing"
// links. It is deliberately a plain function over a storage-like object so it can be unit tested
// without a browser and without importing any game component.
import { HANGMAN_STATE_KEY, isHangmanLost, isHangmanWon } from '#lib/hangman/hangman.js';
import { WORDLE_STATE_KEY } from '#lib/wordle/wordleState.js';

export type ContinuationId = 'circle' | 'wordle' | 'hangman' | 'pronunciation' | 'listen';

export type Continuation = {
	id: ContinuationId;
	href: string;
	/** A short, language-neutral detail such as "2/6" or the word being practised. */
	detail: string;
	savedAt: number;
};

export type ContinuationInput = {
	language: string;
	level: string;
	includeLowerVocabulary: boolean;
	read: (key: string) => string | null;
};

const CIRCLE_KEY = 'wordcircle-active-round-v1';
const PRONUNCIATION_KEY = 'wordcircle-pronunciation-progress-v1';
const LISTEN_KEY = 'wordcircle-listen-progress-v1';

function parse(read: ContinuationInput['read'], key: string): Record<string, unknown> | null {
	try {
		const value = read(key);
		if (!value) return null;
		const parsed: unknown = JSON.parse(value);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
	} catch {
		return null;
	}
}

function strings(value: unknown): string[] | null {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value as string[] : null;
}

function fingerprint(input: ContinuationInput): string {
	return `${input.language}|${input.level}|${input.includeLowerVocabulary}`;
}

function circleContinuation(input: ContinuationInput): Continuation | null {
	const saved = parse(input.read, CIRCLE_KEY);
	if (!saved || saved.version !== 1 || saved.language !== input.language) return null;
	const words = strings(saved.words);
	const solved = strings(saved.solvedWords);
	const round = Number(saved.roundNumber);
	if (!words?.length || !solved || !Number.isSafeInteger(round) || round < 1 || solved.length >= words.length) return null;
	const startedAt = Number(saved.startedAt);
	return {
		id: 'circle',
		href: '/circle',
		detail: `${new Set(solved).size}/${words.length}`,
		savedAt: Number.isSafeInteger(startedAt) && startedAt > 0 ? startedAt : 0
	};
}

function wordleContinuation(input: ContinuationInput): Continuation | null {
	const saved = parse(input.read, WORDLE_STATE_KEY);
	if (!saved || saved.version !== 1 || saved.language !== input.language || saved.level !== input.level) return null;
	if (typeof saved.target !== 'string' || typeof saved.guess !== 'string' || !Array.isArray(saved.entries)) return null;
	const guesses = saved.entries.filter((entry) => entry && typeof entry === 'object' && typeof (entry as { word?: unknown }).word === 'string').length;
	// Six guesses are allowed; a full set means the round is over and must not be restored.
	if (guesses >= 6) return null;
	return { id: 'wordle', href: '/wordle', detail: `${guesses}/6`, savedAt: 0 };
}

function hangmanContinuation(input: ContinuationInput): Continuation | null {
	const saved = parse(input.read, HANGMAN_STATE_KEY);
	if (!saved || saved.version !== 1 || saved.language !== input.language || saved.level !== input.level) return null;
	if (typeof saved.target !== 'string' || !saved.target) return null;
	const guessed = strings(saved.guessed);
	if (!guessed || isHangmanWon(saved.target, guessed) || isHangmanLost(saved.target, guessed)) return null;
	return { id: 'hangman', href: '/hangman', detail: `${guessed.length}`, savedAt: 0 };
}

function pronunciationContinuation(input: ContinuationInput): Continuation | null {
	const saved = parse(input.read, PRONUNCIATION_KEY);
	if (!saved || saved.fingerprint !== fingerprint(input) || typeof saved.word !== 'string' || !saved.word) return null;
	return { id: 'pronunciation', href: '/pronunciation', detail: saved.word, savedAt: 0 };
}

function listenContinuation(input: ContinuationInput): Continuation | null {
	const saved = parse(input.read, LISTEN_KEY);
	if (!saved || saved.fingerprint !== fingerprint(input) || typeof saved.storyId !== 'string') return null;
	const position = Number(saved.position);
	if (!Number.isFinite(position) || position <= 1) return null;
	return { id: 'listen', href: '/listen', detail: saved.storyId, savedAt: 0 };
}

const READERS: readonly ((input: ContinuationInput) => Continuation | null)[] = [
	circleContinuation,
	wordleContinuation,
	hangmanContinuation,
	pronunciationContinuation,
	listenContinuation
];

/** Every unfinished round still on this device, most recently started first. */
export function readContinuations(input: ContinuationInput): Continuation[] {
	return READERS.map((read) => read(input))
		.filter((entry): entry is Continuation => entry !== null)
		.sort((left, right) => right.savedAt - left.savedAt);
}
