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

export type ChatModelId = 'qwen3.5-2b' | 'gemma4-e2b' | 'qwen3.5-4b' | 'qwen3.5-9b';
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
  // Qwen 3.5 can think out loud before answering; a conversation partner should answer right away.
  thinks?: boolean;
};

// A short list of current models, one or two per size: Qwen 3.5 covers every size and all our
// languages (201 trained), Gemma 4 E2B writes the Western European languages especially naturally.
export const chatModels: readonly ChatModel[] = [
  { id: 'qwen3.5-2b', label: 'Qwen 3.5 · 2B', size: 'small', webllm: 'Qwen3.5-2B-q4f16_1-MLC', downloadMB: 1083, gpuMB: 2245, gpuMBf32: 2592, strongIn: ['uk', 'en', 'de', 'fr', 'es', 'pt', 'it'], thinks: true },
  { id: 'gemma4-e2b', label: 'Gemma 4 · E2B', size: 'medium', webllm: 'gemma-4-E2B-it-q4f16_1-MLC', downloadMB: 2831, gpuMB: 3387, gpuMBf32: 3863, strongIn: ['de', 'fr', 'it', 'es', 'pt', 'en', 'uk'] },
  { id: 'qwen3.5-4b', label: 'Qwen 3.5 · 4B', size: 'medium', webllm: 'Qwen3.5-4B-q4f16_1-MLC', downloadMB: 2390, gpuMB: 3868, gpuMBf32: 4680, strongIn: ['uk', 'en', 'de', 'fr', 'es', 'pt', 'it'], thinks: true },
  { id: 'qwen3.5-9b', label: 'Qwen 3.5 · 9B', size: 'large', webllm: 'Qwen3.5-9B-q4f16_1-MLC', downloadMB: 5061, gpuMB: 6433, gpuMBf32: 7545, strongIn: ['uk', 'en', 'de', 'fr', 'es', 'pt', 'it'], thinks: true }
];

export const DEFAULT_CHAT_MODEL: ChatModelId = 'qwen3.5-2b';

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

// Per language and size: the model that writes that language best. Gemma 4 is the most natural in
// the Western European languages and English; Qwen 3.5 is stronger in Ukrainian.
const western = { small: 'qwen3.5-2b', medium: 'gemma4-e2b', large: 'qwen3.5-9b' } as const;
const best: Record<Language, Record<ChatModelSize, ChatModelId>> = {
  de: western, fr: western, it: western, es: western, pt: western, en: western,
  uk: { small: 'qwen3.5-2b', medium: 'qwen3.5-4b', large: 'qwen3.5-9b' }
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
