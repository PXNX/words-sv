/// <reference lib="webworker" />
// Supertonic 2 text-to-speech, run entirely in this worker through transformers.js (WebGPU where
// available, WebAssembly otherwise). The model (~260 MB) and voices download once from Hugging
// Face and stay in the browser's cache. transformers.js is only ever imported here.
import { pipeline, type ProgressInfo, type TextToAudioPipeline } from '@huggingface/transformers';
import { serveWorker, type Call } from '#lib/workers/protocol.js';

// pipeline()'s generic return type is too large for TypeScript to resolve here; this is its TTS shape.
const createPipeline = pipeline as unknown as (task: 'text-to-speech', model: string, options: { device: string; progress_callback: (info: ProgressInfo) => void }) => Promise<TextToAudioPipeline>;

const MODEL_ID = 'onnx-community/Supertonic-TTS-2-ONNX';
const VOICE_URL = `https://huggingface.co/${MODEL_ID}/resolve/main/voices`;

export type LoadProgress = { loaded: number; total: number };
export type SupertonicProtocol = {
  load: Call<object, void, LoadProgress>;
  speak: Call<{ text: string; language: string; voice: string; speed: number }, { pcm: Float32Array; sampleRate: number }, LoadProgress>;
};

let synthesizer: Promise<TextToAudioPipeline> | null = null;

function load(onProgress: (progress: LoadProgress) => void) {
  // Per-file byte counts, summed into one progress bar.
  const files = new Map<string, { loaded: number; total: number }>();
  synthesizer ??= (async () => {
    const hasGpu = 'gpu' in navigator;
    return createPipeline('text-to-speech', MODEL_ID, {
      device: hasGpu ? 'webgpu' : 'wasm',
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
  synthesizer.catch(() => { synthesizer = null; });
  return synthesizer;
}

serveWorker<SupertonicProtocol>(self, {
  async load(_, { update }) {
    await load(update);
  },
  async speak({ text, language, voice, speed }, { update, transfer }) {
    const tts = await load(update);
    const output = await tts(`<${language}>${text}</${language}>`, {
      speaker_embeddings: `${VOICE_URL}/${voice}.bin`,
      num_inference_steps: 5,
      speed
    });
    const pcm = output.audio as Float32Array;
    transfer(pcm.buffer);
    return { pcm, sampleRate: output.sampling_rate };
  }
});
