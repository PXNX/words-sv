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
  import StoryModeSwitch from './StoryModeSwitch.svelte';
  import IconHeadphones from '~icons/material-symbols/headphones-rounded';
  import IconGraphicEq from '~icons/material-symbols/graphic-eq-rounded';
  import IconPlay from '~icons/material-symbols/play-arrow-rounded';
  import IconPause from '~icons/material-symbols/pause-rounded';
  import IconRewind from '~icons/material-symbols/fast-rewind-rounded';
  import IconForward from '~icons/material-symbols/fast-forward-rounded';
  import IconReplay from '~icons/material-symbols/replay-rounded';

  const TARGET_WORDS = 275;
  const BEAT_GAP = 0.32;
  const STORY_GAP = 1.1;
  const levelRates: Record<string, number> = { a1: 0.9, a2: 0.95, b1: 1.03, b2: 1.07, c1: 1.11, c2: 1.15 };
  const naturalLevelPace: Record<string, number> = { a1: 0.9, a2: 0.95, b1: 1, b2: 1, c1: 1, c2: 1 };

  type Phase = 'preparing' | 'generating' | 'ready' | 'error';
  type Segment = { text: string; speaker: Speaker; mood: Mood; gap: number; story: number };

  let phase = $state<Phase>('preparing');
  let progress = $state(0);
  let done = $state(0);
  let total = $state(0);
  let error = $state('');
  let sessionStories = $state<Story[]>([]);
  let storyStarts = $state<{ at: number; story: Story }[]>([]);
  let audio: HTMLAudioElement | null = null;
  let audioUrl = '';
  let duration = $state(0);
  let position = $state(0);
  let playing = $state(false);
  let generation = 0;

  const download = $derived(Math.round((naturalState.progress[settings.lang] ?? 0) * 100));
  const labels = $derived({
    listen: m.story_listen({}, { locale: settings.interfaceLocale }),
    level: m.vocabulary({}, { locale: settings.interfaceLocale }),
    download: m.voice_quality_loading({ percent: String(download) }, { locale: settings.interfaceLocale }),
    play: m.home_play({}, { locale: settings.interfaceLocale }),
    again: m.learning_again({}, { locale: settings.interfaceLocale }),
    unsupported: m.learning_speech_unavailable({}, { locale: settings.interfaceLocale })
  });
  const interfaceDirection = $derived(getTextDirection(settings.interfaceLocale));
  const currentStory = $derived(storyStarts.filter((entry) => entry.at <= position + 0.05).at(-1)?.story ?? storyStarts[0]?.story ?? sessionStories[0] ?? null);

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
  // Picks stories around a two-minute listening session: the best single match first, then shorter
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
      if (picked.includes(story) || words >= TARGET_WORDS * 0.8) continue;
      if (words + wordCount(story) > TARGET_WORDS * 1.35) continue;
      picked.push(story);
      words += wordCount(story);
    }
    return picked;
  }
  function segmentsFor(picked: Story[]): Segment[] {
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
  function clearAudio() {
    audio?.pause();
    playing = false;
    position = 0;
    duration = 0;
    storyStarts = [];
    if (audio) {
      audio.removeAttribute('src');
      audio.load();
    }
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    audioUrl = '';
  }
  async function startSession() {
    const token = ++generation;
    clearAudio();
    sessionStories = [];
    error = '';
    progress = 0;
    done = 0;
    total = 0;
    phase = 'preparing';
    if (!settings.firstName) { void goto('/', { replace: true }); return; }
    if (!naturalSupported()) { phase = 'error'; error = labels.unsupported; return; }
    const picked = pickStories();
    if (!picked.length) { phase = 'error'; error = 'No stories are available for this level yet.'; return; }
    sessionStories = picked;
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
      }
      const buffer = await combineNatural(clips, gaps);
      if (token !== generation) return;
      audioUrl = URL.createObjectURL(wavBlob(buffer));
      duration = buffer.duration;
      storyStarts = starts;
      progress = 1;
      phase = 'ready';
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
  function updatePosition() {
    if (!audio || !Number.isFinite(audio.currentTime)) return;
    position = audio.currentTime;
  }
  function togglePlay() {
    if (!audio) return;
    if (audio.paused) void audio.play().catch(() => (playing = false));
    else audio.pause();
  }
  function skip(seconds: number) {
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
    updatePosition();
  }
  function replay() {
    if (!audio) return;
    audio.currentTime = 0;
    position = 0;
    void audio.play().catch(() => (playing = false));
  }
  function seek(event: Event) {
    if (!audio) return;
    const value = Number((event.currentTarget as HTMLInputElement).value);
    audio.currentTime = value;
    position = value;
  }
  function formatTime(seconds: number) {
    const whole = Math.max(0, Math.round(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  }

  $effect(() => {
    settings.lang;
    settings.vocabularyLevel;
    settings.includeLowerVocabulary;
    untrack(() => void startSession());
  });
  onMount(() => {
    if (!settings.firstName) void goto('/', { replace: true });
    return () => {
      generation += 1;
      audio?.pause();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  });
</script>

<section class="listen-view" aria-label={labels.listen}>
  <StoryModeSwitch mode="listen" />
  <header class="listen-header" dir={interfaceDirection} lang={settings.interfaceLocale}>
    <p>{labels.listen} · {settings.vocabularyLevel.toUpperCase()}</p>
    <h1 lang={settings.lang}>{phase === 'ready' ? currentStory?.title[settings.lang] ?? labels.listen : labels.listen}</h1>
  </header>

  <div class="listen-card">
    {#if phase === 'preparing'}
      <div class="listen-state" aria-live="polite">
        <span class="listen-pulse" aria-hidden="true"><IconHeadphones /></span>
        <p>{labels.download}</p>
        <div class="listen-bar"><span style={`width:${download}%`}></span></div>
      </div>
    {:else if phase === 'generating'}
      <div class="listen-state" aria-live="polite">
        <span class="listen-pulse" aria-hidden="true"><IconGraphicEq /></span>
        <p>Audio · {Math.round(progress * 100)} %</p>
        <div class="listen-bar"><span style={`width:${progress * 100}%`}></span></div>
        <small>{done} / {total}</small>
      </div>
    {:else if phase === 'error'}
      <div class="listen-state" aria-live="polite">
        <span class="listen-pulse" aria-hidden="true"><IconHeadphones /></span>
        <p>{error}</p>
        <button type="button" class="btn-play btn-play-ink btn-play-sm" onclick={startSession}>{labels.again}</button>
      </div>
    {:else}
      <div class="listen-player">
        <span class="listen-art" aria-hidden="true"><IconGraphicEq /></span>
        <div class="listen-now">
          <p>{currentStory?.title[settings.lang] ?? labels.listen}</p>
          <small>{sessionStories.length} · {formatTime(duration)}</small>
        </div>
        <input class="listen-seek" type="range" min="0" max={duration} step="0.1" value={position} oninput={seek} aria-label={labels.listen} />
        <div class="listen-time"><span>{formatTime(position)}</span><span>{formatTime(duration)}</span></div>
        <div class="listen-controls">
          <button type="button" class="listen-control" onclick={() => skip(-15)} aria-label="Rewind 15 seconds" title="Rewind 15 seconds"><IconRewind aria-hidden="true" /></button>
          <button type="button" class="listen-control listen-control-main" onclick={togglePlay} aria-label={playing ? 'Pause' : labels.play} title={playing ? 'Pause' : labels.play}>{#if playing}<IconPause aria-hidden="true" />{:else}<IconPlay aria-hidden="true" />{/if}</button>
          <button type="button" class="listen-control" onclick={() => skip(15)} aria-label="Forward 15 seconds" title="Forward 15 seconds"><IconForward aria-hidden="true" /></button>
          <button type="button" class="listen-control" onclick={replay} aria-label={labels.again} title={labels.again}><IconReplay aria-hidden="true" /></button>
        </div>
      </div>
    {/if}
  </div>

  <audio bind:this={audio} preload="auto" ontimeupdate={updatePosition} onplay={() => (playing = true)} onpause={() => (playing = false)} onended={() => { playing = false; position = duration; }}></audio>
</section>

<style>
  .listen-view { flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:.65rem;padding:clamp(.6rem,3vw,1rem) clamp(.7rem,3.4vw,1.2rem) clamp(.7rem,3vw,1rem);overflow-y:auto; }
  .listen-header { display:grid;gap:.2rem;padding-top:.35rem;text-align:center; }
  .listen-header p { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase; }
  .listen-header h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.55rem,7vw,2.2rem);font-weight:400;letter-spacing:-.03em;line-height:1; }
  .listen-card { flex:1 1 auto;min-height:0;display:grid;place-items:center;padding:.4rem 0; }
  .listen-state,.listen-player { width:min(100%,26rem);display:grid;justify-items:center;gap:.65rem;padding:clamp(1.25rem,6vw,2rem);border:1px solid rgba(23,42,69,.22);border-radius:1.15rem;background:#fffdf7;box-shadow:0 8px 20px rgba(23,42,69,.08);text-align:center; }
  .listen-state p,.listen-now p { margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.82rem;font-weight:800;line-height:1.4; }
  .listen-state small,.listen-now small { color:#596477;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:800; }
  .listen-pulse,.listen-art { display:grid;place-items:center;width:4.4rem;height:4.4rem;border:2px solid #172a45;border-radius:48% 52% 46% 54% / 54% 46% 52% 48%;background:#f7e2b0;color:#a45e38; }
  .listen-pulse { animation:listen-pulse 1.8s ease-in-out infinite; }
  .listen-pulse :global(svg),.listen-art :global(svg) { width:2rem;height:2rem; }
  .listen-bar { width:min(100%,16rem);height:.42rem;overflow:hidden;border-radius:999px;background:rgba(23,42,69,.12); }
  .listen-bar span { display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#e6a527,#a45e38);transition:width .2s ease; }
  .listen-player { gap:.55rem; }
  .listen-now { display:grid;gap:.15rem;justify-items:center; }
  .listen-now p { font-family:'DM Serif Display',serif;font-size:1.25rem;font-weight:400; }
  .listen-seek { width:100%;accent-color:#a45e38;cursor:pointer; }
  .listen-time { display:flex;justify-content:space-between;width:100%;color:#596477;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;font-variant-numeric:tabular-nums; }
  .listen-controls { display:flex;align-items:center;justify-content:center;gap:.55rem;margin-top:.15rem; }
  .listen-control { display:grid;place-items:center;width:2.5rem;height:2.5rem;padding:0;border:1px solid rgba(23,42,69,.25);border-radius:50%;background:transparent;color:#a45e38;cursor:pointer;transition:transform .15s var(--play-ease),background .15s ease; }
  .listen-control:active { transform:scale(.94); }
  .listen-control :global(svg) { width:1.2rem;height:1.2rem; }
  .listen-control-main { width:3.5rem;height:3.5rem;border-color:#172a45;background:#172a45;color:#fffdf7;box-shadow:3px 3px 0 #e6a527; }
  .listen-control-main :global(svg) { width:1.7rem;height:1.7rem; }
  .listen-control:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  @keyframes listen-pulse { 0%,100% { transform:scale(1);box-shadow:0 0 0 0 rgba(230,165,39,.32); } 50% { transform:scale(1.035);box-shadow:0 0 0 .55rem rgba(230,165,39,0); } }
  @media (prefers-reduced-motion:reduce) { .listen-pulse { animation:none; } .listen-control,.listen-bar span { transition:none; } }
  :global(html.dark) .listen-header h1 { color:#fffdf7; }
  :global(html.dark) .listen-state,:global(html.dark) .listen-player { border-color:rgba(255,253,247,.36);background:#213a5d; }
  :global(html.dark) .listen-state p,:global(html.dark) .listen-now p { color:#fffdf7; }
  :global(html.dark) .listen-state small,:global(html.dark) .listen-time { color:rgba(255,253,247,.72); }
  :global(html.dark) .listen-art { border-color:#e6a527;background:#2b4a70;color:#e6a527; }
  :global(html.dark) .listen-bar { background:rgba(255,253,247,.16); }
  :global(html.dark) .listen-control { border-color:rgba(255,253,247,.32);color:#e6a527; }
  :global(html.dark) .listen-control-main { border-color:#e6a527;background:#e6a527;color:#172a45;box-shadow:3px 3px 0 #0b1626; }
</style>
