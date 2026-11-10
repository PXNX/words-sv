/*
 * Whether a mode that can use the on-device language model runs with it or without it. Without
 * the model (no WebGPU, not downloaded, still downloading, failed) the modes always run without
 * AI; once it is available the learner may still pick "without AI", and that choice is kept per
 * mode on this device.
 */
import { localModel } from './localModel.svelte.js';

export type AiMode = 'conversation' | 'writing';

const KEY = 'wordcircle-without-ai-v1';

function load(): Partial<Record<AiMode, boolean>> {
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Partial<Record<AiMode, boolean>>) : {};
  } catch {
    return {};
  }
}

const withoutAi = $state<Partial<Record<AiMode, boolean>>>(load());

/** Whether the chosen model can run here and is downloaded (or already in memory). */
export function aiAvailable(): boolean {
  return localModel.status !== 'unsupported' && localModel.status !== 'loading' && localModel.status !== 'checking' && (localModel.status === 'ready' || localModel.cached);
}

/** Whether the learner picked "without AI" for this mode. */
export function prefersWithoutAi(mode: AiMode): boolean {
  return Boolean(withoutAi[mode]);
}

/** Whether this mode runs with the model right now. */
export function usesAi(mode: AiMode): boolean {
  return aiAvailable() && !prefersWithoutAi(mode);
}

export function setWithoutAi(mode: AiMode, value: boolean): void {
  withoutAi[mode] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(withoutAi));
  } catch {
    // Blocked storage: the choice lasts for this visit only.
  }
}
