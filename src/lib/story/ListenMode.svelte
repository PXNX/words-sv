<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { characterNames, fillName, moodFor, storiesFor, withDetails, withWeather, type CharacterId, type Mood, type SceneId, type Story, type StoryBeat } from './stories';
  import type { Language, VocabularyLevel } from '#lib/data/vocabulary.js';
  import { intonationOf, pronounceable, splitSounds, wordsOf } from './speech';
  import { naturalReady, naturalState, naturalSupported, prepareNatural, synthesizeNatural, combineNatural, type NaturalClip } from './naturalVoices.svelte';
  import { applyVoice, profiles, type Dialect, type Speaker } from './voices';
  import { listAudioSessions, loadAudioBlob, saveAudioSession, updateAudioSessionPosition, type SavedAudio, type SavedSound, type SavedStoryStart } from './audioLibrary';
  import { playSoundEffect, soundEffectSeconds, type SoundEffect } from '#lib/sounds.js';
  import StoryCharacter from './StoryCharacter.svelte';
  import StoryScene from './StoryScene.svelte';
  import IconHeadphones from '~icons/material-symbols/headphones-rounded';
  import IconPlay from '~icons/material-symbols/play-arrow-rounded';
  import IconPause from '~icons/material-symbols/pause-rounded';
  import IconRewind from '~icons/material-symbols/fast-rewind-rounded';
  import IconForward from '~icons/material-symbols/fast-forward-rounded';

  const STORY_TARGETS: Record<string, number> = { a1: 200, a2: 250, b1: 320, b2: 380, c1: 420, c2: 480 };
  const BEAT_GAP = 0.6;
  const SINGLE_WORD_QUESTION_GAP = 1.4;
  const STORY_GAP = 1.4;
  const QUESTION_WORD_LIMIT = 170;
  const QUESTION_COUNT = 5;
  const levelRates: Record<string, number> = { a1: 0.9, a2: 0.95, b1: 1.03, b2: 1.07, c1: 1.11, c2: 1.15 };
  const naturalLevelPace: Record<string, number> = { a1: 0.9, a2: 0.95, b1: 1, b2: 1, c1: 1, c2: 1 };
  const speechLocales: Record<string, string> = { de: 'de-DE', en: 'en-GB', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-BR', uk: 'uk-UA' };
  const dialectAttention: Record<string, string> = { de: 'Vorsicht', en: 'Careful', fr: 'Attention', it: 'Attenzione', es: 'Cuidado', pt: 'Cuidado', uk: 'Обережно' };
  const dialectNotes: Record<string, Record<Dialect, string>> = {
    de: { bavarian: '{name} spricht Bayerisch.', berlin: '{name} spricht Berlinerisch.', alpine: '{name} spricht mit Alpenakzent.', northern: '{name} spricht Norddeutsch.' },
    en: { bavarian: '{name} speaks Bavarian.', berlin: '{name} speaks the Berlin dialect.', alpine: '{name} speaks with an Alpine accent.', northern: '{name} speaks Northern German.' },
    fr: { bavarian: '{name} parle bavarois.', berlin: '{name} parle le dialecte berlinois.', alpine: '{name} parle avec un accent alpin.', northern: "{name} parle l'allemand du nord." },
    it: { bavarian: '{name} parla bavarese.', berlin: '{name} parla il dialetto berlinese.', alpine: '{name} parla con accento alpino.', northern: '{name} parla il tedesco settentrionale.' },
    es: { bavarian: '{name} habla bávaro.', berlin: '{name} habla el dialecto berlinés.', alpine: '{name} habla con acento alpino.', northern: '{name} habla alemán del norte.' },
    pt: { bavarian: '{name} fala bávaro.', berlin: '{name} fala o dialeto berlinense.', alpine: '{name} fala com sotaque alpino.', northern: '{name} fala alemão do norte.' },
    uk: { bavarian: '{name} розмовляє баварським діалектом.', berlin: '{name} розмовляє берлінським діалектом.', alpine: '{name} розмовляє з альпійським акцентом.', northern: '{name} розмовляє північнонімецьким діалектом.' }
  };

  type Phase = 'idle' | 'preparing' | 'generating' | 'loading' | 'ready' | 'error';
  type Segment = { text: string; speaker: Speaker; mood: Mood; gap: number; story: number; sound: SoundEffect | null; soundLead: number };
  type LiveSession = { story: Story; segments: Segment[]; starts: number[]; sounds: SavedSound[]; duration: number };

  let phase = $state<Phase>('idle');
  let progress = $state(0);
  let done = $state(0);
  let total = $state(0);
  let error = $state('');
  let storyStarts = $state<SavedStoryStart[]>([]);
  let storyCount = $state(0);
  let audioUrl = $state('');
  let currentId = $state('');
  let history = $state<SavedAudio[]>([]);
  let audio: HTMLAudioElement | null = null;
  let duration = $state(0);
  let position = $state(0);
  let playing = $state(false);
  let generation = 0;
  let pendingSeek: number | null = null;
  let lastSavedAt = 0;
  let eta = $state<number | null>(null);
  let settingsReady = $state(false);
  let settingsKey = '';
  let liveSession = $state<LiveSession | null>(null);
  let sounds = $state<SavedSound[]>([]);
  let lastSoundAt = -1;
  let liveToken = 0;

  const standardMode = $derived(settings.voiceQuality !== 'natural');
  const download = $derived(Math.round((naturalState.progress[settings.lang] ?? 0) * 100));
  const downloadRemaining = $derived(naturalState.remaining[settings.lang] ?? null);
  const labels = $derived({
    listen: m.story_listen({}, { locale: settings.interfaceLocale }),
    level: m.vocabulary({}, { locale: settings.interfaceLocale }),
    download: m.voice_quality_loading({ percent: String(download) }, { locale: settings.interfaceLocale }),
    audio: m.story_listen_audio({}, { locale: settings.interfaceLocale }),
    loading: m.story_listen_loading({}, { locale: settings.interfaceLocale }),
    newAudio: m.story_listen_new({}, { locale: settings.interfaceLocale }),
    history: m.story_listen_history({}, { locale: settings.interfaceLocale }),
    play: m.home_play({}, { locale: settings.interfaceLocale }),
    again: m.learning_again({}, { locale: settings.interfaceLocale }),
    unsupported: m.learning_speech_unavailable({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const currentStory = $derived(storyStarts.filter((entry) => entry.at <= position + 0.05).at(-1)?.title ?? storyStarts[0]?.title ?? labels.listen);
  const visibleHistory = $derived.by(() => {
    const seen = new Set<string>();
    return history.filter((session) => {
      const key = savedSessionKey(session);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  const dateFormat = $derived(new Intl.DateTimeFormat(settings.interfaceLocale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));
  const soundEnabled = $derived(settings.sound);

  let audioContextRef: AudioContext | null = null;

  function ensureAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!audioContextRef) {
      const legacy = window as typeof window & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? legacy.webkitAudioContext;
      if (!Ctor) return null;
      audioContextRef = new Ctor();
    }
    if (audioContextRef.state === 'suspended') void audioContextRef.resume();
    return audioContextRef;
  }
  function playSfx(sfx: any) {
    if (!soundEnabled || !sfx) return;
    try { playSoundEffect(true, sfx); } catch {}
  }
  function canSpeak() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }
  function wait(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
  function cancelStandardSpeech() {
    liveToken += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }
  function playChime() {
    try {
      const ctx = ensureAudioContext();
      if (!ctx || !soundEnabled) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(1320, t + 0.12);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.08, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    } catch {}
  }
  function segmentIndexAt(session: LiveSession, at: number) {
    let index = 0;
    for (const [positionIndex, start] of session.starts.entries()) {
      if (start <= at + 0.01) index = positionIndex;
      else break;
    }
    return index;
  }
  function speakStandardSegment(segment: Segment, token: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (token !== liveToken || !canSpeak()) {
        resolve(false);
        return;
      }
      const synth = window.speechSynthesis;
      let spoken = '';
      for (const part of splitSounds(segment.text, settings.lang)) {
        if (part.kind === 'say') spoken += `${part.text} `;
      }
      const text = pronounceable(spoken.trim() || segment.text, settings.lang).text;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLocales[settings.lang] ?? settings.lang;
      const baseRate = levelRates[settings.vocabularyLevel] ?? 1;
      applyVoice(utterance, segment.speaker, settings.lang, utterance.lang, liveSession?.story.cast ?? [], baseRate, segment.mood, settings.dialects);
      const startPosition = position;
      const startedAt = performance.now();
      const estimated = estimateSpeech(text, utterance.rate || baseRate);
      const ticker = window.setInterval(() => {
        if (token !== liveToken) return;
        position = Math.min(startPosition + estimated, startPosition + (performance.now() - startedAt) / 1000);
      }, 200);
      let done = false;
      let safety = 0;
      const finish = () => {
        if (done) return;
        done = true;
        clearInterval(ticker);
        clearTimeout(safety);
        if (token === liveToken) {
          const elapsed = (performance.now() - startedAt) / 1000;
          position = Math.max(position, startPosition + Math.min(estimated, elapsed));
        }
        resolve(token === liveToken);
      };
      safety = window.setTimeout(finish, estimated * 2500 + 5000);
      utterance.onend = finish;
      utterance.onerror = finish;
      synth.speak(utterance);
    });
  }
  async function runStandard(token: number, startIndex: number, startAt: number) {
    const session = liveSession;
    if (!session) return;
    for (let index = startIndex; index < session.segments.length; index += 1) {
      if (token !== liveToken) return;
      const segment = session.segments[index];
      const segmentStart = session.starts[index];
      const begin = index === startIndex ? Math.max(startAt, segmentStart) : segmentStart;
      position = begin;
      if (segment.sound) {
        if (index !== startIndex || begin <= segmentStart + 0.15) playSfx(segment.sound);
        const remaining = Math.max(0, segmentStart + segment.soundLead - begin);
        if (remaining > 0) {
          await wait(remaining * 1000);
          if (token !== liveToken) return;
          position = Math.max(begin, segmentStart + segment.soundLead);
        }
      }
      const spoken = await speakStandardSegment(segment, token);
      if (!spoken || token !== liveToken) return;
      const rate = levelRates[settings.vocabularyLevel] ?? 1;
      position = Math.max(position, segmentStart + segment.soundLead + estimateSpeech(segment.text, rate));
      if (segment.gap > 0) await wait(segment.gap * 1000);
    }
    if (token !== liveToken) return;
    playing = false;
    finishSession();
  }
  function startStandardPlayback(from: number) {
    const session = liveSession;
    if (!session) return;
    const token = ++liveToken;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    const startAt = Math.max(0, Math.min(session.duration, from));
    playing = true;
    position = startAt;
    lastSoundAt = startAt - 0.05;
    void runStandard(token, segmentIndexAt(session, startAt), startAt);
  }
  function pauseStandard() {
    cancelStandardSpeech();
    playing = false;
  }
  function finishSession() {
    const token = generation;
    position = duration;
    lastSoundAt = duration;
    flushPosition();
    playChime();
    setTimeout(() => {
      if (phase === 'ready' && token === generation) void startSession();
    }, 600);
  }
  function say(text: string) {
    return fillName(text, settings.firstName);
  }
  function wordCount(story: Story) {
    const text = story.beats
      .filter((beat) => beat.kind === 'narration' || beat.kind === 'line')
      .map((beat) => beat.text[settings.lang])
      .join(' ');
    return text.split(/\s+/).filter(Boolean).length;
  }
  function shuffled<T>(items: T[]) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }
  // One story should carry the whole session. Short stories get their questions read after the plot,
  // so even the briefest A1 story reaches a comfortable 1.5-2 minute listening length.
  function storyLength(story: Story) {
    const words = wordCount(story);
    return words < QUESTION_WORD_LIMIT ? words + 110 : words;
  }
  function pickStory(avoidSaved = false): Story | null {
    let pool = [...new Map(storiesFor(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary).map((story) => [story.id, story])).values()];
    if (!pool.length) return null;
    if (avoidSaved) {
      const covered = new Set(history.filter((session) => session.language === settings.lang).map(savedSessionKey));
      const fresh = pool.filter((story) => !covered.has(storyKey(story)));
      if (fresh.length) pool = fresh;
    }
    const target = STORY_TARGETS[settings.vocabularyLevel] ?? 320;
    const ranked = [...pool].sort((left, right) => Math.abs(storyLength(left) - target) - Math.abs(storyLength(right) - target));
    const top = shuffled(ranked.slice(0, Math.min(3, ranked.length)));
    return top[0] ?? ranked[0] ?? null;
  }
  function beatSounds(beat: any): { start: any; slot: any } {
    if (beat.kind === 'narration' && beat.announcement) return { start: beat.sfx ?? 'gong', slot: beat.sfx ?? null };
    if (beat.kind === 'narration') return { start: beat.sfx ?? null, slot: beat.sfx ?? null };
    if (beat.kind !== 'line') return { start: null, slot: null };
    const petSounds: any = { lilith: { slot: 'meow', start: 'purr' }, bello: { slot: 'bark', start: 'bark' }, bird: { slot: 'tweet', start: 'tweet' }, cow: { slot: 'moo', start: 'moo' }, horse: { slot: 'neigh', start: 'neigh' }, giraffe: { slot: 'hum', start: 'hum' }, elephant: { slot: 'trumpet', start: 'trumpet' }, snake: { slot: 'hiss', start: 'hiss' } };
    const pet = petSounds[beat.speaker];
    return { start: beat.sfx ?? pet?.start ?? null, slot: beat.sfx ?? pet?.slot ?? null };
  }
  function beatSound(beat: any): SoundEffect | null {
    if (beat.kind !== 'narration' && beat.kind !== 'line') return null;
    const sounds = beatSounds(beat);
    if (splitSounds(beat.text[settings.lang], settings.lang).some((part: any) => part.kind === 'sound')) return sounds.slot ?? sounds.start;
    return sounds.start ?? sounds.slot;
  }
  function beatGap(text: string) {
    return intonationOf(text) === 'question' && wordsOf(text).length === 1 ? SINGLE_WORD_QUESTION_GAP : BEAT_GAP;
  }
  function dialectIntroduction(story: Story) {
    if (!settings.dialects) return '';
    const speakers = new Set<Speaker>();
    for (const beat of story.beats) {
      if (beat.kind === 'line') speakers.add(beat.speaker);
      else if (beat.kind === 'question' && beat.asker) speakers.add(beat.asker);
    }
    const templates = dialectNotes[settings.lang] ?? dialectNotes.en;
    const attention = dialectAttention[settings.lang] ?? dialectAttention.en;
    const notes: string[] = [];
    for (const speaker of speakers) {
      const dialect = profiles[speaker].dialect;
      if (!dialect) continue;
      const name = characterNames[speaker as CharacterId][settings.lang];
      const note = `${attention}, ${templates[dialect].replace('{name}', name)}`;
      if (!notes.includes(note)) notes.push(note);
    }
    return notes.join(' ');
  }
  function segmentsForStory(story: Story, withSoundLead = true): Segment[] {
    const segments: Segment[] = [];
    const title = `${say(story.title[settings.lang])}.`;
    const dialect = dialectIntroduction(story);
    segments.push({
      text: `${title} ${labels.level} ${story.level.toUpperCase()}.${dialect ? ` ${dialect}` : ''}`,
      speaker: 'narrator',
      mood: 'neutral',
      gap: 0.7,
      story: 0,
      sound: null,
      soundLead: 0
    });
    for (const beat of story.beats) {
      if (beat.kind !== 'narration' && beat.kind !== 'line') continue;
      const text = say(beat.text[settings.lang]);
      const sound = beatSound(beat);
      segments.push({
        text,
        speaker: beat.kind === 'line' ? beat.speaker : 'narrator',
        mood: beat.kind === 'line' ? moodFor(beat) : 'neutral',
        gap: beatGap(text),
        story: 0,
        sound,
        soundLead: sound && withSoundLead ? soundEffectSeconds[sound] : 0
      });
    }
    const last = segments.at(-1);
    if (last) last.gap = STORY_GAP;
    return segments.filter((segment) => /\p{L}/u.test(segment.text));
  }
  function questionSegments(story: Story): Segment[] {
    const questions = story.beats.filter((beat): beat is Extract<StoryBeat, { kind: 'question' }> => beat.kind === 'question').slice(0, QUESTION_COUNT);
    const segments: Segment[] = [];
    for (const question of questions) {
      const prompt = say(question.prompt[settings.lang]).trim();
      const speaker = question.asker ?? 'narrator';
      if (prompt) segments.push({ text: prompt, speaker, mood: 'curious', gap: 1.8, story: 0, sound: null, soundLead: 0 });
      const options = question.options.map((option) => say(option[settings.lang]).trim()).filter(Boolean);
      if (options.length) segments.push({ text: options.join(' … '), speaker, mood: 'neutral', gap: 2.4, story: 0, sound: null, soundLead: 0 });
    }
    return segments;
  }
  function estimateSpeech(text: string, rate: number) {
    const rateValue = Math.max(0.5, rate);
    return Math.max(0.9, (Math.max(1, wordsOf(text).length) / 2.6 + 0.5) / rateValue);
  }
  function buildStandardSession(): LiveSession | null {
    const raw = pickStory();
    if (!raw) return null;
    const story = withWeather(withDetails(raw));
    const segments = segmentsForStory(story, settings.sound);
    if (wordCount(raw) < QUESTION_WORD_LIMIT) segments.push(...questionSegments(story));
    const starts: number[] = [];
    const timedSounds: SavedSound[] = [];
    let at = 0;
    const rate = levelRates[settings.vocabularyLevel] ?? 1;
    for (const segment of segments) {
      starts.push(at);
      if (segment.sound) timedSounds.push({ at, effect: segment.sound });
      at += segment.soundLead + estimateSpeech(segment.text, rate) + segment.gap;
    }
    return { story, segments, starts, sounds: timedSounds, duration: at };
  }
  function wavBlob(buffer: AudioBuffer) {
    const samples = buffer.getChannelData(0);
    const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
    const write = (offset: number, value: string) => {
      for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
    };
    write(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    write(8, 'WAVE');
    write(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    write(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    for (let index = 0; index < samples.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, samples[index]));
      view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }
    return new Blob([view.buffer], { type: 'audio/wav' });
  }
  function newSessionId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
  function mergeHistory(saved: SavedAudio) {
    history = [saved, ...history.filter((entry) => entry.id !== saved.id)].sort((left, right) => right.updatedAt - left.updatedAt);
  }
  function clearAudio() {
    cancelStandardSpeech();
    currentId = '';
    const current = audio;
    current?.pause();
    playing = false;
    liveSession = null;
    sounds = [];
    lastSoundAt = -1;
    position = 0;
    duration = 0;
    storyStarts = [];
    storyCount = 0;
    eta = null;
    pendingSeek = null;
    if (current) {
      current.removeAttribute('src');
      current.load();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = '';
  }
  function savePosition() {
    const id = currentId;
    if (!id || !audio || !Number.isFinite(audio.currentTime)) return;
    const at = audio.currentTime;
    position = at;
    void updateAudioSessionPosition(id, at).then((saved) => {
      if (saved) mergeHistory(saved);
    }).catch(() => {});
  }
  function scheduleSave() {
    const now = Date.now();
    if (now - lastSavedAt < 4000) return;
    lastSavedAt = now;
    savePosition();
  }
  function flushPosition() {
    if (phase !== 'ready' || !currentId) return;
    lastSavedAt = Date.now();
    savePosition();
  }
  async function startSession() {
    flushPosition();
    const token = ++generation;
    clearAudio();
    phase = 'preparing';
    error = '';
    progress = 0;
    done = 0;
    total = 0;
    if (!settings.firstName) { void goto('/', { replace: true }); return; }
    if (standardMode) {
      if (!canSpeak()) { phase = 'error'; error = labels.unsupported; return; }
      const session = buildStandardSession();
      if (token !== generation) return;
      if (!session) { phase = 'error'; error = 'No stories are available for this level yet.'; return; }
      liveSession = session;
      sounds = session.sounds;
      storyStarts = [{ at: 0, title: session.story.title[settings.lang] }];
      storyCount = 1;
      duration = session.duration;
      position = 0;
      lastSoundAt = -1;
      phase = 'ready';
      return;
    }
    if (!naturalSupported()) { phase = 'error'; error = labels.unsupported; return; }
    const raw = pickStory(true);
    if (!raw) { phase = 'error'; error = 'No stories are available for this level yet.'; return; }
    const existing = history.find((session) => savedSessionKey(session) === storyKey(raw));
    if (existing) { await openSession(existing); return; }
    await prepareNatural(settings.lang);
    if (token !== generation) return;
    if (!naturalReady(settings.lang)) { phase = 'error'; error = labels.unsupported; return; }
    phase = 'generating';
    const story = withWeather(withDetails(raw));
    const segments = segmentsForStory(story);
    if (wordCount(raw) < QUESTION_WORD_LIMIT) segments.push(...questionSegments(story));
    total = segments.length;
    const clips: NaturalClip[] = [];
    const gaps: number[] = [];
    const leads: number[] = [];
    const timedSounds: SavedSound[] = [];
    const rate = (levelRates[settings.vocabularyLevel] ?? 1) * (naturalLevelPace[settings.vocabularyLevel] ?? 1);
    const startedAt = performance.now();
    let at = 0;
    try {
      for (const [index, segment] of segments.entries()) {
        if (token !== generation) return;
        if (segment.sound) timedSounds.push({ at, effect: segment.sound });
        const clip = await synthesizeNatural(pronounceable(segment.text, settings.lang).text, segment.speaker, segment.mood, story.cast, settings.lang, rate);
        if (token !== generation) return;
        clips.push(clip);
        gaps.push(segment.gap);
        leads.push(segment.soundLead);
        at += segment.soundLead + clip.buffer.duration / clip.playbackRate + segment.gap;
        done = index + 1;
        progress = done / total;
        const elapsed = (performance.now() - startedAt) / 1000;
        eta = progress > 0 ? Math.max(0, elapsed / progress - elapsed) : null;
      }
      const buffer = await combineNatural(clips, gaps, leads);
      if (token !== generation) return;
      eta = 0;
      const blob = wavBlob(buffer);
      const savedStarts: SavedStoryStart[] = [{ at: 0, title: story.title[settings.lang] }];
      const now = Date.now();
      const saved: SavedAudio = {
        id: newSessionId(),
        createdAt: now,
        updatedAt: now,
        language: settings.lang,
        level: settings.vocabularyLevel,
        duration: buffer.duration,
        position: 0,
        storyCount: 1,
        stories: savedStarts,
        scene: story.scene,
        weather: story.weather,
        sounds: timedSounds
      };
      try {
        await saveAudioSession(saved, blob);
      } catch {}
      if (token !== generation) return;
      try {
        history = await listAudioSessions();
      } catch {
        mergeHistory(saved);
      }
      if (token !== generation) return;
      currentId = saved.id;
      storyStarts = savedStarts;
      storyCount = 1;
      sounds = timedSounds;
      lastSoundAt = 0;
      audioUrl = URL.createObjectURL(blob);
      duration = buffer.duration;
      progress = 1;
      phase = 'ready';
      pendingSeek = 0;
      await tick();
      if (token !== generation || !audio) return;
      audio.src = audioUrl;
      audio.load();
    } catch {
      if (token === generation) {
        phase = 'error';
        error = 'The audio could not be generated.';
      }
    }
  }
  async function openSession(session: SavedAudio) {
    if (currentId === session.id && phase === 'ready') {
      if (audio?.paused) void audio.play().catch(() => (playing = false));
      return;
    }
    flushPosition();
    const token = ++generation;
    clearAudio();
    phase = 'loading';
    error = '';
    let blob: Blob | undefined;
    try {
      blob = await loadAudioBlob(session.id);
    } catch {}
    if (token !== generation) return;
    if (!blob) {
      phase = 'error';
      error = 'The saved audio could not be loaded.';
      return;
    }
    const startAt = session.position >= session.duration - 1 ? 0 : session.position;
    currentId = session.id;
    storyStarts = session.stories;
    storyCount = session.storyCount;
    sounds = session.sounds ?? [];
    lastSoundAt = startAt;
    duration = session.duration;
    position = startAt;
    pendingSeek = startAt;
    audioUrl = URL.createObjectURL(blob);
    phase = 'ready';
    await tick();
    if (token !== generation || !audio) return;
    audio.src = audioUrl;
    audio.load();
  }
  function sessionTitle(session: SavedAudio) {
    return session.stories[0]?.title ?? labels.listen;
  }
  function savedSessionKey(session: SavedAudio) {
    return `${session.language}|${session.level}|${sessionTitle(session)}`;
  }
  function storyKey(story: Story) {
    return `${settings.lang}|${story.level}|${story.title[settings.lang]}`;
  }
  function sessionScene(session: SavedAudio): SceneId | undefined {
    if (session.scene) return session.scene;
    const title = sessionTitle(session);
    return storiesFor(session.language as Language, session.level as VocabularyLevel, true).find((story) => story.title[session.language as Language] === title)?.scene;
  }
  const currentSession = $derived(currentId ? history.find((session) => session.id === currentId) ?? null : null);
  const currentScene = $derived(liveSession?.story.scene ?? (currentSession ? sessionScene(currentSession) : undefined));
  const currentWeather = $derived(liveSession?.story.weather ?? currentSession?.weather);
  function onLoadedMetadata() {
    if (!audio) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
    if (pendingSeek === null) return;
    const target = Math.max(0, Math.min(pendingSeek, duration));
    try {
      audio.currentTime = target;
    } catch {}
    position = target;
    lastSoundAt = target;
    pendingSeek = null;
  }
  function onPlay() {
    playing = true;
    lastSoundAt = Math.max(-0.05, position - 0.05);
  }
  function updatePosition() {
    if (!audio || !Number.isFinite(audio.currentTime)) return;
    const previous = lastSoundAt;
    position = audio.currentTime;
    if (previous >= 0) {
      for (const event of sounds) {
        if (event.at > previous && event.at <= position + 0.06) playSfx(event.effect);
      }
    }
    lastSoundAt = position;
    scheduleSave();
  }
  function togglePlay() {
    if (liveSession) {
      if (playing) pauseStandard();
      else startStandardPlayback(position);
      return;
    }
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => (playing = false));
    else audio.pause();
  }
  function onEnded() {
    playing = false;
    finishSession();
  }
  function seekTo(value: number) {
    const target = Math.max(0, Math.min(duration, value));
    if (liveSession) {
      const wasPlaying = playing;
      cancelStandardSpeech();
      position = target;
      lastSoundAt = target;
      if (wasPlaying) startStandardPlayback(target);
      return;
    }
    if (!audio) return;
    audio.currentTime = target;
    position = target;
    lastSoundAt = target;
    lastSavedAt = 0;
    flushPosition();
  }
  function skip(seconds: number) {
    if (!duration) return;
    seekTo(position + seconds);
  }
  function prevTrack() {
    if (!duration) return;
    if (position <= 2) {
      const index = currentId ? visibleHistory.findIndex((session) => session.id === currentId) : -1;
      const previous = index >= 0 ? visibleHistory[index + 1] : visibleHistory[0];
      if (previous) {
        void openSession(previous);
        return;
      }
    }
    seekTo(0);
  }
  function seek(event: Event) {
    const value = Number((event.currentTarget as HTMLInputElement).value);
    seekTo(value);
  }
  function formatTime(seconds: number) {
    const whole = Math.max(0, Math.round(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }
  $effect(() => {
    if (!audio || liveSession) return;
    // Make the animated view follow currently playing audio
    playing = !audio.paused;
  });
  function settingsFingerprint() {
    return `${settings.lang}|${settings.vocabularyLevel}|${settings.includeLowerVocabulary}|${settings.voiceQuality}`;
  }

  $effect(() => {
    const fingerprint = settingsFingerprint();
    if (!settingsReady) return;
    if (fingerprint === settingsKey) return;
    settingsKey = fingerprint;
    untrack(() => void startSession());
  });
  onMount(() => {
    if (!settings.firstName) {
      void goto('/', { replace: true });
      return;
    }
    let disposed = false;
    const loadLibrary = async () => {
      let saved: SavedAudio[] = [];
      try {
        saved = await listAudioSessions();
      } catch {}
      if (disposed) return;
      history = saved;
      settingsKey = settingsFingerprint();
      settingsReady = true;
      const latest = saved[0];
      if (latest && !standardMode) await openSession(latest);
      else await startSession();
    };
    void loadLibrary();
    const onPageHide = () => flushPosition();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushPosition();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
      flushPosition();
      generation += 1;
      cancelStandardSpeech();
      audio?.pause();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  });
</script>

<section class="listen-view" aria-label={labels.listen}>
  <header class="listen-header" dir={interfaceDirection} lang={settings.interfaceLocale}>
    <p>{labels.listen} · {settings.vocabularyLevel.toUpperCase()}</p>
    <h1 lang={settings.lang}>{phase === 'ready' ? currentStory : labels.listen}</h1>
  </header>

  <div class="listen-card">
    {#if phase === 'preparing'}
      <div class="listen-state" aria-live="polite">
        <span class="listen-pulse" aria-hidden="true"><IconHeadphones /></span>
        <p>{labels.download}</p>
        <div class="listen-bar"><span style={`width:${download}%`}></span></div>
        {#if downloadRemaining !== null && downloadRemaining >= 1}
          <small>{m.voice_quality_remaining({ time: formatTime(downloadRemaining) }, { locale: settings.interfaceLocale })}</small>
        {/if}
      </div>
    {:else if phase === 'generating'}
      <div class="listen-state listen-generating" aria-live="polite">
        <span class="listen-walk" aria-hidden="true"><span class="listen-walker"><StoryCharacter id="lilith" mood="happy" /></span></span>
        <p>{labels.audio} · {Math.round(progress * 100)} %</p>
        <div class="listen-bar"><span style={`width:${progress * 100}%`}></span></div>
        <div class="listen-eta">
          <small>{done} / {total}</small>
          {#if eta !== null && eta >= 1}<small>{m.voice_quality_remaining({ time: formatTime(eta) }, { locale: settings.interfaceLocale })}</small>{/if}
        </div>
      </div>
    {:else if phase === 'loading'}
      <div class="listen-state" aria-live="polite">
        <span class="listen-pulse" aria-hidden="true"><IconHeadphones /></span>
        <p>{labels.loading}</p>
      </div>
    {:else if phase === 'error'}
      <div class="listen-state" aria-live="polite">
        <span class="listen-pulse" aria-hidden="true"><IconHeadphones /></span>
        <p>{error}</p>
        <button type="button" class="btn-play btn-play-ink btn-play-sm" onclick={startSession}>{labels.again}</button>
      </div>
    {:else if phase === 'ready'}
      <div class="listen-player">
        <span class="listen-art" class:has-scene={currentScene} class:playing aria-hidden="true">
          {#if currentScene}
            <span class="listen-art-bg"><StoryScene scene={currentScene} weather={currentWeather} /></span>
          {/if}
          <span class="listen-wave">{#each [0, 1, 2, 3, 4] as bar (bar)}<span style={`--bar:${bar}`}></span>{/each}</span>
        </span>
        <div class="listen-now">
          <p lang={settings.lang}>{currentStory}</p>
          <small>{#if storyCount > 1}{storyCount} · {/if}{formatTime(duration)}</small>
        </div>
        <input class="listen-seek" type="range" min="0" max={duration} step="0.1" value={position} oninput={seek} aria-label={labels.listen} />
        <div class="listen-time"><span>{formatTime(position)}</span><span>{formatTime(duration)}</span></div>
        <div class="listen-controls">
          <button type="button" class="listen-control" onclick={prevTrack} aria-label="Previous" title="Previous"><IconRewind aria-hidden="true" /></button>
          <button type="button" class="listen-control listen-control-main" onclick={togglePlay} aria-label={playing ? 'Pause' : labels.play} title={playing ? 'Pause' : labels.play}>{#if playing}<IconPause aria-hidden="true" />{:else}<IconPlay aria-hidden="true" />{/if}</button>
          <button type="button" class="listen-control" onclick={() => skip(15)} aria-label="Forward 15 seconds" title="Forward 15 seconds"><IconForward aria-hidden="true" /></button>
        </div>
        <button type="button" class="btn-play btn-play-sm listen-new" onclick={startSession}>{labels.newAudio}</button>
      </div>
    {:else}
      <div class="listen-state" aria-live="polite">
        <span class="listen-pulse" aria-hidden="true"><IconHeadphones /></span>
        <p>{labels.loading}</p>
      </div>
    {/if}
  </div>

  {#if visibleHistory.length}
    <section class="listen-history" dir={interfaceDirection} lang={settings.interfaceLocale}>
      <div class="listen-history-head">
        <h2>{labels.history}</h2>
      </div>
      <ul>
        {#each visibleHistory as session (session.id)}
          {@const scene = sessionScene(session)}
          <li class:current={session.id === currentId}>
            <button type="button" class="listen-history-item" onclick={() => void openSession(session)}>
              <span class="listen-history-art" class:has-scene={scene} aria-hidden="true">
                {#if scene}
                  <span class="listen-history-bg"><StoryScene {scene} weather={session.weather} /></span>
                {/if}
                {#if session.id === currentId && playing}
                  <span class="listen-mini-wave">{#each [0, 1, 2] as bar (bar)}<span style={`--bar:${bar}`}></span>{/each}</span>
                {:else if !scene}
                  <IconHeadphones />
                {/if}
              </span>
              <span class="listen-history-text">
                <strong lang={session.language}>{sessionTitle(session)}</strong>
                <small>{session.level.toUpperCase()} · {dateFormat.format(session.updatedAt)}{#if session.storyCount > 1}{' · '}{session.storyCount}{/if}</small>
              </span>
              <span class="listen-history-at">{formatTime(session.position)} / {formatTime(session.duration)}</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <audio bind:this={audio} preload="auto" onloadedmetadata={onLoadedMetadata} ontimeupdate={updatePosition} onplay={onPlay} onpause={() => { playing = false; flushPosition(); }} onended={onEnded}></audio>
</section>

<style>
  .listen-view { flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:.65rem;padding:clamp(.6rem,3vw,1rem) clamp(.7rem,3.4vw,1.2rem) clamp(.7rem,3vw,1rem);overflow-y:auto; }
  .listen-header { display:grid;gap:.2rem;padding-top:.35rem;text-align:center; }
  .listen-header p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase; }
  .listen-header h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.55rem,7vw,2.2rem);font-weight:400;letter-spacing:-.03em;line-height:1; }
  .listen-card { flex:none;display:grid;place-items:center;padding:.4rem 0; }
  .listen-state,.listen-player { width:min(100%,26rem);display:grid;justify-items:center;gap:.65rem;padding:clamp(1.25rem,6vw,2rem);border:1px solid rgba(23,42,69,.22);border-radius:1.15rem;background:#fffdf7;box-shadow:0 8px 20px rgba(23,42,69,.08);text-align:center; }
  .listen-state p,.listen-now p { margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:800;line-height:1.4; }
  .listen-state small,.listen-now small { color:#596477;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:800; }
  .listen-pulse,.listen-art { display:grid;place-items:center;width:4.4rem;height:4.4rem;border:2px solid #172a45;border-radius:48% 52% 46% 54% / 54% 46% 52% 48%;background:#f7e2b0;color:#a45e38; }
  .listen-art { position:relative;overflow:hidden; }
  .listen-art.has-scene { background:#cfe6f2; }
  .listen-art-bg { position:absolute;inset:0; }
  .listen-art-bg :global(.story-scene) { position:absolute;inset:0;width:100%;height:100%; }
  .listen-art-bg :global(.story-scene *) { animation-play-state:paused; }
  .listen-art.playing .listen-art-bg :global(.story-scene *) { animation-play-state:running; }
  .listen-pulse { animation:listen-pulse 1.8s ease-in-out infinite; }
  .listen-pulse :global(svg) { width:2rem;height:2rem; }
  .listen-bar { width:min(100%,16rem);height:.42rem;overflow:hidden;border-radius:999px;background:rgba(23,42,69,.12); }
  .listen-bar span { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#e6a527,#a45e38);transition:width .2s ease; }
  .listen-generating { position:relative;overflow:hidden;padding-top:.8rem; }
  .listen-walk { position:relative;display:block;width:100%;height:5.4rem;overflow:hidden; }
  .listen-walker { position:absolute;bottom:0;left:0;width:3.6rem;height:5.2rem;transform-origin:50% 100%;animation:listen-walk 8s ease-in-out infinite; }
  .listen-walker :global(.story-character) { display:block;width:100%;height:100%;transform-origin:50% 100%;animation:listen-bob .34s ease-in-out infinite alternate; }
  .listen-eta { display:flex;justify-content:space-between;gap:.5rem;width:min(100%,16rem); }
  .listen-player { gap:.55rem; }
  .listen-now { display:grid;gap:.15rem;justify-items:center; }
  .listen-now p { font-family:'DM Serif Display',serif;font-size:1.25rem;font-weight:400; }
  .listen-wave { position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:center;gap:.18rem;width:2.25rem;height:1.9rem;padding:.4rem .45rem;border-radius:999px;background:rgba(255,253,247,.86); }
  .listen-wave span { width:.24rem;height:100%;border-radius:999px;background:#a45e38;transform:scaleY(.32);transform-origin:bottom;animation:listen-level 1s ease-in-out infinite alternate;animation-delay:calc(var(--bar) * -.17s);animation-play-state:paused; }
  .listen-wave span:nth-child(2) { height:74%; }
  .listen-wave span:nth-child(3) { height:92%; }
  .listen-wave span:nth-child(4) { height:64%; }
  .listen-art.playing .listen-wave span { animation-play-state:running; }
  .listen-seek { width:100%;accent-color:#a45e38;cursor:pointer; }
  .listen-time { display:flex;justify-content:space-between;width:100%;color:#596477;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;font-variant-numeric:tabular-nums; }
  .listen-controls { display:flex;align-items:center;justify-content:center;gap:.55rem;margin-top:.15rem; }
  .listen-control { display:grid;place-items:center;width:2.5rem;height:2.5rem;padding:0;border:1px solid rgba(23,42,69,.25);border-radius:50%;background:transparent;color:#a45e38;cursor:pointer;transition:transform .15s var(--play-ease),background .15s ease; }
  .listen-control:active { transform:scale(.94); }
  .listen-control :global(svg) { width:1.2rem;height:1.2rem; }
  .listen-control-main { width:3.5rem;height:3.5rem;border-color:#172a45;background:#172a45;color:#fffdf7;box-shadow:3px 3px 0 #e6a527; }
  .listen-control-main :global(svg) { width:1.7rem;height:1.7rem; }
  .listen-control:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .listen-history { display:grid;gap:.5rem;padding:.1rem 0 .5rem; }
  .listen-history-head { display:flex;align-items:center;justify-content:space-between;gap:.5rem; }
  .listen-history h2 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:1.15rem;font-weight:400; }
  .listen-new { flex:none; }
  .listen-history ul { display:grid;gap:.4rem;margin:0;padding:0;list-style:none; }
  .listen-history-item { display:flex;align-items:center;gap:.55rem;width:100%;padding:.55rem .65rem;border:1px solid rgba(23,42,69,.2);border-radius:.9rem;background:#fffdf7;text-align:start;cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease,transform .15s var(--play-ease); }
  .listen-history-item:active { transform:scale(.995); }
  .listen-history-item:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  .listen-history li.current .listen-history-item { border-color:#e6a527;box-shadow:2px 2px 0 rgba(230,165,39,.35); }
  .listen-history-art { position:relative;display:grid;place-items:center;flex:none;width:2rem;height:2rem;overflow:hidden;border-radius:50%;background:#f7e2b0;color:#a45e38; }
  .listen-history-art.has-scene { border:1px solid rgba(23,42,69,.2);background:#cfe6f2; }
  .listen-history-bg { position:absolute;inset:0; }
  .listen-history-bg :global(.story-scene) { position:absolute;inset:0;width:100%;height:100%; }
  .listen-history-bg :global(.story-scene *) { animation-play-state:paused; }
  .listen-history-art > :global(svg) { width:1rem;height:1rem; }
  .listen-history-text { display:grid;gap:.1rem;min-width:0;flex:1; }
  .listen-history-text strong { overflow:hidden;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.74rem;font-weight:800;line-height:1.2;text-overflow:ellipsis;white-space:nowrap; }
  .listen-history-text small { overflow:hidden;color:#596477;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:700;text-overflow:ellipsis;white-space:nowrap; }
  .listen-history-at { flex:none;color:#596477;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:800;font-variant-numeric:tabular-nums; }
  .listen-mini-wave { position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:center;gap:.1rem;height:.9rem;padding:.25rem .35rem;border-radius:999px;background:rgba(255,253,247,.86); }
  .listen-mini-wave span { width:.15rem;height:100%;border-radius:999px;background:#a45e38;transform:scaleY(.35);transform-origin:bottom;animation:listen-level .9s ease-in-out infinite alternate;animation-delay:calc(var(--bar) * -.2s); }
  @keyframes listen-pulse { 0%,100% { transform:scale(1);box-shadow:0 0 0 0 rgba(230,165,39,.32); } 50% { transform:scale(1.035);box-shadow:0 0 0 .55rem rgba(230,165,39,0); } }
  @keyframes listen-walk { 0%,8% { left:4%;transform:scaleX(1); } 46% { left:calc(100% - 4rem);transform:scaleX(1); } 50%,58% { left:calc(100% - 4rem);transform:scaleX(-1); } 96%,100% { left:4%;transform:scaleX(-1); } }
  @keyframes listen-bob { from { transform:translateY(0) rotate(-2deg); } to { transform:translateY(-2px) rotate(2deg); } }
  @keyframes listen-level { from { transform:scaleY(.28); } to { transform:scaleY(1); } }
  @media (prefers-reduced-motion:reduce) { .listen-pulse,.listen-wave span,.listen-mini-wave span { animation:none; } .listen-walker { animation:none;left:38%; } .listen-walker :global(.story-character) { animation:none; } .listen-control,.listen-bar span,.listen-history-item { transition:none; } }
  :global(html.dark) .listen-header h1,:global(html.dark) .listen-history h2 { color:#fffdf7; }
  :global(html.dark) .listen-state,:global(html.dark) .listen-player { border-color:rgba(255,253,247,.36);background:#213a5d; }
  :global(html.dark) .listen-state p,:global(html.dark) .listen-now p { color:#fffdf7; }
  :global(html.dark) .listen-state small,:global(html.dark) .listen-time { color:rgba(255,253,247,.72); }
  :global(html.dark) .listen-art { border-color:#e6a527;background:#2b4a70;color:#e6a527; }
  :global(html.dark) .listen-wave { background:rgba(23,42,69,.86); }
  :global(html.dark) .listen-wave span,:global(html.dark) .listen-mini-wave span { background:#e6a527; }
  :global(html.dark) .listen-bar { background:rgba(255,253,247,.16); }
  :global(html.dark) .listen-control { border-color:rgba(255,253,247,.32);color:#e6a527; }
  :global(html.dark) .listen-control-main { border-color:#e6a527;background:#e6a527;color:#172a45;box-shadow:3px 3px 0 #0b1626; }
  :global(html.dark) .listen-history-item { border-color:rgba(255,253,247,.26);background:#213a5d; }
  :global(html.dark) .listen-history li.current .listen-history-item { border-color:#e6a527;box-shadow:2px 2px 0 rgba(230,165,39,.25); }
  :global(html.dark) .listen-history-art { background:#2b4a70;color:#e6a527; }
  :global(html.dark) .listen-mini-wave { background:rgba(23,42,69,.86); }
  :global(html.dark) .listen-history-text strong { color:#fffdf7; }
  :global(html.dark) .listen-history-text small,:global(html.dark) .listen-history-at { color:rgba(255,253,247,.72); }
</style>
