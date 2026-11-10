export const VOCABULARY_GOAL = 8;
export const GRAMMAR_GOAL = 5;
export const PRONUNCIATION_GOAL = 10;
export const ALLTAG_GOAL = 5;
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
export const DAILY_GOALS = [5, 8, 12];
export const REMINDER_LOCALES = ['de', 'en', 'fa', 'pt', 'ru', 'ar', 'uk', 'hi', 'ml'];

/** A streak row as stored (snake_case, from MySQL) or as the client sends it (camelCase). */
export interface StoredStreak {
	day_key?: string;
	dateKey?: string;
	vocab_correct?: number;
	vocabCorrect?: number;
	circle_completed?: boolean | number;
	circleCompleted?: boolean | number;
	definitions_completed?: boolean | number;
	definitionsCompleted?: boolean | number;
	wordle_completed?: boolean | number;
	wordleCompleted?: boolean | number;
	reading_completed?: boolean | number;
	readingCompleted?: boolean | number;
	story_completed?: boolean | number;
	storyCompleted?: boolean | number;
	grammar_correct?: number;
	grammarCorrect?: number;
	listen_completed?: boolean | number;
	listenCompleted?: boolean | number;
	pronunciation_attempts?: number;
	pronunciationAttempts?: number;
	hangman_completed?: boolean | number;
	hangmanCompleted?: boolean | number;
	alltag_correct?: number;
	alltagCorrect?: number;
	sentence_completed?: boolean | number;
	sentenceCompleted?: boolean | number;
	current_qualified?: boolean | number;
	qualified?: boolean | number;
	streak_count?: number;
	streakCount?: number;
	last_qualified_day?: string | null;
	lastQualifiedDay?: string | null;
	pro_shield_week?: string | null;
	proShieldWeek?: string | null;
	vocabulary_goal?: number;
	vocabularyGoal?: number;
	freezes?: number;
	qualified_days?: number;
	qualifiedDays?: number;
	reward_collected?: boolean | number;
	rewardCollected?: boolean | number;
	embers?: number | null;
	best_streak?: number;
	bestStreak?: number;
}

/** The streak state for today, normalised to camelCase. */
export interface StreakState {
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
	sentenceCompleted: boolean;
	qualified: boolean;
	streakCount: number;
	lastQualifiedDay: string | null;
	/** The ISO week whose Pro shield bridged a missed day (one per week). */
	proShieldWeek: string | null;
	vocabularyGoal: number;
	freezes: number;
	qualifiedDays: number;
	rewardCollected: boolean;
	embers: number;
	bestStreak?: number;
}


export function normalizeReminderLocale(value: unknown) {
	const language = String(value ?? '').toLowerCase();
	const match = REMINDER_LOCALES.find((locale) => language === locale || language.startsWith(`${locale}-`));
	return match ?? 'en';
}

export function normalizeVocabularyGoal(value: unknown) {
	const numeric = Number(value);
	return DAILY_GOALS.includes(numeric) ? numeric : VOCABULARY_GOAL;
}

export function isSupportedTimeZone(timeZone: string) {
	try {
		new Intl.DateTimeFormat('en-CA', { timeZone }).format();
		return true;
	} catch {
		return false;
	}
}

export function dateKeyFor(timeZone: string, now = new Date()) {
	const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
	const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
	return `${value.year}-${value.month}-${value.day}`;
}

export function previousDateKey(dateKey: string) {
	const date = new Date(`${dateKey}T12:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - 1);
	return date.toISOString().slice(0, 10);
}

/** The ISO week of a `YYYY-MM-DD` day, as `YYYY-Www`. */
export function isoWeek(dateKey: string): string {
	const date = new Date(`${dateKey}T12:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + 3);
	const year = date.getUTCFullYear();
	const week = Math.ceil(((date.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
	return `${year}-W${String(week).padStart(2, '0')}`;
}

function daysBetween(earlier: string, later: string) {
	const start = Date.parse(`${earlier}T12:00:00.000Z`);
	const end = Date.parse(`${later}T12:00:00.000Z`);
	return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function numberField(value: unknown, fallback = 0) {
	const number = Number(value);
	return Number.isSafeInteger(number) && number >= 0 ? number : fallback;
}

// Rows from before the daily reward keep their progress toward the next freeze.
function embersField(stored: StoredStreak | null | undefined) {
	const embers = stored?.embers;
	return embers === undefined || embers === null ? numberField(stored?.qualified_days ?? stored?.qualifiedDays) % FREEZE_EVERY : Math.min(FREEZE_EVERY, numberField(embers));
}

export function minutesUntilNextLocalDate(timeZone: string, now = new Date()) {
	const currentKey = dateKeyFor(timeZone, now);
	const start = now.getTime();
	let end = start + 27 * 60 * 60 * 1000;
	while (dateKeyFor(timeZone, new Date(end)) === currentKey) end += 6 * 60 * 60 * 1000;
	let low = start;
	let high = end;
	while (high - low > 1_000) {
		const middle = Math.floor((low + high) / 2);
		if (dateKeyFor(timeZone, new Date(middle)) === currentKey) low = middle;
		else high = middle;
	}
	return Math.max(0, Math.ceil((high - start) / 60_000));
}

/** `proUntil`: until when the device's Telegram account has Pro (epoch ms), if at all. */
export function stateForToday(stored: StoredStreak | null | undefined, timeZone: string, now = new Date(), proUntil: number | null = null): StreakState {
	const today = dateKeyFor(timeZone, now);
	const previousDay = previousDateKey(today);
	const storedDayKey = stored?.day_key ?? stored?.dateKey;
	const vocabularyGoal = normalizeVocabularyGoal(stored?.vocabulary_goal ?? stored?.vocabularyGoal);
	if (storedDayKey === today) {
		return {
			dateKey: today,
			vocabCorrect: numberField(stored?.vocab_correct ?? stored?.vocabCorrect),
			circleCompleted: Boolean(stored?.circle_completed ?? stored?.circleCompleted),
			definitionsCompleted: Boolean(stored?.definitions_completed ?? stored?.definitionsCompleted),
			wordleCompleted: Boolean(stored?.wordle_completed ?? stored?.wordleCompleted),
			readingCompleted: Boolean(stored?.reading_completed ?? stored?.readingCompleted),
			storyCompleted: Boolean(stored?.story_completed ?? stored?.storyCompleted),
			grammarCorrect: numberField(stored?.grammar_correct ?? stored?.grammarCorrect),
			listenCompleted: Boolean(stored?.listen_completed ?? stored?.listenCompleted),
			pronunciationAttempts: numberField(stored?.pronunciation_attempts ?? stored?.pronunciationAttempts),
			hangmanCompleted: Boolean(stored?.hangman_completed ?? stored?.hangmanCompleted),
			alltagCorrect: numberField(stored?.alltag_correct ?? stored?.alltagCorrect),
			sentenceCompleted: Boolean(stored?.sentence_completed ?? stored?.sentenceCompleted),
			qualified: Boolean(stored?.current_qualified ?? stored?.qualified),
			streakCount: numberField(stored?.streak_count ?? stored?.streakCount),
			lastQualifiedDay: stored?.last_qualified_day ?? stored?.lastQualifiedDay ?? null,
			proShieldWeek: stored?.pro_shield_week ?? stored?.proShieldWeek ?? null,
			vocabularyGoal,
			freezes: Math.min(MAX_FREEZES, numberField(stored?.freezes)),
			qualifiedDays: numberField(stored?.qualified_days ?? stored?.qualifiedDays),
			rewardCollected: Boolean(stored?.reward_collected ?? stored?.rewardCollected),
			embers: embersField(stored)
		};
	}
	let lastQualifiedDay = stored?.last_qualified_day ?? stored?.lastQualifiedDay ?? null;
	let freezes = Math.min(MAX_FREEZES, numberField(stored?.freezes));
	let proShieldWeek = stored?.pro_shield_week ?? stored?.proShieldWeek ?? null;
	const missedYesterday = Boolean(lastQualifiedDay && lastQualifiedDay < previousDay && daysBetween(lastQualifiedDay, previousDay) === 1);
	// Pro forgives one missed day per ISO week before a freeze is spent (as src/lib/streak/proShield.ts).
	const shieldWeek = isoWeek(previousDay);
	if (missedYesterday && proUntil !== null && proUntil >= Date.parse(`${previousDay}T00:00:00.000Z`) && proShieldWeek !== shieldWeek) {
		lastQualifiedDay = previousDay;
		proShieldWeek = shieldWeek;
	} else if (missedYesterday && freezes > 0) {
		freezes -= 1;
		lastQualifiedDay = previousDay;
	}
	const streakCount = lastQualifiedDay && lastQualifiedDay >= previousDay ? numberField(stored?.streak_count ?? stored?.streakCount) : 0;
	return {
		dateKey: today,
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
		sentenceCompleted: false,
		qualified: false,
		streakCount,
		lastQualifiedDay,
		proShieldWeek,
		vocabularyGoal,
		freezes,
		qualifiedDays: numberField(stored?.qualified_days ?? stored?.qualifiedDays),
		rewardCollected: false,
		embers: embersField(stored)
	};
}

export function qualifiesToday(state: StreakState) {
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
		state.alltagCorrect >= ALLTAG_GOAL ||
		state.sentenceCompleted
	);
}

function settleQualification(state: StreakState): StreakState {
	const qualifies = qualifiesToday(state) || state.qualified;
	const next = { ...state, qualified: qualifies };
	if (!qualifies || state.qualified) {
		if (next.streakCount > (next.bestStreak ?? 0)) next.bestStreak = next.streakCount;
		return next;
	}
	next.qualifiedDays = state.qualifiedDays + 1;
	next.streakCount = state.lastQualifiedDay === previousDateKey(state.dateKey) ? state.streakCount + 1 : 1;
	next.lastQualifiedDay = state.dateKey;
	next.bestStreak = Math.max(state.bestStreak ?? 0, next.streakCount);
	return next;
}

/** Collects today's ember once; a full set turns into a freeze as soon as there is room for one. */
export function collectReward(state: StreakState): StreakState {
	if (!state.qualified || state.rewardCollected) return state;
	const next = { ...state, rewardCollected: true, embers: Math.min(FREEZE_EVERY, state.embers + 1) };
	if (next.embers >= FREEZE_EVERY && next.freezes < MAX_FREEZES) {
		next.freezes += 1;
		next.embers = 0;
	}
	return next;
}

export function applyStreakEvent(stored: StoredStreak | null | undefined, timeZone: string, event: string, now = new Date()): StreakState {
	const state = stateForToday(stored, timeZone, now);
	if (event === 'vocab_correct') state.vocabCorrect += 1;
	if (event === 'circle_completed') state.circleCompleted = true;
	if (event === 'definitions_completed') state.definitionsCompleted = true;
	if (event === 'wordle_completed') state.wordleCompleted = true;
	if (event === 'reading_completed') state.readingCompleted = true;
	if (event === 'story_completed') state.storyCompleted = true;
	if (event === 'grammar_correct') state.grammarCorrect += 1;
	if (event === 'listen_completed') state.listenCompleted = true;
	if (event === 'pronunciation_practised') state.pronunciationAttempts += 1;
	if (event === 'hangman_completed') state.hangmanCompleted = true;
	if (event === 'alltag_correct') state.alltagCorrect += 1;
	if (event === 'sentence_completed') state.sentenceCompleted = true;
	if (event === 'reward_collected') return collectReward(state);
	return settleQualification(state);
}

export function streakSummary(stored: StoredStreak | null | undefined, timeZone: string, now = new Date()) {
	const state = stateForToday(stored, timeZone, now);
	return {
		...state,
		bestStreak: numberField(stored?.best_streak ?? stored?.bestStreak, state.streakCount),
		minutesRemaining: minutesUntilNextLocalDate(timeZone, now),
		canProtectStreak: state.lastQualifiedDay === previousDateKey(state.dateKey) && !state.qualified
	};
}

/** A device gets at most one reminder a day, so the most urgent type wins. */
export function reminderTypes(stored: StoredStreak | null | undefined, timeZone: string, now = new Date()) {
	const summary = streakSummary(stored, timeZone, now);
	const types: string[] = [];
	if (summary.canProtectStreak && summary.minutesRemaining > 0 && summary.minutesRemaining <= 120) types.push('deadline');
	else if (summary.lastQualifiedDay === previousDateKey(summary.dateKey) && dateKeyFor(timeZone, new Date(now.getTime() - 2 * 60 * 60 * 1000)) !== summary.dateKey) types.push('new_day');
	return { summary, types };
}

const NOTIFICATIONS: Record<string, (type: string, minutes: number) => { title: string; body: string }> = {
	en: (type, minutes) => type === 'deadline'
		? { title: 'Keep your WordCircle streak', body: `Only ${minutes} minutes remain to qualify today.` }
		: { title: 'Continue your WordCircle streak', body: 'A new learning day has started.' },
	de: (type, minutes) => type === 'deadline'
		? { title: 'Deine WordCircle-Serie wartet', body: `Nur noch ${minutes} Minuten bis Mitternacht, um heute zu qualifizieren.` }
		: { title: 'Weiter mit deiner WordCircle-Serie', body: 'Ein neuer Lerntag hat begonnen.' },
	ar: (type, minutes) => type === 'deadline'
		? { title: 'سلسلتك في WordCircle تنتظر', body: `تبقّى ${minutes} دقيقة حتى منتصف الليل لتُكمل اليوم.` }
		: { title: 'واصل سلسلة WordCircle', body: 'بدأ يوم تعلّم جديد.' },
	fa: (type, minutes) => type === 'deadline'
		? { title: 'زنجیره WordCircle شما منتظر است', body: `فقط ${minutes} دقیقه تا نیمه‌شب برای امروز باقی مانده است.` }
		: { title: 'زنجیره WordCircle خود را ادامه بده', body: 'روز یادگیری تازه‌ای آغاز شد.' },
	hi: (type, minutes) => type === 'deadline'
		? { title: 'आपकी WordCircle लय प्रतीक्षा में है', body: `आज पूरा करने के लिए मध्यरात्रि तक ${minutes} मिनट बाकी हैं।` }
		: { title: 'अपनी WordCircle लय जारी रखें', body: 'नया सीखने का दिन शुरू हुआ।' },
	ml: (type, minutes) => type === 'deadline'
		? { title: 'നിങ്ങളുടെ WordCircle തുടർച്ച കാത്തിരിക്കുന്നു', body: `ഇന്ന് പൂർത്തിയാക്കാൻ അർധരാത്രി വരെ ${minutes} മിനിറ്റ് ബാക്കി.` }
		: { title: 'നിങ്ങളുടെ WordCircle തുടർച്ച തുടരുക', body: 'പുതിയ പഠന ദിവസം തുടങ്ങി.' },
	pt: (type, minutes) => type === 'deadline'
		? { title: 'A sua sequência WordCircle está à espera', body: `Restam ${minutes} minutos até à meia-noite para qualificar hoje.` }
		: { title: 'Continue a sua sequência WordCircle', body: 'Começou um novo dia de aprendizagem.' },
	ru: (type, minutes) => type === 'deadline'
		? { title: 'Ваша серия WordCircle ждёт', body: `До полуночи осталось ${minutes} минут, чтобы засчитать сегодняшний день.` }
		: { title: 'Продолжите серию WordCircle', body: 'Начался новый учебный день.' },
	uk: (type, minutes) => type === 'deadline'
		? { title: 'Ваша серія WordCircle чекає', body: `До опівночі залишилося ${minutes} хвилин, щоб зарахувати сьогодні.` }
		: { title: 'Продовжте серію WordCircle', body: 'Почався новий навчальний день.' }
};

export function reminderNotification(type: string, locale: string, minutesRemaining: number) {
	// Every supported locale has a notification set; unknown ones fall back to English.
	const set = NOTIFICATIONS[normalizeReminderLocale(locale)] ?? NOTIFICATIONS.en;
	if (!set) return { title: 'Keep your WordCircle streak', body: `Only ${minutesRemaining} minutes remain to qualify today.` };
	return set(type, minutesRemaining);
}
