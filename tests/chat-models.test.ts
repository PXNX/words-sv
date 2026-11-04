import { describe, expect, it } from 'vitest';
import { chatModel, chatModels, isRecommended, likelyFits, recommendedFor, webllmId } from '../src/lib/conversation/models.js';

describe('chat models', () => {
  it('falls back to the default model for unknown ids', () => {
    expect(chatModel('nonsense').id).toBe('qwen2.5-1.5b');
  });

  it('recommends a model per language and size that is strong in that language', () => {
    for (const language of ['de', 'en', 'fr', 'it', 'es', 'pt', 'uk'] as const) {
      for (const size of ['small', 'medium', 'large'] as const) {
        const model = recommendedFor(language, size);
        expect(model.size).toBe(size);
        expect(model.strongIn).toContain(language);
        expect(isRecommended(model, language)).toBe(true);
      }
    }
  });

  it('switches to the 32-bit build on GPUs without 16-bit shaders', () => {
    const model = chatModel('gemma2-9b');
    expect(webllmId(model, true)).toBe('gemma-2-9b-it-q4f16_1-MLC');
    expect(webllmId(model, false)).toBe('gemma-2-9b-it-q4f32_1-MLC');
  });

  it('warns about models that need more memory than a small device has', () => {
    const large = chatModel('gemma2-9b');
    expect(likelyFits(large, true, 4, 1024)).toBe(false);
    // 8 GB is the most a browser reports, so it cannot rule a model out.
    expect(likelyFits(large, true, 8, 1024)).toBe(true);
    expect(chatModels.every((model) => model.gpuMBf32 >= model.gpuMB)).toBe(true);
  });
});
