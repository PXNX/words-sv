import assert from 'node:assert/strict';
import test from 'node:test';
import { createRemindersEndpoint, cronAuthorized } from '../api/cron/reminders.mjs';
import { applyStreakEvent, reminderTypes, streakSummary, VOCABULARY_GOAL } from '../api/_lib/streak.mjs';

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

test('Circle or Wordle completion qualifies a day without eight vocabulary answers', () => {
	const base = { day_key: '2026-08-26', streak_count: 4, last_qualified_day: '2026-08-25' };
	assert.equal(applyStreakEvent(base, 'UTC', 'circle_completed', new Date('2026-08-26T12:00:00Z')).qualified, true);
	assert.equal(applyStreakEvent(base, 'UTC', 'wordle_completed', new Date('2026-08-26T12:00:00Z')).qualified, true);
});

test('a missed day breaks the displayed streak and a later qualification restarts it', () => {
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
