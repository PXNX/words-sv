import { getDatabase } from '../_lib/database.mjs';
import { isMethod, readJson, respond } from '../_lib/http.mjs';
import { applyStreakEvent, isSupportedTimeZone, normalizeReminderLocale, normalizeVocabularyGoal, stateForToday, streakSummary } from '../_lib/streak.mjs';

const events = new Set([
	'sync',
	'vocab_correct',
	'circle_completed',
	'wordle_completed',
	'reading_completed',
	'story_completed',
	'grammar_correct',
	'listen_completed',
	'pronunciation_practised'
]);
const validDeviceId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(value);

function counter(value, max = 999) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number >= 0 ? Math.min(max, number) : 0;
}

export default async function streakProgress(req, res) {
	if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
	try {
		const { deviceId, timeZone, event = 'sync', snapshot, locale } = await readJson(req);
		if (!validDeviceId(deviceId) || !isSupportedTimeZone(timeZone) || !events.has(event)) return respond(res, 400, { ok: false, error: 'invalid_request' });
		const db = getDatabase();
		const [rows] = await db.execute('SELECT * FROM wordcircle_streak_devices WHERE device_id = ? LIMIT 1', [deviceId]);
		const reminderLocale = normalizeReminderLocale(locale ?? rows[0]?.locale);
		const merged = stateForToday(rows[0], timeZone, new Date());
		// A device that played offline sends its snapshot along, so the server never loses progress and
		// never awards the same day twice.
		if (snapshot && typeof snapshot === 'object' && snapshot.dateKey === merged.dateKey) {
			merged.vocabularyGoal = normalizeVocabularyGoal(snapshot.vocabularyGoal ?? merged.vocabularyGoal);
			merged.vocabCorrect = Math.max(merged.vocabCorrect, counter(snapshot.vocabCorrect));
			merged.grammarCorrect = Math.max(merged.grammarCorrect, counter(snapshot.grammarCorrect));
			merged.pronunciationAttempts = Math.max(merged.pronunciationAttempts, counter(snapshot.pronunciationAttempts));
			merged.circleCompleted = merged.circleCompleted || Boolean(snapshot.circleCompleted);
			merged.wordleCompleted = merged.wordleCompleted || Boolean(snapshot.wordleCompleted);
			merged.readingCompleted = merged.readingCompleted || Boolean(snapshot.readingCompleted);
			merged.storyCompleted = merged.storyCompleted || Boolean(snapshot.storyCompleted);
			merged.listenCompleted = merged.listenCompleted || Boolean(snapshot.listenCompleted);
			// The device is the only place that knows when a freeze was consumed, so take the lower count.
			merged.freezes = Math.min(merged.freezes, counter(snapshot.freezes, 2));
			merged.qualifiedDays = Math.max(merged.qualifiedDays, counter(snapshot.qualifiedDays, 100000));
			// A repaired streak arrives as an already-qualified snapshot; keep the restored count.
			if (snapshot.qualified && snapshot.lastQualifiedDay === merged.dateKey) {
				merged.qualified = true;
				merged.lastQualifiedDay = merged.dateKey;
				merged.streakCount = Math.max(merged.streakCount, counter(snapshot.streakCount, 100000));
			}
		}
		const next = applyStreakEvent(merged, timeZone, event);
		const bestStreak = Math.max(counter(rows[0]?.best_streak), counter(snapshot?.bestStreak, 100000), next.bestStreak, next.streakCount);
		await db.execute(
			`INSERT INTO wordcircle_streak_devices (device_id, timezone, locale, day_key, vocab_correct, circle_completed, wordle_completed, reading_completed, story_completed, grammar_correct, listen_completed, pronunciation_attempts, current_qualified, last_qualified_day, streak_count, best_streak, vocabulary_goal, freezes, qualified_days)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON DUPLICATE KEY UPDATE timezone = VALUES(timezone), locale = VALUES(locale), day_key = VALUES(day_key), vocab_correct = VALUES(vocab_correct), circle_completed = VALUES(circle_completed), wordle_completed = VALUES(wordle_completed), reading_completed = VALUES(reading_completed), story_completed = VALUES(story_completed), grammar_correct = VALUES(grammar_correct), listen_completed = VALUES(listen_completed), pronunciation_attempts = VALUES(pronunciation_attempts), current_qualified = VALUES(current_qualified), last_qualified_day = VALUES(last_qualified_day), streak_count = VALUES(streak_count), best_streak = VALUES(best_streak), vocabulary_goal = VALUES(vocabulary_goal), freezes = VALUES(freezes), qualified_days = VALUES(qualified_days)`,
			[
				deviceId,
				timeZone,
				reminderLocale,
				next.dateKey,
				next.vocabCorrect,
				next.circleCompleted ? 1 : 0,
				next.wordleCompleted ? 1 : 0,
				next.readingCompleted ? 1 : 0,
				next.storyCompleted ? 1 : 0,
				next.grammarCorrect,
				next.listenCompleted ? 1 : 0,
				next.pronunciationAttempts,
				next.qualified ? 1 : 0,
				next.lastQualifiedDay,
				next.streakCount,
				bestStreak,
				next.vocabularyGoal,
				next.freezes,
				next.qualifiedDays
			]
		);
		return respond(res, 200, {
			ok: true,
			streak: streakSummary(
				{
					day_key: next.dateKey,
					vocab_correct: next.vocabCorrect,
					circle_completed: next.circleCompleted,
					wordle_completed: next.wordleCompleted,
					reading_completed: next.readingCompleted,
					story_completed: next.storyCompleted,
					grammar_correct: next.grammarCorrect,
					listen_completed: next.listenCompleted,
					pronunciation_attempts: next.pronunciationAttempts,
					current_qualified: next.qualified,
					last_qualified_day: next.lastQualifiedDay,
					streak_count: next.streakCount,
					best_streak: bestStreak,
					vocabulary_goal: next.vocabularyGoal,
					freezes: next.freezes,
					qualified_days: next.qualifiedDays
				},
				timeZone
			)
		});
	} catch (error) {
		return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'streak_unavailable' });
	}
}
