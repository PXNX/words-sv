/// <reference lib="webworker" />
// Supertonic 2 text-to-speech, run entirely in this worker through transformers.js (WebGPU where
// available, WebAssembly otherwise). The model (~260 MB) and voices download once from Hugging
// Face and stay in the browser's cache. transformers.js is only ever imported here.
import { pipeline, type ProgressInfo, type TextToAudioPipeline } from '@huggingface/transformers';

// pipeline()'s generic return type is too large for TypeScript to resolve here; this is its TTS shape.
const createPipeline = pipeline as unknown as (task: 'text-to-speech', model: string, options: { device: string; progress_callback: (info: ProgressInfo) => void }) => Promise<TextToAudioPipeline>;

const MODEL_ID = 'onnx-community/Supertonic-TTS-2-ONNX';
const VOICE_URL = `https://huggingface.co/${MODEL_ID}/resolve/main/voices`;

export type SupertonicRequest =
  | { id: number; type: 'load' }
  | { id: number; type: 'speak'; text: string; language: string; voice: string; speed: number };
export type SupertonicReply =
  | { id: number; type: 'progress'; loaded: number; total: number }
  | { id: number; type: 'done'; pcm?: Float32Array; sampleRate?: number }
  | { id: number; type: 'error'; message: string };

let synthesizer: Promise<TextToAudioPipeline> | null = null;
const post = (reply: SupertonicReply, transfer: Transferable[] = []) => self.postMessage(reply, transfer);

function load(id: number) {
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
        post({ id, type: 'progress', loaded, total });
      }
    });
  })();
  synthesizer.catch(() => { synthesizer = null; });
  return synthesizer;
}

self.onmessage = async ({ data }: MessageEvent<SupertonicRequest>) => {
  try {
    if (data.type === 'load') {
      await load(data.id);
      post({ id: data.id, type: 'done' });
      return;
    }
    const tts = await load(data.id);
    const output = await tts(`<${data.language}>${data.text}</${data.language}>`, {
      speaker_embeddings: `${VOICE_URL}/${data.voice}.bin`,
      num_inference_steps: 5,
      speed: data.speed
    });
    const pcm = output.audio as Float32Array;
    post({ id: data.id, type: 'done', pcm, sampleRate: output.sampling_rate }, [pcm.buffer]);
  } catch (error) {
    post({ id: data.id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
