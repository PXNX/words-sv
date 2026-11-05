/*
 * Progress saved to a Telegram account is the app's own storage: every `wordcircle-` entry except
 * the ones that only make sense on this device. When a device's progress and the account's meet
 * (the first link, or another phone that played meanwhile), they are merged so nothing learned is
 * lost: lists are joined, review entries keep their newest version, counters keep the higher
 * number, a day's state keeps the newer day, and plain settings keep this device's choice.
 */

export type ProgressSnapshot = Record<string, string>;

export const SYNC_PREFIX = 'wordcircle-';

// Device-only: ids, downloads and caches, hardware choices, per-device look and feel, bookkeeping.
const DEVICE_ONLY = new Set([
  'wordcircle-streak-device-v1',
  'wordcircle-install-hint-dismissed-v1',
  'wordcircle-chat-model-v1',
  'wordcircle-voice-quality-v1',
  'wordcircle-natural-model-v1',
  'wordcircle-audio-v1',
  'wordcircle-word-audio-v1',
  'wordcircle-auto-update-at',
  'wordcircle-on-demand',
  'wordcircle-reminders',
  'wordcircle-streak-reminder',
  'wordcircle-telegram-init-data-v1',
  'wordcircle-theme',
  'wordcircle-sound',
  'wordcircle-vibration',
  'wordcircle-sync-v1'
]);

// Top-level numbers that only ever grow; other top-level numbers are settings (e.g. the goal).
const COUNTERS = new Set(['wordcircle-completed-rounds-v1']);

// The activity log's cap (progress/activity.ts); joined logs keep the most recent events.
const MAX_TIMELINE = 4000;

export function isSyncedKey(key: string): boolean {
  return key.startsWith(SYNC_PREFIX) && !DEVICE_ONLY.has(key);
}

/** The synced entries of a storage-like object. */
export function collectSnapshot(storage: Pick<Storage, 'length' | 'key' | 'getItem'>): ProgressSnapshot {
  const snapshot: ProgressSnapshot = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !isSyncedKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
  return snapshot;
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const isObject = (value: unknown): value is Record<string, Json> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function parse(raw: string): { ok: true; value: Json } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as Json };
  } catch {
    return { ok: false };
  }
}

function mergeArrays(local: Json[], remote: Json[]): Json[] {
  const primitive = (value: Json) => value === null || typeof value !== 'object';
  if (local.every(primitive) && remote.every(primitive)) return [...local, ...remote.filter((value) => !local.includes(value))];
  // Timelines (events with a timestamp `at`): join, drop duplicates, keep order and the newest.
  const timed = (value: Json) => isObject(value) && typeof value.at === 'number';
  if (local.every(timed) && remote.every(timed)) {
    const seen = new Set<string>();
    const joined = [...local, ...remote].filter((value) => {
      const id = JSON.stringify(value);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    joined.sort((a, b) => ((a as { at: number }).at - (b as { at: number }).at));
    return joined.slice(-MAX_TIMELINE);
  }
  return remote.length > local.length ? remote : local;
}

/** Merges two parsed values; `local` wins where neither side is clearly further along. */
export function mergeJson(local: Json, remote: Json): Json {
  if (Array.isArray(local) && Array.isArray(remote)) return mergeArrays(local, remote);
  if (isObject(local) && isObject(remote)) {
    // A versioned record (a review entry): the newer one, whole.
    if (typeof local.updatedAt === 'number' && typeof remote.updatedAt === 'number') return remote.updatedAt > local.updatedAt ? remote : local;
    // A day's state (the streak): another day's counters must not mix in, so the newer day wins.
    if (isDay(local.dateKey) && isDay(remote.dateKey) && local.dateKey !== remote.dateKey) {
      const newer = remote.dateKey > local.dateKey ? remote : local;
      const older = newer === remote ? local : remote;
      // Lifetime records still keep the better of both.
      const best = Math.max(Number(newer.bestStreak) || 0, Number(older.bestStreak) || 0);
      return 'bestStreak' in newer ? { ...newer, bestStreak: best } : newer;
    }
    const merged: Record<string, Json> = { ...remote, ...local };
    for (const key of Object.keys(local)) if (key in remote) merged[key] = mergeJson(local[key], remote[key]);
    return merged;
  }
  if (typeof local === 'number' && typeof remote === 'number') return Math.max(local, remote);
  if (typeof local === 'boolean' && typeof remote === 'boolean') return local || remote;
  if (isDay(local) && isDay(remote)) return local > remote ? local : remote;
  return local;
}

/** Merges one stored entry. */
export function mergeEntry(key: string, local: string, remote: string): string {
  if (local === remote) return local;
  const a = parse(local);
  const b = parse(remote);
  if (!a.ok || !b.ok) return local;
  // A single top-level value is a setting (this device's choice), unless it is a counter.
  if (!isObject(a.value) && !Array.isArray(a.value)) {
    if (COUNTERS.has(key) && typeof a.value === 'number' && typeof b.value === 'number') return String(Math.max(a.value, b.value));
    return local;
  }
  const merged = mergeJson(a.value, b.value);
  return JSON.stringify(merged) === JSON.stringify(a.value) ? local : JSON.stringify(merged);
}

/** Merges the account's snapshot into this device's; entries only on one side are kept. */
export function mergeSnapshots(local: ProgressSnapshot, remote: ProgressSnapshot | null): ProgressSnapshot {
  if (!remote) return { ...local };
  const merged: ProgressSnapshot = {};
  for (const [key, value] of Object.entries(remote)) if (isSyncedKey(key) && typeof value === 'string') merged[key] = value;
  for (const [key, value] of Object.entries(local)) merged[key] = key in merged ? mergeEntry(key, value, merged[key]) : value;
  return merged;
}

/** The entries that differ from what this device stores (what a merge would write back). */
export function changedEntries(local: ProgressSnapshot, merged: ProgressSnapshot): ProgressSnapshot {
  const changed: ProgressSnapshot = {};
  for (const [key, value] of Object.entries(merged)) if (local[key] !== value) changed[key] = value;
  return changed;
}

/** A cheap fingerprint, to tell whether anything changed since the last push. */
export function snapshotFingerprint(snapshot: ProgressSnapshot): string {
  let hash = 2166136261;
  const text = Object.keys(snapshot).sort().map((key) => `${key}\u0000${snapshot[key]}`).join('\u0001');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}
