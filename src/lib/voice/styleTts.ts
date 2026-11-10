/*
 * Kokoro-82M and Kitten TTS nano: English StyleTTS 2 voices generated on the learner's device in
 * styleTts.worker.ts (one worker for both). Their named voices are listed in engines.ts; this client
 * looks up each voice's accent there, so a British voice is phonemized as British English.
 * naturalVoices.svelte.ts uses it when the settings pick "Kokoro" or "Kitten", with Piper for the
 * other languages.
 */
import { createPriorityQueue, type Priority } from '#lib/audio/priorityQueue.js';
import { createWorkerClient } from '#lib/workers/protocol.js';
import { voiceEngines } from './engines.js';
import type { EnglishAccent } from './phonemes.js';
import type { StyleTtsModel, StyleTtsProtocol } from './styleTts.worker.js';

export type { StyleTtsModel };
const SPEAK_TIMEOUT_MS = 60_000;

const queue = createPriorityQueue();
const loading = new Map<StyleTtsModel, Promise<void>>();
const loaded = new Set<StyleTtsModel>();
const engine = createWorkerClient<StyleTtsProtocol>(() => new Worker(new URL('./styleTts.worker.ts', import.meta.url), { type: 'module' }), {
  onRestart(reason) {
    loaded.clear();
    queue.clear(reason);
  }
});

/** Downloads (once) and loads a model; `onProgress` gets bytes loaded and total. */
export function prepareStyleTts(model: StyleTtsModel, onProgress?: (loaded: number, total: number) => void): Promise<void> {
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

/** Speaks English `text` with one of the model's voices; resolves with mono PCM at 24 kHz. */
export async function speakStyleTts(model: StyleTtsModel, text: string, voice: string, speed: number, priority: Priority = 'foreground') {
  await prepareStyleTts(model);
  const accent = (voiceEngines[model].voices?.find((candidate) => candidate.id === voice)?.accent ?? 'en-us') as EnglishAccent;
  return queue.push(() => engine.request('speak', { model, text, voice, accent, speed }, { timeoutMs: SPEAK_TIMEOUT_MS }), priority);
}

/** Stops the engine and forgets the loaded models (their files are being deleted). */
export function unloadStyleTts() {
  engine.restart();
}
