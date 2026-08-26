import { getDatabase } from '../_lib/database.mjs';
import { isMethod, readJson, respond } from '../_lib/http.mjs';
import { applyStreakEvent, isSupportedTimeZone, stateForToday, streakSummary } from '../_lib/streak.mjs';

const events = new Set(['sync', 'vocab_correct', 'circle_completed', 'wordle_completed']);
const validDeviceId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(value);

export default async function streakProgress(req, res) {
	if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
	try {
		const { deviceId, timeZone, event = 'sync', snapshot } = await readJson(req);
		if (!validDeviceId(deviceId) || !isSupportedTimeZone(timeZone) || !events.has(event)) return respond(res, 400, { ok: false, error: 'invalid_request' });
		const db = getDatabase();
		const [rows] = await db.execute('SELECT * FROM wordcircle_streak_devices WHERE device_id = ? LIMIT 1', [deviceId]);
		let merged = stateForToday(rows[0], timeZone);
		if (snapshot && typeof snapshot === 'object' && snapshot.dateKey === merged.dateKey) {
			const snapshotVocabulary = Math.min(999, Math.max(0, Number(snapshot.vocabCorrect) || 0));
			if (snapshotVocabulary > merged.vocabCorrect) { merged.vocabCorrect = snapshotVocabulary - 1; merged = applyStreakEvent(merged, timeZone, 'vocab_correct'); }
			if (snapshot.circleCompleted && !merged.circleCompleted) merged = applyStreakEvent(merged, timeZone, 'circle_completed');
			if (snapshot.wordleCompleted && !merged.wordleCompleted) merged = applyStreakEvent(merged, timeZone, 'wordle_completed');
		}
		const next = applyStreakEvent(merged, timeZone, event);
		await db.execute(`INSERT INTO wordcircle_streak_devices (device_id, timezone, day_key, vocab_correct, circle_completed, wordle_completed, current_qualified, last_qualified_day, streak_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE timezone = VALUES(timezone), day_key = VALUES(day_key), vocab_correct = VALUES(vocab_correct), circle_completed = VALUES(circle_completed), wordle_completed = VALUES(wordle_completed), current_qualified = VALUES(current_qualified), last_qualified_day = VALUES(last_qualified_day), streak_count = VALUES(streak_count)`, [deviceId, timeZone, next.dateKey, next.vocabCorrect, next.circleCompleted ? 1 : 0, next.wordleCompleted ? 1 : 0, next.qualified ? 1 : 0, next.lastQualifiedDay, next.streakCount]);
		return respond(res, 200, { ok: true, streak: streakSummary({ day_key: next.dateKey, vocab_correct: next.vocabCorrect, circle_completed: next.circleCompleted, wordle_completed: next.wordleCompleted, current_qualified: next.qualified, last_qualified_day: next.lastQualifiedDay, streak_count: next.streakCount }, timeZone) });
	} catch (error) {
		return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'streak_unavailable' });
	}
}
