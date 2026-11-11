import { describe, expect, it } from 'vitest';
import { definitionKeywords, nextTabooWord, rateDescription, relatedForms, tabooCandidates, tabooHits, wordStem } from '../src/lib/taboo/taboo.js';

const AIRPORT = 'A place where aircraft take off and land.';

describe('taboo families', () => {
	it('catches the word, its inflections, derivations and compounds', () => {
		expect(tabooHits('walk', 'He walked with a walker and a walkman, walking fast.')).toEqual(['walked', 'walker', 'walkman', 'walking']);
		expect(tabooHits('laufen', 'Er läuft oft.')).toEqual(['läuft']);
		expect(tabooHits('Haus', 'Die Hausaufgabe liegt im Haus.')).toContain('Hausaufgabe');
	});

	it('leaves unrelated words alone', () => {
		expect(tabooHits('Haus', 'Die Maus sitzt im Gras.')).toEqual([]);
		expect(tabooHits('Kuchen', 'Die Küche ist klein.')).toEqual([]);
		expect(tabooHits('Tag', 'Sie sagt etwas.')).toEqual([]);
	});

	it('finds the related forms in the word pool', () => {
		const words = ['WALK', 'WALKER', 'WALKING', 'WALKMAN', 'HOUSE'];
		expect(relatedForms('WALK', words)).toEqual(['WALK', 'WALKER', 'WALKING', 'WALKMAN'].filter((word) => word !== 'WALK'));
	});
});

describe('definition key words', () => {
	it('drops function words and the target family', () => {
		const keywords = definitionKeywords('Abfalleimer', 'Ein Behälter, in den man Abfall wirft.').map((keyword) => keyword.word);
		expect(keywords).toContain('Behälter');
		expect(keywords).not.toContain('Abfall');
		expect(keywords).not.toContain('man');
	});

	it('keeps the words an explanation should contain', () => {
		const keywords = definitionKeywords('AIRPORT', AIRPORT).map((keyword) => keyword.word);
		expect(keywords).toEqual(expect.arrayContaining(['place', 'aircraft', 'land']));
	});

	it('only offers words with enough key words to grade', () => {
		const definitions = { AIRPORT, OK: 'Ein Ding.', EMPTY: '' };
		expect(tabooCandidates(['AIRPORT', 'OK', 'EMPTY'], definitions)).toEqual(['AIRPORT']);
	});
});

describe('rating an explanation', () => {
	it('passes an explanation that hits the key words', () => {
		const rating = rateDescription('AIRPORT', AIRPORT, 'A place where aircraft land after they take off.');
		expect(rating.forbidden).toEqual([]);
		expect(rating.verdict).toBe('pass');
		expect(rating.score).toBeGreaterThanOrEqual(60);
	});

	it('fails as soon as a forbidden word is used', () => {
		const rating = rateDescription('AIRPORT', AIRPORT, 'An airport is a place where aircraft land.');
		expect(rating.forbidden).toEqual(['airport']);
		expect(rating.score).toBe(0);
		expect(rating.verdict).toBe('fail');
	});

	it('caps a too-short explanation even when it hits a key word', () => {
		const rating = rateDescription('AIRPORT', AIRPORT, 'aircraft');
		expect(rating.score).toBeLessThanOrEqual(40);
		expect(rating.verdict).not.toBe('pass');
	});

	it('counts inflected forms of a key word', () => {
		const rating = rateDescription('AIRPORT', AIRPORT, 'Places where aircraft take off and land.');
		expect(rating.matched).toContain('place');
	});

	it('reports what was missing', () => {
		const rating = rateDescription('AIRPORT', AIRPORT, 'A place where aircraft take off and land.');
		expect(rating.matched).toEqual(expect.arrayContaining(['place', 'aircraft', 'land']));
		expect(rating.missed).toEqual([]);
	});
});

describe('stem', () => {
	it('brings German inflections together', () => {
		expect(wordStem('läuft')).toBe(wordStem('laufen'));
		expect(wordStem('Abfahrt')).toBe(wordStem('abfahren'));
		expect(wordStem('Wohnungen')).toBe(wordStem('wohnen'));
	});

	it('strips the English endings', () => {
		expect(wordStem('walking')).toBe(wordStem('walk'));
		expect(wordStem('walkers')).toBe(wordStem('walk'));
	});
});

describe('next word', () => {
	it('avoids the recent words until the pool is used up', () => {
		expect(nextTabooWord(['A', 'B'], ['A'], () => 0)).toBe('B');
		expect(nextTabooWord(['A'], ['A'], () => 0)).toBe('A');
		expect(nextTabooWord([], [], () => 0)).toBe('');
	});
});
