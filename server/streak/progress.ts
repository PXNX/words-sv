import { getDatabase } from '../_lib/database.js';
import { isMethod, readJson, respond } from '../_lib/http.js';
import { applyStreakEvent, collectReward, isSupportedTimeZone, normalizeReminderLocale, normalizeVocabularyGoal, stateForToday, streakSummary } from '../_lib/streak.js';
import type { Database } from '../_lib/database.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';

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
	'taboo_completed',
	'alltag_correct',
	'sentence_completed',
	'reward_collected'
]);
const validDeviceId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,64}$/.test(value);

const COLUMNS = ['device_id', 'timezone', 'locale', 'day_key', 'vocab_correct', 'circle_completed', 'definitions_completed', 'wordle_completed', 'reading_completed', 'story_completed', 'grammar_correct', 'listen_completed', 'pronunciation_attempts', 'hangman_completed', 'taboo_completed', 'alltag_correct', 'sentence_completed', 'pro_shield_week', 'native_digits', 'current_qualified', 'last_qualified_day', 'streak_count', 'best_streak', 'vocabulary_goal', 'freezes', 'qualified_days', 'reward_collected', 'embers'];
const UPSERT = `INSERT INTO wordcircle_streak_devices (${COLUMNS.join(', ')})
	VALUES (${COLUMNS.map(() => '?').join(', ')})
	ON CONFLICT (device_id) DO UPDATE SET ${COLUMNS.slice(1).map((column) => `${column} = EXCLUDED.${column}`).join(', ')}, last_seen_at = now()`;
// Databases created before the daily reward or the writing goal get their columns on first use, so
// a deploy never breaks streak syncing while the migrations in database-schema.sql are still pending.
const MIGRATIONS = [
	'ALTER TABLE wordcircle_streak_devices ADD COLUMN IF NOT EXISTS reward_collected SMALLINT NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS embers SMALLINT NULL',
	'ALTER TABLE wordcircle_streak_devices ADD COLUMN IF NOT EXISTS sentence_completed SMALLINT NOT NULL DEFAULT 0',
	'ALTER TABLE wordcircle_streak_devices ADD COLUMN IF NOT EXISTS taboo_completed SMALLINT NOT NULL DEFAULT 0',
	'ALTER TABLE wordcircle_streak_devices ADD COLUMN IF NOT EXISTS pro_shield_week CHAR(8) NULL',
	'ALTER TABLE wordcircle_streak_devices ADD COLUMN IF NOT EXISTS native_digits SMALLINT NOT NULL DEFAULT 0'
];

async function upsert(db: Database, row: Record<string, unknown>) {
	const values = COLUMNS.map((column) => row[column]);
	try {
		await db.execute(UPSERT, values);
	} catch (error) {
		// 42703: undefined_column.
		if ((error as { code?: string } | null)?.code !== '42703') throw error;
		for (const migration of MIGRATIONS) await db.execute(migration);
		await db.execute(UPSERT, values);
	}
}

function counter(value: unknown, max = 999) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number >= 0 ? Math.min(max, number) : 0;
}

/** Until when the device's Telegram account has Pro; null without a link, Pro or store tables yet. */
async function readProUntil(db: Database, deviceId: string): Promise<number | null> {
	try {
		const [[row]] = await db.execute('SELECT p.pro_until FROM wordcircle_telegram_links l INNER JOIN wordcircle_pro p ON p.telegram_user_id = l.telegram_user_id WHERE l.device_id = ? LIMIT 1', [deviceId]);
		return row?.pro_until ? new Date(row.pro_until).getTime() : null;
	} catch {
		return null;
	}
}

export default async function streakProgress(req: ApiRequest, res: ApiResponse) {
	if (!isMethod(req, 'POST')) return respond(res, 405, { ok: false, error: 'method_not_allowed' });
	try {
		const { deviceId, timeZone, event = 'sync', snapshot: rawSnapshot, locale, nativeDigits } = await readJson(req);
		// The device's own streak state for today, sent as-is; every field is checked where it is read.
		const snapshot = rawSnapshot as Record<string, unknown> | null | undefined;
		if (!validDeviceId(deviceId) || typeof timeZone !== 'string' || !isSupportedTimeZone(timeZone) || typeof event !== 'string' || !events.has(event)) return respond(res, 400, { ok: false, error: 'invalid_request' });
		const db = getDatabase();
		const [rows] = await db.execute('SELECT * FROM wordcircle_streak_devices WHERE device_id = ? LIMIT 1', [deviceId]);
		const reminderLocale = normalizeReminderLocale(locale ?? rows[0]?.locale);
		const proUntil = await readProUntil(db, deviceId);
		const merged = stateForToday(rows[0], timeZone, new Date(), proUntil);
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
			merged.tabooCompleted = merged.tabooCompleted || Boolean(snapshot.tabooCompleted);
			merged.sentenceCompleted = merged.sentenceCompleted || Boolean(snapshot.sentenceCompleted);
			// The later week wins ("2026-W46" > "2026-W45"), so a shield used offline stays used.
			if (typeof snapshot.proShieldWeek === 'string' && /^\d{4}-W\d{2}$/u.test(snapshot.proShieldWeek) && snapshot.proShieldWeek > (merged.proShieldWeek ?? '')) merged.proShieldWeek = snapshot.proShieldWeek;
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
		const bestStreak = Math.max(counter(rows[0]?.best_streak), counter(snapshot?.bestStreak, 100000), next.bestStreak ?? 0, next.streakCount);
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
			taboo_completed: next.tabooCompleted ? 1 : 0,
			alltag_correct: next.alltagCorrect,
			sentence_completed: next.sentenceCompleted ? 1 : 0,
			pro_shield_week: next.proShieldWeek,
			// The app's digit choice, for the reminders' numbers (Telegram and push).
			native_digits: nativeDigits === true ? 1 : 0,
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
