import { beforeEach, describe, expect, test } from 'vitest';
import type { ClientStreak } from '../src/lib/clientStreak.js';

const store = new Map<string, string>();
globalThis.localStorage = {
	getItem: (key: string) => store.get(key) ?? null,
	setItem: (key: string, value: string) => { store.set(key, String(value)); },
	removeItem: (key: string) => { store.delete(key); },
	clear: () => { store.clear(); },
	key: () => null,
	length: 0
} as Storage;

const { applyLocalEvent, ALLTAG_GOAL, FREEZE_EVERY, MAX_FREEZES, rewardReady, dateKey, modeDone, previousDate, readStreak, repairCandidate, repairStreak, dismissRepair, lilithMood } = await import('../src/lib/clientStreak.js');

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

describe('every game mode counts toward the streak', () => {
	beforeEach(() => store.clear());

	const today = (): ClientStreak => ({ ...readStreak(NOW), dateKey: TODAY, qualified: false, streakCount: 0, lastQualifiedDay: YESTERDAY });

	test('definitions, hangman and Alltag each qualify today', () => {
		const definitions = applyLocalEvent(today(), 'definitions_completed', NOW);
		expect(definitions.qualified).toBe(true);
		expect(definitions.streakCount).toBe(1);
		expect(modeDone(definitions, 'definitions')).toBe(true);

		store.clear();
		const hangman = applyLocalEvent(today(), 'hangman_completed', NOW);
		expect(hangman.qualified).toBe(true);
		expect(modeDone(hangman, 'hangman')).toBe(true);

		store.clear();
		let alltag = today();
		for (let index = 0; index < ALLTAG_GOAL - 1; index += 1) alltag = applyLocalEvent(alltag, 'alltag_correct', NOW);
		expect(alltag.qualified).toBe(false);
		expect(modeDone(alltag, 'alltag')).toBe(false);
		alltag = applyLocalEvent(alltag, 'alltag_correct', NOW);
		expect(alltag.qualified).toBe(true);
		expect(alltag.streakCount).toBe(1);
		expect(modeDone(alltag, 'alltag')).toBe(true);
	});
});

describe('daily reward', () => {
	beforeEach(() => store.clear());

	const qualified = (overrides: Partial<ClientStreak> = {}): ClientStreak => ({ ...readStreak(NOW), qualified: true, lastQualifiedDay: TODAY, ...overrides });

	test('a reward only waits once today is qualified', () => {
		expect(rewardReady({ ...readStreak(NOW), qualified: false })).toBe(false);
		expect(rewardReady(qualified())).toBe(true);
	});

	test('collecting adds one ember and only once a day', () => {
		const once = applyLocalEvent(qualified({ embers: 2 }), 'reward_collected', NOW);
		expect(once.embers).toBe(3);
		expect(once.rewardCollected).toBe(true);
		expect(applyLocalEvent(once, 'reward_collected', NOW).embers).toBe(3);
	});

	test('a full set of embers forges a freeze', () => {
		const forged = applyLocalEvent(qualified({ embers: FREEZE_EVERY - 1, freezes: 0 }), 'reward_collected', NOW);
		expect(forged.freezes).toBe(1);
		expect(forged.embers).toBe(0);
	});

	test('embers stay full while every freeze slot is stocked', () => {
		const full = applyLocalEvent(qualified({ embers: FREEZE_EVERY - 1, freezes: MAX_FREEZES }), 'reward_collected', NOW);
		expect(full.freezes).toBe(MAX_FREEZES);
		expect(full.embers).toBe(FREEZE_EVERY);
	});

	test('qualifying no longer hands out freezes by itself', () => {
		const state = applyLocalEvent({ ...readStreak(NOW), qualified: false, qualifiedDays: FREEZE_EVERY - 1, freezes: 0 }, 'wordle_completed', NOW);
		expect(state.qualified).toBe(true);
		expect(state.freezes).toBe(0);
	});

	test('an old save keeps its progress toward the next freeze and a new day resets the claim', () => {
		seed({ qualifiedDays: 40, rewardCollected: true });
		const state = readStreak(NOW);
		expect(state.embers).toBe(40 % FREEZE_EVERY);
		expect(state.rewardCollected).toBe(false);
	});
});

describe('Lilith streak moods', () => {
	beforeEach(() => store.clear());

	const state = (overrides: Partial<ClientStreak>) => ({ ...readStreak(NOW), ...overrides });

	test('a five-day streak turns loving even before today is done', () => {
		expect(lilithMood(state({ streakCount: 5, qualified: false }))).toBe('loving');
	});

	test('a qualified day makes her happy', () => {
		expect(lilithMood(state({ streakCount: 2, qualified: true }))).toBe('happy');
	});

	test('a broken streak from a previous best makes her sad', () => {
		expect(lilithMood(state({ streakCount: 0, bestStreak: 4, qualified: false }))).toBe('sad');
	});

	test('a repairable streak makes her sad even before the reset is read', () => {
		expect(lilithMood(state({ streakCount: 0, bestStreak: 0 }), { dateKey: TODAY, streakCount: 9, bestStreak: 9 })).toBe('sad');
	});

	test('a live streak waiting for today gets a surprised face', () => {
		expect(lilithMood(state({ streakCount: 3, bestStreak: 3, qualified: false }))).toBe('surprised');
	});
});
