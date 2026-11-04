/*
 * VoxCPM2 (OpenBMB) — 2B-parameter text-to-speech for 30 languages at 48 kHz, run on the learner's
 * device in voxcpm.worker.ts (WebGPU only). Experimental: ~1.6 GB download, slow on phones, and
 * the model picks its own voice, which the worker keeps steadier with a per-character noise seed.
 * naturalVoices.svelte.ts uses it when the settings pick "VoxCPM" (see engines.ts).
 */
import { createPriorityQueue, type Priority } from '#lib/audio/priorityQueue.js';
import type { VoxReply, VoxRequest } from './voxcpm.worker.js';

const SPEAK_TIMEOUT_MS = 180_000;

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (reply: VoxReply) => void>();
const queue = createPriorityQueue();
let loading: Promise<void> | null = null;
let loaded = false;

function ensureWorker() {
  worker ??= (() => {
    const created = new Worker(new URL('./voxcpm.worker.ts', import.meta.url), { type: 'module' });
    created.addEventListener('message', ({ data }: MessageEvent<VoxReply>) => pending.get(data.id)?.(data));
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

type Request = VoxRequest extends infer R ? R extends { id: number } ? Omit<R, 'id'> : never : never;
function request(message: Request, onProgress?: (loaded: number, total: number) => void, timeoutMs = 0) {
  const id = ++nextId;
  return new Promise<VoxReply & { type: 'done' }>((resolve, reject) => {
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

export function voxcpmSupported() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && typeof Worker !== 'undefined';
}

export function voxcpmReady() {
  return loaded;
}

/** Downloads (resumably, once) and loads the graphs; `onProgress` gets bytes loaded and total. */
export function prepareVoxCPM(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  if (loaded) return Promise.resolve();
  loading ??= request({ type: 'load' }, onProgress)
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
  const reply = await queue.push(() => request({ type: 'speak', text, seed: voiceSeed(speaker) }, undefined, SPEAK_TIMEOUT_MS), priority);
  return { pcm: reply.pcm!, sampleRate: reply.sampleRate! };
}
