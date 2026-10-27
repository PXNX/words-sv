import assert from 'node:assert/strict';
import test from 'node:test';
import { createRemindersEndpoint, cronAuthorized } from '../api/cron/reminders.mjs';
import { applyStreakEvent, collectReward, reminderTypes, streakSummary, ALLTAG_GOAL, GRAMMAR_GOAL, PRONUNCIATION_GOAL, VOCABULARY_GOAL } from '../api/_lib/streak.mjs';

function responseCapture() {
	const result = { statusCode: 200, body: null };
	return { result, status(code) { result.statusCode = code; return this; }, json(body) { result.body = body; return this; } };
}

test('eight correct vocabulary answers qualify the local day exactly once', () => {
	let state = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null };
	for (let index = 0; index < VOCABULARY_GOAL; index += 1) state = applyStreakEvent(state, 'UTC', 'vocab_correct', new Date('2026-08-26T12:00:00Z'));
	assert.equal(state.vocabCorrect, VOCABULARY_GOAL);
	assert.equal(state.qualified, true);
	assert.equal(state.streakCount, 1);
	assert.equal(state.lastQualifiedDay, '2026-08-26');
});

test('Circle, definitions, Wordle and Hangman completion qualify a day without eight vocabulary answers', () => {
	const base = { day_key: '2026-08-26', streak_count: 4, last_qualified_day: '2026-08-25' };
	for (const event of ['circle_completed', 'definitions_completed', 'wordle_completed', 'hangman_completed']) {
		const state = applyStreakEvent(base, 'UTC', event, new Date('2026-08-26T12:00:00Z'));
		assert.equal(state.qualified, true, event);
		assert.equal(state.streakCount, 5, event);
	}
});

test('Alltag qualifies at five correct answers', () => {
	/** @type {any} */
	let state = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null };
	for (let index = 0; index < ALLTAG_GOAL - 1; index += 1) state = applyStreakEvent(state, 'UTC', 'alltag_correct', new Date('2026-08-26T12:00:00Z'));
	assert.equal(state.qualified, false);
	assert.equal(state.alltagCorrect, ALLTAG_GOAL - 1);
	state = applyStreakEvent(state, 'UTC', 'alltag_correct', new Date('2026-08-26T12:00:00Z'));
	assert.equal(state.qualified, true);
	assert.equal(state.streakCount, 1);
});

test('reading, story and listening sessions qualify a day', () => {
	const base = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null };
	for (const event of ['reading_completed', 'story_completed', 'listen_completed']) {
		const state = applyStreakEvent(base, 'UTC', event, new Date('2026-08-26T12:00:00Z'));
		assert.equal(state.qualified, true, event);
		assert.equal(state.streakCount, 1, event);
	}
});

test('grammar qualifies at five correct answers and pronunciation at ten attempts', () => {
	/** @type {any} */
	const base = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null };
	/** @type {any} */
	let grammar = base;
	for (let index = 0; index < GRAMMAR_GOAL - 1; index += 1) grammar = applyStreakEvent(grammar, 'UTC', 'grammar_correct', new Date('2026-08-26T12:00:00Z'));
	assert.equal(grammar.qualified, false);
	grammar = applyStreakEvent(grammar, 'UTC', 'grammar_correct', new Date('2026-08-26T12:00:00Z'));
	assert.equal(grammar.qualified, true);

	let pronunciation = base;
	for (let index = 0; index < PRONUNCIATION_GOAL - 1; index += 1) pronunciation = applyStreakEvent(pronunciation, 'UTC', 'pronunciation_practised', new Date('2026-08-26T12:00:00Z'));
	assert.equal(pronunciation.qualified, false);
	pronunciation = applyStreakEvent(pronunciation, 'UTC', 'pronunciation_practised', new Date('2026-08-26T12:00:00Z'));
	assert.equal(pronunciation.qualified, true);
});

test('a selected daily goal of five words qualifies with five correct answers', () => {
	/** @type {any} */
	let state = { day_key: '2026-08-26', streak_count: 0, last_qualified_day: null, vocabulary_goal: 5 };
	for (let index = 0; index < 5; index += 1) state = applyStreakEvent(state, 'UTC', 'vocab_correct', new Date('2026-08-26T12:00:00Z'));
	assert.equal(state.qualified, true);
	assert.equal(state.vocabularyGoal, 5);
});

test('an earned freeze bridges one missed day instead of resetting the streak', () => {
	const stored = { day_key: '2026-08-24', vocab_correct: 8, current_qualified: 1, streak_count: 12, best_streak: 12, last_qualified_day: '2026-08-24', freezes: 1 };
	const summary = streakSummary(stored, 'UTC', new Date('2026-08-26T12:00:00Z'));
	assert.equal(summary.streakCount, 12);
	assert.equal(summary.freezes, 0);
	const restarted = applyStreakEvent(stored, 'UTC', 'reading_completed', new Date('2026-08-26T12:00:00Z'));
	assert.equal(restarted.streakCount, 13);
	assert.equal(restarted.lastQualifiedDay, '2026-08-26');
});

test('a missed day without a freeze breaks the displayed streak and a later qualification restarts it', () => {
	const stored = { day_key: '2026-08-23', vocab_correct: 8, current_qualified: 1, streak_count: 9, last_qualified_day: '2026-08-23' };
	const summary = streakSummary(stored, 'UTC', new Date('2026-08-26T12:00:00Z'));
	assert.equal(summary.streakCount, 0);
	const restarted = applyStreakEvent(stored, 'UTC', 'circle_completed', new Date('2026-08-26T12:00:00Z'));
	assert.equal(restarted.streakCount, 1);
});

test('deadline and new-day reminders are eligible only in their intended local windows', () => {
	const stored = { day_key: '2026-08-25', vocab_correct: 8, current_qualified: 1, streak_count: 3, last_qualified_day: '2026-08-25' };
	assert.deepEqual(reminderTypes(stored, 'UTC', new Date('2026-08-26T00:30:00Z')).types, ['new_day']);
	assert.deepEqual(reminderTypes(stored, 'UTC', new Date('2026-08-26T22:30:00Z')).types, ['deadline']);
});

test('external cron handler rejects absent credentials and accepts the configured bearer token without exposing it', async () => {
	const secret = process.env.CRON_SECRET;
	assert.match(secret, /.{32,}/);
	assert.equal(cronAuthorized(`Bearer ${secret}`), true);
	assert.equal(cronAuthorized('Bearer not-the-secret'), false);
	const handler = createRemindersEndpoint({ databaseProvider: () => ({ execute: async () => [[]] }) });
	const bad = responseCapture();
	await handler({ method: 'GET', headers: {} }, bad);
	assert.equal(bad.result.statusCode, 401);
	const good = responseCapture();
	await handler({ method: 'GET', headers: { authorization: `Bearer ${secret}` } }, good);
	assert.deepEqual(good.result, { statusCode: 200, body: { ok: true, attempted: 0, delivered: 0 } });
});

test('collecting the daily reward adds an ember once and a full set forges a freeze', () => {
	const now = new Date('2026-08-26T12:00:00Z');
	let state = applyStreakEvent({ day_key: '2026-08-26', streak_count: 0, last_qualified_day: null, qualified_days: 6, freezes: 0 }, 'UTC', 'wordle_completed', now);
	assert.equal(state.freezes, 0);
	assert.equal(state.embers, 6);
	state = collectReward(state);
	assert.equal(state.freezes, 1);
	assert.equal(state.embers, 0);
	assert.equal(state.rewardCollected, true);
	assert.deepEqual(collectReward(state), state);
});

test('an unqualified day has no reward to collect', () => {
	const state = applyStreakEvent({ day_key: '2026-08-26', streak_count: 0 }, 'UTC', 'reward_collected', new Date('2026-08-26T12:00:00Z'));
	assert.equal(state.rewardCollected, false);
	assert.equal(state.embers, 0);
});
