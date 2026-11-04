import type { ChatMessage } from './conversation.js';
import type { WorkerReply, WorkerRequest } from './llm.worker.js';
import { runJob } from '#lib/audio/backgroundJobs.svelte.js';
import { createSpeedMeter } from '#lib/offline/downloadSpeed.js';

/*
 * The conversation partner's brain: a small multilingual chat model that runs entirely on the
 * device through WebGPU (WebLLM, in llm.worker.ts). Nothing the learner says leaves the phone. The
 * model is downloaded once from Hugging Face and then kept in the browser's cache, like the story
 * voices.
 */

// Qwen 2.5 1.5B speaks all of the app's languages well enough for learner conversations and fits
// in about 1.7 GB of GPU memory. The f32 build is for GPUs without 16-bit float shaders.
const MODEL_F16 = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const MODEL_F32 = 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC';
export const MODEL_MEGABYTES = 900;

type Status = 'idle' | 'checking' | 'unsupported' | 'loading' | 'ready' | 'failed';
// `bytesPerSecond` is the current download speed, measured from WebLLM's "… MB fetched" reports.
export const localModel = $state<{ status: Status; progress: number; text: string; cached: boolean; bytesPerSecond: number }>({
  status: 'idle', progress: 0, text: '', cached: false, bytesPerSecond: 0
});
const speed = createSpeedMeter();

type Listener = (reply: WorkerReply) => void;
let worker: Worker | null = null;
let nextId = 0;
const listeners = new Map<number, Listener>();
let loading: Promise<void> | null = null;
let modelId: string | null = null;

function ensureWorker() {
  worker ??= (() => {
    const created = new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' });
    created.addEventListener('message', ({ data }: MessageEvent<WorkerReply>) => listeners.get(data.id)?.(data));
    return created;
  })();
  return worker;
}

type Request = WorkerRequest extends infer R ? R extends { id: number } ? Omit<R, 'id'> : never : never;
function request(message: Request, onUpdate?: Listener): Promise<WorkerReply & { type: 'done' }> {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    listeners.set(id, (reply) => {
      if (reply.type === 'progress' || reply.type === 'token') return onUpdate?.(reply);
      listeners.delete(id);
      if (reply.type === 'error') reject(new Error(reply.message));
      else resolve(reply);
    });
    ensureWorker().postMessage({ id, ...message });
  });
}

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
  localModel.cached = await request({ type: 'cached', model: modelId }).then((reply) => Boolean(reply.cached), () => false);
  if (localModel.status === 'checking') localModel.status = 'idle';
}

/** Downloads (once) and loads the model onto the GPU, reporting progress in `localModel`. */
export function loadLocalModel(): Promise<void> {
  if (localModel.status === 'ready') return Promise.resolve();
  loading ??= (async () => {
    modelId ??= await pickModel();
    if (!modelId) {
      localModel.status = 'unsupported';
      return;
    }
    localModel.status = 'loading';
    localModel.progress = 0;
    try {
      // A background job, so the download keeps going (and shows in the corner badge) while the
      // learner plays something else.
      const model = modelId;
      await runJob(`conversation-model|${model}`, 'Lilith', '/conversation', (control) => request({ type: 'load', model }, (reply) => {
        if (reply.type !== 'progress') return;
        localModel.progress = reply.progress;
        localModel.text = reply.text;
        // WebLLM reports "123MB fetched" (MiB) while downloading, "MB loaded" when reading its cache.
        const fetched = /(\d+)MB fetched/.exec(reply.text);
        if (fetched) localModel.bytesPerSecond = speed.sample(Number(fetched[1]) * 1024 * 1024);
        control.progress({ done: Math.round(reply.progress * 100), total: 100 });
      }));
      localModel.status = 'ready';
      localModel.cached = true;
    } catch (error) {
      console.error('Local model failed to load', error);
      // A failed load can leave the GPU in a bad state; the next try starts a fresh worker.
      worker?.terminate();
      worker = null;
      localModel.status = 'failed';
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Streams the model's reply; `onText` receives the reply so far after every new piece. */
export async function generateReply(messages: ChatMessage[], onText: (text: string) => void): Promise<string> {
  if (localModel.status !== 'ready') throw new Error('model_not_loaded');
  const reply = await request({ type: 'generate', messages }, (update) => {
    if (update.type === 'token') onText(update.text);
  });
  return reply.text ?? '';
}

/** Stops a reply that is still being generated. */
export function interruptReply() {
  if (worker && localModel.status === 'ready') void request({ type: 'interrupt' }).catch(() => undefined);
}
