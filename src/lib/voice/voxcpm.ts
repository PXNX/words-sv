/*
 * VoxCPM2 (OpenBMB) — 2B-parameter text-to-speech for 30 languages at 48 kHz, run on the learner's
 * device in voxcpm.worker.ts (WebGPU only). Experimental: ~1.6 GB download, slow on phones, and
 * the model picks its own voice, which the worker keeps steadier with a per-character noise seed.
 * naturalVoices.svelte.ts uses it when the settings pick "VoxCPM" (see engines.ts).
 */
import { createPriorityQueue, type Priority } from '#lib/audio/priorityQueue.js';
import { createWorkerClient } from '#lib/workers/protocol.js';
import type { VoxProtocol } from './voxcpm.worker.js';

const SPEAK_TIMEOUT_MS = 180_000;

const queue = createPriorityQueue();
let loading: Promise<void> | null = null;
let loaded = false;
// A worker the browser killed (most often for running out of memory) fails what is waiting with
// that reason instead of leaving the download hanging.
const engine = createWorkerClient<VoxProtocol>(() => new Worker(new URL('./voxcpm.worker.ts', import.meta.url), { type: 'module' }), {
  crashMessage: 'The VoxCPM worker stopped, most likely out of memory',
  onRestart(reason) {
    loaded = false;
    queue.clear(reason);
  }
});

export function voxcpmSupported() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && typeof Worker !== 'undefined';
}

export function voxcpmReady() {
  return loaded;
}

/** Downloads (resumably, once) and loads the graphs; `onProgress` gets bytes loaded and total. */
export function prepareVoxCPM(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= engine.request('load', {}, { onUpdate: (progress) => onProgress?.(progress.loaded, progress.total) })
    .then(() => { loaded = true; })
    .finally(() => { loading = null; });
  return loading;
}

/** A stable number for a speaker, so each character keeps drawing the same noise. */
export function voiceSeed(name: string) {
  let hash = 2166136261;
  for (const char of name) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Speaks `text`; resolves with mono PCM at 48 kHz. */
export async function speakVoxCPM(text: string, speaker: string, priority: Priority = 'foreground') {
  await prepareVoxCPM();
  return queue.push(() => engine.request('speak', { text, seed: voiceSeed(speaker) }, { timeoutMs: SPEAK_TIMEOUT_MS }), priority);
}

/** Stops the engine and forgets the loaded model (its files are being deleted). */
export function unloadVoxCPM() {
  engine.restart();
}
