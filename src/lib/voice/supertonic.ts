/*
 * Supertonic 2 (Supertone) — open text-to-speech for English, Spanish, Portuguese and French that
 * runs entirely on the learner's device, in supertonic.worker.ts. Ten preset voices (F1–F5, M1–M5)
 * at 44.1 kHz; the ~260 MB model downloads once and stays cached. naturalVoices.svelte.ts uses this
 * when the settings pick "Supertonic" (see engines.ts), with Piper for the other languages.
 */
import { createPriorityQueue, type Priority } from '#lib/audio/priorityQueue.js';
import type { SupertonicReply, SupertonicRequest } from './supertonic.worker.js';

export const SUPERTONIC_VOICES = { female: ['F1', 'F2', 'F3', 'F4', 'F5'], male: ['M1', 'M2', 'M3', 'M4', 'M5'] } as const;
const SPEAK_TIMEOUT_MS = 60_000;

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (reply: SupertonicReply) => void>();
const queue = createPriorityQueue();
let loading: Promise<void> | null = null;
let loaded = false;

function ensureWorker() {
  worker ??= (() => {
    const created = new Worker(new URL('./supertonic.worker.ts', import.meta.url), { type: 'module' });
    created.addEventListener('message', ({ data }: MessageEvent<SupertonicReply>) => pending.get(data.id)?.(data));
    return created;
  })();
  return worker;
}

function restart() {
  worker?.terminate();
  worker = null;
  loaded = false;
  for (const answer of pending.values()) answer({ id: -1, type: 'error', message: 'restarted' });
  pending.clear();
  queue.clear('restarted');
}

type Request = SupertonicRequest extends infer R ? R extends { id: number } ? Omit<R, 'id'> : never : never;
function request(message: Request, onProgress?: (loaded: number, total: number) => void, timeoutMs = 0) {
  const id = ++nextId;
  return new Promise<SupertonicReply & { type: 'done' }>((resolve, reject) => {
    const timer = timeoutMs ? setTimeout(restart, timeoutMs) : 0;
    pending.set(id, (reply) => {
      if (reply.type === 'progress') return onProgress?.(reply.loaded, reply.total);
      clearTimeout(timer);
      pending.delete(id);
      if (reply.type === 'error') reject(new Error(reply.message));
      else resolve(reply);
    });
    ensureWorker().postMessage({ id, ...message });
  });
}

export function supertonicSupported() {
  return typeof window !== 'undefined' && 'Worker' in window && 'WebAssembly' in window;
}

export function supertonicReady() {
  return loaded;
}

/** Downloads (once) and loads the model; `onProgress` gets bytes loaded and total. */
export function prepareSupertonic(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= request({ type: 'load' }, onProgress)
    .then(() => { loaded = true; })
    .finally(() => { loading = null; });
  return loading;
}

/** Speaks `text` with one of the preset voices; resolves with mono PCM. */
export async function speakSupertonic(text: string, language: string, voice: string, speed: number, priority: Priority = 'foreground') {
  await prepareSupertonic();
  const reply = await queue.push(() => request({ type: 'speak', text, language, voice, speed }, undefined, SPEAK_TIMEOUT_MS), priority);
  return { pcm: reply.pcm!, sampleRate: reply.sampleRate! };
}
