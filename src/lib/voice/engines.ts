/*
 * Every voice engine the app can speak with, in one place. The settings' "Story voices" choice
 * (settings.voiceQuality) picks an engine; `engineFor` resolves it for a language, falling back to
 * Piper where the chosen engine cannot speak that language. Modes never talk to an engine directly:
 * they call naturalVoices.svelte.ts (synthesizeNatural / playNatural), which dispatches here.
 *
 *   standard   – the browser's own speechSynthesis voices. Instant, offline, robotic.
 *   natural    – Piper neural voices, generated on the device in static/voices/piper-worker.js.
 *   recorded   – pre-recorded Piper clips for the cast's reference lines, live Piper for the rest.
 *   supertonic – Supertonic 2 (Supertone), generated on the device in voice/supertonic.worker.ts.
 *   edge       – Microsoft's Edge neural voices over the network (the only engine that is not local).
 *
 * Not wired in: voice/omnivoice.ts, voice/voxcpm.ts and voice/neutts.ts are sketches without a
 * working inference loop (see their headers); they stay out of the registry until they produce speech.
 */
import type { Language } from '#lib/data/vocabulary.js';

export type VoiceEngineId = 'standard' | 'natural' | 'recorded' | 'supertonic' | 'edge';

export type VoiceEngine = {
  id: VoiceEngineId;
  // Generated on the learner's device: nothing they hear is sent anywhere.
  onDevice: boolean;
  // Rendered into audio clips (as opposed to the browser speaking live).
  clips: boolean;
  // The languages it speaks; the rest fall back to `fallback`.
  languages: readonly Language[] | 'all';
  fallback: VoiceEngineId;
  // Rough one-time download, for the settings hint (Piper's depends on the language, see naturalMegabytes).
  megabytes?: number;
};

export const voiceEngines: Record<VoiceEngineId, VoiceEngine> = {
  standard: { id: 'standard', onDevice: true, clips: false, languages: 'all', fallback: 'standard' },
  natural: { id: 'natural', onDevice: true, clips: true, languages: 'all', fallback: 'standard' },
  recorded: { id: 'recorded', onDevice: true, clips: true, languages: 'all', fallback: 'natural' },
  supertonic: { id: 'supertonic', onDevice: true, clips: true, languages: ['en', 'es', 'pt', 'fr'], fallback: 'natural', megabytes: 260 },
  edge: { id: 'edge', onDevice: false, clips: true, languages: 'all', fallback: 'natural' }
};
export const voiceEngineIds = Object.keys(voiceEngines) as VoiceEngineId[];

export function speaksLanguage(engine: VoiceEngineId, language: Language): boolean {
  const { languages } = voiceEngines[engine];
  return languages === 'all' || languages.includes(language);
}

/** The engine that actually speaks `language` when `chosen` is selected. */
export function engineFor(chosen: VoiceEngineId, language: Language): VoiceEngineId {
  let engine = chosen;
  // Fallbacks form a short chain that ends at an engine speaking every language.
  for (let hops = 0; hops < voiceEngineIds.length && !speaksLanguage(engine, language); hops += 1) engine = voiceEngines[engine].fallback;
  return engine;
}
