import { publishReminderState, reminderLocale } from './pwaReminders.js';

export type StreakEvent =
	| 'sync'
	| 'vocab_correct'
	| 'circle_completed'
	| 'definitions_completed'
	| 'wordle_completed'
	| 'reading_completed'
	| 'story_completed'
	| 'grammar_correct'
	| 'listen_completed'
	| 'pronunciation_practised'
	| 'hangman_completed'
	| 'alltag_correct';

export type StreakMode = 'vocab' | 'circle' | 'definitions' | 'wordle' | 'reading' | 'story' | 'grammar' | 'listen' | 'pronunciation' | 'hangman' | 'alltag';

export type ClientStreak = {
	dateKey: string;
	vocabCorrect: number;
	circleCompleted: boolean;
	definitionsCompleted: boolean;
	wordleCompleted: boolean;
	readingCompleted: boolean;
	storyCompleted: boolean;
	grammarCorrect: number;
	listenCompleted: boolean;
	pronunciationAttempts: number;
	hangmanCompleted: boolean;
	alltagCorrect: number;
	qualified: boolean;
	streakCount: number;
	bestStreak: number;
	lastQualifiedDay: string | null;
	vocabularyGoal: number;
	minutesRemaining: number;
	// One earned freeze bridges a single missed day, so a long streak does not vanish overnight.
	freezes: number;
	// Every qualified day counts toward the next freeze.
	qualifiedDays: number;
};

export const VOCABULARY_GOALS = [5, 8, 12] as const;
export const GRAMMAR_GOAL = 5;
export const PRONUNCIATION_GOAL = 10;
export const ALLTAG_GOAL = 5;
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
const DEFAULT_VOCABULARY_GOAL = 8;

const DEVICE_KEY = 'wordcircle-streak-device-v1';
const STREAK_KEY = 'wordcircle-streak-state-v1';
const DAILY_GOAL_KEY = 'wordcircle-daily-goal-v1';
// Remembers a broken-but-repairable streak for the rest of the day, so opening the app before
// the repair session does not erase the count we are about to restore.
const REPAIR_KEY = 'wordcircle-streak-repair-v1';
export const REPAIR_WORDS = 5;

export type StreakRepair = { dateKey: string; streakCount: number; bestStreak: number };

export function timeZone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
export function dateKey(now = new Date()) { const pieces = new Intl.DateTimeFormat('en-CA', { timeZone: timeZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); const value = Object.fromEntries(pieces.filter((piece) => piece.type !== 'literal').map((piece) => [piece.type, piece.value])); return `${value.year}-${value.month}-${value.day}`; }
export function previousDate(key: string) { const value = new Date(`${key}T12:00:00.000Z`); value.setUTCDate(value.getUTCDate() - 1); return value.toISOString().slice(0, 10); }
export function minutesLeft(now = new Date()) { const today = dateKey(now); let probe = now.getTime() + 27 * 60 * 60 * 1000; while (dateKey(new Date(probe)) === today) probe += 6 * 60 * 60 * 1000; let low = now.getTime(); let high = probe; while (high - low > 1_000) { const middle = Math.floor((low + high) / 2); if (dateKey(new Date(middle)) === today) low = middle; else high = middle; } return Math.max(0, Math.ceil((high - now.getTime()) / 60_000)); }

function daysBetween(earlier: string, later: string) {
	const start = Date.parse(`${earlier}T12:00:00.000Z`);
	const end = Date.parse(`${later}T12:00:00.000Z`);
	return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

export function normalizeVocabularyGoal(value: unknown): number {
	const numeric = Number(value);
	return (VOCABULARY_GOALS as readonly number[]).includes(numeric) ? numeric : DEFAULT_VOCABULARY_GOAL;
}

export function readDailyGoal(): number {
	if (typeof localStorage === 'undefined') return DEFAULT_VOCABULARY_GOAL;
	return normalizeVocabularyGoal(localStorage.getItem(DAILY_GOAL_KEY));
}

export function deviceId() {
	if (typeof localStorage === 'undefined') return 'server-render-placeholder';
	let value = localStorage.getItem(DEVICE_KEY);
	if (!value) { value = crypto.randomUUID().replaceAll('-', ''); localStorage.setItem(DEVICE_KEY, value); }
	return value;
}

function defaultState(now = new Date()): ClientStreak {
	return {
		dateKey: dateKey(now),
		vocabCorrect: 0,
		circleCompleted: false,
		definitionsCompleted: false,
		wordleCompleted: false,
		readingCompleted: false,
		storyCompleted: false,
		grammarCorrect: 0,
		listenCompleted: false,
		pronunciationAttempts: 0,
		hangmanCompleted: false,
		alltagCorrect: 0,
		qualified: false,
		streakCount: 0,
		bestStreak: 0,
		lastQualifiedDay: null,
		vocabularyGoal: readDailyGoal(),
		minutesRemaining: minutesLeft(now),
		freezes: 0,
		qualifiedDays: 0
	};
}

function numberField(value: unknown, fallback = 0) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

function rememberRepair(dateKeyValue: string, saved: Partial<ClientStreak>) {
	if (typeof localStorage === 'undefined') return;
	const streakCount = numberField(saved.streakCount);
	if (streakCount < 1) return;
	const repair: StreakRepair = {
		dateKey: dateKeyValue,
		streakCount,
		bestStreak: numberField(saved.bestStreak)
	};
	try { localStorage.setItem(REPAIR_KEY, JSON.stringify(repair)); } catch { /* Storage may be full; the streak just resets. */ }
}

/** Reads a stored state into today's shape, consuming one freeze when it can bridge one missed day. */
export function readStreak(now = new Date()) {
	if (typeof localStorage === 'undefined') return defaultState(now);
	try {
		const saved = JSON.parse(localStorage.getItem(STREAK_KEY) ?? 'null') as Partial<ClientStreak> | null;
		const today = dateKey(now);
		if (!saved) return defaultState(now);
		const goal = normalizeVocabularyGoal(saved.vocabularyGoal ?? readDailyGoal());
		if (saved.dateKey !== today) {
			const yesterday = previousDate(today);
			let lastQualifiedDay = typeof saved.lastQualifiedDay === 'string' ? saved.lastQualifiedDay : null;
			let freezes = Math.min(MAX_FREEZES, numberField(saved.freezes));
			const missedYesterday = Boolean(lastQualifiedDay && lastQualifiedDay < yesterday && daysBetween(lastQualifiedDay, yesterday) === 1);
			if (missedYesterday && freezes > 0) {
				freezes -= 1;
				lastQualifiedDay = yesterday;
			} else if (missedYesterday) {
				// One missed day is repairable with a short session later that day instead of losing months.
				rememberRepair(today, saved);
			}
			const streakCount = lastQualifiedDay && lastQualifiedDay >= yesterday ? numberField(saved.streakCount) : 0;
			return {
				...defaultState(now),
				vocabularyGoal: goal,
				streakCount,
				bestStreak: Math.max(numberField(saved.bestStreak), streakCount),
				lastQualifiedDay,
				freezes,
				qualifiedDays: numberField(saved.qualifiedDays)
			};
		}
		return {
			...defaultState(now),
			...saved,
			dateKey: today,
			vocabCorrect: numberField(saved.vocabCorrect),
			grammarCorrect: numberField(saved.grammarCorrect),
			pronunciationAttempts: numberField(saved.pronunciationAttempts),
			alltagCorrect: numberField(saved.alltagCorrect),
			circleCompleted: Boolean(saved.circleCompleted),
			definitionsCompleted: Boolean(saved.definitionsCompleted),
			wordleCompleted: Boolean(saved.wordleCompleted),
			readingCompleted: Boolean(saved.readingCompleted),
			storyCompleted: Boolean(saved.storyCompleted),
			listenCompleted: Boolean(saved.listenCompleted),
			hangmanCompleted: Boolean(saved.hangmanCompleted),
			qualified: Boolean(saved.qualified),
			vocabularyGoal: goal,
			minutesRemaining: minutesLeft(now),
			freezes: Math.min(MAX_FREEZES, numberField(saved.freezes)),
			qualifiedDays: numberField(saved.qualifiedDays)
		};
	} catch { return defaultState(now); }
}

export function writeStreak(state: ClientStreak) {
	if (typeof localStorage !== 'undefined') localStorage.setItem(STREAK_KEY, JSON.stringify(state));
	return state;
}

export function qualifiesToday(state: ClientStreak): boolean {
	return (
		state.vocabCorrect >= state.vocabularyGoal ||
		state.circleCompleted ||
		state.definitionsCompleted ||
		state.wordleCompleted ||
		state.readingCompleted ||
		state.storyCompleted ||
		state.grammarCorrect >= GRAMMAR_GOAL ||
		state.listenCompleted ||
		state.pronunciationAttempts >= PRONUNCIATION_GOAL ||
		state.hangmanCompleted ||
		state.alltagCorrect >= ALLTAG_GOAL
	);
}

/* Qualifies the day if the counters now meet the goal. An already-qualified day stays qualified,
   even when the learner raises the goal afterwards. */
function settleQualification(state: ClientStreak, force = false): ClientStreak {
	const qualifies = force || qualifiesToday(state) || state.qualified;
	const next = { ...state, qualified: qualifies };
	if (!qualifies || state.qualified) {
		next.bestStreak = Math.max(next.bestStreak, next.streakCount);
		return next;
	}
	next.qualifiedDays = state.qualifiedDays + 1;
	if (next.qualifiedDays % FREEZE_EVERY === 0) next.freezes = Math.min(MAX_FREEZES, state.freezes + 1);
	next.streakCount = state.lastQualifiedDay === previousDate(state.dateKey) ? state.streakCount + 1 : 1;
	next.lastQualifiedDay = state.dateKey;
	next.bestStreak = Math.max(state.bestStreak, next.streakCount);
	return next;
}

export function applyLocalEvent(current: ClientStreak, event: StreakEvent, now = new Date()) {
	const base = readStreak(now);
	const start = current.dateKey === base.dateKey ? { ...base, ...current, dateKey: base.dateKey } : base;
	const next: ClientStreak = { ...start, minutesRemaining: minutesLeft(now) };
	if (event === 'vocab_correct') next.vocabCorrect += 1;
	if (event === 'circle_completed') next.circleCompleted = true;
	if (event === 'definitions_completed') next.definitionsCompleted = true;
	if (event === 'wordle_completed') next.wordleCompleted = true;
	if (event === 'reading_completed') next.readingCompleted = true;
	if (event === 'story_completed') next.storyCompleted = true;
	if (event === 'grammar_correct') next.grammarCorrect += 1;
	if (event === 'listen_completed') next.listenCompleted = true;
	if (event === 'pronunciation_practised') next.pronunciationAttempts += 1;
	if (event === 'hangman_completed') next.hangmanCompleted = true;
	if (event === 'alltag_correct') next.alltagCorrect += 1;
	return writeStreak(settleQualification(next));
}

/** Changing the goal must not take a qualified day away, but a lower goal can qualify the day at once. */
export function setStreakGoal(current: ClientStreak, goal: number, now = new Date()) {
	const base = readStreak(now);
	const start = current.dateKey === base.dateKey ? { ...base, ...current, dateKey: base.dateKey } : base;
	const next = { ...start, vocabularyGoal: normalizeVocabularyGoal(goal), minutesRemaining: minutesLeft(now) };
	if (typeof localStorage !== 'undefined') localStorage.setItem(DAILY_GOAL_KEY, String(next.vocabularyGoal));
	return writeStreak(settleQualification(next));
}

function storedRepairCandidate(now = new Date()): StreakRepair | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const parsed = JSON.parse(localStorage.getItem(REPAIR_KEY) ?? 'null') as Partial<StreakRepair> | null;
		if (!parsed || parsed.dateKey !== dateKey(now)) return null;
		if (numberField(parsed.streakCount) < 1) return null;
		return {
			dateKey: parsed.dateKey,
			streakCount: numberField(parsed.streakCount),
			bestStreak: numberField(parsed.bestStreak)
		};
	} catch {
		return null;
	}
}

/** A broken streak that yesterday’s short session can restore, or null. */
export function repairCandidate(now = new Date()): StreakRepair | null {
	const streak = readStreak(now);
	const candidate = storedRepairCandidate(now);
	if (!candidate) return null;
	// Once today is qualified — normally or by repair — there is nothing left to restore.
	if (streak.qualified || streak.lastQualifiedDay === previousDate(streak.dateKey)) return null;
	return candidate;
}

/** Restores the streak and counts today, so the repair session ends the day qualified. */
export function repairStreak(now = new Date()) {
	const current = readStreak(now);
	const candidate = storedRepairCandidate(now);
	if (!candidate) return current;
	if (typeof localStorage !== 'undefined') localStorage.removeItem(REPAIR_KEY);
	const repaired = settleQualification({
		...current,
		lastQualifiedDay: previousDate(current.dateKey),
		streakCount: candidate.streakCount,
		bestStreak: Math.max(current.bestStreak, candidate.bestStreak, candidate.streakCount)
	}, true);
	return writeStreak(repaired);
}

/** Clearing a candidate the learner declined; the rolled-over state is saved so it stays gone. */
export function dismissRepair(now = new Date()) {
	if (typeof localStorage === 'undefined') return;
	const state = readStreak(now);
	if (storedRepairCandidate(now)) localStorage.removeItem(REPAIR_KEY);
	writeStreak(state);
}

export type LilithMood = 'loving' | 'happy' | 'sad' | 'surprised';

/**
 * Lilith's face for the streak header: in love from five days on, content once today is
 * qualified, sad about a broken or repairable streak, and playfully shocked while a live streak
 * still waits for its session.
 */
export function lilithMood(state: ClientStreak, repair: StreakRepair | null = null): LilithMood {
	if (state.streakCount >= 5) return 'loving';
	if (state.qualified) return 'happy';
	if (repair || (state.streakCount === 0 && state.bestStreak > 0)) return 'sad';
	return 'surprised';
}

const lilithFaces = { loving: 'laughing', happy: 'happy', sad: 'sad', surprised: 'surprised' } as const;

export function lilithFace(mood: LilithMood) {
	return lilithFaces[mood];
}

export function modeDone(state: ClientStreak, mode: StreakMode): boolean {
	if (mode === 'vocab') return state.vocabCorrect >= state.vocabularyGoal;
	if (mode === 'circle') return state.circleCompleted;
	if (mode === 'definitions') return state.definitionsCompleted;
	if (mode === 'wordle') return state.wordleCompleted;
	if (mode === 'reading') return state.readingCompleted;
	if (mode === 'story') return state.storyCompleted;
	if (mode === 'grammar') return state.grammarCorrect >= GRAMMAR_GOAL;
	if (mode === 'listen') return state.listenCompleted;
	if (mode === 'hangman') return state.hangmanCompleted;
	if (mode === 'alltag') return state.alltagCorrect >= ALLTAG_GOAL;
	return state.pronunciationAttempts >= PRONUNCIATION_GOAL;
}

export async function syncStreak(event: StreakEvent, fallback = readStreak()) {
	const optimistic = applyLocalEvent(fallback, event);
	void publishReminderState(optimistic);
	// The /api functions only exist on Vercel; under `vite dev` every call would just 404.
	if (import.meta.env?.DEV) return optimistic;
	try {
		const response = await fetch('/api/streak/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), timeZone: timeZone(), locale: reminderLocale(), event, snapshot: optimistic }) });
		const body = await response.json();
		if (response.ok && body?.streak) {
			const saved = writeStreak(body.streak);
			void publishReminderState(saved);
			return saved;
		}
	} catch { /* Offline play retains the local cache and retries with the next event. */ }
	return optimistic;
}

export async function syncStreakGoal(goal: number, fallback = readStreak()) {
	const optimistic = setStreakGoal(fallback, goal);
	void publishReminderState(optimistic);
	if (import.meta.env?.DEV) return optimistic;
	try {
		const response = await fetch('/api/streak/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), timeZone: timeZone(), locale: reminderLocale(), event: 'sync', snapshot: optimistic }) });
		const body = await response.json();
		if (response.ok && body?.streak) return writeStreak(body.streak);
	} catch { /* Local goal still applies; the next event retries it. */ }
	return optimistic;
}
