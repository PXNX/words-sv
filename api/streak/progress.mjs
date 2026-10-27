import { getDatabase } from '../_lib/database.mjs';
import { isMethod, readJson, respond } from '../_lib/http.mjs';
import { applyStreakEvent, collectReward, isSupportedTimeZone, normalizeReminderLocale, normalizeVocabularyGoal, stateForToday, streakSummary } from '../_lib/streak.mjs';

const events = new Set([
	'sync',
	'vocab_correct',
	'circle_completed',
	'definitions_completed',
	'wordle_completed',
	'reading_completed',
	'story_completed',
	'grammar_correct',
	'listen_completed',
	'pronunciation_practised',
	'hangman_completed',
	'alltag_correct',
	'reward_collected'
]);
const validDeviceId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(value);

const COLUMNS = ['device_id', 'timezone', 'locale', 'day_key', 'vocab_correct', 'circle_completed', 'definitions_completed', 'wordle_completed', 'reading_completed', 'story_completed', 'grammar_correct', 'listen_completed', 'pronunciation_attempts', 'hangman_completed', 'alltag_correct', 'current_qualified', 'last_qualified_day', 'streak_count', 'best_streak', 'vocabulary_goal', 'freezes', 'qualified_days', 'reward_collected', 'embers'];
const UPSERT = `INSERT INTO wordcircle_streak_devices (${COLUMNS.join(', ')})
	VALUES (${COLUMNS.map(() => '?').join(', ')})
	ON DUPLICATE KEY UPDATE ${COLUMNS.slice(1).map((column) => `${column} = VALUES(${column})`).join(', ')}`;
// Databases created before the daily reward get its columns on first use, so a deploy never
// breaks streak syncing while the migration in database-schema.sql is still pending.
const REWARD_MIGRATION = 'ALTER TABLE wordcircle_streak_devices ADD COLUMN reward_collected TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN embers TINYINT UNSIGNED NULL';

async function upsert(db, row) {
	const values = COLUMNS.map((column) => row[column]);
	try {
		await db.execute(UPSERT, values);
	} catch (error) {
		if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
		await db.execute(REWARD_MIGRATION).catch((migrationError) => { if (migrationError?.code !== 'ER_DUP_FIELDNAME') throw migrationError; });
		await db.execute(UPSERT, values);
	}
}

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
		const inviteFreezes = counter(rows[0]?.invite_freezes, 2);
		// A device that played offline sends its snapshot along, so the server never loses progress and
		// never awards the same day twice.
		if (snapshot && typeof snapshot === 'object' && snapshot.dateKey === merged.dateKey) {
			merged.vocabularyGoal = normalizeVocabularyGoal(snapshot.vocabularyGoal ?? merged.vocabularyGoal);
			merged.vocabCorrect = Math.max(merged.vocabCorrect, counter(snapshot.vocabCorrect));
			merged.grammarCorrect = Math.max(merged.grammarCorrect, counter(snapshot.grammarCorrect));
			merged.pronunciationAttempts = Math.max(merged.pronunciationAttempts, counter(snapshot.pronunciationAttempts));
			merged.alltagCorrect = Math.max(merged.alltagCorrect, counter(snapshot.alltagCorrect));
			merged.circleCompleted = merged.circleCompleted || Boolean(snapshot.circleCompleted);
			merged.definitionsCompleted = merged.definitionsCompleted || Boolean(snapshot.definitionsCompleted);
			merged.wordleCompleted = merged.wordleCompleted || Boolean(snapshot.wordleCompleted);
			merged.readingCompleted = merged.readingCompleted || Boolean(snapshot.readingCompleted);
			merged.storyCompleted = merged.storyCompleted || Boolean(snapshot.storyCompleted);
			merged.listenCompleted = merged.listenCompleted || Boolean(snapshot.listenCompleted);
			merged.hangmanCompleted = merged.hangmanCompleted || Boolean(snapshot.hangmanCompleted);
			// The device is the only place that knows when a freeze was consumed, so take the lower count;
			// freezes forged from invite embers (see /api/telegram/start) are new to it and come on top.
			merged.freezes = Math.min(merged.freezes, counter(snapshot.freezes, 2) + inviteFreezes);
			merged.qualifiedDays = Math.max(merged.qualifiedDays, counter(snapshot.qualifiedDays, 100000));
			// A repaired streak arrives as an already-qualified snapshot; keep the restored count.
			if (snapshot.qualified && snapshot.lastQualifiedDay === merged.dateKey) {
				merged.qualified = true;
				merged.lastQualifiedDay = merged.dateKey;
				merged.streakCount = Math.max(merged.streakCount, counter(snapshot.streakCount, 100000));
			}
		}
		let next = applyStreakEvent(merged, timeZone, event);
		// An ember collected offline is collected here too; collecting is idempotent per day.
		if (snapshot?.rewardCollected && snapshot.dateKey === next.dateKey) next = collectReward(next);
		const bestStreak = Math.max(counter(rows[0]?.best_streak), counter(snapshot?.bestStreak, 100000), next.bestStreak, next.streakCount);
		const row = {
			device_id: deviceId,
			timezone: timeZone,
			locale: reminderLocale,
			day_key: next.dateKey,
			vocab_correct: next.vocabCorrect,
			circle_completed: next.circleCompleted ? 1 : 0,
			definitions_completed: next.definitionsCompleted ? 1 : 0,
			wordle_completed: next.wordleCompleted ? 1 : 0,
			reading_completed: next.readingCompleted ? 1 : 0,
			story_completed: next.storyCompleted ? 1 : 0,
			grammar_correct: next.grammarCorrect,
			listen_completed: next.listenCompleted ? 1 : 0,
			pronunciation_attempts: next.pronunciationAttempts,
			hangman_completed: next.hangmanCompleted ? 1 : 0,
			alltag_correct: next.alltagCorrect,
			current_qualified: next.qualified ? 1 : 0,
			last_qualified_day: next.lastQualifiedDay,
			streak_count: next.streakCount,
			best_streak: bestStreak,
			vocabulary_goal: next.vocabularyGoal,
			freezes: next.freezes,
			qualified_days: next.qualifiedDays,
			reward_collected: next.rewardCollected ? 1 : 0,
			embers: next.embers
		};
		await upsert(db, row);
		// The device takes this answer as its new state, so it now counts the invite freezes itself.
		if (inviteFreezes > 0) await db.execute('UPDATE wordcircle_streak_devices SET invite_freezes = 0 WHERE device_id = ?', [deviceId]);
		return respond(res, 200, { ok: true, streak: streakSummary(row, timeZone) });
	} catch (error) {
		return respond(res, 503, { ok: false, error: error instanceof Error ? error.message : 'streak_unavailable' });
	}
}
