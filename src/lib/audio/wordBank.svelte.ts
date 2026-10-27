import { settings } from '#lib/state/settings.svelte.js';
import { spokenWord, wordPools, type Language, type VocabularyLevel } from '#lib/data/vocabulary.js';
import {
	clipFromPcm,
	naturalReady,
	naturalSupported,
	pcmFromClip,
	playNatural,
	prepareNatural,
	synthesizeNaturalOnce,
	type NaturalClip
} from '#lib/story/naturalVoices.svelte.js';
import { listWordAudioKeys, readWordAudio, writeWordAudio, deleteWordAudio, type StoredWordAudio } from './wordAudioStore.js';
import { orderWords } from './wordBankWords.js';

/*
 * The shared word bank: every word of a level, spoken once by the natural voice model and kept on
 * the device. The vocabulary quiz and the listening mode both generate into it and both read out of
 * it, so nothing is rendered twice and a word stays available after a reload.
 *
 * Generating a whole level takes a while, so the bank resumes where it stopped: a session only
 * renders the words that are still missing, with the current round's words first.
 */

export type WordBankStatus = 'idle' | 'loading' | 'ready' | 'failed';

/** What each model/language/level combination has generated so far; the loaders read this. */
export const wordBankState = $state<{
	status: Partial<Record<string, WordBankStatus>>;
	done: Partial<Record<string, number>>;
	total: Partial<Record<string, number>>;
}>({ status: {}, done: {}, total: {} });

export function wordBankStateKey(language: Language, level: VocabularyLevel) {
	return `${settings.clipVoiceKey}|${language}|${level}`;
}

function wordAudioKey(language: Language, word: string) {
	return `${settings.clipVoiceKey}|${language}|${word}`;
}

// Decoded clips are only kept for the words that were played lately: a full level would otherwise
// hold hundreds of audio buffers in memory.
const MEMORY_LIMIT = 42;
const memory = new Map<string, NaturalClip>();

function rememberClip(key: string, clip: NaturalClip) {
	memory.set(key, clip);
	while (memory.size > MEMORY_LIMIT) {
		const oldest = memory.keys().next().value;
		if (oldest === undefined) break;
		memory.delete(oldest);
	}
}

// A word that exists in the store is known without touching IndexedDB again.
const known = new Set<string>();
let knownSignature = '';
let knownTask: Promise<void> | null = null;

async function loadKnown(language: Language) {
	// Make sure every caller waits for the same scan, even while a scan is running.
	if (knownSignature === signatureFor(language) && knownTask) return knownTask;
	if (knownSignature === signatureFor(language)) return;
	knownSignature = signatureFor(language);
	known.clear();
	const scan = (async () => {
		const keys = await listWordAudioKeys();
		const prefix = `${signatureFor(language)}|`;
		for (const key of keys) {
			if (key.startsWith(prefix)) known.add(key);
		}
		// Audio of an older Piper model is dead weight; drop it while the keys are at hand. Edge audio
		// stays, so switching voices back and forth to compare them doesn't throw work away.
		const stale = keys.filter((key) => {
			const [model, entryLanguage] = key.split('|');
			return entryLanguage === language && model !== 'edge' && model !== settings.naturalModel;
		});
		if (stale.length) await deleteWordAudio(stale);
	})();
	knownTask = scan;
	try {
		await scan;
	} finally {
		if (knownTask === scan) knownTask = null;
	}
}

function signatureFor(language: Language) {
	return `${settings.clipVoiceKey}|${language}`;
}

let generation = 0;

/** Stops the running generation (navigation, the loader's "continue", a language change). */
export function cancelWordBank() {
	generation += 1;
	for (const [key, status] of Object.entries(wordBankState.status)) {
		if (status === 'loading') wordBankState.status[key] = 'idle';
	}
}

export function hasWordAudio(language: Language, word: string) {
	const key = wordAudioKey(language, word);
	return known.has(key) || memory.has(key);
}

/** Reads a word clip from the in-memory cache or the persistent store. */
export async function loadWordClip(language: Language, word: string): Promise<NaturalClip | null> {
	const key = wordAudioKey(language, word);
	const cached = memory.get(key);
	if (cached) return cached;
	const stored = await readWordAudio(key);
	if (!stored) return null;
	const samples = stored.samples instanceof Int16Array ? stored.samples : new Int16Array(stored.samples as unknown as number[]);
	const clip = clipFromPcm(samples, stored.sampleRate, stored.playbackRate, stored.volume);
	rememberClip(key, clip);
	known.add(key);
	return clip;
}

/** Plays a word in the narrator's natural voice; null lets the caller fall back to the browser voice. */
export async function playWordClip(language: Language, word: string, volume = 1) {
	const clip = await loadWordClip(language, word);
	if (!clip) return null;
	return playNatural(clip, volume);
}

/**
 * Renders every word of a level that is still missing. `priority` words (the current round) are
 * rendered first. Resolves with how many clips were newly generated.
 */
export async function prepareWordBank(language: Language, level: VocabularyLevel, priority: readonly string[] = []) {
	if (!naturalSupported()) return 0;
	const pool = wordPools[language]?.[level] ?? [];
	const key = wordBankStateKey(language, level);
	wordBankState.total[key] = pool.length;
	if (!pool.length) {
		wordBankState.status[key] = 'idle';
		return 0;
	}
	const run = ++generation;
	wordBankState.status[key] = 'loading';
	// Only the run that is still current may touch the shared state; a cancelled run stays silent.
	const owned = () => run === generation;
	try {
		await prepareNatural(language);
		if (!owned()) return 0;
		if (!naturalReady(language)) {
			wordBankState.status[key] = 'failed';
			return 0;
		}
		await loadKnown(language);
		if (!owned()) return 0;
		const ordered = orderWords(pool, priority);
		let done = ordered.reduce((count, word) => count + (known.has(wordAudioKey(language, word)) ? 1 : 0), 0);
		wordBankState.done[key] = done;
		let generated = 0;
		let failures = 0;
		for (const word of ordered) {
			if (!owned()) return generated;
			const audioKey = wordAudioKey(language, word);
			if (known.has(audioKey)) continue;
			try {
				const clip = await synthesizeNaturalOnce(spokenWord(language, word), 'narrator', 'neutral', ['narrator'], language, 1);
				if (!owned()) return generated;
				await writeWordAudio(audioKey, { ...clipToStored(clip), savedAt: Date.now() } satisfies StoredWordAudio);
				known.add(audioKey);
				rememberClip(audioKey, clip);
				generated += 1;
				failures = 0;
				done += 1;
				wordBankState.done[key] = done;
			} catch {
				failures += 1;
				// A single odd word should not stop the bank; a dead engine should.
				if (failures >= 5) {
					if (owned()) wordBankState.status[key] = 'failed';
					return generated;
				}
			}
		}
		if (owned()) wordBankState.status[key] = done >= pool.length ? 'ready' : 'idle';
		return generated;
	} catch {
		if (owned()) wordBankState.status[key] = 'failed';
		return 0;
	}
}

function clipToStored(clip: NaturalClip): StoredWordAudio {
	const { samples, sampleRate, playbackRate, volume } = pcmFromClip(clip);
	return { samples, sampleRate, playbackRate, volume, savedAt: 0 };
}
