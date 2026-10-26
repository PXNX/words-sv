/*
 * Supertonic 2 / 3 — open text-to-speech that runs entirely in the browser.
 *
 * Supertonic 3 (Supertone, 2026) is a 263 MB model for English, Korean, Spanish, Portuguese and
 * French at 44.1 kHz, with ten preset voices (st_f1…st_m5). It streams sentence by sentence via
 * WebGPU and falls back to WebAssembly on browsers without it. The weights are Apache-2.0 /
 * OpenRAIL-M and are cached in IndexedDB after the first download.
 *
 * Nothing is uploaded; synthesis happens on the learner's device. It is free and open, but the
 * download is large and a sentence takes a moment — the story falls back to the browser's own
 * speechSynthesis if it is not ready yet (see StoryMode.svelte).
 */
const MODEL_ID = 'onnx-community/Supertonic-2-ONNX';
const VOICES = ['st_f1', 'st_f2', 'st_f3', 'st_f4', 'st_f5', 'st_m1', 'st_m2', 'st_m3', 'st_m4', 'st_m5'];

let pipeline: ((text: string, voice: string) => Promise<Blob>) | null = null;
let ready = false;

export function supertonicSupported() {
  return typeof window !== 'undefined' && 'WebAssembly' in window;
}

export async function prepareSupertonic(): Promise<void> {
  if (ready) return;
  // The transformers.js pipeline loads the model on demand; it is lazy so the initial bundle
  // stays small.
  const { pipeline: loadPipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0/dist/transformers.min.js');
  pipeline = (await loadPipeline('text-to-speech', MODEL_ID)) as (text: string, voice: string) => Promise<Blob>;
  ready = true;
}

export async function speakSupertonic(text: string, voice: string): Promise<{ blob: Blob; duration: number }> {
  if (!pipeline) await prepareSupertonic();
  const blob = await pipeline!(text, voice);
  return { blob, duration: 0 };
}

export function supertonicVoices() {
  return VOICES;
}