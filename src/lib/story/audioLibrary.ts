import type { SoundEffect } from '#lib/sounds.js';

export type SavedStoryStart = { at: number; title: string };
export type SavedSound = { at: number; effect: SoundEffect };

export type SavedAudio = {
  id: string;
  createdAt: number;
  updatedAt: number;
  language: string;
  level: string;
  duration: number;
  position: number;
  storyCount: number;
  stories: SavedStoryStart[];
  sounds?: SavedSound[];
};

const DB_NAME = 'wordcircle-audio-v1';
const DB_VERSION = 1;
const SESSIONS = 'sessions';
const BLOBS = 'blobs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS)) db.createObjectStore(SESSIONS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error('Could not open the audio library.'));
    request.onblocked = () => reject(new Error('The audio library is blocked by another tab.'));
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The audio library request failed.'));
  });
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('The audio library transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('The audio library transaction was cancelled.'));
  });
}

async function withDb<T>(work: (db: IDBDatabase) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    return await work(db);
  } finally {
    db.close();
  }
}

export function listAudioSessions(): Promise<SavedAudio[]> {
  return withDb(async (db) => {
    const transaction = db.transaction(SESSIONS, 'readonly');
    const completed = done(transaction);
    const rows = await result(transaction.objectStore(SESSIONS).getAll() as IDBRequest<SavedAudio[]>);
    await completed;
    return rows.sort((left, right) => right.updatedAt - left.updatedAt);
  });
}

export function readAudioSession(id: string): Promise<SavedAudio | undefined> {
  return withDb(async (db) => {
    const transaction = db.transaction(SESSIONS, 'readonly');
    const completed = done(transaction);
    const row = await result(transaction.objectStore(SESSIONS).get(id) as IDBRequest<SavedAudio | undefined>);
    await completed;
    return row;
  });
}

export function saveAudioSession(session: SavedAudio, blob: Blob): Promise<void> {
  return withDb(async (db) => {
    const transaction = db.transaction([SESSIONS, BLOBS], 'readwrite');
    const completed = done(transaction);
    transaction.objectStore(SESSIONS).put(session);
    transaction.objectStore(BLOBS).put(blob, session.id);
    await completed;
  });
}

export async function updateAudioSessionPosition(id: string, position: number): Promise<SavedAudio | undefined> {
  const existing = await readAudioSession(id);
  if (!existing) return undefined;
  const updated: SavedAudio = {
    ...existing,
    position: Math.max(0, Math.min(position, existing.duration)),
    updatedAt: Date.now()
  };
  await withDb(async (db) => {
    const transaction = db.transaction(SESSIONS, 'readwrite');
    const completed = done(transaction);
    transaction.objectStore(SESSIONS).put(updated);
    await completed;
  });
  return updated;
}

export function loadAudioBlob(id: string): Promise<Blob | undefined> {
  return withDb(async (db) => {
    const transaction = db.transaction(BLOBS, 'readonly');
    const completed = done(transaction);
    const blob = await result(transaction.objectStore(BLOBS).get(id) as IDBRequest<Blob | undefined>);
    await completed;
    return blob;
  });
}
