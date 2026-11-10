/*
 * IndexedDB storage for the learning event log (events.ts). Writes are batched per tick and never
 * block or fail an answer; without IndexedDB (private mode, tests) logging is a silent no-op.
 * Every mode logs through `logLearningEvent`; none writes progress on its own.
 */
import { itemId, isLevel, sessionId as newSessionId, type LangCode, type SessionId } from '#lib/domain/types.js';
import { aggregateKey, compactEvents, normalizeLearningEvent, skillForMode, type DailyAggregate, type EventMode, type LearningEvent, type LearningEventInput } from './events.js';

const DB_NAME = 'wordcircle-events-v1';
const DB_VERSION = 1;
const EVENTS = 'events';
const AGGREGATES = 'aggregates';
const SESSION_GAP_MS = 30 * 60 * 1000;

let database: Promise<IDBDatabase | null> | null = null;
let pending: LearningEvent[] = [];
let flushScheduled = false;
let session: { id: SessionId; lastAt: number } | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
  if (database) return database;
  database = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(EVENTS)) db.createObjectStore(EVENTS, { keyPath: 'id' }).createIndex('ts', 'ts');
        if (!db.objectStoreNames.contains(AGGREGATES)) db.createObjectStore(AGGREGATES);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return database;
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

/** The current practice session; a 30-minute pause starts a new one. */
export function currentSession(now = Date.now()): SessionId {
  if (!session || now - session.lastAt > SESSION_GAP_MS) session = { id: newSessionId(), lastAt: now };
  session.lastAt = now;
  return session.id;
}

function eventId(ts: number) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${ts.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createEvent(input: LearningEventInput, now = Date.now()): LearningEvent {
  const ts = input.ts ?? now;
  return { ...input, id: input.id ?? eventId(ts), ts, sessionId: input.sessionId ?? currentSession(ts) };
}

/** Appends one event; returns it immediately, the write happens in the background. */
export function logLearningEvent(input: LearningEventInput): LearningEvent {
  const event = createEvent(input);
  pending.push(event);
  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(() => void flushEvents());
  }
  return event;
}

/** Shorthand for an answer or completion outside the review ledger (texts, games, writing). */
export function logAnswer(lang: string, mode: EventMode, item: string, correct: boolean | null, extra: { level?: string; score?: number } = {}): LearningEvent {
  return logLearningEvent({
    lang: lang as LangCode,
    mode,
    skill: skillForMode(mode),
    itemId: itemId(lang as LangCode, item),
    correct,
    ...(isLevel(extra.level) ? { level: extra.level } : {}),
    ...(extra.score !== undefined ? { score: Math.min(1, Math.max(0, extra.score)) } : {})
  });
}

export async function flushEvents(): Promise<void> {
  flushScheduled = false;
  const batch = pending;
  pending = [];
  if (!batch.length) return;
  const db = await openDatabase();
  if (!db) return;
  try {
    const transaction = db.transaction(EVENTS, 'readwrite');
    const store = transaction.objectStore(EVENTS);
    for (const event of batch) store.put(event);
    await done(transaction);
  } catch {
    // Quota or a closed database must never interrupt practice.
  }
}

/** Events since `since` (inclusive), oldest first, validated. */
export async function readEvents(since = 0): Promise<LearningEvent[]> {
  await flushEvents();
  const db = await openDatabase();
  if (!db) return [];
  try {
    const transaction = db.transaction(EVENTS, 'readonly');
    const request = transaction.objectStore(EVENTS).index('ts').getAll(IDBKeyRange.lowerBound(since));
    const rows = await new Promise<unknown[]>((resolve) => {
      request.onsuccess = () => resolve(request.result as unknown[]);
      request.onerror = () => resolve([]);
    });
    return rows.flatMap((row) => {
      const event = normalizeLearningEvent(row);
      return event ? [event] : [];
    });
  } catch {
    return [];
  }
}

export async function readAggregates(): Promise<Map<string, DailyAggregate>> {
  const db = await openDatabase();
  const result = new Map<string, DailyAggregate>();
  if (!db) return result;
  try {
    const request = db.transaction(AGGREGATES, 'readonly').objectStore(AGGREGATES).getAll();
    const rows = await new Promise<DailyAggregate[]>((resolve) => {
      request.onsuccess = () => resolve(request.result as DailyAggregate[]);
      request.onerror = () => resolve([]);
    });
    for (const row of rows) result.set(aggregateKey(row), row);
  } catch {}
  return result;
}

/** Folds events older than 12 months into daily aggregates and deletes them. */
export async function compactEventLog(now = Date.now()): Promise<number> {
  const db = await openDatabase();
  if (!db) return 0;
  const { expired, aggregates } = compactEvents(await readEvents(0), await readAggregates(), now);
  if (!expired.length) return 0;
  try {
    const transaction = db.transaction([EVENTS, AGGREGATES], 'readwrite');
    const events = transaction.objectStore(EVENTS);
    const store = transaction.objectStore(AGGREGATES);
    for (const event of expired) events.delete(event.id);
    for (const [key, aggregate] of aggregates) store.put(aggregate, key);
    await done(transaction);
  } catch {
    return 0;
  }
  return expired.length;
}
