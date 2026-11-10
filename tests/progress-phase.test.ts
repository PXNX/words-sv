import { describe, expect, it } from 'vitest';
import { clampProgress, modelProgressPhase } from '../src/lib/offline/progressPhase';

describe('progress phase', () => {
  it('tells downloading from loading into memory by WebLLM\'s text', () => {
    expect(modelProgressPhase('Fetching param cache[3/40]: 120MB fetched. 10% completed')).toBe('download');
    expect(modelProgressPhase('Loading model from cache[12/40]: 800MB loaded. 30% completed')).toBe('load');
    expect(modelProgressPhase('Finish loading on WebGPU - nvidia')).toBe('load');
    expect(modelProgressPhase('')).toBe('download');
  });

  it('clamps progress and keeps unknown amounts unknown', () => {
    expect(clampProgress(1.4)).toBe(1);
    expect(clampProgress(-1)).toBe(0);
    expect(clampProgress(Number.NaN)).toBeNull();
    expect(clampProgress(null)).toBeNull();
  });
});
