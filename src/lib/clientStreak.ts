export type StreakEvent = 'sync' | 'vocab_correct' | 'circle_completed' | 'wordle_completed';
export type ClientStreak = { dateKey: string; vocabCorrect: number; circleCompleted: boolean; wordleCompleted: boolean; qualified: boolean; streakCount: number; bestStreak: number; lastQualifiedDay: string | null; vocabularyGoal: number; minutesRemaining: number };

const DEVICE_KEY = 'wordcircle-streak-device-v1';
const STREAK_KEY = 'wordcircle-streak-state-v1';
const goal = 8;

export function timeZone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
export function dateKey(now = new Date()) { const pieces = new Intl.DateTimeFormat('en-CA', { timeZone: timeZone(), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now); const value = Object.fromEntries(pieces.filter((piece) => piece.type !== 'literal').map((piece) => [piece.type, piece.value])); return `${value.year}-${value.month}-${value.day}`; }
export function previousDate(key: string) { const value = new Date(`${key}T12:00:00.000Z`); value.setUTCDate(value.getUTCDate() - 1); return value.toISOString().slice(0, 10); }
export function minutesLeft(now = new Date()) { const today = dateKey(now); let probe = now.getTime() + 27 * 60 * 60 * 1000; while (dateKey(new Date(probe)) === today) probe += 6 * 60 * 60 * 1000; let low = now.getTime(); let high = probe; while (high - low > 1_000) { const middle = Math.floor((low + high) / 2); if (dateKey(new Date(middle)) === today) low = middle; else high = middle; } return Math.max(0, Math.ceil((high - now.getTime()) / 60_000)); }

export function deviceId() {
	if (typeof localStorage === 'undefined') return 'server-render-placeholder';
	let value = localStorage.getItem(DEVICE_KEY);
	if (!value) { value = crypto.randomUUID().replaceAll('-', ''); localStorage.setItem(DEVICE_KEY, value); }
	return value;
}

function defaultState(now = new Date()): ClientStreak { return { dateKey: dateKey(now), vocabCorrect: 0, circleCompleted: false, wordleCompleted: false, qualified: false, streakCount: 0, bestStreak: 0, lastQualifiedDay: null, vocabularyGoal: goal, minutesRemaining: minutesLeft(now) }; }
export function readStreak(now = new Date()) {
	if (typeof localStorage === 'undefined') return defaultState(now);
	try {
		const saved = JSON.parse(localStorage.getItem(STREAK_KEY) ?? 'null') as ClientStreak | null;
		const today = dateKey(now);
		if (!saved) return defaultState(now);
		if (saved.dateKey !== today) return { ...defaultState(now), streakCount: saved.lastQualifiedDay && saved.lastQualifiedDay < previousDate(today) ? 0 : saved.streakCount, bestStreak: saved.bestStreak ?? 0, lastQualifiedDay: saved.lastQualifiedDay };
		return { ...saved, bestStreak: saved.bestStreak ?? 0, minutesRemaining: minutesLeft(now) };
	} catch { return defaultState(now); }
}
export function writeStreak(state: ClientStreak) { if (typeof localStorage !== 'undefined') localStorage.setItem(STREAK_KEY, JSON.stringify(state)); return state; }
export function applyLocalEvent(current: ClientStreak, event: StreakEvent, now = new Date()) {
	let next = { ...readStreak(now), ...current, dateKey: dateKey(now), minutesRemaining: minutesLeft(now) };
	if (event === 'vocab_correct') next.vocabCorrect += 1;
	if (event === 'circle_completed') next.circleCompleted = true;
	if (event === 'wordle_completed') next.wordleCompleted = true;
	const qualifies = next.vocabCorrect >= goal || next.circleCompleted || next.wordleCompleted;
	if (qualifies && !next.qualified) { next.streakCount = next.lastQualifiedDay === previousDate(next.dateKey) ? next.streakCount + 1 : 1; next.lastQualifiedDay = next.dateKey; }
	next.qualified = qualifies;
	next.bestStreak = Math.max(next.bestStreak ?? 0, next.streakCount);
	return writeStreak(next);
}
export async function syncStreak(event: StreakEvent, fallback = readStreak()) {
	const optimistic = applyLocalEvent(fallback, event);
	try {
		const response = await fetch('/api/streak/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), timeZone: timeZone(), event, snapshot: optimistic }) });
		const body = await response.json();
		if (response.ok && body?.streak) return writeStreak(body.streak);
	} catch { /* Offline play retains the local cache and retries with the next event. */ }
	return optimistic;
}
