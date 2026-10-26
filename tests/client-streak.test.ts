import { beforeEach, describe, expect, test } from 'vitest';

const store = new Map<string, string>();
globalThis.localStorage = {
	getItem: (key: string) => store.get(key) ?? null,
	setItem: (key: string, value: string) => { store.set(key, String(value)); },
	removeItem: (key: string) => { store.delete(key); },
	clear: () => { store.clear(); },
	key: () => null,
	length: 0
} as Storage;

const { dateKey, previousDate, readStreak, repairCandidate, repairStreak, dismissRepair } = await import('../src/lib/clientStreak.js');

const NOW = new Date('2026-10-26T12:00:00Z');
const TODAY = dateKey(NOW);
const YESTERDAY = previousDate(TODAY);
const DAY_BEFORE = previousDate(YESTERDAY);

function seed(overrides: Record<string, unknown> = {}) {
	store.set('wordcircle-streak-state-v1', JSON.stringify({
		dateKey: DAY_BEFORE,
		vocabCorrect: 8,
		circleCompleted: false,
		wordleCompleted: false,
		readingCompleted: false,
		storyCompleted: false,
		grammarCorrect: 0,
		listenCompleted: false,
		pronunciationAttempts: 0,
		qualified: true,
		streakCount: 12,
		bestStreak: 12,
		lastQualifiedDay: DAY_BEFORE,
		vocabularyGoal: 8,
		freezes: 0,
		qualifiedDays: 40,
		...overrides
	}));
}

describe('streak repair', () => {
	beforeEach(() => store.clear());

	test('one missed day without a freeze offers a repair after the streak resets', () => {
		seed();
		expect(readStreak(NOW).streakCount).toBe(0);
		expect(repairCandidate(NOW)).toMatchObject({ streakCount: 12, dateKey: TODAY });
	});

	test('a freeze bridges the missed day instead of offering a repair', () => {
		seed({ freezes: 1 });
		const state = readStreak(NOW);
		expect(state.streakCount).toBe(12);
		expect(state.freezes).toBe(0);
		expect(repairCandidate(NOW)).toBeNull();
	});

	test('repairing restores the count and qualifies today', () => {
		seed();
		const repaired = repairStreak(NOW);
		expect(repaired.qualified).toBe(true);
		expect(repaired.streakCount).toBe(13);
		expect(repaired.lastQualifiedDay).toBe(TODAY);
		expect(repairCandidate(NOW)).toBeNull();
	});

	test('a dismissed repair stays dismissed for the day', () => {
		seed();
		dismissRepair(NOW);
		expect(repairCandidate(NOW)).toBeNull();
		expect(readStreak(NOW).streakCount).toBe(0);
	});
});
