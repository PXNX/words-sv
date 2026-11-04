/// <reference lib="webworker" />
// Runs the on-device conversation model off the main thread, so the page stays responsive while
// the model downloads, loads onto the GPU and generates. WebLLM is only ever imported here, which
// keeps its 6 MB out of the page itself (and out of the offline precache, see service-worker.ts).
import { CreateMLCEngine, deleteModelAllInfoInCache, hasModelInCache, type MLCEngine } from '@mlc-ai/web-llm';
import type { ChatMessage } from './conversation.js';

export type GenerationStats = { decodeTokensPerSecond: number; prefillTokensPerSecond: number; completionTokens: number; promptTokens: number };

export type WorkerRequest =
  | { id: number; type: 'cached'; models: string[] }
  | { id: number; type: 'load'; model: string }
  | { id: number; type: 'generate'; messages: ChatMessage[]; noThinking: boolean }
  | { id: number; type: 'delete'; model: string }
  | { id: number; type: 'interrupt' };
export type WorkerReply =
  | { id: number; type: 'progress'; progress: number; text: string }
  | { id: number; type: 'token'; text: string; tokens: number }
  | { id: number; type: 'done'; text?: string; cached?: string[]; stats?: GenerationStats }
  | { id: number; type: 'error'; message: string };

let engine: MLCEngine | null = null;
let loadedModel: string | null = null;
const post = (reply: WorkerReply) => self.postMessage(reply);

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
