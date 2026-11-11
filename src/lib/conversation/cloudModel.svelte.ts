/*
 * The learner's OpenRouter opt-in (openRouter.ts): off by default; "fallback" uses it only where
 * the on-device model cannot run (no WebGPU), "always" uses it instead of the on-device model.
 * The API key and the model per learning language are kept in this browser's storage only.
 */
import { DEFAULT_CLOUD_MODEL } from './openRouter.js';

export type CloudMode = 'off' | 'fallback' | 'always';

const KEY = 'wordcircle-openrouter-v1';

type Stored = { mode: CloudMode; apiKey: string; models: Record<string, string> };

function load(): Stored {
  const empty: Stored = { mode: 'off', apiKey: '', models: {} };
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    const value = raw ? (JSON.parse(raw) as Partial<Stored>) : null;
    if (!value || typeof value !== 'object') return empty;
    const mode: CloudMode = value.mode === 'fallback' || value.mode === 'always' ? value.mode : 'off';
    return { mode, apiKey: typeof value.apiKey === 'string' ? value.apiKey : '', models: value.models && typeof value.models === 'object' ? value.models : {} };
  } catch {
    return empty;
  }
}

export const cloud = $state<Stored>(load());

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cloud));
  } catch {
    // Blocked storage: the opt-in lasts for this visit only.
  }
}

/** Whether OpenRouter is turned on and has a key. */
export function cloudConfigured(): boolean {
  return cloud.mode !== 'off' && cloud.apiKey.trim().length > 0;
}

/** The OpenRouter model for a learning language (its own choice, else the default). */
export function cloudModelFor(language: string): string {
  return cloud.models[language]?.trim() || cloud.models['*']?.trim() || DEFAULT_CLOUD_MODEL;
}

export function setCloudMode(mode: CloudMode) {
  cloud.mode = mode;
  save();
}

export function setCloudKey(apiKey: string) {
  cloud.apiKey = apiKey.trim();
  save();
}

/** Sets the model for one learning language; an empty id goes back to the default. */
export function setCloudModel(language: string, model: string) {
  const id = model.trim();
  if (id) cloud.models[language] = id;
  else delete cloud.models[language];
  save();
}

/** Forgets the key and turns OpenRouter off. */
export function clearCloud() {
  cloud.mode = 'off';
  cloud.apiKey = '';
  save();
}
