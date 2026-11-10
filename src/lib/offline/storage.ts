/*
 * What the app keeps on the device for offline use, by group: the models every engine downloads
 * (Cache API) and the audio it renders (IndexedDB). The settings' "Models & storage" section lists
 * these with their size and lets the learner delete them. Engine code owns its caches; this file
 * only knows their names, so keep it in step when an engine changes where it stores things.
 */
import { formatNumber, learningContext, type FormatContext } from '#lib/format/format.js';
export type StoredGroup = 'piper' | 'supertonic' | 'supertonic3' | 'conversation' | 'wordAudio' | 'listening';

type CacheStore = { cache: string; match?: (url: string) => boolean };
type Store = { caches?: CacheStore[]; databases?: string[] };

export const storedGroups: Record<StoredGroup, Store> = {
  // static/voices/piper-worker.js
  piper: { caches: [{ cache: 'story-voices-v1' }] },
  // transformers.js keeps every model it loads in one cache, keyed by URL.
  supertonic: { caches: [{ cache: 'transformers-cache', match: (url) => url.includes('Supertonic-TTS-2') }] },
  supertonic3: { caches: [{ cache: 'transformers-cache', match: (url) => url.includes('Supertonic-3') }] },
  // WebLLM (conversation/llm.worker.ts)
  conversation: { caches: [{ cache: 'webllm/model' }, { cache: 'webllm/wasm' }, { cache: 'webllm/config' }] },
  // audio/wordAudioStore.ts and story/audioLibrary.ts
  wordAudio: { databases: ['wordcircle-word-audio-v1'] },
  listening: { databases: ['wordcircle-audio-v1'] }
};
export const storedGroupIds = Object.keys(storedGroups) as StoredGroup[];

async function cacheEntries({ cache, match }: CacheStore) {
  if (typeof caches === 'undefined' || !(await caches.has(cache))) return { store: null, requests: [] as Request[] };
  const store = await caches.open(cache);
  const requests = (await store.keys()).filter((request) => !match || match(request.url));
  return { store, requests };
}

/** Bytes a group takes up in the Cache API (databases are only counted in the total estimate). */
export async function groupBytes(group: StoredGroup): Promise<number> {
  let bytes = 0;
  for (const entry of storedGroups[group].caches ?? []) {
    const { store, requests } = await cacheEntries(entry);
    if (!store) continue;
    for (const request of requests) {
      const response = await store.match(request);
      if (!response) continue;
      const length = Number(response.headers.get('content-length'));
      // Cached blobs are backed by disk, so asking for their size does not load them into memory.
      bytes += length > 0 ? length : (await response.blob()).size;
    }
  }
  return bytes;
}

/** Whether anything of the group is stored at all. */
export async function groupStored(group: StoredGroup): Promise<boolean> {
  for (const entry of storedGroups[group].caches ?? []) if ((await cacheEntries(entry)).requests.length) return true;
  if (storedGroups[group].databases?.length && typeof indexedDB !== 'undefined' && 'databases' in indexedDB) {
    const names = new Set((await indexedDB.databases()).map((database) => database.name));
    return storedGroups[group].databases!.some((name) => names.has(name));
  }
  return false;
}

/** Deletes everything the group stored. The engine must be unloaded first (see ModelManager). */
async function deleteCaches(entries: readonly CacheStore[]) {
  for (const entry of entries) {
    if (!entry.match) {
      if (typeof caches !== 'undefined') await caches.delete(entry.cache);
      continue;
    }
    const { store, requests } = await cacheEntries(entry);
    if (store) await Promise.all(requests.map((request) => store.delete(request)));
  }
}

// What removed engines left behind: nothing reads it any more, so it only takes up space.
// VoxCPM2 kept ~1.6 GB of graphs in its own cache and its tokenizer among transformers.js's files.
const retiredCaches: readonly CacheStore[] = [{ cache: 'voxcpm2-v1' }, { cache: 'transformers-cache', match: (url) => url.includes('VoxCPM') }];

/** Frees the space of engines the app no longer has (run once the app is idle). */
export async function deleteRetiredStorage(): Promise<void> {
  await deleteCaches(retiredCaches).catch(() => undefined);
}

export async function deleteGroup(group: StoredGroup): Promise<void> {
  await deleteCaches(storedGroups[group].caches ?? []);
  for (const name of storedGroups[group].databases ?? []) {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
  }
}

/** The browser's own total for this site, and whether it promised not to evict it. */
export async function storageSummary(): Promise<{ usage: number; quota: number; persisted: boolean }> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return { usage: 0, quota: 0, persisted: false };
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const persisted = (await navigator.storage.persisted?.()) ?? false;
  return { usage, quota, persisted };
}

/**
 * Asks the browser to keep the downloads even when space runs low, so a learner with bad internet
 * does not have to fetch gigabytes again. Browsers decide on their own; some grant it silently.
 */
export async function keepStoragePersistent(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

/** "1,2 GB", "350 MB": sizes follow the learner's number format (format/format.ts). */
export function formatBytes(bytes: number, context: FormatContext = learningContext('en')): string {
  const format = (value: number, digits: number) => formatNumber(context, value, { maximumFractionDigits: digits });
  if (bytes >= 1e9) return `${format(bytes / 1e9, 1)} GB`;
  if (bytes >= 1e6) return `${format(bytes / 1e6, 0)} MB`;
  return `${format(bytes / 1e3, 0)} KB`;
}
