/*
 * Supertonic (Supertone): open text-to-speech that runs entirely on the learner's device, in
 * supertonic.worker.ts. Supertonic 2 speaks English, Spanish, Portuguese and French; Supertonic 3
 * every language the app teaches (31 in all). Both have ten preset voices (F1–F5, M1–M5, listed in
 * engines.ts) at 44.1 kHz; each model downloads once and stays cached. naturalVoices.svelte.ts uses
 * this when the settings pick either (see engines.ts), with Piper for the other languages.
 */
import { createPriorityQueue, type Priority } from '#lib/audio/priorityQueue.js';
import { createWorkerClient } from '#lib/workers/protocol.js';
import type { SupertonicModel, SupertonicProtocol } from './supertonic.worker.js';

export type { SupertonicModel };
const SPEAK_TIMEOUT_MS = 60_000;

const queue = createPriorityQueue();
const loading = new Map<SupertonicModel, Promise<void>>();
const loaded = new Set<SupertonicModel>();
const engine = createWorkerClient<SupertonicProtocol>(() => new Worker(new URL('./supertonic.worker.ts', import.meta.url), { type: 'module' }), {
  onRestart(reason) {
    loaded.clear();
    queue.clear(reason);
  }
});

export function supertonicSupported() {
  return typeof window !== 'undefined' && 'Worker' in window && 'WebAssembly' in window;
}

export function supertonicReady(model: SupertonicModel = 'supertonic') {
  return loaded.has(model);
}

/** Downloads (once) and loads a model; `onProgress` gets bytes loaded and total. */
export function prepareSupertonic(onProgress?: (loaded: number, total: number) => void, model: SupertonicModel = 'supertonic'): Promise<void> {
  if (loaded.has(model)) return Promise.resolve();
  let task = loading.get(model);
  if (!task) {
    task = engine.request('load', { model }, { onUpdate: (progress) => onProgress?.(progress.loaded, progress.total) })
      .then(() => { loaded.add(model); })
      .finally(() => loading.delete(model));
    loading.set(model, task);
  }
  return task;
}

/** Speaks `text` with one of the preset voices; resolves with mono PCM. */
export async function speakSupertonic(text: string, language: string, voice: string, speed: number, priority: Priority = 'foreground', model: SupertonicModel = 'supertonic') {
  await prepareSupertonic(undefined, model);
  return queue.push(() => engine.request('speak', { model, text, language, voice, speed }, { timeoutMs: SPEAK_TIMEOUT_MS }), priority);
}

/** Stops the engine and forgets the loaded models (their files are being deleted). */
export function unloadSupertonic() {
  engine.restart();
}
