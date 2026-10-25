import type { Language } from '#lib/data/vocabulary.js';
import type { Mood } from './stories';
import { animals, moodShape, priority, profiles, sharedPitch, type Speaker, type VoiceGender } from './voices';
import { germanSpeakers, GERMAN_CAST_MODEL } from './germanSpeakers';
import { speechChunks } from './speech';
import { settings, type NaturalModel } from '#lib/state/settings.svelte.js';

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

const THORSTEN_HIGH = 'de/de_DE/thorsten/high/de_DE-thorsten-high.onnx';
const THORSTEN_STANDARD = 'de/de_DE/thorsten_emotional/medium/de_DE-thorsten_emotional-medium.onnx';
const CORI = 'en/en_GB/cori/high/en_GB-cori-high.onnx';
const SERENA = 'it/it_IT/serena/high/it_IT-serena-high.onnx';
const TETIANA = 'uk/uk_UA/tetiana/high/uk_UA-tetiana-high.onnx';
const SEMANA = 'en/en_GB/semaine/medium/en_GB-semaine-medium.onnx';
const PAOLA = 'it/it_IT/paola/medium/it_IT-paola-medium.onnx';
const RICCARDO = 'it/it_IT/riccardo/x_low/it_IT-riccardo-x_low.onnx';
const UPMC = 'fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx';
const SHARVARD = 'es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx';
const FABER = 'pt/pt_BR/faber/medium/pt_BR-faber-medium.onnx';
const UKRAINIAN = 'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium.onnx';

const germanFemale = germanSpeakers.female.map(([speaker, f0]) => ({ model: GERMAN_CAST_MODEL, speaker, f0 }));
const germanMale = germanSpeakers.male.map(([speaker, f0]) => ({ model: GERMAN_CAST_MODEL, speaker, f0 }));
const semanaFemale = [{ model: SEMANA, speaker: 0 }, { model: SEMANA, speaker: 3 }];
const semanaMale = [{ model: SEMANA, speaker: 1 }, { model: SEMANA, speaker: 2 }];
const ukrainianFemale = [{ model: UKRAINIAN, speaker: 0 }, { model: UKRAINIAN, speaker: 2 }];
const ukrainianMale = [{ model: UKRAINIAN, speaker: 1 }];

const voices: Record<NaturalModel, Record<Language, LanguageVoices>> = {
  high: {
    de: {
      narrator: { model: THORSTEN_HIGH, speaker: 0 },
      female: germanFemale,
      male: germanMale
    },
    en: {
      narrator: { model: CORI },
      female: semanaFemale,
      male: semanaMale
    },
    fr: {
      female: [{ model: UPMC, speaker: 0 }],
      male: [{ model: UPMC, speaker: 1 }]
    },
    it: {
      narrator: { model: SERENA },
      female: [{ model: PAOLA }],
      male: [{ model: RICCARDO }]
    },
    es: {
      female: [{ model: SHARVARD, speaker: 1 }],
      male: [{ model: SHARVARD, speaker: 0 }]
    },
    // There is no Brazilian Portuguese female voice yet; the women borrow the male one, pitched up.
    pt: {
      female: [],
      male: [{ model: FABER }]
    },
    uk: {
      narrator: { model: TETIANA },
      female: ukrainianFemale,
      male: ukrainianMale
    }
  },
  standard: {
    de: {
      narrator: { model: THORSTEN_STANDARD, speaker: 4 },
      female: germanFemale,
      male: germanMale
    },
    en: {
      narrator: { model: SEMANA, speaker: 0 },
      female: semanaFemale,
      male: semanaMale
    },
    fr: {
      female: [{ model: UPMC, speaker: 0 }],
      male: [{ model: UPMC, speaker: 1 }]
    },
    it: {
      narrator: { model: PAOLA },
      female: [{ model: PAOLA }],
      male: [{ model: RICCARDO }]
    },
    es: {
      female: [{ model: SHARVARD, speaker: 1 }],
      male: [{ model: SHARVARD, speaker: 0 }]
    },
    pt: {
      female: [],
      male: [{ model: FABER }]
    },
    uk: {
      narrator: { model: UKRAINIAN, speaker: 0 },
      female: ukrainianFemale,
      male: ukrainianMale
    }
  }
};
// Download sizes in MB, plus about 30 MB of runtime (speech engine and phonemizer) shared by all languages.
const modelMegabytes: Record<string, number> = {
  [GERMAN_CAST_MODEL]: 77,
  [THORSTEN_HIGH]: 109,
  [THORSTEN_STANDARD]: 77,
  [CORI]: 109,
  [SEMANA]: 77,
  [UPMC]: 77,
  [SERENA]: 109,
  [PAOLA]: 64,
  [RICCARDO]: 28,
  [SHARVARD]: 77,
  [FABER]: 63,
  [TETIANA]: 109,
  [UKRAINIAN]: 77
};
const RUNTIME_MEGABYTES = 30;

function modelsOf(language: Language, model: NaturalModel = settings.naturalModel) {
  const { narrator, female, male } = voices[model][language];
  return [...new Set([...(narrator ? [narrator] : []), ...female, ...male].map((voice) => voice.model))];
}

export function naturalMegabytes(language: Language, model: NaturalModel = settings.naturalModel) {
  return RUNTIME_MEGABYTES + modelsOf(language, model).reduce((sum, name) => sum + modelMegabytes[name], 0);
}

export function naturalSupported() {
  return typeof window !== 'undefined' && 'Worker' in window && 'caches' in window && 'AudioContext' in window;
}

type Status = 'idle' | 'loading' | 'ready' | 'failed';
/** How far each language's natural voices are: the settings show it, and stories use them once ready. */
export const naturalState = $state<{
  status: Partial<Record<Language, Status>>;
  model: Partial<Record<Language, NaturalModel>>;
  progress: Partial<Record<Language, number>>;
  downloaded: Partial<Record<Language, number>>;
  total: Partial<Record<Language, number>>;
  remaining: Partial<Record<Language, number | null>>;
}>({ status: {}, model: {}, progress: {}, downloaded: {}, total: {}, remaining: {} });

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

const preparation = new Map<Language, Promise<void>>();

/** Downloads (once) and loads the voice models of a language, reporting progress in `naturalState`. */
export function prepareNatural(language: Language): Promise<void> {
  if (!naturalSupported()) return Promise.resolve();
  if (naturalState.status[language] === 'ready' && naturalState.model[language] === settings.naturalModel) return Promise.resolve();
  const running = preparation.get(language);
  if (running) return running;
  const task = loadNatural(language).finally(() => preparation.delete(language));
  preparation.set(language, task);
  return task;
}

async function loadNatural(language: Language) {
  const model = settings.naturalModel;
  const models = modelsOf(language, model);
  const totalMegabytes = naturalMegabytes(language, model);
  naturalState.status[language] = 'loading';
  naturalState.model[language] = model;
  naturalState.progress[language] = 0;
  naturalState.downloaded[language] = 0;
  naturalState.total[language] = totalMegabytes;
  naturalState.remaining[language] = null;
  const startedAt = performance.now();
  let finishedMegabytes = 0;
  const update = (fraction: number, megabytes = finishedMegabytes) => {
    const now = performance.now();
    naturalState.progress[language] = fraction;
    naturalState.downloaded[language] = Math.min(totalMegabytes, megabytes);
    const elapsed = (now - startedAt) / 1000;
    // Too little data at the very beginning gives wild estimates; wait for a real sample.
    if (fraction >= 0.02 && elapsed >= 0.8) naturalState.remaining[language] = Math.max(0, elapsed / fraction - elapsed);
  };
  try {
    for (const [index, name] of models.entries()) {
      await request({ type: 'load', model: name }, (loaded, total) => {
        if (total) update((index + loaded / total) / models.length, finishedMegabytes + loaded / 1_000_000);
      });
      // Cached models report no download progress; this still marks each finished model at once.
      finishedMegabytes += modelMegabytes[name] ?? 0;
      update((index + 1) / models.length, finishedMegabytes);
    }
    naturalState.downloaded[language] = totalMegabytes;
    naturalState.remaining[language] = 0;
    naturalState.status[language] = 'ready';
  } catch {
    naturalState.remaining[language] = null;
    naturalState.status[language] = 'failed';
  }
}

export function naturalReady(language: Language) {
  return naturalState.status[language] === 'ready' && naturalState.model[language] === settings.naturalModel;
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
  const model = settings.naturalModel;
  const speakers = priority.filter((speaker) => speaker === 'narrator' || cast.includes(speaker));
  const key = `${model}|${language}|${speakers.join()}`;
  if (cached?.key === key) return cached.casting;
  const uses = new Map<NaturalVoice, number>();
  const casting: Casting = new Map();
  const narrator = voices[model][language].narrator;
  for (const speaker of speakers) {
    if (speaker === 'narrator' && narrator) {
      casting.set(speaker, { voice: narrator, shared: false, borrowed: false });
      continue;
    }
    const own = voices[model][language][profiles[speaker].gender];
    const borrowed = own.length === 0;
    const pool = borrowed ? voices[model][language][profiles[speaker].gender === 'female' ? 'male' : 'female'] : own;
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
// A dash gets a little thinking break; the two sides are rendered separately so the silence is
// exact rather than left to the voice's punctuation handling.
const THINKING_BREAK = 0.35;

export type NaturalClip ={ buffer: AudioBuffer; playbackRate: number; volume: number };

const renderedAudio = new Map<string, Promise<NaturalClip>>();

/** Drops rendered story audio, e.g. when a new story takes the stage. */
export function clearNaturalAudio() {
  renderedAudio.clear();
}

/** Speaks a sentence in the speaker's natural voice; resolves with audio ready to play. */
export function synthesizeNatural(text: string, speaker: Speaker, mood: Mood, cast: Speaker[], language: Language, baseRate: number): Promise<NaturalClip> {
  const key = `${settings.naturalModel}|${language}|${baseRate}|${speaker}|${mood}|${cast.join()}|${text}`;
  const cached = renderedAudio.get(key);
  if (cached) return cached;
  const task = renderNatural(text, speaker, mood, cast, language, baseRate);
  renderedAudio.set(key, task);
  void task.catch(() => {
    if (renderedAudio.get(key) === task) renderedAudio.delete(key);
  });
  return task;
}

async function renderNatural(text: string, speaker: Speaker, mood: Mood, cast: Speaker[], language: Language, baseRate: number): Promise<NaturalClip> {
  const chunks = speechChunks(text);
  if (chunks.length < 2) return synthesizeChunk(text, speaker, mood, cast, language, baseRate);
  const clips: NaturalClip[] = [];
  for (const chunk of chunks) clips.push(await synthesizeChunk(chunk, speaker, mood, cast, language, baseRate));
  const gaps = clips.map((_, index) => (index === clips.length - 1 ? 0 : THINKING_BREAK));
  const buffer = await combineNatural(clips, gaps);
  return { buffer, playbackRate: 1, volume: 1 };
}

async function synthesizeChunk(text: string, speaker: Speaker, mood: Mood, cast: Speaker[], language: Language, baseRate: number): Promise<NaturalClip> {
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

/** Renders clips one after another into a single buffer, with optional silence before and after each. */
export async function combineNatural(clips: NaturalClip[], gaps: number[], leads: number[] = []): Promise<AudioBuffer> {
  if (!clips.length) throw new Error('no clips');
  const sampleRate = clips[0].buffer.sampleRate;
  const durations = clips.map((clip) => clip.buffer.duration / clip.playbackRate);
  const total = durations.reduce((sum, duration, index) => sum + (leads[index] ?? 0) + duration + (gaps[index] ?? 0), 0);
  const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(total * sampleRate)), sampleRate);
  let at = 0;
  clips.forEach((clip, index) => {
    at += leads[index] ?? 0;
    const source = offline.createBufferSource();
    const gain = offline.createGain();
    source.buffer = clip.buffer;
    source.playbackRate.value = clip.playbackRate;
    gain.gain.value = clip.volume;
    source.connect(gain).connect(offline.destination);
    source.start(at);
    at += durations[index] + (gaps[index] ?? 0);
  });
  return offline.startRendering();
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
