/*
 * Every voice engine the app can speak with, in one place: the single source of truth for the
 * settings' model list and for naturalVoices.svelte.ts. The settings' "Story voices" choice
 * (settings.voiceQuality) picks an engine; `engineFor` resolves it for a language, falling back to
 * Piper where the chosen engine cannot speak that language or the device lacks what it needs.
 * Modes never talk to an engine directly: they call naturalVoices.svelte.ts (synthesizeNatural /
 * playNatural), which dispatches here.
 *
 *   standard   – the browser's own speechSynthesis voices. Instant, offline, robotic.
 *   natural    – Piper neural voices, generated on the device in static/voices/piper-worker.js.
 *   recorded   – pre-recorded Piper clips for the cast's reference lines, live Piper for the rest.
 *   supertonic – Supertonic 2 (Supertone), generated on the device in voice/supertonic.worker.ts.
 *   voxcpm     – VoxCPM2 (OpenBMB), generated on the device in voice/voxcpm.worker.ts. Experimental:
 *                WebGPU only, ~1.6 GB, slow on phones.
 *   edge       – Microsoft's Edge neural voices over the network (the only engine that is not local).
 *
 * Not wired in: see "Not wired in" in docs/voice-engines.md.
 *
 * Fields of a VoiceEngine (see the type below) are what the settings render: name, tier, download
 * and memory (engineFootprint picks the figures for this device), languages, voices, licence and
 * whether it needs WebGPU. Keep them accurate when an engine changes.
 */
import type { Language } from '#lib/data/vocabulary.js';

export type VoiceEngineId = 'standard' | 'natural' | 'recorded' | 'supertonic' | 'voxcpm' | 'edge';

export type VoiceGender = 'female' | 'male';

/** One named voice of a model; characters are cast from these (castEngineVoices). */
export type EngineVoice = {
  // What the model calls it (a voice file name or speaker id).
  id: string;
  // A readable name for the settings.
  name: string;
  gender: VoiceGender;
  // The accent or locale it reads in, where the model has several (Kokoro's en-us / en-gb).
  accent?: string;
};

/** Size class of the one-time download, like the conversation models': small < 100 MB, medium < 500 MB, large above. */
export type QualityTier = 'small' | 'medium' | 'large';

/**
 * How an engine produces sound:
 *   browser – the browser speaks live (speechSynthesis), nothing is rendered or downloaded;
 *   piper   – Piper voices, a download per language (naturalVoices.svelte.ts knows their sizes);
 *   model   – one neural model for every language it speaks, run in its own worker;
 *   network – rendered by an online service.
 */
export type EngineRuntime = 'browser' | 'piper' | 'model' | 'network';

/** One-time download and rough memory (RAM or GPU) while loaded, both in MB. */
export type Footprint = { megabytes: number; memoryMB: number };

export type VoiceEngine = {
  id: VoiceEngineId;
  // Product name, shown as is (not translated).
  name: string;
  runtime: EngineRuntime;
  // Generated on the learner's device: nothing they hear is sent anywhere.
  onDevice: boolean;
  // Rendered into audio clips (as opposed to the browser speaking live).
  clips: boolean;
  // The languages it speaks; the rest fall back to `fallback`.
  languages: readonly Language[] | 'all';
  fallback: VoiceEngineId;
  // Size class of the download (see QualityTier); absent for engines without one.
  tier?: QualityTier;
  // Rough one-time download, for the settings hint (Piper's depends on the language, see naturalMegabytes).
  // With WebGPU where the engine uses it; `wasm` holds the figures without.
  megabytes?: number;
  // Rough memory (RAM or GPU) while loaded; Piper's scales with its download (see ModelManager).
  memoryMB?: number;
  // Download and memory when the engine runs on WebAssembly (no WebGPU), where they differ.
  wasm?: Footprint;
  // Needs WebGPU; without it the fallback speaks instead. Engines that only run faster with WebGPU
  // leave this off and pick the backend themselves.
  webgpu?: boolean;
  // Where the model comes from (a Hugging Face repository) and under which licence.
  model?: string;
  licence?: string;
  // Named voices, best first: the narrator and main characters are cast from the front.
  voices?: readonly EngineVoice[];
};

const supertonicVoices: readonly EngineVoice[] = [
  ...(['F1', 'F2', 'F3', 'F4', 'F5'] as const).map((id) => ({ id, name: `Female ${id.slice(1)}`, gender: 'female' as const })),
  ...(['M1', 'M2', 'M3', 'M4', 'M5'] as const).map((id) => ({ id, name: `Male ${id.slice(1)}`, gender: 'male' as const }))
];

export const voiceEngines: Record<VoiceEngineId, VoiceEngine> = {
  standard: { id: 'standard', name: 'Browser', runtime: 'browser', onDevice: true, clips: false, languages: 'all', fallback: 'standard' },
  natural: { id: 'natural', name: 'Piper', runtime: 'piper', onDevice: true, clips: true, languages: 'all', fallback: 'standard', tier: 'small', licence: 'per voice (MIT, CC0, CC-BY)' },
  recorded: { id: 'recorded', name: 'Piper (recorded)', runtime: 'piper', onDevice: true, clips: true, languages: 'all', fallback: 'natural', tier: 'small' },
  supertonic: {
    id: 'supertonic', name: 'Supertonic 2', runtime: 'model', onDevice: true, clips: true, languages: ['en', 'es', 'pt', 'fr'], fallback: 'natural',
    tier: 'medium', megabytes: 260, memoryMB: 450, model: 'onnx-community/Supertonic-TTS-2-ONNX', licence: 'OpenRAIL-M', voices: supertonicVoices
  },
  voxcpm: {
    id: 'voxcpm', name: 'VoxCPM2', runtime: 'model', onDevice: true, clips: true, languages: 'all', fallback: 'natural',
    tier: 'large', megabytes: 1600, webgpu: true, memoryMB: 2300, model: 'danyalmalik/VoxCPM2-ONNX-WebGPU', licence: 'Apache-2.0'
  },
  edge: { id: 'edge', name: 'Edge', runtime: 'network', onDevice: false, clips: true, languages: 'all', fallback: 'natural' }
};
export const voiceEngineIds = Object.keys(voiceEngines) as VoiceEngineId[];

export function speaksLanguage(engine: VoiceEngineId, language: Language): boolean {
  const { languages } = voiceEngines[engine];
  return languages === 'all' || languages.includes(language);
}

export type DeviceAbilities = { webgpu: boolean };

// `navigator.gpu` existing is not enough: many browsers (Linux Chrome without a flag, for one) have
// it but hand out no adapter. probeWebGpu() asks once at startup; until it answers, the API's
// presence counts.
let webgpuAdapter: boolean | null = null;

/** Asks the browser for a WebGPU adapter once, so engines that need one can fall back in time. */
export async function probeWebGpu(): Promise<boolean> {
  if (webgpuAdapter !== null) return webgpuAdapter;
  const gpu = typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  try {
    webgpuAdapter = Boolean(gpu && (await gpu.requestAdapter()));
  } catch {
    webgpuAdapter = false;
  }
  return webgpuAdapter;
}

export function deviceAbilities(): DeviceAbilities {
  return { webgpu: typeof navigator !== 'undefined' && 'gpu' in navigator && webgpuAdapter !== false };
}

function usable(engine: VoiceEngineId, language: Language, device: DeviceAbilities) {
  return speaksLanguage(engine, language) && (!voiceEngines[engine].webgpu || device.webgpu);
}

/** The engine that actually speaks `language` when `chosen` is selected, on this device. */
export function engineFor(chosen: VoiceEngineId, language: Language, device: DeviceAbilities = deviceAbilities()): VoiceEngineId {
  let engine = chosen;
  // Fallbacks form a short chain that ends at an engine every device can run in every language.
  for (let hops = 0; hops < voiceEngineIds.length && !usable(engine, language, device); hops += 1) engine = voiceEngines[engine].fallback;
  return engine;
}

/** Download and memory of an engine on this device (WebAssembly figures without WebGPU); null when it downloads nothing fixed. */
export function engineFootprint(id: VoiceEngineId, device: DeviceAbilities = deviceAbilities()): Footprint | null {
  const engine = voiceEngines[id];
  if (!device.webgpu && engine.wasm) return engine.wasm;
  if (engine.megabytes === undefined) return null;
  return { megabytes: engine.megabytes, memoryMB: engine.memoryMB ?? Math.round(engine.megabytes * 1.3) };
}

/**
 * Gives every speaker a voice of their gender, in the order given (narrator and main characters
 * first): each takes the next voice of the pool, best first, so nobody shares one until the pool
 * runs out. A gender the model has no voice for borrows from the other.
 */
export function castEngineVoices<Speaker>(speakers: readonly { id: Speaker; gender: VoiceGender }[], voices: readonly EngineVoice[]): Map<Speaker, string> {
  const pools: Record<VoiceGender, readonly EngineVoice[]> = {
    female: voices.filter((voice) => voice.gender === 'female'),
    male: voices.filter((voice) => voice.gender === 'male')
  };
  const next: Record<VoiceGender, number> = { female: 0, male: 0 };
  const casting = new Map<Speaker, string>();
  for (const { id, gender } of speakers) {
    const own = pools[gender].length ? gender : gender === 'female' ? 'male' : 'female';
    const pool = pools[own];
    if (!pool.length) continue;
    casting.set(id, pool[next[own]++ % pool.length]!.id);
  }
  return casting;
}
