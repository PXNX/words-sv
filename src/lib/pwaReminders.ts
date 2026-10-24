// Streak reminders that live inside the installed PWA: the app stores the current streak state in
// IndexedDB and the service worker checks it from the Periodic Background Sync event. No server,
// push subscription or scheduler is involved, so this keeps working on deployments without VAPID keys.

export const PERIODIC_SYNC_TAG = 'wordcircle-streak-reminder';

type ReminderType = 'new_day' | 'deadline';

export type ReminderState = {
  enabled: boolean;
  timeZone: string;
  dateKey: string;
  qualified: boolean;
  lastQualifiedDay: string | null;
  locale: 'de' | 'en';
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
  return record ? { enabled: record.enabled, timeZone: record.timeZone, dateKey: record.dateKey, qualified: record.qualified, lastQualifiedDay: record.lastQualifiedDay ?? null, locale: record.locale === 'de' ? 'de' : 'en' } : null;
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

export function reminderLocale(): 'de' | 'en' {
  const language = (typeof document !== 'undefined' ? document.documentElement.lang : '') || (typeof navigator !== 'undefined' ? navigator.language : '');
  return language.toLowerCase().startsWith('de') ? 'de' : 'en';
}

export async function publishReminderState(streak: StreakLike): Promise<void> {
  await writeReminderState({
    timeZone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' : 'UTC',
    dateKey: streak.dateKey,
    qualified: streak.qualified,
    lastQualifiedDay: streak.lastQualifiedDay,
    locale: reminderLocale()
  });
}

export async function wasReminderDelivered(dateKey: string, type: ReminderType): Promise<boolean> {
  const record = await withStore<Delivery>(DELIVERY_STORE, 'readonly', (store) => store.get(`${dateKey}:${type}`));
  return Boolean(record);
}

export async function markReminderDelivered(dateKey: string, type: ReminderType): Promise<void> {
  const id = `${dateKey}:${type}`;
  await withStore(DELIVERY_STORE, 'readwrite', (store) => store.put({ id, at: Date.now() } satisfies Delivery));
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

export function dueReminderTypes(state: ReminderState, now = new Date()): { types: ReminderType[]; dateKey: string; minutesRemaining: number } {
  const dateKey = dateKeyFor(state.timeZone, now);
  const minutesRemaining = minutesUntilNextLocalDate(state.timeZone, now);
  if (!state.enabled) return { types: [], dateKey, minutesRemaining };
  const qualifiedToday = state.qualified && state.dateKey === dateKey;
  const atRisk = state.lastQualifiedDay === previousDateKey(dateKey) && !qualifiedToday;
  const types: ReminderType[] = [];
  if (!atRisk) return { types, dateKey, minutesRemaining };
  if (minutesRemaining > 0 && minutesRemaining <= 120) types.push('deadline');
  else if (1440 - minutesRemaining < 120) types.push('new_day');
  return { types, dateKey, minutesRemaining };
}

export function reminderNotification(type: ReminderType, locale: 'de' | 'en', minutesRemaining: number): { title: string; body: string } {
  if (locale === 'de') {
    return type === 'deadline'
      ? { title: 'Deine WordCircle-Serie wartet', body: `Nur noch ${minutesRemaining} Minuten bis Mitternacht, um heute zu qualifizieren.` }
      : { title: 'Weiter mit deiner WordCircle-Serie', body: 'Ein neuer Lerntag hat begonnen.' };
  }
  return type === 'deadline'
    ? { title: 'Keep your WordCircle streak', body: `Only ${minutesRemaining} minutes remain to qualify today.` }
    : { title: 'Continue your WordCircle streak', body: 'A new learning day has started.' };
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
