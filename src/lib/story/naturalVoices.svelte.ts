import type { Language } from '#lib/data/vocabulary.js';
import type { Mood } from './stories';
import { animals, moodShape, priority, profiles, type Speaker, type VoiceGender } from './voices';

/*
 * Natural story voices: Piper neural voices generated on the learner's device (see
 * static/voices/piper-worker.js). Each language has one or two voice models, some of them with
 * several speakers; the cast of a story is spread over those speakers like the system voices are
 * (see voices.ts), and where speakers have to share one, the character's pitch tells them apart.
 * The German male voice has a speaker per emotion, so it laughs, sulks and yawns with the line's mood.
 *
 * Pitch is changed by playing the audio faster or slower; the model then speaks correspondingly
 * slower or faster, so the pace stays the character's own.
 */
type NaturalVoice = { model: string; speaker?: number; moods?: Partial<Record<Mood, number>> };
type LanguageVoices = { female: NaturalVoice[]; male: NaturalVoice[] };

const thorstenMoods: Partial<Record<Mood, number>> = { happy: 0, laughing: 0, angry: 1, sleepy: 5, surprised: 6 };
const voices: Record<Language, LanguageVoices> = {
  de: {
    female: [{ model: 'de/de_DE/kerstin/low/de_DE-kerstin-low.onnx' }],
    male: [{ model: 'de/de_DE/thorsten_emotional/medium/de_DE-thorsten_emotional-medium.onnx', speaker: 4, moods: thorstenMoods }]
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
  'de/de_DE/kerstin/low/de_DE-kerstin-low.onnx': 63,
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
  return [...new Set([...voices[language].female, ...voices[language].male].map((voice) => voice.model))];
}

export function naturalMegabytes(language: Language) {
  return RUNTIME_MEGABYTES + modelsOf(language).reduce((sum, model) => sum + modelMegabytes[model], 0);
}

export function naturalSupported() {
  return typeof window !== 'undefined' && 'Worker' in window && 'caches' in window && 'AudioContext' in window;
}

type Status = 'idle' | 'loading' | 'ready' | 'failed';
/** How far each language's natural voices are: the settings show it, and stories use them once ready. */
export const naturalState = $state<{ status: Partial<Record<Language, Status>>; progress: number }>({ status: {}, progress: 0 });

type Reply = { type: 'progress'; loaded: number; total: number } | { type: 'done'; pcm?: Float32Array; sampleRate?: number } | { type: 'error'; message: string };
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (reply: Reply) => void>();

function request(message: Record<string, unknown>, onProgress?: (loaded: number, total: number) => void) {
  worker ??= (() => {
    const created = new Worker('/voices/piper-worker.js');
    created.addEventListener('message', ({ data }: MessageEvent<Reply & { id: number }>) => pending.get(data.id)?.(data));
    return created;
  })();
  const id = ++nextId;
  return new Promise<Reply & { type: 'done' }>((resolve, reject) => {
    pending.set(id, (reply) => {
      if (reply.type === 'progress') return onProgress?.(reply.loaded, reply.total);
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
  naturalState.progress = 0;
  const models = modelsOf(language);
  try {
    for (const [index, model] of models.entries()) {
      await request({ type: 'load', model }, (loaded, total) => {
        if (total) naturalState.progress = (index + loaded / total) / models.length;
      });
    }
    naturalState.status[language] = 'ready';
  } catch {
    naturalState.status[language] = 'failed';
  }
}

export function naturalReady(language: Language) {
  return naturalState.status[language] === 'ready';
}

type Casting = Map<Speaker, { voice: NaturalVoice; shared: boolean; borrowed: boolean }>;
let cached: { key: string; casting: Casting } | null = null;

// Like the system voices: the narrator picks first, then the main characters, each taking an unused
// voice of their gender, else the least used one (which then counts as shared).
function castNatural(cast: Speaker[], language: Language): Casting {
  const speakers = priority.filter((speaker) => speaker === 'narrator' || cast.includes(speaker));
  const key = `${language}|${speakers.join()}`;
  if (cached?.key === key) return cached.casting;
  const uses = new Map<NaturalVoice, number>();
  const casting: Casting = new Map();
  for (const speaker of speakers) {
    const own = voices[language][profiles[speaker].gender];
    const borrowed = own.length === 0;
    const pool = borrowed ? voices[language][profiles[speaker].gender === 'female' ? 'male' : 'female'] : own;
    const voice = pool.find((candidate) => !uses.has(candidate)) ?? [...pool].sort((left, right) => (uses.get(left) ?? 0) - (uses.get(right) ?? 0))[0];
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

export type NaturalClip = { buffer: AudioBuffer; playbackRate: number; volume: number };

/** Speaks a sentence in the speaker's natural voice; resolves with audio ready to play. */
export async function synthesizeNatural(text: string, speaker: Speaker, mood: Mood, cast: Speaker[], language: Language, baseRate: number): Promise<NaturalClip> {
  const profile = profiles[speaker];
  const { voice, shared, borrowed } = castNatural(cast, language).get(speaker) ?? castNatural([speaker], language).get(speaker)!;
  const shape = moodShape[mood];
  const ownPitch = shared || borrowed || animals.includes(speaker) ? profile.pitch : 1 + (profile.pitch - 1) * 0.35;
  const playbackRate = Math.min(1.7, Math.max(0.65, ownPitch * (borrowed ? borrowedPitch[profile.gender] : 1)));
  const rate = baseRate * profile.rate * shape.rate;
  const reply = await request({ type: 'speak', model: voice.model, text, speaker: voice.moods?.[mood] ?? voice.speaker ?? 0, lengthScale: playbackRate / rate });
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
  source.start();
  return { done, seconds: clip.buffer.duration / clip.playbackRate, stop: () => { try { source.stop(); } catch { /* already over */ } } };
}
