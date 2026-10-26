import { describe, expect, test } from 'vitest';
import { orderWords } from '../src/lib/audio/wordBankWords.js';
import { articleFor, spokenWord } from '../src/lib/data/vocabulary.js';

describe('orderWords', () => {
	test('puts the current round first without losing the rest of the level', () => {
		const pool = ['APFEL', 'BROT', 'HAUS', 'TISCH', 'WASSER'];
		expect(orderWords(pool, ['TISCH', 'BROT'])).toEqual(['TISCH', 'BROT', 'APFEL', 'HAUS', 'WASSER']);
	});

	test('ignores priority words that are not in the level and repeated entries', () => {
		const pool = ['APFEL', 'BROT', 'HAUS'];
		expect(orderWords(pool, ['HAUS', 'HAUS', 'AUTO'])).toEqual(['HAUS', 'APFEL', 'BROT']);
	});

	test('keeps the pool order when there is nothing to prioritise', () => {
		const pool = ['APFEL', 'BROT', 'HAUS'];
		expect(orderWords(pool)).toEqual(pool);
		expect(orderWords([])).toEqual([]);
	});
});

describe('spokenWord', () => {
	test('reads German nouns with their article and the dictionary spelling', () => {
		expect(articleFor('de', 'HAUS')).toBe('das');
		expect(spokenWord('de', 'HAUS')).toBe('das Haus');
		expect(articleFor('de', 'ABFAHRT')).toBe('die');
		expect(spokenWord('de', 'ABFAHRT')).toBe('die Abfahrt');
	});

	test('leaves words without an article alone', () => {
		expect(articleFor('de', 'LAUFEN')).toBe('');
		expect(spokenWord('de', 'LAUFEN')).toBe('laufen');
	});

	test('returns unknown words unchanged', () => {
		expect(articleFor('de', 'GIBTESNICHT')).toBe('');
		expect(spokenWord('de', 'GIBTESNICHT')).toBe('GIBTESNICHT');
	});
});
