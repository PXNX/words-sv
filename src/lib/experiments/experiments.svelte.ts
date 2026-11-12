// This device's side of the experiments (experiments.ts): a random id kept in localStorage, the
// variant it maps to, and the `?exp=key:variant` override that lasts for the session.
import { EXPERIMENTS, assignVariant, parseOverrides, type ExperimentKey, type VariantOf } from './experiments.js';

const DEVICE_KEY = 'wordcircle-device-id-v1';
const OVERRIDE_KEY = 'wordcircle-experiment-overrides';

function deviceId(): string {
  if (typeof localStorage === 'undefined') return 'server';
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function overrides(): Partial<Record<ExperimentKey, string>> {
  if (typeof window === 'undefined') return {};
  let stored: Partial<Record<ExperimentKey, string>> = {};
  try { stored = JSON.parse(sessionStorage.getItem(OVERRIDE_KEY) ?? '{}') as Partial<Record<ExperimentKey, string>>; } catch { /* a broken entry is ignored */ }
  const fromUrl = parseOverrides(window.location.search);
  if (Object.keys(fromUrl).length) {
    stored = { ...stored, ...fromUrl };
    try { sessionStorage.setItem(OVERRIDE_KEY, JSON.stringify(stored)); } catch { /* private mode */ }
  }
  return stored;
}

/** The variant this device has for an experiment. The same on every call and every visit. */
export function variant<K extends ExperimentKey>(key: K): VariantOf<K> {
  const forced = overrides()[key];
  if (forced) return forced as VariantOf<K>;
  return assignVariant(EXPERIMENTS[key], deviceId()) as VariantOf<K>;
}
