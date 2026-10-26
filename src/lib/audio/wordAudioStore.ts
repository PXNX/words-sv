/**
 * Persistent home of the shared word audio. Both the vocabulary quiz and the listening mode
 * fill the same store, so a word rendered in one game is instantly available in the other and
 * survives a reload.
 *
 * PCM is stored as 16-bit samples: a whole level of word clips stays far smaller than it would as
 * WAV blobs, and IndexedDB clones typed arrays without copying them into strings.
 */

export type StoredWordAudio = {
	samples: Int16Array;
	sampleRate: number;
	playbackRate: number;
	volume: number;
	savedAt: number;
};

const DB_NAME = 'wordcircle-word-audio-v1';
const STORE = 'clips';

let opening: Promise<IDBDatabase | null> | null = null;

function openDatabase(): Promise<IDBDatabase | null> {
	if (typeof indexedDB === 'undefined') return Promise.resolve(null);
	opening ??= new Promise((resolve) => {
		let request: IDBOpenDBRequest;
		try {
			request = indexedDB.open(DB_NAME, 1);
		} catch {
			resolve(null);
			return;
		}
		request.onupgradeneeded = () => {
			const database = request.result;
			if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => resolve(null);
		request.onblocked = () => resolve(null);
	});
	return opening;
}

function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
	return openDatabase().then((database) => {
		if (!database) return null;
		return new Promise<T | null>((resolve) => {
			let request: IDBRequest<T>;
			try {
				request = run(database.transaction(STORE, mode).objectStore(STORE));
			} catch {
				resolve(null);
				return;
			}
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(null);
		});
	});
}

export function readWordAudio(key: string) {
	return transact<StoredWordAudio | undefined>('readonly', (store) => store.get(key) as IDBRequest<StoredWordAudio | undefined>);
}

export function writeWordAudio(key: string, clip: StoredWordAudio) {
	return transact<IDBValidKey>('readwrite', (store) => store.put(clip, key));
}

export function listWordAudioKeys() {
	return transact<IDBValidKey[]>('readonly', (store) => store.getAllKeys() as IDBRequest<IDBValidKey[]>).then((keys) =>
		(keys ?? []).filter((key): key is string => typeof key === 'string')
	);
}

export function deleteWordAudio(keys: string[]) {
	if (!keys.length) return Promise.resolve(null);
	return openDatabase().then((database) => {
		if (!database) return null;
		try {
			const store = database.transaction(STORE, 'readwrite').objectStore(STORE);
			for (const key of keys) store.delete(key);
			return Promise.resolve(null);
		} catch {
			return null;
		}
	});
}
