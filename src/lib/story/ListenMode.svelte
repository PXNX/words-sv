<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { goto } from '$app/navigation';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { fillName, moodFor, storiesFor, withDetails, withWeather, type Mood, type Story } from './stories';
  import { pronounceable } from './speech';
  import { naturalReady, naturalState, naturalSupported, prepareNatural, synthesizeNatural, combineNatural, type NaturalClip } from './naturalVoices.svelte';
  import type { Speaker } from './voices';
  import { listAudioSessions, loadAudioBlob, saveAudioSession, updateAudioSessionPosition, type SavedAudio, type SavedStoryStart } from './audioLibrary';
  import { splitSounds } from './speech';
  import { playSoundEffect } from '#lib/sounds.js';
  import StoryCharacter from './StoryCharacter.svelte';
  import IconHeadphones from '~icons/material-symbols/headphones-rounded';
  import IconPlay from '~icons/material-symbols/play-arrow-rounded';
  import IconPause from '~icons/material-symbols/pause-rounded';
  import IconRewind from '~icons/material-symbols/fast-rewind-rounded';
  import IconForward from '~icons/material-symbols/fast-forward-rounded';
  import IconReplay from '~icons/material-symbols/replay-rounded';

  const TARGET_WORDS = 375;
  const BEAT_GAP = 0.32;
  const STORY_GAP = 1.1;
  const levelRates: Record<string, number> = { a1: 0.9, a2: 0.95, b1: 1.03, b2: 1.07, c1: 1.11, c2: 1.15 };
  const naturalLevelPace: Record<string, number> = { a1: 0.9, a2: 0.95, b1: 1, b2: 1, c1: 1, c2: 1 };

  type Phase = 'idle' | 'preparing' | 'generating' | 'loading' | 'ready' | 'error';
  type Segment = { text: string; speaker: Speaker; mood: Mood; gap: number; story: number };

  let phase = $state<Phase>('idle');
  let progress = $state(0);
  let done = $state(0);
  let total = $state(0);
  let error = $state('');
  let storyStarts = $state<SavedStoryStart[]>([]);
  let storyCount = $state(0);
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
    resume: m.story_listen_continue({}, { locale: settings.interfaceLocale }),
    play: m.home_play({}, { locale: settings.interfaceLocale }),
    again: m.learning_again({}, { locale: settings.interfaceLocale }),
    continue: m.continue({}, { locale: settings.interfaceLocale }),
    unsupported: m.learning_speech_unavailable({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const currentStory = $derived(storyStarts.filter((entry) => entry.at <= position + 0.05).at(-1)?.title ?? storyStarts[0]?.title ?? labels.listen);
  const resumeSession = $derived(history.find((session) => session.position > 0.5 && session.position < session.duration - 1) ?? null);
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
  // Picks stories around a 1.5-2 minute listening session: the best single match first, then shorter
  // stories only when the level has nothing long enough.
  function pickStories(): Story[] {
    const pool = [...new Map(storiesFor(settings.lang, settings.vocabularyLevel, settings.includeLowerVocabulary).map((story) => [story.id, story])).values()];
    if (!pool.length) return [];
    const order = shuffled(pool);
    const [first] = [...order].sort((left, right) => Math.abs(wordCount(left) - TARGET_WORDS) - Math.abs(wordCount(right) - TARGET_WORDS));
    if (!first) return [];
    const picked = [first];
    let words = wordCount(first);
    for (const story of order) {
      if (picked.includes(story) || words >= TARGET_WORDS * 0.85) continue;
      if (words + wordCount(story) > TARGET_WORDS * 1.6) continue;
      picked.push(story);
      words += wordCount(story);
    }
    if (picked.length === 1 && wordCount(picked[0]) < 220) {
      for (const story of order) {
        if (picked.includes(story)) continue;
        if (wordCount(picked[0]) + wordCount(story) > TARGET_WORDS * 1.8) continue;
        picked.push(story);
        break;
      }
    }
    return picked;
  }
  function beatSounds(beat: any): { start: any; slot: any } {
    if (beat.kind === 'narration' && beat.announcement) return { start: beat.sfx ?? 'gong', slot: beat.sfx ?? null };
    if (beat.kind === 'narration') return { start: beat.sfx ?? null, slot: beat.sfx ?? null };
    if (beat.kind !== 'line') return { start: null, slot: null };
    const petSounds: any = { lilith: { slot: 'meow', start: 'purr' }, bello: { slot: 'bark', start: 'bark' }, bird: { slot: 'tweet', start: 'tweet' }, cow: { slot: 'moo', start: 'moo' }, horse: { slot: 'neigh', start: 'neigh' }, giraffe: { slot: 'hum', start: 'hum' }, elephant: { slot: 'trumpet', start: 'trumpet' }, snake: { slot: 'hiss', start: 'hiss' } };
    const pet = petSounds[beat.speaker];
    return { start: beat.sfx ?? pet?.start ?? null, slot: beat.sfx ?? pet?.slot ?? null };
  }
  function beatSound(beat: any): any {
    if (beat.kind !== 'narration' && beat.kind !== 'line') return null;
    const sounds = beatSounds(beat);
    if (splitSounds(beat.text[settings.lang], settings.lang).some((part: any) => part.kind === 'sound')) return sounds.slot;
    return sounds.start;
  }
    const levelLabel = m.vocabulary({}, { locale: settings.interfaceLocale });
    const segments: Segment[] = [];
    picked.forEach((raw, index) => {
      const story = withWeather(withDetails(raw));
      const title = `${say(story.title[settings.lang])}.`;
      segments.push({
        text: index === 0 ? `${title} ${levelLabel} ${story.level.toUpperCase()}.` : title,
        speaker: 'narrator',
        mood: 'neutral',
        gap: 0.55,
        story: index
      });
      for (const beat of story.beats) {
        if (beat.kind === 'narration') segments.push({ text: say(beat.text[settings.lang]), speaker: 'narrator', mood: 'neutral', gap: BEAT_GAP, story: index });
        else if (beat.kind === 'line') segments.push({ text: say(beat.text[settings.lang]), speaker: beat.speaker, mood: moodFor(beat), gap: BEAT_GAP, story: index });
      }
      const last = segments.at(-1);
      if (last?.story === index) last.gap = STORY_GAP;
    });
    return segments.filter((segment) => /\p{L}/u.test(segment.text));
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
    currentId = '';
    const current = audio;
    current?.pause();
    playing = false;
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
    if (!naturalSupported()) { phase = 'error'; error = labels.unsupported; return; }
    const picked = pickStories();
    if (!picked.length) { phase = 'error'; error = 'No stories are available for this level yet.'; return; }
    await prepareNatural(settings.lang);
    if (token !== generation) return;
    if (!naturalReady(settings.lang)) { phase = 'error'; error = labels.unsupported; return; }
    phase = 'generating';
    const segments = segmentsFor(picked);
    total = segments.length;
    const clips: NaturalClip[] = [];
    const gaps: number[] = [];
    const starts: { at: number; story: Story }[] = [];
    const rate = (levelRates[settings.vocabularyLevel] ?? 1) * (naturalLevelPace[settings.vocabularyLevel] ?? 1);
    const startedAt = performance.now();
    let at = 0;
    let previousStory = -1;
    try {
      for (const [index, segment] of segments.entries()) {
        if (token !== generation) return;
        if (segment.story !== previousStory) {
          starts.push({ at, story: picked[segment.story] });
          previousStory = segment.story;
        }
        const clip = await synthesizeNatural(pronounceable(segment.text, settings.lang).text, segment.speaker, segment.mood, picked[segment.story].cast, settings.lang, rate);
        if (token !== generation) return;
        clips.push(clip);
        gaps.push(segment.gap);
        at += clip.buffer.duration / clip.playbackRate + segment.gap;
        done = index + 1;
        progress = done / total;
        const elapsed = (performance.now() - startedAt) / 1000;
        eta = progress > 0 ? Math.max(0, elapsed / progress - elapsed) : null;
      }
      const buffer = await combineNatural(clips, gaps);
      if (token !== generation) return;
      eta = 0;
      const blob = wavBlob(buffer);
      const savedStarts = starts.map(({ at: start, story }) => ({ at: start, title: story.title[settings.lang] }));
      const now = Date.now();
      const saved: SavedAudio = {
        id: newSessionId(),
        createdAt: now,
        updatedAt: now,
        language: settings.lang,
        level: settings.vocabularyLevel,
        duration: buffer.duration,
        position: 0,
        storyCount: picked.length,
        stories: savedStarts
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
      storyCount = picked.length;
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
  function resumeLast() {
    if (resumeSession) void openSession(resumeSession);
  }
  function sessionTitle(session: SavedAudio) {
    return session.stories[0]?.title ?? labels.listen;
  }
  function onLoadedMetadata() {
    if (!audio) return;
    if (Number.isFinite(audio.duration) && audio.duration > 0) duration = audio.duration;
    if (pendingSeek === null) return;
    const target = Math.max(0, Math.min(pendingSeek, duration));
    try {
      audio.currentTime = target;
    } catch {}
    position = target;
    pendingSeek = null;
  }
  function updatePosition() {
    if (!audio || !Number.isFinite(audio.currentTime)) return;
    position = audio.currentTime;
    scheduleSave();
  }
  function togglePlay() {
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => (playing = false));
    else audio.pause();
  }
  function onEnded() {
    playing = false;
    position = duration;
    flushPosition();
    // Play a small chime and generate next story audio
    try {
      const ctx = ensureAudioContext();
      if (ctx && soundEnabled) {
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
      }
    } catch {}
    setTimeout(() => {
      if (phase === 'ready') {
        void startSession();
      }
    }, 600);
  }
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
    position = audio.currentTime;
    lastSavedAt = 0;
    flushPosition();
  }
  function prevTrack() {
    if (!audio || !duration) return;
    // If within first 2 seconds of current audio, go to previous track beginning
    if (position <= 2 && storyStarts.length > 1) {
      const current = storyStarts.filter((entry) => entry.at <= position + 0.05).at(-1);
      const idx = storyStarts.findIndex((s) => s.at === current?.at);
      if (idx > 0) {
        const target = storyStarts[idx - 1].at;
        audio.currentTime = target;
        position = target;
        lastSavedAt = 0;
        flushPosition();
        return;
      }
    }
    if (position <= 2) {
      audio.currentTime = 0;
      position = 0;
      lastSavedAt = 0;
      flushPosition();
      return;
    }
    audio.currentTime = 0;
    position = 0;
    lastSavedAt = 0;
    flushPosition();
  }
  function seek(event: Event) {
    if (!audio) return;
    const value = Number((event.currentTarget as HTMLInputElement).value);
    audio.currentTime = value;
    position = value;
    lastSavedAt = 0;
    flushPosition();
  }
  function formatTime(seconds: number) {
    const whole = Math.max(0, Math.round(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }
  $effect(() => {
    if (!audio) return;
    // Make the animated view follow currently playing audio
    playing = !audio.paused;
  });
    return `${settings.lang}|${settings.vocabularyLevel}|${settings.includeLowerVocabulary}`;
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
      if (saved.length) phase = 'idle';
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
    {#if phase === 'idle'}
      <div class="listen-resume" aria-live="polite">
        {#if resumeSession}
          <span class="listen-pulse" aria-hidden="true"><IconHeadphones /></span>
          <p>{labels.resume}</p>
          <strong lang={resumeSession.language}>{sessionTitle(resumeSession)}</strong>
          <small>{formatTime(resumeSession.position)} / {formatTime(resumeSession.duration)}</small>
          <button type="button" class="btn-play btn-play-ink btn-play-sm" onclick={resumeLast}>{labels.continue}</button>
        {:else}
          <span class="listen-pulse" aria-hidden="true"><IconHeadphones /></span>
          <p>{labels.listen}</p>
          <button type="button" class="btn-play btn-play-ink btn-play-sm" onclick={startSession}>{labels.newAudio}</button>
        {/if}
      </div>
    {:else if phase === 'preparing'}
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
    {:else}
      <div class="listen-player">
        <span class="listen-art" class:playing aria-hidden="true">
          <span class="listen-wave">{#each [0, 1, 2, 3, 4] as bar (bar)}<span style={`--bar:${bar}`}></span>{/each}</span>
        </span>
        <div class="listen-now">
          <p lang={settings.lang}>{currentStory}</p>
          <small>{storyCount} · {formatTime(duration)}</small>
        </div>
        <input class="listen-seek" type="range" min="0" max={duration} step="0.1" value={position} oninput={seek} aria-label={labels.listen} />
        <div class="listen-time"><span>{formatTime(position)}</span><span>{formatTime(duration)}</span></div>
        <div class="listen-controls">
          <button type="button" class="listen-control" onclick={prevTrack} aria-label="Previous" title="Previous"><IconRewind aria-hidden="true" /></button>
          <button type="button" class="listen-control listen-control-main" onclick={togglePlay} aria-label={playing ? 'Pause' : labels.play} title={playing ? 'Pause' : labels.play}>{#if playing}<IconPause aria-hidden="true" />{:else}<IconPlay aria-hidden="true" />{/if}</button>
          <button type="button" class="listen-control" onclick={() => skip(15)} aria-label="Forward 15 seconds" title="Forward 15 seconds"><IconForward aria-hidden="true" /></button>
        </div>
      </div>
    {/if}
  </div>

  {#if history.length}
    <section class="listen-history" dir={interfaceDirection} lang={settings.interfaceLocale}>
      <div class="listen-history-head">
        <h2>{labels.history}</h2>
        {#if phase !== 'preparing' && phase !== 'generating' && phase !== 'loading'}
          <button type="button" class="btn-play btn-play-sm listen-new" onclick={startSession}>{labels.newAudio}</button>
        {/if}
      </div>
      <ul>
        {#each history as session (session.id)}
          <li class:current={session.id === currentId}>
            <button type="button" class="listen-history-item" onclick={() => void openSession(session)}>
              <span class="listen-history-art" aria-hidden="true">
                {#if session.id === currentId && playing}
                  <span class="listen-mini-wave">{#each [0, 1, 2] as bar (bar)}<span style={`--bar:${bar}`}></span>{/each}</span>
                {:else}
                  <IconHeadphones />
                {/if}
              </span>
              <span class="listen-history-text">
                <strong lang={session.language}>{sessionTitle(session)}</strong>
                <small>{dateFormat.format(session.updatedAt)} · {session.storyCount}</small>
              </span>
              <span class="listen-history-at">{formatTime(session.position)} / {formatTime(session.duration)}</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <audio bind:this={audio} preload="auto" onloadedmetadata={onLoadedMetadata} ontimeupdate={updatePosition} onplay={() => (playing = true)} onpause={() => { playing = false; flushPosition(); }} onended={onEnded}></audio>
</section>

<style>
  .listen-view { flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:.65rem;padding:clamp(.6rem,3vw,1rem) clamp(.7rem,3.4vw,1.2rem) clamp(.7rem,3vw,1rem);overflow-y:auto; }
  .listen-header { display:grid;gap:.2rem;padding-top:.35rem;text-align:center; }
  .listen-header p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase; }
  .listen-header h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.55rem,7vw,2.2rem);font-weight:400;letter-spacing:-.03em;line-height:1; }
  .listen-card { flex:none;display:grid;place-items:center;padding:.4rem 0; }
  .listen-state,.listen-player,.listen-resume { width:min(100%,26rem);display:grid;justify-items:center;gap:.65rem;padding:clamp(1.25rem,6vw,2rem);border:1px solid rgba(23,42,69,.22);border-radius:1.15rem;background:#fffdf7;box-shadow:0 8px 20px rgba(23,42,69,.08);text-align:center; }
  .listen-state p,.listen-now p { margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:800;line-height:1.4; }
  .listen-state small,.listen-now small,.listen-resume small { color:#596477;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:800; }
  .listen-resume { gap:.45rem; }
  .listen-resume strong { color:#172a45;font-family:'DM Serif Display',serif;font-size:1.25rem;font-weight:400;line-height:1.1; }
  .listen-pulse,.listen-art { display:grid;place-items:center;width:4.4rem;height:4.4rem;border:2px solid #172a45;border-radius:48% 52% 46% 54% / 54% 46% 52% 48%;background:#f7e2b0;color:#a45e38; }
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
  .listen-wave { display:flex;align-items:flex-end;justify-content:center;gap:.18rem;width:2.25rem;height:1.9rem; }
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
  .listen-history-art { display:grid;place-items:center;flex:none;width:2rem;height:2rem;border-radius:50%;background:#f7e2b0;color:#a45e38; }
  .listen-history-art :global(svg) { width:1rem;height:1rem; }
  .listen-history-text { display:grid;gap:.1rem;min-width:0;flex:1; }
  .listen-history-text strong { overflow:hidden;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.74rem;font-weight:800;line-height:1.2;text-overflow:ellipsis;white-space:nowrap; }
  .listen-history-text small { overflow:hidden;color:#596477;font-family:'DM Sans',sans-serif;font-size:.56rem;font-weight:700;text-overflow:ellipsis;white-space:nowrap; }
  .listen-history-at { flex:none;color:#596477;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:800;font-variant-numeric:tabular-nums; }
  .listen-mini-wave { display:flex;align-items:flex-end;justify-content:center;gap:.1rem;height:.9rem; }
  .listen-mini-wave span { width:.15rem;height:100%;border-radius:999px;background:#a45e38;transform:scaleY(.35);transform-origin:bottom;animation:listen-level .9s ease-in-out infinite alternate;animation-delay:calc(var(--bar) * -.2s); }
  @keyframes listen-pulse { 0%,100% { transform:scale(1);box-shadow:0 0 0 0 rgba(230,165,39,.32); } 50% { transform:scale(1.035);box-shadow:0 0 0 .55rem rgba(230,165,39,0); } }
  @keyframes listen-walk { 0%,8% { left:4%;transform:scaleX(1); } 46% { left:calc(100% - 4rem);transform:scaleX(1); } 50%,58% { left:calc(100% - 4rem);transform:scaleX(-1); } 96%,100% { left:4%;transform:scaleX(-1); } }
  @keyframes listen-bob { from { transform:translateY(0) rotate(-2deg); } to { transform:translateY(-2px) rotate(2deg); } }
  @keyframes listen-level { from { transform:scaleY(.28); } to { transform:scaleY(1); } }
  @media (prefers-reduced-motion:reduce) { .listen-pulse,.listen-wave span,.listen-mini-wave span { animation:none; } .listen-walker { animation:none;left:38%; } .listen-walker :global(.story-character) { animation:none; } .listen-control,.listen-bar span,.listen-history-item { transition:none; } }
  :global(html.dark) .listen-header h1,:global(html.dark) .listen-history h2 { color:#fffdf7; }
  :global(html.dark) .listen-state,:global(html.dark) .listen-player,:global(html.dark) .listen-resume { border-color:rgba(255,253,247,.36);background:#213a5d; }
  :global(html.dark) .listen-state p,:global(html.dark) .listen-now p,:global(html.dark) .listen-resume strong { color:#fffdf7; }
  :global(html.dark) .listen-state small,:global(html.dark) .listen-time,:global(html.dark) .listen-resume small { color:rgba(255,253,247,.72); }
  :global(html.dark) .listen-art { border-color:#e6a527;background:#2b4a70;color:#e6a527; }
  :global(html.dark) .listen-wave span,:global(html.dark) .listen-mini-wave span { background:#e6a527; }
  :global(html.dark) .listen-bar { background:rgba(255,253,247,.16); }
  :global(html.dark) .listen-control { border-color:rgba(255,253,247,.32);color:#e6a527; }
  :global(html.dark) .listen-control-main { border-color:#e6a527;background:#e6a527;color:#172a45;box-shadow:3px 3px 0 #0b1626; }
  :global(html.dark) .listen-history-item { border-color:rgba(255,253,247,.26);background:#213a5d; }
  :global(html.dark) .listen-history li.current .listen-history-item { border-color:#e6a527;box-shadow:2px 2px 0 rgba(230,165,39,.25); }
  :global(html.dark) .listen-history-art { background:#2b4a70;color:#e6a527; }
  :global(html.dark) .listen-history-text strong { color:#fffdf7; }
  :global(html.dark) .listen-history-text small,:global(html.dark) .listen-history-at { color:rgba(255,253,247,.72); }
</style>
