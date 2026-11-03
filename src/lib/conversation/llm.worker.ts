/// <reference lib="webworker" />
// Runs the on-device conversation model off the main thread, so the page stays responsive while
// the model downloads, loads onto the GPU and generates. WebLLM is only ever imported here, which
// keeps its 6 MB out of the page itself (and out of the offline precache, see service-worker.ts).
import { CreateMLCEngine, hasModelInCache, type MLCEngine } from '@mlc-ai/web-llm';
import type { ChatMessage } from './conversation.js';

export type WorkerRequest =
  | { id: number; type: 'cached'; model: string }
  | { id: number; type: 'load'; model: string }
  | { id: number; type: 'generate'; messages: ChatMessage[] }
  | { id: number; type: 'interrupt' };
export type WorkerReply =
  | { id: number; type: 'progress'; progress: number; text: string }
  | { id: number; type: 'token'; text: string }
  | { id: number; type: 'done'; text?: string; cached?: boolean }
  | { id: number; type: 'error'; message: string };

let engine: MLCEngine | null = null;
const post = (reply: WorkerReply) => self.postMessage(reply);

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  try {
    if (data.type === 'cached') {
      post({ id: data.id, type: 'done', cached: await hasModelInCache(data.model) });
    } else if (data.type === 'load') {
      engine ??= await CreateMLCEngine(data.model, {
        initProgressCallback: (report) => post({ id: data.id, type: 'progress', progress: report.progress, text: report.text })
      });
      post({ id: data.id, type: 'done' });
    } else if (data.type === 'generate') {
      if (!engine) throw new Error('model_not_loaded');
      const stream = await engine.chat.completions.create({ messages: data.messages, stream: true, temperature: 0.7, top_p: 0.9, max_tokens: 160 });
      let text = '';
      for await (const chunk of stream) {
        const piece = chunk.choices[0]?.delta?.content ?? '';
        if (!piece) continue;
        text += piece;
        post({ id: data.id, type: 'token', text });
      }
      post({ id: data.id, type: 'done', text });
    } else if (data.type === 'interrupt') {
      engine?.interruptGenerate();
      post({ id: data.id, type: 'done' });
    }
  } catch (error) {
    post({ id: data.id, type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
