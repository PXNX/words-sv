// Streak reminders that live inside the installed PWA: the app stores the current streak state in
// IndexedDB and the service worker checks it from the Periodic Background Sync event. No server,
// push subscription or scheduler is involved, so this keeps working on deployments without VAPID keys.

export const PERIODIC_SYNC_TAG = 'wordcircle-streak-reminder';

export type ReminderType = 'new_day' | 'deadline' | 'due' | 'continue_text' | 'weekly';

export type ReminderLocale = 'de' | 'en' | 'fa' | 'pt' | 'ru' | 'ar' | 'uk' | 'hi' | 'ml';

export const REMINDER_LOCALES: ReminderLocale[] = ['de', 'en', 'fa', 'pt', 'ru', 'ar', 'uk', 'hi', 'ml'];

export type ReminderState = {
  enabled: boolean;
  timeZone: string;
  dateKey: string;
  qualified: boolean;
  lastQualifiedDay: string | null;
  locale: ReminderLocale;
  /** Words the review ledger says are due; powers the “N words are due” reminder. */
  dueWords: number;
  /** The text the learner stopped in the middle of, for the “continue” reminder. */
  readingTitle: string | null;
  /** Set by the app on the day the weekly recap should be announced. */
  weeklyReady: boolean;
};

export type ReminderExtras = {
  dueWords?: number;
  readingTitle?: string | null;
  weeklyReady?: boolean;
};

type StreakLike = {
  dateKey: string;
  qualified: boolean;
  lastQualifiedDay: string | null;
};

type Delivery = { id: string; at: number };

const DB_NAME = 'wordcircle-reminders';
const DB_VERSION = 1;
const STATE_STORE = 'state';
const DELIVERY_STORE = 'deliveries';
const STATE_ID = 'current';

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STATE_STORE)) database.createObjectStore(STATE_STORE, { keyPath: 'id' });
      if (!database.objectStoreNames.contains(DELIVERY_STORE)) database.createObjectStore(DELIVERY_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function withStore<T>(storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return new Promise(async (resolve) => {
    const database = await openDatabase();
    if (!database) return resolve(null);
    const transaction = database.transaction(storeName, mode);
    let result: T | null = null;
    const request = run(transaction.objectStore(storeName));
    request.onsuccess = () => { result = request.result ?? null; };
    request.onerror = () => { result = null; };
    transaction.oncomplete = () => { database.close(); resolve(result); };
    transaction.onerror = () => { database.close(); resolve(null); };
    transaction.onabort = () => { database.close(); resolve(null); };
  });
}

export async function readReminderState(): Promise<ReminderState | null> {
  const record = await withStore<{ id: string } & ReminderState>(STATE_STORE, 'readonly', (store) => store.get(STATE_ID));
  if (!record) return null;
  return {
    enabled: record.enabled,
    timeZone: record.timeZone,
    dateKey: record.dateKey,
    qualified: record.qualified,
    lastQualifiedDay: record.lastQualifiedDay ?? null,
    locale: normalizeReminderLocale(record.locale),
    dueWords: Math.max(0, Number(record.dueWords) || 0),
    readingTitle: typeof record.readingTitle === 'string' ? record.readingTitle : null,
    weeklyReady: Boolean(record.weeklyReady)
  };
}

async function writeReminderState(patch: Partial<ReminderState>): Promise<void> {
  const database = await openDatabase();
  if (!database) return;
  const transaction = database.transaction(STATE_STORE, 'readwrite');
  const store = transaction.objectStore(STATE_STORE);
  const request = store.get(STATE_ID);
  request.onsuccess = () => {
    const next = {
      id: STATE_ID,
      enabled: false,
      timeZone: 'UTC',
      dateKey: '1970-01-01',
      qualified: false,
      lastQualifiedDay: null,
      locale: 'en',
      dueWords: 0,
      readingTitle: null,
      weeklyReady: false,
      ...(request.result ?? {}),
      ...patch
    };
    store.put(next);
  };
  await new Promise<void>((resolve) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
  database.close();
}

export async function setReminderEnabled(enabled: boolean): Promise<void> {
  await writeReminderState({ enabled });
}

export function reminderLocale(): ReminderLocale {
  const language = (typeof document !== 'undefined' ? document.documentElement.lang : '') || (typeof navigator !== 'undefined' ? navigator.language : '');
  return normalizeReminderLocale(language);
}

export function normalizeReminderLocale(value: unknown): ReminderLocale {
  const language = String(value ?? '').toLowerCase();
  const match = REMINDER_LOCALES.find((locale) => language === locale || language.startsWith(`${locale}-`));
  return match ?? 'en';
}

export async function publishReminderState(streak: StreakLike, extras: ReminderExtras = {}): Promise<void> {
  await writeReminderState({
    timeZone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC',
    dateKey: streak.dateKey,
    qualified: streak.qualified,
    lastQualifiedDay: streak.lastQualifiedDay,
    locale: reminderLocale(),
    ...(typeof extras.dueWords === 'number' ? { dueWords: Math.max(0, Math.round(extras.dueWords)) } : {}),
    ...(extras.readingTitle !== undefined ? { readingTitle: extras.readingTitle || null } : {}),
    ...(typeof extras.weeklyReady === 'boolean' ? { weeklyReady: extras.weeklyReady } : {})
  });
}

export async function wasReminderDelivered(dateKey: string, _type?: ReminderType): Promise<boolean> {
  const record = await withStore<Delivery>(DELIVERY_STORE, 'readonly', (store) => store.get(dateKey));
  return Boolean(record);
}

export async function markReminderDelivered(dateKey: string, _type?: ReminderType): Promise<void> {
  await withStore(DELIVERY_STORE, 'readwrite', (store) => store.put({ id: dateKey, at: Date.now() } satisfies Delivery));
}

export function dateKeyFor(timeZone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const value = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function previousDateKey(key: string): string {
  const value = new Date(`${key}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function minutesUntilNextLocalDate(timeZone: string, now = new Date()): number {
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

function localHour(timeZone: string, now: Date): number {
  try {
    const hour = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hour12: false }).format(now);
    return Number(hour) % 24;
  } catch {
    return now.getHours();
  }
}

/**
 * Chooses at most one reminder for the day: the deadline if the streak is about to lapse, then a
 * fresh-day nudge, then what the learner actually has waiting (due words, an unfinished text, the
 * weekly recap). The service worker also caps delivery at one per local day.
 */
export function dueReminderTypes(state: ReminderState, now = new Date()): { types: ReminderType[]; dateKey: string; minutesRemaining: number } {
  const dateKey = dateKeyFor(state.timeZone, now);
  const minutesRemaining = minutesUntilNextLocalDate(state.timeZone, now);
  if (!state.enabled) return { types: [], dateKey, minutesRemaining };
  const qualifiedToday = state.qualified && state.dateKey === dateKey;
  if (qualifiedToday) return { types: [], dateKey, minutesRemaining };
  const atRisk = state.lastQualifiedDay === previousDateKey(dateKey);
  const hour = localHour(state.timeZone, now);
  const daytime = hour >= 8 && hour < 21;
  const types: ReminderType[] = [];
  if (atRisk && minutesRemaining > 0 && minutesRemaining <= 120) types.push('deadline');
  else if (atRisk && 1440 - minutesRemaining < 120) types.push('new_day');
  else if (daytime && state.dueWords > 0) types.push('due');
  else if (daytime && state.readingTitle) types.push('continue_text');
  else if (daytime && state.weeklyReady) types.push('weekly');
  return { types, dateKey, minutesRemaining };
}

type NotificationText = { title: string; body: string };
type NotificationContext = { count?: number; title?: string };

const NOTIFICATIONS: Record<ReminderLocale, (type: ReminderType, minutes: number, context: NotificationContext) => NotificationText> = {
  en: (type, minutes, context) => {
    if (type === 'deadline') return { title: 'Keep your WordCircle streak', body: `Only ${minutes} minutes remain to qualify today.` };
    if (type === 'due') return { title: 'Reviews are waiting', body: `${context.count ?? 0} words are due — about 2 minutes.` };
    if (type === 'continue_text') return { title: 'Continue where you stopped', body: `“${context.title ?? ''}” is still waiting for you.` };
    if (type === 'weekly') return { title: 'Your week in review', body: 'See what worked this week and what comes next.' };
    return { title: 'Continue your WordCircle streak', body: 'A new learning day has started.' };
  },
  de: (type, minutes, context) => {
    if (type === 'deadline') return { title: 'Deine WordCircle-Serie wartet', body: `Nur noch ${minutes} Minuten bis Mitternacht, um heute zu qualifizieren.` };
    if (type === 'due') return { title: 'Wiederholungen warten', body: `${context.count ?? 0} Wörter sind fällig — etwa 2 Minuten.` };
    if (type === 'continue_text') return { title: 'Weiterlesen', body: `„${context.title ?? ''}“ wartet noch auf dich.` };
    if (type === 'weekly') return { title: 'Dein Wochenrückblick', body: 'Sieh dir an, was diese Woche geklappt hat.' };
    return { title: 'Weiter mit deiner WordCircle-Serie', body: 'Ein neuer Lerntag hat begonnen.' };
  },
  ar: (type, minutes, context) => {
    if (type === 'deadline') return { title: 'سلسلتك في WordCircle تنتظر', body: `تبقّى ${minutes} دقيقة حتى منتصف الليل لتُكمل اليوم.` };
    if (type === 'due') return { title: 'مراجعات في الانتظار', body: `${context.count ?? 0} كلمات مستحقة — حوالي دقيقتين.` };
    if (type === 'continue_text') return { title: 'أكمل من حيث توقفت', body: `«${context.title ?? ''}» ما زال في انتظارك.` };
    if (type === 'weekly') return { title: 'ملخص أسبوعك', body: 'اطّلع على ما تحقق هذا الأسبوع وما هو التالي.' };
    return { title: 'واصل سلسلة WordCircle', body: 'بدأ يوم تعلّم جديد.' };
  },
  fa: (type, minutes, context) => {
    if (type === 'deadline') return { title: 'زنجیره WordCircle شما منتظر است', body: `فقط ${minutes} دقیقه تا نیمه‌شب برای امروز باقی مانده است.` };
    if (type === 'due') return { title: 'مرورها در انتظارند', body: `${context.count ?? 0} واژه سررسید شده‌اند — حدود ۲ دقیقه.` };
    if (type === 'continue_text') return { title: 'از همان‌جا ادامه بده', body: `«${context.title ?? ''}» هنوز منتظر توست.` };
    if (type === 'weekly') return { title: 'مرور هفته شما', body: 'ببینید این هفته چه چیزی خوب پیش رفت و قدم بعدی چیست.' };
    return { title: 'زنجیره WordCircle خود را ادامه بده', body: 'روز یادگیری تازه‌ای آغاز شد.' };
  },
  hi: (type, minutes, context) => {
    if (type === 'deadline') return { title: 'आपकी WordCircle लय प्रतीक्षा में है', body: `आज पूरा करने के लिए मध्यरात्रि तक ${minutes} मिनट बाकी हैं।` };
    if (type === 'due') return { title: 'दोहराव प्रतीक्षा में', body: `${context.count ?? 0} शब्द देय हैं — लगभग 2 मिनट।` };
    if (type === 'continue_text') return { title: 'जहाँ छोड़ा था वहीं से जारी रखें', body: `«${context.title ?? ''}» अभी भी आपका इंतज़ार कर रहा है।` };
    if (type === 'weekly') return { title: 'आपका साप्ताहिक सारांश', body: 'देखें इस सप्ताह क्या काम आया और आगे क्या है।' };
    return { title: 'अपनी WordCircle लय जारी रखें', body: 'नया सीखने का दिन शुरू हुआ।' };
  },
  ml: (type, minutes, context) => {
    if (type === 'deadline') return { title: 'നിങ്ങളുടെ WordCircle തുടർച്ച കാത്തിരിക്കുന്നു', body: `ഇന്ന് പൂർത്തിയാക്കാൻ അർധരാത്രി വരെ ${minutes} മിനിറ്റ് ബാക്കി.` };
    if (type === 'due') return { title: 'ആവർത്തനങ്ങൾ കാത്തിരിക്കുന്നു', body: `${context.count ?? 0} വാക്കുകൾ ബാക്കിയുണ്ട് — ഏകദേശം 2 മിനിറ്റ്.` };
    if (type === 'continue_text') return { title: 'നിർത്തിയിടത്തുനിന്ന് തുടരുക', body: `«${context.title ?? ''}» ഇപ്പോഴും നിങ്ങൾക്കായി കാത്തിരിക്കുന്നു.` };
    if (type === 'weekly') return { title: 'നിങ്ങളുടെ ആഴ്ചയിലെ സംഗ്രഹം', body: 'ഈ ആഴ്ച എന്ത് നേടി, അടുത്തത് എന്തെന്ന് കാണുക.' };
    return { title: 'നിങ്ങളുടെ WordCircle തുടർച്ച തുടരുക', body: 'പുതിയ പഠന ദിവസം തുടങ്ങി.' };
  },
  pt: (type, minutes, context) => {
    if (type === 'deadline') return { title: 'A sua sequência WordCircle está à espera', body: `Restam ${minutes} minutos até à meia-noite para qualificar hoje.` };
    if (type === 'due') return { title: 'Revisões à espera', body: `${context.count ?? 0} palavras estão para rever — cerca de 2 minutos.` };
    if (type === 'continue_text') return { title: 'Continue onde parou', body: `«${context.title ?? ''}» ainda está à sua espera.` };
    if (type === 'weekly') return { title: 'O seu resumo semanal', body: 'Veja o que resultou esta semana e o que vem a seguir.' };
    return { title: 'Continue a sua sequência WordCircle', body: 'Começou um novo dia de aprendizagem.' };
  },
  ru: (type, minutes, context) => {
    if (type === 'deadline') return { title: 'Ваша серия WordCircle ждёт', body: `До полуночи осталось ${minutes} минут, чтобы засчитать сегодняшний день.` };
    if (type === 'due') return { title: 'Повторения ждут', body: `${context.count ?? 0} слов ждут повторения — около 2 минут.` };
    if (type === 'continue_text') return { title: 'Продолжите с места остановки', body: `«${context.title ?? ''}» всё ещё ждёт вас.` };
    if (type === 'weekly') return { title: 'Ваши итоги недели', body: 'Посмотрите, что получилось на этой неделе и что дальше.' };
    return { title: 'Продолжите серию WordCircle', body: 'Начался новый учебный день.' };
  },
  uk: (type, minutes, context) => {
    if (type === 'deadline') return { title: 'Ваша серія WordCircle чекає', body: `До опівночі залишилося ${minutes} хвилин, щоб зарахувати сьогодні.` };
    if (type === 'due') return { title: 'Повторення чекають', body: `${context.count ?? 0} слів чекають на повторення — близько 2 хвилин.` };
    if (type === 'continue_text') return { title: 'Продовжте з місця зупинки', body: `«${context.title ?? ''}» досі чекає на вас.` };
    if (type === 'weekly') return { title: 'Ваш підсумок тижня', body: 'Подивіться, що вдалося цього тижня і що далі.' };
    return { title: 'Продовжте серію WordCircle', body: 'Почався новий навчальний день.' };
  }
};

export function reminderNotification(type: ReminderType, locale: ReminderLocale, minutesRemaining: number, context: NotificationContext = {}): NotificationText {
  return (NOTIFICATIONS[locale] ?? NOTIFICATIONS.en)(type, minutesRemaining, context);
}

export async function registerPeriodicReminders(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.ready;
  const periodicSync = (registration as ServiceWorkerRegistration & { periodicSync?: { register: (tag: string, options: { minInterval: number }) => Promise<void> } }).periodicSync;
  if (!periodicSync) return false;
  try {
    await periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: 15 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterPeriodicReminders(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  const periodicSync = (registration as ServiceWorkerRegistration & { periodicSync?: { unregister: (tag: string) => Promise<void> } }).periodicSync;
  if (!periodicSync) return;
  try {
    await periodicSync.unregister(PERIODIC_SYNC_TAG);
  } catch {
    // Nothing registered.
  }
}

export async function periodicRemindersRegistered(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;
  const periodicSync = (registration as ServiceWorkerRegistration & { periodicSync?: { getTags: () => Promise<string[]> } }).periodicSync;
  if (!periodicSync) return false;
  try {
    return (await periodicSync.getTags()).includes(PERIODIC_SYNC_TAG);
  } catch {
    return false;
  }
}

export async function requestReminderCheck(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  registration.active?.postMessage({ type: 'CHECK_REMINDERS' });
}
