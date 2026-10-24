import type { Language } from '#lib/data/vocabulary.js';
import type { Mood } from './stories';
import { animals, moodShape, priority, profiles, sharedPitch, type Speaker, type VoiceGender } from './voices';
import { germanSpeakers, GERMAN_CAST_MODEL } from './germanSpeakers';

/*
 * Natural story voices: Piper neural voices generated on the learner's device (see
 * static/voices/piper-worker.js). Each language has one or more voice models, some of them with
 * several speakers, and every character gets a speaker of their own.
 *
 * In German the narrator is Thorsten, the clearest German voice, and the characters are drawn from
 * a model trained on 236 audiobook readers: each character gets a different real person, the one
 * whose natural pitch is closest to the character (deep for Bauer Fritz and Herr Paul, bright for Kim,
 * warm and low for Oma). Their voices are never pitched up or down, which is what made them sound
 * off. Only animals still get a cartoon pitch, and in the other languages, which have just one or
 * two speakers per gender, characters who have to share a voice are shifted a little to tell them apart.
 */
// `f0` is the speaker's typical pitch in Hz, measured once (see germanSpeakers.ts).
type NaturalVoice = { model: string; speaker?: number; f0?: number };
type LanguageVoices = { narrator?: NaturalVoice; female: NaturalVoice[]; male: NaturalVoice[] };

const THORSTEN = 'de/de_DE/thorsten_emotional/medium/de_DE-thorsten_emotional-medium.onnx';
const voices: Record<Language, LanguageVoices> = {
  de: {
    narrator: { model: THORSTEN, speaker: 4 },
    female: germanSpeakers.female.map(([speaker, f0]) => ({ model: GERMAN_CAST_MODEL, speaker, f0 })),
    male: germanSpeakers.male.map(([speaker, f0]) => ({ model: GERMAN_CAST_MODEL, speaker, f0 }))
  },
  en: {
    female: [{ model: 'en/en_GB/semaine/medium/en_GB-semaine-medium.onnx', speaker: 0 }, { model: 'en/en_GB/semaine/medium/en_GB-semaine-medium.onnx', speaker: 3 }],
    male: [{ model: 'en/en_GB/semaine/medium/en_GB-semaine-medium.onnx', speaker: 1 }, { model: 'en/en_GB/semaine/medium/en_GB-semaine-medium.onnx', speaker: 2 }]
  },
  fr: {
    female: [{ model: 'fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx', speaker: 0 }],
    male: [{ model: 'fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx', speaker: 1 }]
  },
  it: {
    female: [{ model: 'it/it_IT/paola/medium/it_IT-paola-medium.onnx' }],
    male: [{ model: 'it/it_IT/riccardo/x_low/it_IT-riccardo-x_low.onnx' }]
  },
  es: {
    female: [{ model: 'es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx', speaker: 1 }],
    male: [{ model: 'es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx', speaker: 0 }]
  },
  // There is no Brazilian Portuguese female voice yet; the women borrow the male one, pitched up.
  pt: {
    female: [],
    male: [{ model: 'pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx' }]
  },
  uk: {
    female: [{ model: 'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx', speaker: 0 }, { model: 'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx', speaker: 2 }],
    male: [{ model: 'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx', speaker: 1 }]
  }
};
// Download sizes in MB, plus about 30 MB of runtime (speech engine and phonemizer) shared by all languages.
const modelMegabytes: Record<string, number> = {
  'de/de_DE/mls/medium/de_DE-mls-medium.onnx': 77,
  'de/de_DE/thorsten_emotional/medium/de_DE-thorsten_emotional-medium.onnx': 77,
  'en/en_GB/semaine/medium/en_GB-semaine-medium.onnx': 77,
  'fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx': 77,
  'it/it_IT/paola/medium/it_IT-paola-medium.onnx': 64,
  'it/it_IT/riccardo/x_low/it_IT-riccardo-x_low.onnx': 28,
  'es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx': 77,
  'pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx': 63,
  'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx': 77
};
const RUNTIME_MEGABYTES = 30;

function modelsOf(language: Language) {
  const { narrator, female, male } = voices[language];
  return [...new Set([...(narrator ? [narrator] : []), ...female, ...male].map((voice) => voice.model))];
}

export function naturalMegabytes(language: Language) {
  return RUNTIME_MEGABYTES + modelsOf(language).reduce((sum, model) => sum + modelMegabytes[model], 0);
}

export function naturalSupported() {
  return typeof window !== 'undefined' && 'Worker' in window && 'caches' in window && 'AudioContext' in window;
}

type Status = 'idle' | 'loading' | 'ready' | 'failed';
/** How far each language's natural voices are: the settings show it, and stories use them once ready. */
export const naturalState = $state<{
  status: Partial<Record<Language, Status>>;
  progress: Partial<Record<Language, number>>;
  remaining: Partial<Record<Language, number | null>>;
}>({ status: {}, progress: {}, remaining: {} });

type Reply = { type: 'progress'; loaded: number; total: number } | { type: 'done'; pcm?: Float32Array; sampleRate?: number } | { type: 'error'; message: string };
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (reply: Reply) => void>();

// A worker stuck on a sentence is thrown away with everything it still had to do; the next request
// starts a fresh one, which loads the models again from the cache.
function restartWorker() {
  worker?.terminate();
  worker = null;
  for (const answer of pending.values()) answer({ type: 'error', message: 'restarted' });
  pending.clear();
}

function request(message: Record<string, unknown>, onProgress?: (loaded: number, total: number) => void, timeoutMs = 0) {
  worker ??= (() => {
    const created = new Worker('/voices/piper-worker.js');
    created.addEventListener('message', ({ data }: MessageEvent<Reply & { id: number }>) => pending.get(data.id)?.(data));
    return created;
  })();
  const id = ++nextId;
  return new Promise<Reply & { type: 'done' }>((resolve, reject) => {
    const timer = timeoutMs ? window.setTimeout(restartWorker, timeoutMs) : 0;
    pending.set(id, (reply) => {
      if (reply.type === 'progress') return onProgress?.(reply.loaded, reply.total);
      clearTimeout(timer);
      pending.delete(id);
      if (reply.type === 'error') reject(new Error(reply.message));
      else resolve(reply);
    });
    worker!.postMessage({ id, ...message });
  });
}

/** Downloads (once) and loads the voice models of a language, reporting progress in `naturalState`. */
export async function prepareNatural(language: Language) {
  const status = naturalState.status[language];
  if (!naturalSupported() || status === 'loading' || status === 'ready') return;
  naturalState.status[language] = 'loading';
  naturalState.progress[language] = 0;
  naturalState.remaining[language] = null;
  const startedAt = performance.now();
  const models = modelsOf(language);
  const update = (fraction: number) => {
    const now = performance.now();
    naturalState.progress[language] = fraction;
    const elapsed = (now - startedAt) / 1000;
    // Too little data at the very beginning gives wild estimates; wait for a real sample.
    if (fraction >= 0.02 && elapsed >= 0.8) naturalState.remaining[language] = Math.max(0, elapsed / fraction - elapsed);
  };
  try {
    for (const [index, model] of models.entries()) {
      await request({ type: 'load', model }, (loaded, total) => {
        if (total) update((index + loaded / total) / models.length);
      });
      // Cached models report no download progress; this still marks each finished model at once.
      update((index + 1) / models.length);
    }
    naturalState.remaining[language] = 0;
    naturalState.status[language] = 'ready';
  } catch {
    naturalState.remaining[language] = null;
    naturalState.status[language] = 'failed';
  }
}

export function naturalReady(language: Language) {
  return naturalState.status[language] === 'ready';
}

type Casting = Map<Speaker, { voice: NaturalVoice; shared: boolean; borrowed: boolean }>;
let cached: { key: string; casting: Casting } | null = null;

// The pitch a character's voice should have: a typical man's or woman's voice, scaled by the
// character's profile (Bauer Fritz 0.74 is a deep bass, Kim 1.2 a bright voice).
const typicalPitch: Record<VoiceGender, number> = { male: 118, female: 205 };

// The narrator picks first, then the main characters, each taking an unused voice of their gender:
// the one whose measured pitch is closest to theirs, else (where voices are few) the least used one,
// which then counts as shared.
function castNatural(cast: Speaker[], language: Language): Casting {
  const speakers = priority.filter((speaker) => speaker === 'narrator' || cast.includes(speaker));
  const key = `${language}|${speakers.join()}`;
  if (cached?.key === key) return cached.casting;
  const uses = new Map<NaturalVoice, number>();
  const casting: Casting = new Map();
  const narrator = voices[language].narrator;
  for (const speaker of speakers) {
    if (speaker === 'narrator' && narrator) {
      casting.set(speaker, { voice: narrator, shared: false, borrowed: false });
      continue;
    }
    const own = voices[language][profiles[speaker].gender];
    const borrowed = own.length === 0;
    const pool = borrowed ? voices[language][profiles[speaker].gender === 'female' ? 'male' : 'female'] : own;
    const target = typicalPitch[profiles[speaker].gender] * profiles[speaker].pitch;
    const distance = (candidate: NaturalVoice) => (candidate.f0 ? Math.abs(Math.log(candidate.f0 / target)) : 0);
    const unused = pool.filter((candidate) => !uses.has(candidate)).sort((left, right) => distance(left) - distance(right));
    const voice = unused[0] ?? [...pool].sort((left, right) => (uses.get(left) ?? 0) - (uses.get(right) ?? 0))[0];
    uses.set(voice, (uses.get(voice) ?? 0) + 1);
    casting.set(speaker, { voice, shared: false, borrowed });
  }
  for (const entry of casting.values()) entry.shared = (uses.get(entry.voice) ?? 0) > 1;
  cached = { key, casting };
  return casting;
}

// A woman borrowing a man's voice sounds higher, and the other way round.
const borrowedPitch: Record<VoiceGender, number> = { female: 1.3, male: 0.82 };

let context: AudioContext | null = null;
function audio() {
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

// A whole line takes only a few seconds to work out; the timeout is generous because a fresh worker
// first has to load the models again.
const SPEAK_TIMEOUT_MS = 30000;

export type NaturalClip ={ buffer: AudioBuffer; playbackRate: number; volume: number };

/** Speaks a sentence in the speaker's natural voice; resolves with audio ready to play. */
export async function synthesizeNatural(text: string, speaker: Speaker, mood: Mood, cast: Speaker[], language: Language, baseRate: number): Promise<NaturalClip> {
  const profile = profiles[speaker];
  const { voice, shared, borrowed } = castNatural(cast, language).get(speaker) ?? castNatural([speaker], language).get(speaker)!;
  const shape = moodShape[mood];
  // People keep their voice's own pitch unless they share it; animals sound like cartoon animals.
  // A character with an age treatment (Oma) also shifts the selected speaker slightly.
  const agePitch = profile.natural?.pitch ?? 1;
  const ownPitch = animals.includes(speaker) ? Math.min(1.4, Math.max(0.75, profile.pitch)) : (shared ? sharedPitch(profile.pitch) : 1) * agePitch;
  const playbackRate = ownPitch * (borrowed ? borrowedPitch[profile.gender] : 1);
  const rate = baseRate * (profile.natural?.rate ?? profile.rate) * shape.rate;
  const reply = await request({ type: 'speak', model: voice.model, text, speaker: voice.speaker ?? 0, lengthScale: playbackRate / rate }, undefined, SPEAK_TIMEOUT_MS);
  const pcm = reply.pcm!;
  const buffer = audio().createBuffer(1, pcm.length, reply.sampleRate!);
  buffer.copyToChannel(pcm as Float32Array<ArrayBuffer>, 0);
  return { buffer, playbackRate, volume: Math.min(1, profile.volume * shape.volume) };
}

/** Plays a clip; `done` resolves when it has finished or was stopped. */
export function playNatural(clip: NaturalClip, volume = 1) {
  const output = audio();
  const source = output.createBufferSource();
  const gain = output.createGain();
  source.buffer = clip.buffer;
  source.playbackRate.value = clip.playbackRate;
  gain.gain.value = clip.volume * volume;
  source.connect(gain).connect(output.destination);
  const done = new Promise<void>((resolve) => source.addEventListener('ended', () => resolve()));
  const seconds = clip.buffer.duration / clip.playbackRate;
  const startedAt = output.currentTime;
  source.start();
  return {
    done,
    seconds,
    position: () => Math.max(0, Math.min(seconds, output.currentTime - startedAt)),
    stop: () => { try { source.stop(); } catch { /* already over */ } }
  };
}
