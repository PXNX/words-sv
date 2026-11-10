/*
 * Supertonic 2 (Supertone) — open text-to-speech for English, Spanish, Portuguese and French that
 * runs entirely on the learner's device, in supertonic.worker.ts. Ten preset voices (F1–F5, M1–M5)
 * at 44.1 kHz; the ~260 MB model downloads once and stays cached. naturalVoices.svelte.ts uses this
 * when the settings pick "Supertonic" (see engines.ts), with Piper for the other languages.
 */
import { createPriorityQueue, type Priority } from '#lib/audio/priorityQueue.js';
import { createWorkerClient } from '#lib/workers/protocol.js';
import type { SupertonicProtocol } from './supertonic.worker.js';

const SPEAK_TIMEOUT_MS = 60_000;

const queue = createPriorityQueue();
let loading: Promise<void> | null = null;
let loaded = false;
const engine = createWorkerClient<SupertonicProtocol>(() => new Worker(new URL('./supertonic.worker.ts', import.meta.url), { type: 'module' }), {
  onRestart(reason) {
    loaded = false;
    queue.clear(reason);
  }
});

export function supertonicSupported() {
  return typeof window !== 'undefined' && 'Worker' in window && 'WebAssembly' in window;
}

export function supertonicReady() {
  return loaded;
}

/** Downloads (once) and loads the model; `onProgress` gets bytes loaded and total. */
export function prepareSupertonic(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= engine.request('load', {}, { onUpdate: (progress) => onProgress?.(progress.loaded, progress.total) })
    .then(() => { loaded = true; })
    .finally(() => { loading = null; });
  return loading;
}

/** Speaks `text` with one of the preset voices; resolves with mono PCM. */
export async function speakSupertonic(text: string, language: string, voice: string, speed: number, priority: Priority = 'foreground') {
  await prepareSupertonic();
  return queue.push(() => engine.request('speak', { text, language, voice, speed }, { timeoutMs: SPEAK_TIMEOUT_MS }), priority);
}

/** Stops the engine and forgets the loaded model (its files are being deleted). */
export function unloadSupertonic() {
  engine.restart();
}
