import { randomBytes } from 'node:crypto';
import * as v from 'valibot';
import type { Database } from './database.js';
import type { StreakState } from './streak.js';

// Group leagues: a few friends (a class, a family, a Telegram group) in one group, ranked by the
// points they earned this week. Points are scored here on the server from the streak state the
// server itself keeps, so a player can only earn them by playing: every daily counter counts up
// to a cap, and every finished mode counts once a day.

export const COUNTER_CAP = 150;
export const COMPLETION_POINTS = 10;
export const MAX_GROUPS_PER_DEVICE = 5;
export const MAX_MEMBERS = 50;

type Scored = Pick<StreakState, 'vocabCorrect' | 'grammarCorrect' | 'alltagCorrect' | 'pronunciationAttempts' | 'circleCompleted' | 'definitionsCompleted' | 'wordleCompleted' | 'readingCompleted' | 'storyCompleted' | 'listenCompleted' | 'hangmanCompleted' | 'sentenceCompleted'>;

/** Points a day's state is worth. */
export function dayScore(state: Scored): number {
	const counters = [state.vocabCorrect, state.grammarCorrect, state.alltagCorrect, state.pronunciationAttempts].reduce((sum, value) => sum + Math.min(COUNTER_CAP, Math.max(0, value || 0)), 0);
	const completions = [state.circleCompleted, state.definitionsCompleted, state.wordleCompleted, state.readingCompleted, state.storyCompleted, state.listenCompleted, state.hangmanCompleted, state.sentenceCompleted].filter(Boolean).length;
	return counters + completions * COMPLETION_POINTS;
}

/** Points earned by moving from `before` to `after` on the same day (never negative). */
export function pointsEarned(before: Scored, after: Scored): number {
	return Math.max(0, dayScore(after) - dayScore(before));
}

/** The ISO week of a `YYYY-MM-DD` day, as `YYYY-Www`; leagues restart every Monday. */
export function weekKey(dateKey: string): string {
	const date = new Date(`${dateKey}T12:00:00.000Z`);
	const day = (date.getUTCDay() + 6) % 7;
	date.setUTCDate(date.getUTCDate() - day + 3);
	const year = date.getUTCFullYear();
	// The week's Thursday decides the year; its day of the year decides the week.
	const week = Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
	return `${year}-W${String(week).padStart(2, '0')}`;
}

/** Ranks members by points (ties share a place), highest first. */
export function rankMembers<T extends { points: number }>(members: readonly T[]): Array<T & { rank: number }> {
	const sorted = [...members].sort((a, b) => b.points - a.points);
	let rank = 0;
	return sorted.map((member, index) => {
		if (index === 0 || member.points < sorted[index - 1]!.points) rank = index + 1;
		return { ...member, rank };
	});
}

// Codes ride in links and are typed by hand now and then: no 0/O/1/I/L.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function groupCode(length = 6): string {
	const bytes = randomBytes(length);
	return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join('');
}
export const GroupCodeSchema = v.pipe(v.string(), v.toUpperCase(), v.regex(/^[2-9A-HJKMNP-Z]{6}$/u));
export const GroupNameSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(40));
export const MemberNameSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(30));
// The learner's story character, shown next to their name; only short JSON is kept.
export const AvatarSchema = v.nullable(v.pipe(v.string(), v.maxLength(400)));

const TABLES = [
	`CREATE TABLE IF NOT EXISTS wordcircle_groups (
		id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
		code CHAR(6) NOT NULL UNIQUE,
		name VARCHAR(40) NOT NULL,
		created_by_device VARCHAR(64) NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE TABLE IF NOT EXISTS wordcircle_group_members (
		group_id INT UNSIGNED NOT NULL,
		device_id VARCHAR(64) NOT NULL,
		display_name VARCHAR(30) NOT NULL,
		avatar VARCHAR(400) NULL,
		joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (group_id, device_id),
		INDEX wordcircle_group_members_device_idx (device_id),
		CONSTRAINT wordcircle_group_members_group_fk FOREIGN KEY (group_id) REFERENCES wordcircle_groups(id) ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS wordcircle_weekly_points (
		device_id VARCHAR(64) NOT NULL,
		week_key CHAR(8) NOT NULL,
		points INT UNSIGNED NOT NULL DEFAULT 0,
		PRIMARY KEY (device_id, week_key)
	)`
];

let tablesReady: Promise<unknown> | undefined;
export function ensureGroupTables(db: Database) {
	tablesReady ??= (async () => {
		for (const sql of TABLES) await db.execute(sql);
	})().catch((error: unknown) => {
		tablesReady = undefined;
		throw error;
	});
	return tablesReady;
}

/** Adds points to a device's week; a no-op for zero. */
export async function addWeeklyPoints(db: Database, deviceId: string, dateKey: string, points: number) {
	if (points <= 0) return;
	await ensureGroupTables(db);
	await db.execute('INSERT INTO wordcircle_weekly_points (device_id, week_key, points) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE points = points + VALUES(points)', [deviceId, weekKey(dateKey), Math.round(points)]);
}
