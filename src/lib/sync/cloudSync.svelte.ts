/*
 * Keeps this device's progress and the linked Telegram account's in step (api/progress/sync.ts).
 * At startup it pulls the account's snapshot and merges it in (progressMerge.ts); when that brings
 * anything new, the page reloads once so every mode reads the merged progress. Afterwards it pushes
 * whenever the progress changed: every minute while open and when the app goes to the background.
 * The first push after linking is what carries the progress made offline over to the account.
 * Unlinked devices only ask once per start whether they are linked, and nothing else is sent.
 */
import { deviceId } from '#lib/streak/clientStreak.js';
import * as v from 'valibot';
import { ApiError, callApi } from '#lib/api/client.js';
import { SyncReplySchema, type SyncReply } from '#lib/api/schemas.js';
import { changedEntries, collectSnapshot, mergeSnapshots, snapshotFingerprint, type ProgressSnapshot } from './progressMerge.js';

type Meta = { revision: number; fingerprint: string; savedAt: number | null };
type Reply = SyncReply;

const META_KEY = 'wordcircle-sync-v1';
const RELOAD_KEY = 'wordcircle-sync-reloaded';
const PUSH_EVERY_MS = 60_000;
const MAX_ATTEMPTS = 3;

export const cloudSync = $state<{ linked: boolean | null; savedAt: number | null; busy: boolean; failed: boolean }>({ linked: null, savedAt: null, busy: false, failed: false });

// Anything unreadable starts over from revision 0, which only costs one extra pull.
const MetaSchema = v.object({
  revision: v.fallback(v.pipe(v.number(), v.integer(), v.minValue(0)), 0),
  fingerprint: v.fallback(v.string(), ''),
  savedAt: v.fallback(v.nullable(v.pipe(v.number(), v.minValue(1))), null)
});

function readMeta(): Meta {
  try {
    const parsed = v.safeParse(MetaSchema, JSON.parse(localStorage.getItem(META_KEY) ?? 'null'));
    if (parsed.success) return parsed.output;
  } catch {}
  return { revision: 0, fingerprint: '', savedAt: null };
}

function writeMeta(meta: Meta) {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* full storage: the next sync starts over */ }
  cloudSync.savedAt = meta.savedAt;
}

async function call(body: Record<string, unknown>): Promise<Reply> {
  try {
    return await callApi('/api/progress/sync', SyncReplySchema, { body: { deviceId: deviceId(), ...body }, accept: [409] });
  } catch (error) {
    throw new Error(error instanceof ApiError && error.code !== 'unavailable' ? error.code : 'sync_unavailable');
  }
}

/** Writes merged entries back; returns whether anything on this device changed. */
function applyLocally(remote: ProgressSnapshot | null): boolean {
  const local = collectSnapshot(localStorage);
  const changes = changedEntries(local, mergeSnapshots(local, remote));
  for (const [key, value] of Object.entries(changes)) {
    try { localStorage.setItem(key, value); } catch { /* full storage: keep what fits */ }
  }
  return Object.keys(changes).length > 0;
}

/** Pushes this device's (already merged) progress, merging again if another device was faster. */
async function pushMerged(revision: number): Promise<boolean> {
  let base = revision;
  let changedHere = false;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const snapshot = collectSnapshot(localStorage);
    const reply = await call({ action: 'push', baseRevision: base, snapshot });
    if (reply.ok && typeof reply.revision === 'number') {
      writeMeta({ revision: reply.revision, fingerprint: snapshotFingerprint(snapshot), savedAt: Date.now() });
      return changedHere;
    }
    if (reply.error !== 'conflict') throw new Error(reply.error ?? 'sync_failed');
    changedHere = applyLocally(reply.snapshot ?? null) || changedHere;
    base = reply.revision ?? 0;
  }
  throw new Error('sync_conflict');
}

let running: Promise<void> | null = null;
function exclusive(task: () => Promise<void>): Promise<void> {
  running ??= (async () => {
    cloudSync.busy = true;
    try {
      await task();
      cloudSync.failed = false;
    } catch (error) {
      console.warn('Progress sync failed', error);
      cloudSync.failed = true;
    } finally {
      cloudSync.busy = false;
      running = null;
    }
  })();
  return running;
}

function reloadOnce() {
  // At most once a minute, so a sync that keeps changing something can never loop the page.
  const last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0;
  if (Date.now() - last < 60_000) return;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  location.reload();
}

/**
 * Pulls and merges the account's progress, then saves the result to it. `reload` lets new progress
 * from the account show at once (at startup, or right after linking).
 */
export function syncNow({ reload = false } = {}): Promise<void> {
  return exclusive(async () => {
    const pulled = await call({ action: 'pull' });
    cloudSync.linked = Boolean(pulled.linked);
    if (!pulled.linked) return;
    const changed = applyLocally(pulled.snapshot ?? null);
    const merged = collectSnapshot(localStorage);
    const upToDate = pulled.snapshot && snapshotFingerprint(merged) === snapshotFingerprint(pulled.snapshot);
    let changedByPush = false;
    if (upToDate) writeMeta({ revision: pulled.revision ?? 0, fingerprint: snapshotFingerprint(merged), savedAt: readMeta().savedAt ?? Date.now() });
    else changedByPush = await pushMerged(pulled.revision ?? 0);
    if (reload && (changed || changedByPush)) reloadOnce();
  });
}

/** Saves the progress if it changed since the last save. */
export function pushIfChanged(): Promise<void> {
  if (cloudSync.linked !== true || running) return running ?? Promise.resolve();
  const meta = readMeta();
  if (snapshotFingerprint(collectSnapshot(localStorage)) === meta.fingerprint) return Promise.resolve();
  return exclusive(async () => { await pushMerged(meta.revision); });
}

/** Called when the Telegram status says the device is linked (Mini App or the bot's link). */
export function noteLinked(linked: boolean) {
  const was = cloudSync.linked;
  if (!linked || was === true) {
    cloudSync.linked = linked;
    return;
  }
  // Newly linked (or the startup check is still out): merge with the account right away, after any
  // sync already under way, so the progress made so far moves over to the account.
  void (running ?? Promise.resolve()).then(() => syncNow({ reload: true }));
}

let started = false;
/** Starts syncing for this page; a no-op under `vite dev`, where /api does not exist. */
export function startCloudSync() {
  if (started || typeof window === 'undefined' || import.meta.env?.DEV) return;
  started = true;
  cloudSync.savedAt = readMeta().savedAt;
  void syncNow({ reload: true });
  window.setInterval(() => void pushIfChanged(), PUSH_EVERY_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void pushIfChanged(); });
}
