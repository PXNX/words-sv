import type { Language } from '#lib/data/vocabulary.js';
import type { Mood } from './stories';
import { accentShape, animals, moodShape, priority, profiles, sharedPitch, type Speaker, type VoiceGender } from './voices';
import { speechChunks } from './speech';
import { settings, type NaturalModel } from '#lib/state/settings.svelte.js';

/*
 * Natural story voices: Piper neural voices generated on the learner's device (see
 * static/voices/piper-worker.js). Each language has one or more voice models, some of them with
 * several speakers, and every character gets a speaker of their own.
 *
 * German: Thorsten (high) reads the narration. The cast draws from the MLS audiobook model —
 * 236 distinct, well-articulated speakers trained on German audiobook data, all using the modern
 * Piper 1.0.0 phoneme set. The old low-quality models (Kerstin, Karlsson, Eva) used the 0.2.0
 * phoneme set and produced mumbly, hard-to-understand output; learners need every word. Each
 * character is matched to the speaker whose measured pitch is closest to theirs, so Oma gets a
 * warm low-mid woman, Kim a bright high woman, Paul a deep man. Characters who have to share a
 * voice move only a few percent away from it, which keeps them clear. Only animals still get a
 * cartoon pitch. Enzo's Italian accent is a small melodic lift, applied when dialects are on.
 */
// `f0` is the voice's typical pitch in Hz; it decides which character gets which voice.
type NaturalVoice = { model: string; speaker?: number; f0?: number };
type LanguageVoices = { narrator?: NaturalVoice; female: NaturalVoice[]; male: NaturalVoice[] };

const THORSTEN_HIGH = 'de/de_DE/thorsten/high/de_DE-thorsten-high.onnx';
const THORSTEN = 'de/de_DE/thorsten/medium/de_DE-thorsten-medium.onnx';
const MLS = 'de/de_DE/mls/medium/de_DE-mls-medium.onnx';
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

// The MLS German audiobook model has 236 speakers. Each is a distinct person; the ones below
// were chosen by ear from the model's own sample sentences, matching each character's profile.
// Pitch is the speaker's measured f0 in Hz, which is what the casting code uses to pair a
// character with a voice that suits them.
const mlsFemale = [
  { model: MLS, speaker: 2, f0: 178 },   // warm, clear mid woman — Oma, Lilith, Selma, Sabine
  { model: MLS, speaker: 4, f0: 192 },   // bright, lively — Mia, Jana, Kim
  { model: MLS, speaker: 5, f0: 193 },   // very bright, quick — Kim
  { model: MLS, speaker: 0, f0: 167 }    // calm, lower woman — Oma
];
const mlsMale = [
  { model: MLS, speaker: 1, f0: 119 },   // steady mid man — Tom, Paul, Becker, Robert, Simon
  { model: MLS, speaker: 3, f0: 148 }    // lighter, quicker — Leo, Enzo, Tobias, Kumar
];
const semanaFemale = [{ model: SEMANA, speaker: 0 }, { model: SEMANA, speaker: 3 }];
const semanaMale = [{ model: SEMANA, speaker: 1 }, { model: SEMANA, speaker: 2 }];
const ukrainianFemale = [{ model: UKRAINIAN, speaker: 0 }, { model: UKRAINIAN, speaker: 2 }];
const ukrainianMale = [{ model: UKRAINIAN, speaker: 1 }];

const voices: Record<NaturalModel, Record<Language, LanguageVoices>> = {
  high: {
    de: {
      narrator: { model: THORSTEN_HIGH, speaker: 0 },
      female: mlsFemale,
      male: mlsMale
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
      narrator: { model: THORSTEN, speaker: 0 },
      female: mlsFemale,
      male: mlsMale
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
  [THORSTEN_HIGH]: 114,
  [THORSTEN]: 63,
  [MLS]: 77,
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

// The name of the voice that reads the narration, for the story loading screen.
const voiceNames: Record<string, string> = {
  [THORSTEN_HIGH]: 'Thorsten',
  [THORSTEN]: 'Thorsten',
  [MLS]: 'MLS',
  [CORI]: 'Cori',
  [SEMANA]: 'Semaine',
  [UPMC]: 'UPMC',
  [SERENA]: 'Serena',
  [PAOLA]: 'Paola',
  [RICCARDO]: 'Riccardo',
  [SHARVARD]: 'Sharvard',
  [FABER]: 'Faber',
  [TETIANA]: 'Tetiana',
  [UKRAINIAN]: 'Ukrainian'
};

export function naturalNarratorVoice(language: Language, model: NaturalModel = settings.naturalModel) {
  const narrator = voices[model][language].narrator;
  return narrator ? voiceNames[narrator.model] ?? '' : '';
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
      uses.set(narrator, (uses.get(narrator) ?? 0) + 1);
      continue;
    }
    if (speaker === 'wirt' && narrator) {
      casting.set(speaker, { voice: narrator, shared: true, borrowed: false });
      uses.set(narrator, (uses.get(narrator) ?? 0) + 1);
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
  const innkeeper = casting.get('wirt');
  if (innkeeper && narrator && innkeeper.voice === narrator) innkeeper.shared = true;
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

/** Renders a line without keeping it in the story cache: the word bank stores its own clips. */
export function synthesizeNaturalOnce(text: string, speaker: Speaker, mood: Mood, cast: Speaker[], language: Language, baseRate: number): Promise<NaturalClip> {
  return renderNatural(text, speaker, mood, cast, language, baseRate);
}

/** Copies a rendered clip into compact 16-bit PCM for persistent storage. */
export function pcmFromClip(clip: NaturalClip) {
  const channel = clip.buffer.getChannelData(0);
  const samples = new Int16Array(channel.length);
  for (let index = 0; index < channel.length; index += 1) {
    samples[index] = Math.max(-32768, Math.min(32767, Math.round(channel[index] * 32767)));
  }
  return { samples, sampleRate: clip.buffer.sampleRate, playbackRate: clip.playbackRate, volume: clip.volume };
}

/** Rebuilds a playable clip from stored 16-bit PCM. */
export function clipFromPcm(samples: Int16Array, sampleRate: number, playbackRate = 1, volume = 1): NaturalClip {
  const buffer = audio().createBuffer(1, samples.length, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) channel[index] = samples[index] / 0x8000;
  return { buffer, playbackRate, volume };
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
  // A character with an age treatment (Oma) also shifts the selected speaker slightly, and Enzo's
  // Italian accent adds a light melodic lift while dialects are on.
  const agePitch = profile.natural?.pitch ?? 1;
  const accent = accentShape(profile.dialect, settings.dialects);
  const ownPitch = animals.includes(speaker) ? Math.min(1.4, Math.max(0.75, profile.pitch)) : (shared ? sharedPitch(profile.pitch) : 1) * agePitch * accent.pitch;
  const playbackRate = ownPitch * (borrowed ? Math.min(1.08, Math.max(0.95, 1 + (borrowedPitch[profile.gender] - 1) * 0.3)) : 1);
  const rate = Math.max(0.85, Math.min(1.15, baseRate * (profile.natural?.rate ?? profile.rate) * shape.rate * accent.rate));
  const reply = await request({ type: 'speak', model: voice.model, text, speaker: voice.speaker ?? 0, lengthScale: Math.max(0.85, Math.min(1.15, playbackRate / rate)) }, undefined, SPEAK_TIMEOUT_MS);
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
