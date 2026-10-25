import { describe, expect, it } from 'vitest';
import { pickReviewSection } from '../src/lib/vocab/learning.ts';
import { normalizeReviewProgress, prioritizeLearningWords, updateReviewProgress } from '../src/lib/vocab/spacedRepetition.ts';
import { lookupReadingWord, tokenizeReadingText } from '../src/lib/story/readingWords.ts';

describe('reading words', () => {
	it('splits text into words and keeps every character', () => {
		const text = 'Anna kauft Brot, Käse und Milch.';
		const tokens = tokenizeReadingText(text);
		expect(tokens.filter((token) => token.word).map((token) => token.text)).toEqual(['Anna', 'kauft', 'Brot', 'Käse', 'und', 'Milch']);
		expect(tokens.map((token) => token.text).join('')).toBe(text);
	});

	it('finds a noun with its article and the three case forms', () => {
		const info = lookupReadingWord('de', 'Wohnungen');
		expect(info).toMatchObject({ word: 'WOHNUNG', spelling: 'Wohnung', article: 'die', gender: 'feminine', type: 'noun' });
		expect(info?.definition).toContain('Räume');
		expect(info?.cases.map((entry) => `${entry.grammarCase}:${entry.article} ${entry.form}`)).toEqual([
			'nominative:die Wohnung',
			'accusative:die Wohnung',
			'dative:der Wohnung'
		]);
	});

	it('resolves conjugated, past and participle verb forms', () => {
		expect(lookupReadingWord('de', 'wohnt')?.word).toBe('WOHNEN');
		expect(lookupReadingWord('de', 'sieht')?.word).toBe('SEHEN');
		expect(lookupReadingWord('de', 'ging')?.word).toBe('GEHEN');
		expect(lookupReadingWord('de', 'gekauft')?.word).toBe('KAUFEN');
	});

	it('resolves an inflected adjective to its base form', () => {
		expect(lookupReadingWord('de', 'müdes')).toMatchObject({ word: 'MÜDE', spelling: 'müde', type: 'adjective' });
	});

	it('resolves English suffixes', () => {
		expect(lookupReadingWord('en', 'walked')?.word).toBe('WALK');
		expect(lookupReadingWord('en', 'stopping')?.word).toBe('STOP');
		expect(lookupReadingWord('en', 'planned')?.word).toBe('PLAN');
	});

	it('leaves words outside the vocabulary alone', () => {
		expect(lookupReadingWord('de', 'quakz')).toBeNull();
	});
});

describe('review priority', () => {
	const now = 1_000_000;

	it('treats missing lapse counts as zero', () => {
		expect(normalizeReviewProgress({ repetitions: 2, dueAt: 5 })).toEqual({ repetitions: 2, dueAt: 5, lapses: 0 });
	});

	it('puts marked words ahead of unseen ones', () => {
		const progress = {
			BROT: { repetitions: 4, dueAt: now + 500_000, lapses: 2 },
			MILCH: { repetitions: 0, dueAt: 0, lapses: 0 }
		};
		expect(prioritizeLearningWords(['MILCH', 'BROT'], progress, now)).toEqual(['BROT', 'MILCH']);
	});

	it('adds a lapse on a wrong answer and earns it back on a right one', () => {
		/** @type {Record<string, import('../src/lib/vocab/spacedRepetition.ts').ReviewProgress>} */
		let progress = { BROT: { repetitions: 3, dueAt: now, lapses: 0 } };
		progress = updateReviewProgress(progress, 'BROT', false, now);
		expect(progress.BROT).toMatchObject({ repetitions: 0, lapses: 1 });
		progress = updateReviewProgress(progress, 'BROT', true, now);
		expect(progress.BROT.lapses).toBe(0);
		progress = updateReviewProgress(progress, 'BROT', true, now);
		expect(progress.BROT.lapses).toBe(0);
	});

	it('gives marked words a slot in the next practice section', () => {
		const words = ['BROT', 'MILCH', 'KÄSE', 'APFEL', 'BIRNE', 'REIS', 'SALZ'];
		const progress = { KÄSE: { repetitions: 0, dueAt: 0, lapses: 2 } };
		const section = pickReviewSection(words, progress, () => 0.1, 6);
		expect(section[0]).toBe('KÄSE');
		expect(section).toHaveLength(6);
		expect(new Set(section).size).toBe(6);
	});

	it('fills a section from the whole pool when nothing is marked', () => {
		const words = ['BROT', 'MILCH', 'KÄSE', 'APFEL', 'BIRNE', 'REIS', 'SALZ'];
		const section = pickReviewSection(words, {}, () => 0.1, 6);
		expect(section).toHaveLength(6);
		expect(section.every((word) => words.includes(word))).toBe(true);
	});
});
