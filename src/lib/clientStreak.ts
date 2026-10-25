import { publishReminderState } from './pwaReminders.js';

export type StreakEvent =
	| 'sync'
	| 'vocab_correct'
	| 'circle_completed'
	| 'wordle_completed'
	| 'reading_completed'
	| 'story_completed'
	| 'grammar_correct'
	| 'listen_completed'
	| 'pronunciation_practised';

export type StreakMode = 'vocab' | 'circle' | 'wordle' | 'reading' | 'story' | 'grammar' | 'listen' | 'pronunciation';

export type ClientStreak = {
	dateKey: string;
	vocabCorrect: number;
	circleCompleted: boolean;
	wordleCompleted: boolean;
	readingCompleted: boolean;
	storyCompleted: boolean;
	grammarCorrect: number;
	listenCompleted: boolean;
	pronunciationAttempts: number;
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
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
const DEFAULT_VOCABULARY_GOAL = 8;

const DEVICE_KEY = 'wordcircle-streak-device-v1';
const STREAK_KEY = 'wordcircle-streak-state-v1';
const DAILY_GOAL_KEY = 'wordcircle-daily-goal-v1';

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
		wordleCompleted: false,
		readingCompleted: false,
		storyCompleted: false,
		grammarCorrect: 0,
		listenCompleted: false,
		pronunciationAttempts: 0,
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
			if (lastQualifiedDay && lastQualifiedDay < yesterday && daysBetween(lastQualifiedDay, yesterday) === 1 && freezes > 0) {
				freezes -= 1;
				lastQualifiedDay = yesterday;
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
			circleCompleted: Boolean(saved.circleCompleted),
			wordleCompleted: Boolean(saved.wordleCompleted),
			readingCompleted: Boolean(saved.readingCompleted),
			storyCompleted: Boolean(saved.storyCompleted),
			listenCompleted: Boolean(saved.listenCompleted),
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
		state.wordleCompleted ||
		state.readingCompleted ||
		state.storyCompleted ||
		state.grammarCorrect >= GRAMMAR_GOAL ||
		state.listenCompleted ||
		state.pronunciationAttempts >= PRONUNCIATION_GOAL
	);
}

/* Qualifies the day if the counters now meet the goal. An already-qualified day stays qualified,
   even when the learner raises the goal afterwards. */
function settleQualification(state: ClientStreak): ClientStreak {
	const qualifies = qualifiesToday(state) || state.qualified;
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
	if (event === 'wordle_completed') next.wordleCompleted = true;
	if (event === 'reading_completed') next.readingCompleted = true;
	if (event === 'story_completed') next.storyCompleted = true;
	if (event === 'grammar_correct') next.grammarCorrect += 1;
	if (event === 'listen_completed') next.listenCompleted = true;
	if (event === 'pronunciation_practised') next.pronunciationAttempts += 1;
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

export function modeDone(state: ClientStreak, mode: StreakMode): boolean {
	if (mode === 'vocab') return state.vocabCorrect >= state.vocabularyGoal;
	if (mode === 'circle') return state.circleCompleted;
	if (mode === 'wordle') return state.wordleCompleted;
	if (mode === 'reading') return state.readingCompleted;
	if (mode === 'story') return state.storyCompleted;
	if (mode === 'grammar') return state.grammarCorrect >= GRAMMAR_GOAL;
	if (mode === 'listen') return state.listenCompleted;
	return state.pronunciationAttempts >= PRONUNCIATION_GOAL;
}

export async function syncStreak(event: StreakEvent, fallback = readStreak()) {
	const optimistic = applyLocalEvent(fallback, event);
	void publishReminderState(optimistic);
	// The /api functions only exist on Vercel; under `vite dev` every call would just 404.
	if (import.meta.env?.DEV) return optimistic;
	try {
		const response = await fetch('/api/streak/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), timeZone: timeZone(), event, snapshot: optimistic }) });
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
		const response = await fetch('/api/streak/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), timeZone: timeZone(), event: 'sync', snapshot: optimistic }) });
		const body = await response.json();
		if (response.ok && body?.streak) return writeStreak(body.streak);
	} catch { /* Local goal still applies; the next event retries it. */ }
	return optimistic;
}
