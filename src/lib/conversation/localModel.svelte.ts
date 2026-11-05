import type { ChatMessage } from './conversation.js';
import type { GenerationStats, WorkerReply, WorkerRequest } from './llm.worker.js';
import { cancelJob, runJob } from '#lib/audio/backgroundJobs.svelte.js';
import { createSpeedMeter } from '#lib/offline/downloadSpeed.js';
import { settings } from '#lib/state/settings.svelte.js';
import { chatModel, chatModels, gpuNeedMB, webllmId, type ChatModel, type ChatModelId } from './models.js';

/*
 * The conversation partner's brain: a chat model that runs entirely on the device through WebGPU
 * (WebLLM, in llm.worker.ts). Nothing the learner says leaves the phone. Which model is picked in
 * the settings (conversation/models.ts); each is downloaded once from Hugging Face and then kept in
 * the browser's cache. This module also reports what the model costs: GPU memory, download size,
 * and how fast it writes (tokens per second).
 */

type Status = 'idle' | 'checking' | 'unsupported' | 'loading' | 'ready' | 'failed';
export type DeviceInfo = { f16: boolean; gpu: string; maxBufferMB: number | null; deviceMemoryGB: number | null };

export const localModel = $state<{
  status: Status;
  progress: number;
  text: string;
  // Whether the chosen model is downloaded; `downloaded` lists every catalog model that is.
  cached: boolean;
  downloaded: ChatModelId[];
  // The model on the GPU right now, if any.
  loaded: ChatModelId | null;
  // Current download speed, measured from WebLLM's "… MB fetched" reports.
  bytesPerSecond: number;
  // Writing speed: live while a reply streams, then WebLLM's exact numbers for the finished reply.
  tokensPerSecond: number;
  lastStats: GenerationStats | null;
  device: DeviceInfo | null;
  // Downloads running without loading (from the settings), several at once, per model.
  downloads: Partial<Record<ChatModelId, ModelDownload>>;
}>({ status: 'idle', progress: 0, text: '', cached: false, downloaded: [], loaded: null, bytesPerSecond: 0, tokensPerSecond: 0, lastStats: null, device: null, downloads: {} });

export type ModelDownload = { progress: number; bytesPerSecond: number; failed?: boolean };
const running = new Map<ChatModelId, Promise<void>>();

const speed = createSpeedMeter();

type Listener = (reply: WorkerReply) => void;
let worker: Worker | null = null;
let nextId = 0;
const listeners = new Map<number, Listener>();
let loading: Promise<void> | null = null;

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

type GpuAdapter = { features: Set<string>; limits?: { maxBufferSize?: number }; info?: { vendor?: string; architecture?: string; description?: string } };
type GpuNavigator = Navigator & { gpu?: { requestAdapter: () => Promise<GpuAdapter | null> }; deviceMemory?: number };

/** What this device offers the models, or null without WebGPU. */
async function detectDevice(): Promise<DeviceInfo | null> {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as GpuNavigator;
  if (!nav.gpu) return null;
  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) return null;
    const info = adapter.info ?? {};
    return {
      f16: adapter.features.has('shader-f16'),
      gpu: [info.vendor, info.architecture || info.description].filter(Boolean).join(' ') || 'WebGPU',
      maxBufferMB: adapter.limits?.maxBufferSize ? Math.round(adapter.limits.maxBufferSize / 1_048_576) : null,
      deviceMemoryGB: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null
    };
  } catch {
    return null;
  }
}

/** The model picked in the settings. */
export function chosenModel(): ChatModel {
  return chatModel(settings.chatModel);
}

/** GPU memory the chosen build of `model` needs on this device. */
export function modelGpuMB(model: ChatModel): number {
  return gpuNeedMB(model, localModel.device?.f16 ?? true);
}

/** Checks WebGPU support and which models are downloaded, without loading any. */
export async function checkLocalModel(force = false): Promise<void> {
  if (localModel.status !== 'idle' && !force) return;
  if (localModel.status === 'loading') return;
  const previous = localModel.status;
  localModel.status = 'checking';
  localModel.device ??= await detectDevice();
  if (!localModel.device) {
    localModel.status = 'unsupported';
    return;
  }
  const f16 = localModel.device.f16;
  // Without WebLLM's cache nothing is downloaded yet: answer without fetching the 6 MB worker,
  // which matters on a slow connection (the settings ask this every time they open).
  const anyCache = typeof caches !== 'undefined' && (await caches.has('webllm/model').catch(() => false));
  const ids = chatModels.map((model) => webllmId(model, f16));
  const cached = anyCache ? await request({ type: 'cached', models: ids }).then((reply) => reply.cached ?? [], () => []) : [];
  localModel.downloaded = chatModels.filter((model) => cached.includes(webllmId(model, f16))).map((model) => model.id);
  localModel.cached = localModel.downloaded.includes(chosenModel().id);
  localModel.status = previous === 'ready' && localModel.loaded === chosenModel().id ? 'ready' : 'idle';
}

/** Downloads (once) and loads the chosen model onto the GPU, reporting progress in `localModel`. */
export function loadLocalModel(): Promise<void> {
  const model = chosenModel();
  if (localModel.status === 'ready' && localModel.loaded === model.id) return Promise.resolve();
  loading ??= (async () => {
    localModel.device ??= await detectDevice();
    if (!localModel.device) {
      localModel.status = 'unsupported';
      return;
    }
    const id = webllmId(model, localModel.device.f16);
    localModel.status = 'loading';
    // A download of this model already under way finishes first, so its files are not fetched twice
    // (its progress shows here meanwhile, see downloadModelFiles).
    localModel.progress = 0;
    localModel.bytesPerSecond = 0;
    await running.get(model.id)?.catch(() => undefined);
    speed.reset();
    try {
      // A background job, so the download keeps going (and shows in the corner badge) while the
      // learner plays something else.
      await runJob(`conversation-model|${id}`, model.label, '/conversation', (control) => request({ type: 'load', model: id }, (reply) => {
        if (reply.type !== 'progress') return;
        localModel.progress = reply.progress;
        localModel.text = reply.text;
        // WebLLM reports "123MB fetched" (MiB) while downloading, "MB loaded" when reading its cache.
        const fetched = /(\d+)MB fetched/.exec(reply.text);
        if (fetched) localModel.bytesPerSecond = speed.sample(Number(fetched[1]) * 1024 * 1024);
        control.progress({ done: Math.round(reply.progress * 100), total: 100 });
      }));
      localModel.status = 'ready';
      localModel.loaded = model.id;
      localModel.cached = true;
      if (!localModel.downloaded.includes(model.id)) localModel.downloaded = [...localModel.downloaded, model.id];
    } catch (error) {
      console.error('Local model failed to load', error);
      // A failed load can leave the GPU in a bad state; the next try starts a fresh worker.
      worker?.terminate();
      worker = null;
      localModel.loaded = null;
      localModel.status = 'failed';
    } finally {
      loading = null;
      localModel.bytesPerSecond = 0;
    }
  })();
  return loading;
}

/**
 * Downloads a model into the cache without loading it onto the GPU, as a background job. Any number
 * can run at once; each reports its own progress and speed in `localModel.downloads`.
 */
export function downloadModelFiles(modelId: ChatModelId): Promise<void> {
  const existing = running.get(modelId);
  if (existing) return existing;
  const model = chatModel(modelId);
  const task = (async () => {
    localModel.device ??= await detectDevice();
    if (!localModel.device) {
      localModel.status = 'unsupported';
      return;
    }
    const id = webllmId(model, localModel.device.f16);
    const meter = createSpeedMeter();
    localModel.downloads[modelId] = { progress: 0, bytesPerSecond: 0 };
    try {
      await runJob(`model-download|${id}`, model.label, '/settings', (control) => request({ type: 'download', model: id }, (reply) => {
        if (reply.type !== 'progress') return;
        const entry = localModel.downloads[modelId];
        if (entry) {
          entry.progress = reply.progress;
          if (reply.bytes !== undefined) entry.bytesPerSecond = meter.sample(reply.bytes);
          // The conversation may be waiting for this very download to load it.
          if (localModel.status === 'loading' && chosenModel().id === modelId) {
            localModel.progress = reply.progress;
            localModel.bytesPerSecond = entry.bytesPerSecond;
          }
        }
        control.progress({ done: Math.round(reply.progress * 100), total: 100 });
      }));
      delete localModel.downloads[modelId];
      if (!localModel.downloaded.includes(modelId)) localModel.downloaded = [...localModel.downloaded, modelId];
      localModel.cached = localModel.downloaded.includes(chosenModel().id);
    } catch (error) {
      const entry = localModel.downloads[modelId];
      if (entry && !(error instanceof Error && /abort/i.test(error.message))) {
        console.error('Model download failed', error);
        entry.failed = true;
        entry.bytesPerSecond = 0;
      } else {
        delete localModel.downloads[modelId];
      }
    }
  })().finally(() => running.delete(modelId));
  running.set(modelId, task);
  return task;
}

/** Stops a running download; the files fetched so far stay, and the next download resumes from them. */
export function cancelModelDownload(modelId: ChatModelId) {
  const id = webllmId(chatModel(modelId), localModel.device?.f16 ?? true);
  cancelJob(`model-download|${id}`);
  void request({ type: 'cancel-download', model: id }).catch(() => undefined);
  delete localModel.downloads[modelId];
}

/** Picks another model in the settings; the next conversation loads it (freeing the old one). */
export function chooseModel(id: ChatModelId) {
  settings.setChatModel(id);
  localModel.cached = localModel.downloaded.includes(id);
  if (localModel.status === 'ready' && localModel.loaded !== id) localModel.status = 'idle';
}

/** Streams the model's reply; `onText` receives the reply so far after every new piece. */
export async function generateReply(messages: ChatMessage[], onText: (text: string) => void): Promise<string> {
  if (localModel.status !== 'ready') throw new Error('model_not_loaded');
  const startedAt = performance.now();
  let firstTokenAt = 0;
  const reply = await request({ type: 'generate', messages, noThinking: Boolean(chosenModel().thinks) }, (update) => {
    if (update.type !== 'token') return;
    // Live speed: tokens since the first one, so the time spent reading the prompt does not count.
    if (!firstTokenAt) firstTokenAt = performance.now();
    const seconds = (performance.now() - firstTokenAt) / 1000;
    if (seconds > 0.3) localModel.tokensPerSecond = (update.tokens - 1) / seconds;
    onText(update.text);
  });
  if (reply.stats) {
    localModel.lastStats = reply.stats;
    if (reply.stats.decodeTokensPerSecond) localModel.tokensPerSecond = reply.stats.decodeTokensPerSecond;
  } else if (performance.now() - startedAt > 0) {
    localModel.lastStats = null;
  }
  return reply.text ?? '';
}

/** Stops a reply that is still being generated. */
export function interruptReply() {
  if (worker && localModel.status === 'ready') void request({ type: 'interrupt' }).catch(() => undefined);
}

/** Deletes one downloaded model from the cache (unloading it first if it is on the GPU). */
export async function deleteModel(id: ChatModelId) {
  if (running.has(id)) cancelModelDownload(id);
  const f16 = localModel.device?.f16 ?? true;
  await request({ type: 'delete', model: webllmId(chatModel(id), f16) }).catch(() => undefined);
  localModel.downloaded = localModel.downloaded.filter((entry) => entry !== id);
  if (localModel.loaded === id) {
    localModel.loaded = null;
    localModel.status = 'idle';
  }
  localModel.cached = localModel.downloaded.includes(chosenModel().id);
}

/** Stops the model and marks everything as not downloaded (all model files are being deleted). */
export function unloadLocalModel() {
  worker?.terminate();
  worker = null;
  for (const answer of listeners.values()) answer({ id: -1, type: 'error', message: 'unloaded' });
  listeners.clear();
  loading = null;
  localModel.status = 'idle';
  localModel.cached = false;
  localModel.downloaded = [];
  localModel.downloads = {};
  running.clear();
  localModel.loaded = null;
  localModel.progress = 0;
  localModel.bytesPerSecond = 0;
}

/** The page's own JavaScript memory (Chrome only); the models' GPU memory is in modelGpuMB. */
export function pageMemoryMB(): number | null {
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return memory ? Math.round(memory.usedJSHeapSize / 1_048_576) : null;
}
