/*
 * The language models the conversation partner can run on, all through WebLLM on the device.
 * Small ones load fast and fit most phones; bigger ones write better, more natural sentences but
 * need a strong GPU. `recommendedFor` picks the one that handles a learning language best.
 *
 * Sizes are measured: `downloadMB` is the model's files on Hugging Face (mlc-ai/<id>), `gpuMB` and
 * `gpuMBf32` are WebLLM's own VRAM requirement for the 16-bit and 32-bit-float builds (the latter
 * for GPUs without 16-bit shaders).
 */
import type { Language } from '#lib/data/vocabulary.js';

export type ChatModelId = 'qwen2.5-1.5b' | 'qwen3-1.7b' | 'gemma2-2b' | 'qwen2.5-3b' | 'llama3.2-3b' | 'qwen3-4b' | 'llama3.1-8b' | 'qwen3-8b' | 'gemma2-9b';
export type ChatModelSize = 'small' | 'medium' | 'large';

export type ChatModel = {
  id: ChatModelId;
  label: string;
  size: ChatModelSize;
  // WebLLM's model id for the 16-bit build; the 32-bit-float build swaps q4f16_1 for q4f32_1.
  webllm: string;
  downloadMB: number;
  gpuMB: number;
  gpuMBf32: number;
  // Languages it writes especially well (from the model's documented language support).
  strongIn: readonly Language[];
  // Qwen 3 thinks out loud unless told not to; a conversation partner should answer right away.
  thinks?: boolean;
};

export const chatModels: readonly ChatModel[] = [
  { id: 'qwen2.5-1.5b', label: 'Qwen 2.5 · 1.5B', size: 'small', webllm: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', downloadMB: 880, gpuMB: 1630, gpuMBf32: 1889, strongIn: ['en', 'de', 'fr', 'es', 'pt', 'it'] },
  { id: 'qwen3-1.7b', label: 'Qwen 3 · 1.7B', size: 'small', webllm: 'Qwen3-1.7B-q4f16_1-MLC', downloadMB: 984, gpuMB: 2037, gpuMBf32: 2635, strongIn: ['uk', 'en', 'de', 'fr', 'es', 'pt', 'it'], thinks: true },
  { id: 'gemma2-2b', label: 'Gemma 2 · 2B', size: 'small', webllm: 'gemma-2-2b-it-q4f16_1-MLC', downloadMB: 1493, gpuMB: 1895, gpuMBf32: 2509, strongIn: ['de', 'fr', 'it', 'es', 'pt', 'en'] },
  { id: 'qwen2.5-3b', label: 'Qwen 2.5 · 3B', size: 'medium', webllm: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', downloadMB: 1748, gpuMB: 2505, gpuMBf32: 2893, strongIn: ['en', 'de', 'fr', 'es', 'pt', 'it'] },
  { id: 'llama3.2-3b', label: 'Llama 3.2 · 3B', size: 'medium', webllm: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', downloadMB: 1817, gpuMB: 2264, gpuMBf32: 2952, strongIn: ['en', 'de', 'fr', 'it', 'es', 'pt'] },
  { id: 'qwen3-4b', label: 'Qwen 3 · 4B', size: 'medium', webllm: 'Qwen3-4B-q4f16_1-MLC', downloadMB: 2279, gpuMB: 3432, gpuMBf32: 4328, strongIn: ['uk', 'en', 'de', 'fr', 'es', 'pt', 'it'], thinks: true },
  { id: 'llama3.1-8b', label: 'Llama 3.1 · 8B', size: 'large', webllm: 'Llama-3.1-8B-Instruct-q4f16_1-MLC', downloadMB: 4527, gpuMB: 5001, gpuMBf32: 6101, strongIn: ['en', 'de', 'fr', 'it', 'es', 'pt'] },
  { id: 'qwen3-8b', label: 'Qwen 3 · 8B', size: 'large', webllm: 'Qwen3-8B-q4f16_1-MLC', downloadMB: 4624, gpuMB: 5696, gpuMBf32: 6853, strongIn: ['uk', 'en', 'de', 'fr', 'es', 'pt', 'it'], thinks: true },
  { id: 'gemma2-9b', label: 'Gemma 2 · 9B', size: 'large', webllm: 'gemma-2-9b-it-q4f16_1-MLC', downloadMB: 5222, gpuMB: 6422, gpuMBf32: 8383, strongIn: ['de', 'fr', 'it', 'es', 'pt', 'en'] }
];

export const DEFAULT_CHAT_MODEL: ChatModelId = 'qwen2.5-1.5b';

export function chatModel(id: ChatModelId | string | null | undefined): ChatModel {
  return chatModels.find((model) => model.id === id) ?? chatModels.find((model) => model.id === DEFAULT_CHAT_MODEL)!;
}

/** The WebLLM model id to load, for a GPU with or without 16-bit float shaders. */
export function webllmId(model: ChatModel, f16: boolean): string {
  return f16 ? model.webllm : model.webllm.replace('q4f16_1', 'q4f32_1');
}

export function gpuNeedMB(model: ChatModel, f16: boolean): number {
  return f16 ? model.gpuMB : model.gpuMBf32;
}

// Per language and size: the model that writes that language best. Gemma 2 is strongest across
// the Western European languages, Llama for English, and Qwen 3 the only one here that lists
// Ukrainian among its trained languages.
const best: Record<Language, Record<ChatModelSize, ChatModelId>> = {
  de: { small: 'gemma2-2b', medium: 'llama3.2-3b', large: 'gemma2-9b' },
  fr: { small: 'gemma2-2b', medium: 'llama3.2-3b', large: 'gemma2-9b' },
  it: { small: 'gemma2-2b', medium: 'llama3.2-3b', large: 'gemma2-9b' },
  es: { small: 'gemma2-2b', medium: 'llama3.2-3b', large: 'gemma2-9b' },
  pt: { small: 'gemma2-2b', medium: 'llama3.2-3b', large: 'gemma2-9b' },
  en: { small: 'qwen2.5-1.5b', medium: 'llama3.2-3b', large: 'llama3.1-8b' },
  uk: { small: 'qwen3-1.7b', medium: 'qwen3-4b', large: 'qwen3-8b' }
};

export function recommendedFor(language: Language, size: ChatModelSize): ChatModel {
  return chatModel(best[language][size]);
}

/** Whether a model is the recommendation for this language at its size. */
export function isRecommended(model: ChatModel, language: Language): boolean {
  return best[language][model.size] === model.id;
}

/**
 * Whether the device can probably run it: GPU memory is not exposed to the web, so this compares
 * against the device's RAM (navigator.deviceMemory, rounded and capped at 8 GB by browsers) and the
 * GPU's largest single buffer, with headroom for the rest of the app.
 */
export function likelyFits(model: ChatModel, f16: boolean, deviceMemoryGB: number | null, maxBufferMB: number | null): boolean {
  const need = gpuNeedMB(model, f16);
  // Browsers report at most 8 GB, so 8 means "8 GB or more" and cannot rule anything out.
  if (deviceMemoryGB !== null && deviceMemoryGB < 8 && need > deviceMemoryGB * 1024 * 0.7) return false;
  // The biggest weight buffer is far smaller than the whole model; a tiny limit means a weak GPU.
  if (maxBufferMB !== null && maxBufferMB < 256 && model.size !== 'small') return false;
  return true;
}
