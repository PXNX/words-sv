/// <reference lib="webworker" />
// Runs the on-device conversation model off the main thread, so the page stays responsive while
// the model downloads, loads onto the GPU and generates. WebLLM is only ever imported here, which
// keeps its 6 MB out of the page itself (and out of the offline precache, see service-worker.ts).
import { CreateMLCEngine, deleteModelAllInfoInCache, hasModelInCache, prebuiltAppConfig, type MLCEngine } from '@mlc-ai/web-llm';
import type { ChatMessage } from './conversation.js';

export type GenerationStats = { decodeTokensPerSecond: number; prefillTokensPerSecond: number; completionTokens: number; promptTokens: number };

export type WorkerRequest =
  | { id: number; type: 'cached'; models: string[] }
  | { id: number; type: 'load'; model: string }
  | { id: number; type: 'download'; model: string }
  | { id: number; type: 'cancel-download'; model: string }
  | { id: number; type: 'generate'; messages: ChatMessage[]; noThinking: boolean }
  | { id: number; type: 'delete'; model: string }
  | { id: number; type: 'interrupt' };
export type WorkerReply =
  | { id: number; type: 'progress'; progress: number; text: string; bytes?: number; totalBytes?: number }
  | { id: number; type: 'token'; text: string; tokens: number }
  | { id: number; type: 'done'; text?: string; cached?: string[]; stats?: GenerationStats }
  | { id: number; type: 'error'; message: string };

let engine: MLCEngine | null = null;
let loadedModel: string | null = null;
const post = (reply: WorkerReply) => self.postMessage(reply);

/*
 * Downloading without loading: fills WebLLM's own caches (the same URLs it looks up when it loads a
 * model) with the weights, tokenizer, config and compiled program, but puts nothing on the GPU. That
 * way several models can download at once, side by side, and load from the cache later.
 */
const downloads = new Map<string, AbortController>();
const SHARDS_AT_ONCE = 3;

function modelBaseUrl(url: string): string {
  let base = url.endsWith('/') ? url : `${url}/`;
  if (!/.+\/resolve\/.+\//.test(base)) base += 'resolve/main/';
  return new URL(base).href;
}

/** Stores `url` in `cache` unless it is there already; `onBytes` hears every chunk as it arrives. */
async function cacheFile(cache: Cache, url: string, signal: AbortSignal, onBytes?: (bytes: number) => void): Promise<boolean> {
  if (await cache.match(url)) return false;
  const response = await fetch(url, { signal });
  if (!response.ok || !response.body) throw new Error(`download_failed ${response.status} ${url}`);
  const counted = onBytes
    ? response.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({ transform(chunk, controller) { onBytes(chunk.byteLength); controller.enqueue(chunk); } }))
    : response.body;
  await cache.put(url, new Response(counted, { headers: response.headers }));
  return true;
}

async function cachedJson<T>(cache: Cache, url: string, signal: AbortSignal): Promise<T> {
  await cacheFile(cache, url, signal);
  const stored = await cache.match(url);
  if (!stored) throw new Error(`download_failed ${url}`);
  return stored.json() as Promise<T>;
}

type TensorRecord = { dataPath: string; nbytes: number };

async function downloadModel(id: number, modelId: string, signal: AbortSignal) {
  const record = prebuiltAppConfig.model_list.find((entry) => entry.model_id === modelId);
  if (!record) throw new Error(`unknown_model ${modelId}`);
  const base = modelBaseUrl(record.model);
  const [configCache, modelCache, wasmCache] = await Promise.all([caches.open('webllm/config'), caches.open('webllm/model'), caches.open('webllm/wasm')]);
  // Newer models describe their files in a package manifest; older ones use the default names.
  const manifest = record.model_manifest
    ? await cachedJson<{ chat_config?: string; weights?: { manifest?: string } }>(configCache, new URL(record.model_manifest, base).href, signal)
    : undefined;
  const config = await cachedJson<{ tokenizer_files?: string[] }>(configCache, new URL(manifest?.chat_config ?? 'mlc-chat-config.json', base).href, signal);
  const tensorManifestUrl = new URL(manifest?.weights?.manifest ?? 'tensor-cache.json', base).href;
  const tensorBase = new URL('.', tensorManifestUrl).href;
  const { records } = await cachedJson<{ records: TensorRecord[] }>(modelCache, tensorManifestUrl, signal);
  const tokenizer = config.tokenizer_files?.includes('tokenizer.json') ? 'tokenizer.json' : 'tokenizer.model';
  await cacheFile(modelCache, new URL(tokenizer, base).href, signal);
  if (record.model_lib) await cacheFile(wasmCache, record.model_lib, signal);

  const totalBytes = records.reduce((sum, entry) => sum + entry.nbytes, 0);
  // `done` drives the progress bar (shards already cached count in full), `fetched` the speed.
  let done = 0;
  let fetched = 0;
  let lastReport = 0;
  const report = (force = false) => {
    const now = Date.now();
    if (!force && now - lastReport < 250) return;
    lastReport = now;
    post({ id, type: 'progress', progress: totalBytes ? Math.min(1, done / totalBytes) : 0, text: '', bytes: fetched, totalBytes });
  };
  const queue = [...records];
  const next = async (): Promise<void> => {
    for (let entry = queue.shift(); entry; entry = queue.shift()) {
      const url = new URL(entry.dataPath, tensorBase).href;
      let received = 0;
      const downloaded = await cacheFile(modelCache, url, signal, (chunk) => { received += chunk; done += chunk; fetched += chunk; report(); });
      // A shard already in the cache counts in full; a fetched one has counted itself (adjusted to its listed size).
      done += downloaded ? entry.nbytes - received : entry.nbytes;
      report();
    }
  };
  await Promise.all(Array.from({ length: SHARDS_AT_ONCE }, next));
  report(true);
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'cached') {
      const cached: string[] = [];
      for (const model of data.models) if (await hasModelInCache(model)) cached.push(model);
      post({ id: data.id, type: 'done', cached });
    } else if (data.type === 'load') {
      const report = (report: { progress: number; text: string }) => post({ id: data.id, type: 'progress', progress: report.progress, text: report.text });
      if (!engine) engine = await CreateMLCEngine(data.model, { initProgressCallback: report });
      else if (loadedModel !== data.model) {
        // Switching models frees the old one's GPU memory before the new one loads.
        engine.setInitProgressCallback(report);
        await engine.reload(data.model);
      }
      loadedModel = data.model;
      post({ id: data.id, type: 'done' });
    } else if (data.type === 'download') {
      const controller = new AbortController();
      downloads.get(data.model)?.abort();
      downloads.set(data.model, controller);
      try {
        await downloadModel(data.id, data.model, controller.signal);
      } finally {
        if (downloads.get(data.model) === controller) downloads.delete(data.model);
      }
      post({ id: data.id, type: 'done' });
    } else if (data.type === 'cancel-download') {
      downloads.get(data.model)?.abort();
      post({ id: data.id, type: 'done' });
    } else if (data.type === 'generate') {
      if (!engine) throw new Error('model_not_loaded');
      const stream = await engine.chat.completions.create({
        messages: data.messages, stream: true, temperature: 0.7, top_p: 0.9, max_tokens: 160,
        stream_options: { include_usage: true },
        ...(data.noThinking ? { extra_body: { enable_thinking: false } } : {})
      });
      let text = '';
      let tokens = 0;
      let stats: GenerationStats | undefined;
      for await (const chunk of stream) {
        const piece = chunk.choices[0]?.delta?.content ?? '';
        if (chunk.usage) {
          const extra = (chunk.usage as { extra?: { decode_tokens_per_s?: number; prefill_tokens_per_s?: number } }).extra ?? {};
          stats = {
            decodeTokensPerSecond: extra.decode_tokens_per_s ?? 0,
            prefillTokensPerSecond: extra.prefill_tokens_per_s ?? 0,
            completionTokens: chunk.usage.completion_tokens,
            promptTokens: chunk.usage.prompt_tokens
          };
        }
        if (!piece) continue;
        text += piece;
        tokens += 1;
        post({ id: data.id, type: 'token', text, tokens });
      }
      post({ id: data.id, type: 'done', text, stats });
    } else if (data.type === 'delete') {
      if (loadedModel === data.model) {
        await engine?.unload();
        engine = null;
        loadedModel = null;
      }
      await deleteModelAllInfoInCache(data.model);
      post({ id: data.id, type: 'done' });
    } else if (data.type === 'interrupt') {
      engine?.interruptGenerate();
      post({ id: data.id, type: 'done' });
    }
  } catch (error) {
    post({ id: data.id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
