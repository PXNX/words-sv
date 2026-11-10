/// <reference lib="webworker" />
// Supertonic text-to-speech (Supertone), run entirely in this worker through transformers.js: WebGPU
// where the browser hands out an adapter, WebAssembly otherwise. Two models share the same three-graph
// pipeline: Supertonic 2 (en, es, pt, fr) and Supertonic 3 (31 languages, every one the app teaches).
// Each downloads once from Hugging Face and stays in the browser's cache. transformers.js is only
// ever imported here.
import { pipeline, type ProgressInfo, type TextToAudioPipeline } from '@huggingface/transformers';
import { serveWorker, type Call } from '#lib/workers/protocol.js';

export type SupertonicModel = 'supertonic' | 'supertonic3';

type Dtype = string | Record<string, string>;
// pipeline()'s generic return type is too large for TypeScript to resolve here; this is its TTS shape.
const createPipeline = pipeline as unknown as (task: 'text-to-speech', model: string, options: { device: string; dtype?: Dtype; progress_callback: (info: ProgressInfo) => void }) => Promise<TextToAudioPipeline>;

// The repository and precision of each model per backend. Supertonic 3's card: float16 on WebGPU
// (~200 MB); on WebAssembly a q8 denoiser with float32 encoder and vocoder (same word error rate as
// float32, 40 % less memory), since float16 would be upcast there; never a q8 vocoder (unintelligible).
const MODELS: Record<SupertonicModel, { repo: string; webgpu?: Dtype; wasm?: Dtype }> = {
  supertonic: { repo: 'onnx-community/Supertonic-TTS-2-ONNX' },
  supertonic3: {
    repo: 'open-world-group/Supertonic-3-ONNX',
    webgpu: 'fp16',
    wasm: { text_encoder: 'fp32', latent_denoiser: 'q8', voice_decoder: 'fp32' }
  }
};

export type LoadProgress = { loaded: number; total: number };
export type SupertonicProtocol = {
  /** `webgpu`: whether the app's WebGPU check passed; without it the model runs on WebAssembly. */
  load: Call<{ model: SupertonicModel; webgpu?: boolean }, void, LoadProgress>;
  speak: Call<{ model: SupertonicModel; text: string; language: string; voice: string; speed: number }, { pcm: Float32Array; sampleRate: number }, LoadProgress>;
};

const synthesizers = new Map<SupertonicModel, Promise<TextToAudioPipeline>>();

// `navigator.gpu` alone is not enough: many browsers expose it without handing out an adapter.
let gpu: Promise<boolean> | null = null;
let webgpuAllowed = true;
function hasWebGpu() {
  if (!webgpuAllowed) return Promise.resolve(false);
  const api = (self.navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  gpu ??= api ? api.requestAdapter().then(Boolean, () => false) : Promise.resolve(false);
  return gpu;
}

function load(model: SupertonicModel, onProgress: (progress: LoadProgress) => void) {
  let synthesizer = synthesizers.get(model);
  if (synthesizer) return synthesizer;
  // Per-file byte counts, summed into one progress bar.
  const files = new Map<string, { loaded: number; total: number }>();
  synthesizer = (async () => {
    const { repo, webgpu, wasm } = MODELS[model];
    const device = (await hasWebGpu()) ? 'webgpu' : 'wasm';
    const dtype = device === 'webgpu' ? webgpu : wasm;
    return createPipeline('text-to-speech', repo, {
      device,
      ...(dtype ? { dtype } : {}),
      progress_callback: (info) => {
        if (info.status !== 'progress') return;
        files.set(info.file, { loaded: info.loaded, total: info.total });
        let loaded = 0;
        let total = 0;
        for (const file of files.values()) { loaded += file.loaded; total += file.total; }
        onProgress({ loaded, total });
      }
    });
  })();
  synthesizers.set(model, synthesizer);
  synthesizer.catch(() => synthesizers.delete(model));
  return synthesizer;
}

serveWorker<SupertonicProtocol>(self, {
  async load({ model, webgpu }, { update }) {
    if (webgpu === false) webgpuAllowed = false;
    await load(model, update);
  },
  async speak({ model, text, language, voice, speed }, { update, transfer }) {
    const tts = await load(model, update);
    const output = await tts(`<${language}>${text}</${language}>`, {
      speaker_embeddings: `https://huggingface.co/${MODELS[model].repo}/resolve/main/voices/${voice}.bin`,
      num_inference_steps: 5,
      speed
    });
    const pcm = output.audio as Float32Array;
    transfer(pcm.buffer);
    return { pcm, sampleRate: output.sampling_rate };
  }
});
