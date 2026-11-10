import { describe, expect, it } from 'vitest';
import { applyStreakEvent, collectReward, reminderTypes, streakSummary, ALLTAG_GOAL, GRAMMAR_GOAL, PRONUNCIATION_GOAL, VOCABULARY_GOAL } from '../api/_lib/streak.js';

process.env.CRON_SECRET ??= 'cron-secret-for-tests-0123456789abcdef';

describe('streak basic qualification', () => {
	it('eight correct vocabulary answers qualify the local day exactly once', () => {
		let state: any = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null };
		for (let index = 0; index < VOCABULARY_GOAL; index += 1) state = applyStreakEvent(state, 'UTC', 'vocab_correct', new Date('2026-08-26T12:00:00Z'));
		expect(state.vocabCorrect).toBe(VOCABULARY_GOAL);
		expect(state.qualified).toBe(true);
		expect(state.streakCount).toBe(1);
		expect(state.lastQualifiedDay).toBe('2026-08-26');
	});

	it('Circle, definitions, Wordle and Hangman completion qualify a day without eight vocabulary answers', () => {
		const base = { day_key: '2026-08-26', streak_count: 4, last_qualified_day: '2026-08-25' };
		for (const event of ['circle_completed', 'definitions_completed', 'wordle_completed', 'hangman_completed']) {
			const state = applyStreakEvent(base, 'UTC', event, new Date('2026-08-26T12:00:00Z'));
			expect(state.qualified).toBe(true);
			expect(state.streakCount).toBe(5);
		}
	});

	it('Alltag qualifies at five correct answers', () => {
		let state: any = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null };
		for (let index = 0; index < ALLTAG_GOAL - 1; index += 1) state = applyStreakEvent(state, 'UTC', 'alltag_correct', new Date('2026-08-26T12:00:00Z'));
		expect(state.qualified).toBe(false);
		expect(state.alltagCorrect).toBe(ALLTAG_GOAL - 1);
		state = applyStreakEvent(state, 'UTC', 'alltag_correct', new Date('2026-08-26T12:00:00Z'));
		expect(state.qualified).toBe(true);
		expect(state.streakCount).toBe(1);
	});

	it('reading, story and listening sessions qualify a day', () => {
		const base = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null };
		for (const event of ['reading_completed', 'story_completed', 'listen_completed']) {
			const state = applyStreakEvent(base, 'UTC', event, new Date('2026-08-26T12:00:00Z'));
			expect(state.qualified).toBe(true);
			expect(state.streakCount).toBe(1);
		}
	});

	it('grammar qualifies at five correct answers and pronunciation at ten attempts', () => {
		const base = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null };
		let grammar: any = base;
		for (let index = 0; index < GRAMMAR_GOAL - 1; index += 1) grammar = applyStreakEvent(grammar, 'UTC', 'grammar_correct', new Date('2026-08-26T12:00:00Z'));
		expect(grammar.qualified).toBe(false);
		grammar = applyStreakEvent(grammar, 'UTC', 'grammar_correct', new Date('2026-08-26T12:00:00Z'));
		expect(grammar.qualified).toBe(true);

		let pronunciation: any = base;
		for (let index = 0; index < PRONUNCIATION_GOAL - 1; index += 1) pronunciation = applyStreakEvent(pronunciation, 'UTC', 'pronunciation_practised', new Date('2026-08-26T12:00:00Z'));
		expect(pronunciation.qualified).toBe(false);
		pronunciation = applyStreakEvent(pronunciation, 'UTC', 'pronunciation_practised', new Date('2026-08-26T12:00:00Z'));
		expect(pronunciation.qualified).toBe(true);
	});

	it('a selected daily goal of five words qualifies with five correct answers', () => {
		let state: any = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null, vocabulary_goal: 5 };
		for (let index = 0; index < 5; index += 1) state = applyStreakEvent(state, 'UTC', 'vocab_correct', new Date('2026-08-26T12:00:00Z'));
		expect(state.qualified).toBe(true);
		expect(state.vocabularyGoal).toBe(5);
	});

	it('an earned freeze bridges one missed day instead of resetting the streak', () => {
		const stored = { day_key: '2026-08-24', vocab_correct: 8, current_qualified: 1, streak_count: 12, best_streak: 12, last_qualified_day: '2026-08-24', freezes: 1 };
		const summary = streakSummary(stored, 'UTC', new Date('2026-08-26T12:00:00Z'));
		expect(summary.streakCount).toBe(12);
		expect(summary.freezes).toBe(0);
		const restarted = applyStreakEvent(stored, 'UTC', 'reading_completed', new Date('2026-08-26T12:00:00Z'));
		expect(restarted.streakCount).toBe(13);
		expect(restarted.lastQualifiedDay).toBe('2026-08-26');
	});

	it('a missed day without a freeze breaks the displayed streak and a later qualification restarts it', () => {
		const stored = { day_key: '2026-08-23', vocab_correct: 8, current_qualified: 1, streak_count: 9, last_qualified_day: '2026-08-23' };
		const summary = streakSummary(stored, 'UTC', new Date('2026-08-26T12:00:00Z'));
		expect(summary.streakCount).toBe(0);
		const restarted = applyStreakEvent(stored, 'UTC', 'circle_completed', new Date('2026-08-26T12:00:00Z'));
		expect(restarted.streakCount).toBe(1);
	});

	it('deadline and new-day reminders are eligible only in their intended local windows', () => {
		const stored = { day_key: '2026-08-25', vocab_correct: 8, current_qualified: 1, streak_count: 3, last_qualified_day: '2026-08-25' };
		expect(reminderTypes(stored, 'UTC', new Date('2026-08-26T00:30:00Z')).types).toEqual(['new_day']);
		expect(reminderTypes(stored, 'UTC', new Date('2026-08-26T22:30:00Z')).types).toEqual(['deadline']);
	});

	it('collecting the daily reward adds an ember once and a full set forges a freeze', () => {
		const now = new Date('2026-08-26T12:00:00Z');
		let state: any = applyStreakEvent({ day_key: '2026-08-26', streak_count: 0, last_qualified_day: null, qualified_days: 6, freezes: 0 }, 'UTC', 'wordle_completed', now);
		expect(state.freezes).toBe(0);
		expect(state.embers).toBe(6);
		state = collectReward(state);
		expect(state.freezes).toBe(1);
		expect(state.embers).toBe(0);
		expect(state.rewardCollected).toBe(true);
		expect(collectReward(state)).toEqual(state);
	});

	it('an unqualified day has no reward to collect', () => {
		const state = applyStreakEvent({ day_key: '2026-08-26', streak_count: 0 }, 'UTC', 'reward_collected', new Date('2026-08-26T12:00:00Z'));
		expect(state.rewardCollected).toBe(false);
		expect(state.embers).toBe(0);
	});
});