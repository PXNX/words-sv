import { describe, expect, test } from 'vitest';
import { quickPlacementItems, quickPlacementResult, QUICK_LEVELS, QUICK_REAL_PER_LEVEL } from '../src/lib/assessment/quickPlacement.js';
import { seededRandom } from '../src/lib/assessment/placement.js';

const corpus = ['haus', 'buch', 'stadt', 'wagen', 'garten', 'wagen', 'fenster', 'strauch', 'küche', 'himmel', 'brücke', 'schule', 'lehrer', 'mädchen', 'wasser', 'feuer', 'erdball', 'sonntag', 'morgen', 'abend', 'zwischen', 'bruder', 'schwester', 'onkel', 'tante'];

function pools() {
	return {
		a1: ['HAUS', 'BUCH', 'STADT', 'WAGEN', 'GARTEN'],
		a2: ['FENSTER', 'KÜCHE', 'HIMMEL', 'BRÜCKE', 'SCHULE'],
		b1: ['LEHRER', 'MÄDCHEN', 'WASSER', 'FEUER', 'SONNTAG']
	};
}

describe('quickPlacementItems', () => {
	test('offers three levels with real and invented words shuffled', () => {
		const items = quickPlacementItems(pools(), corpus, seededRandom(42));
		expect(items).toHaveLength(QUICK_LEVELS.length * (QUICK_REAL_PER_LEVEL + 1));
		expect(new Set(items.map((item) => item.level))).toEqual(new Set(QUICK_LEVELS));
		expect(items.filter((item) => item.real)).toHaveLength(QUICK_LEVELS.length * QUICK_REAL_PER_LEVEL);
		expect(items.filter((item) => !item.real)).toHaveLength(QUICK_LEVELS.length);
	});

	test('an empty level contributes no real words', () => {
		const items = quickPlacementItems({ a1: ['HAUS', 'BUCH', 'STADT'] }, corpus, seededRandom(7));
		expect(items.filter((item) => item.level === 'a2' && item.real)).toEqual([]);
	});
});

describe('quickPlacementResult', () => {
	function answers(knownReal: boolean, knownFake: boolean) {
		return quickPlacementItems(pools(), corpus, seededRandom(3)).map((item) => ({ ...item, known: item.real ? knownReal : knownFake }));
	}

	test('all levels passed places at B1', () => {
		expect(quickPlacementResult(answers(true, false))).toBe('b1');
	});

	test('a false alarm on invented words stops the ladder', () => {
		expect(quickPlacementResult(answers(true, true))).toBe('a1');
	});

	test('unknown real words stop at A1', () => {
		expect(quickPlacementResult(answers(false, false))).toBe('a1');
	});
});
