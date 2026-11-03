import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import type { ChatMessage } from './conversation.js';

/*
 * The conversation partner's brain: a small multilingual chat model that runs entirely on the
 * device through WebGPU (WebLLM). Nothing the learner says leaves the phone. The model is
 * downloaded once from Hugging Face and then kept in the browser's cache, like the story voices.
 */

// Qwen 2.5 1.5B speaks all of the app's languages well enough for learner conversations and fits
// in about 1.7 GB of GPU memory. The f32 build is for GPUs without 16-bit float shaders.
const MODEL_F16 = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const MODEL_F32 = 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
export const MODEL_MEGABYTES = 900;

type Status = 'idle' | 'checking' | 'unsupported' | 'loading' | 'ready' | 'failed';
export const localModel = $state<{ status: Status; progress: number; text: string; cached: boolean }>({
  status: 'idle', progress: 0, text: '', cached: false
});

let engine: WebWorkerMLCEngine | null = null;
let loading: Promise<void> | null = null;
let modelId: string | null = null;

type GpuNavigator = Navigator & { gpu?: { requestAdapter: () => Promise<{ features: Set<string> } | null> } };

/** Which model build this device can run, or null without WebGPU. */
async function pickModel(): Promise<string | null> {
  if (typeof navigator === 'undefined') return null;
  const gpu = (navigator as GpuNavigator).gpu;
  if (!gpu) return null;
  try {
    const adapter = await gpu.requestAdapter();
    if (!adapter) return null;
    return adapter.features.has('shader-f16') ? MODEL_F16 : MODEL_F32;
  } catch {
    return null;
  }
}

/** Checks WebGPU support and whether the model is already downloaded, without loading it. */
export async function checkLocalModel(): Promise<void> {
  if (localModel.status !== 'idle') return;
  localModel.status = 'checking';
  modelId = await pickModel();
  if (!modelId) {
    localModel.status = 'unsupported';
    return;
  }
  try {
    const { hasModelInCache } = await import('@mlc-ai/web-llm');
    localModel.cached = await hasModelInCache(modelId);
  } catch {
    localModel.cached = false;
  }
  localModel.status = 'idle';
}

/** Downloads (once) and loads the model onto the GPU, reporting progress in `localModel`. */
export function loadLocalModel(): Promise<void> {
  if (engine) return Promise.resolve();
  loading ??= (async () => {
    modelId ??= await pickModel();
    if (!modelId) {
      localModel.status = 'unsupported';
      return;
    }
    localModel.status = 'loading';
    localModel.progress = 0;
    try {
      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      const worker = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' });
      engine = await CreateWebWorkerMLCEngine(worker, modelId, {
        initProgressCallback: (report) => {
          localModel.progress = report.progress;
          localModel.text = report.text;
        }
      });
      localModel.status = 'ready';
      localModel.cached = true;
    } catch (error) {
      console.error('Local model failed to load', error);
      engine = null;
      localModel.status = 'failed';
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Streams the model's reply; `onText` receives the reply so far after every new piece. */
export async function generateReply(messages: ChatMessage[], onText: (text: string) => void): Promise<string> {
  if (!engine) throw new Error('model_not_loaded');
  const stream = await engine.chat.completions.create({ messages, stream: true, temperature: 0.7, top_p: 0.9, max_tokens: 160 });
  let text = '';
  for await (const chunk of stream) {
    const piece = chunk.choices[0]?.delta?.content ?? '';
    if (!piece) continue;
    text += piece;
    onText(text);
  }
  return text;
}

/** Stops a reply that is still being generated. */
export function interruptReply() {
  engine?.interruptGenerate();
}
