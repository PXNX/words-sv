/// <reference lib="webworker" />
/*
 * Kokoro-82M (hexgrad) and Kitten TTS nano (KittenML): two StyleTTS 2 models that read English
 * phonemes, run in this worker through transformers.js (StyleTextToSpeech2Model), the way the
 * official kokoro-js and KittenTTS-web demos run them. Text becomes phonemes with eSpeak NG
 * (`phonemizer`, see phonemes.ts); a voice is a style vector file. 24 kHz mono.
 *
 *   kokoro – float32 on WebGPU (~330 MB, as the Kokoro WebGPU demo), q8 on WebAssembly (~90 MB).
 *            Its voice files hold one style per phoneme count (510 × 256).
 *   kitten – int8 only (~24 MB), whose quantized ops have no WebGPU kernels, so always WebAssembly.
 *            One style per voice; the first and last 2000 samples are clicks, cut as the demo does.
 *
 * Files download once from Hugging Face and stay in the browser's cache (the voice files in
 * transformers.js's cache, so the settings count and delete them with the model).
 */
import { AutoTokenizer, StyleTextToSpeech2Model, Tensor, type PreTrainedTokenizer, type ProgressInfo } from '@huggingface/transformers';
import { phonemize } from 'phonemizer';
import { serveWorker, type Call } from '#lib/workers/protocol.js';
import { englishPhonemes, type EnglishAccent } from './phonemes.js';

export type StyleTtsModel = 'kokoro' | 'kitten';

const STYLE_DIM = 256;
const SAMPLE_RATE = 24_000;
const VOICE_CACHE = 'transformers-cache';

const MODELS: Record<StyleTtsModel, { repo: string; webgpu: string | null; wasm: string; styles: 'per-length' | 'single'; trim: number }> = {
  kokoro: { repo: 'onnx-community/Kokoro-82M-v1.0-ONNX', webgpu: 'fp32', wasm: 'q8', styles: 'per-length', trim: 0 },
  kitten: { repo: 'onnx-community/kitten-tts-nano-0.1-ONNX', webgpu: null, wasm: 'q8', styles: 'single', trim: 2000 }
};

export type LoadProgress = { loaded: number; total: number };
export type StyleTtsProtocol = {
  load: Call<{ model: StyleTtsModel }, void, LoadProgress>;
  speak: Call<{ model: StyleTtsModel; text: string; voice: string; accent: EnglishAccent; speed: number }, { pcm: Float32Array; sampleRate: number }, LoadProgress>;
};

type Loaded = { model: StyleTextToSpeech2Model; tokenizer: PreTrainedTokenizer };
const loaded = new Map<StyleTtsModel, Promise<Loaded>>();

// `navigator.gpu` alone is not enough: many browsers expose it without handing out an adapter.
let gpu: Promise<boolean> | null = null;
function hasWebGpu() {
  const api = (self.navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  gpu ??= api ? api.requestAdapter().then(Boolean, () => false) : Promise.resolve(false);
  return gpu;
}

// from_pretrained's option types are wider than what this needs; this is the shape used here.
type LoadOptions = { device: string; dtype: string; progress_callback: (info: ProgressInfo) => void };
const loadModel = StyleTextToSpeech2Model.from_pretrained.bind(StyleTextToSpeech2Model) as unknown as (repo: string, options: LoadOptions) => Promise<StyleTextToSpeech2Model>;

function load(name: StyleTtsModel, onProgress: (progress: LoadProgress) => void): Promise<Loaded> {
  let task = loaded.get(name);
  if (task) return task;
  const files = new Map<string, { loaded: number; total: number }>();
  const progress_callback = (info: ProgressInfo) => {
    if (info.status !== 'progress') return;
    files.set(info.file, { loaded: info.loaded, total: info.total });
    let done = 0;
    let total = 0;
    for (const file of files.values()) { done += file.loaded; total += file.total; }
    onProgress({ loaded: done, total });
  };
  task = (async () => {
    const { repo, webgpu, wasm } = MODELS[name];
    const gpuUsable = webgpu !== null && (await hasWebGpu());
    const [model, tokenizer] = await Promise.all([
      loadModel(repo, { device: gpuUsable ? 'webgpu' : 'wasm', dtype: gpuUsable ? webgpu! : wasm, progress_callback }),
      AutoTokenizer.from_pretrained(repo, { progress_callback })
    ]);
    return { model, tokenizer };
  })();
  loaded.set(name, task);
  task.catch(() => loaded.delete(name));
  return task;
}

const voices = new Map<string, Promise<Float32Array>>();
/** A voice's style vectors, from the cache where possible. */
function voiceStyles(name: StyleTtsModel, voice: string): Promise<Float32Array> {
  const url = `https://huggingface.co/${MODELS[name].repo}/resolve/main/voices/${voice}.bin`;
  let task = voices.get(url);
  if (task) return task;
  task = (async () => {
    const cache = await caches.open(VOICE_CACHE).catch(() => null);
    const cached = await cache?.match(url);
    if (cached) return new Float32Array(await cached.arrayBuffer());
    const response = await fetch(url);
    if (!response.ok) throw new Error(`voice ${voice}: HTTP ${response.status}`);
    const bytes = await response.arrayBuffer();
    await cache?.put(url, new Response(bytes.slice(0))).catch(() => undefined);
    return new Float32Array(bytes);
  })();
  voices.set(url, task);
  task.catch(() => voices.delete(url));
  return task;
}

async function speak(name: StyleTtsModel, text: string, voice: string, accent: EnglishAccent, speed: number, onProgress: (progress: LoadProgress) => void): Promise<Float32Array> {
  const [{ model, tokenizer }, styles] = await Promise.all([load(name, onProgress), voiceStyles(name, voice)]);
  const phonemes = await englishPhonemes(text, accent, phonemize);
  const { input_ids } = tokenizer(phonemes, { truncation: true }) as { input_ids: Tensor };
  const { styles: layout, trim } = MODELS[name];
  // Kokoro's voice files hold a style for every phoneme count; the line's own count picks it.
  const tokens = Math.min(Math.max((input_ids.dims.at(-1) ?? 2) - 2, 0), 509);
  const offset = layout === 'per-length' ? tokens * STYLE_DIM : 0;
  const style = new Tensor('float32', styles.slice(offset, offset + STYLE_DIM), [1, STYLE_DIM]);
  const { waveform } = (await model({ input_ids, style, speed: new Tensor('float32', [speed], [1]) })) as { waveform: Tensor };
  const samples = waveform.data as Float32Array;
  return trim && samples.length > trim * 4 ? samples.slice(trim, -trim) : samples.slice();
}

serveWorker<StyleTtsProtocol>(self, {
  async load({ model }, { update }) {
    await load(model, update);
  },
  async speak({ model, text, voice, accent, speed }, { update, transfer }) {
    const pcm = await speak(model, text, voice, accent, speed, update);
    transfer(pcm.buffer);
    return { pcm, sampleRate: SAMPLE_RATE };
  }
});
