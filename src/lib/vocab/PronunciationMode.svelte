<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordDefinitions, wordMetadata } from '#lib/data/vocabulary.js';
  import { transcribeToIpa } from '#lib/vocab/ipa.js';
  import { evaluateAttempt, ipaDiff, type CorrectionSegment } from '#lib/vocab/speechMatch.js';
  import { wiktionaryUrl } from '#lib/wiktionary.js';
  import { recordReview } from '#lib/review/ledger.js';
  import { recordMissedWord } from '#lib/story/missedWords.js';
  import { playSuccessSound } from '#lib/sounds.js';
  import { pronounceable } from '#lib/story/speech.js';
  import { naturalReady, naturalSupported, playNatural, prepareNatural, synthesizeNatural } from '#lib/story/naturalVoices.svelte.js';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import IconMic from '~icons/material-symbols/mic-rounded';
  import IconMicOff from '~icons/material-symbols/mic-off-rounded';
  import IconHelp from '~icons/material-symbols/question-mark-rounded';

  type SpeechRecognitionResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
  type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResult> };
  type SpeechRecognitionLike = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    onsoundstart: (() => void) | null;
    onsoundend: (() => void) | null;
  };
  type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

  const BAR_COUNT = 20;
  const IDLE_LEVEL = 0.14;

  let { words }: { words: string[] } = $props();
  let currentWord = $state('');
  let speechSupported = $state(false);
  let naturalAvailable = $state(false);
  let micSupported = $state(false);
  let recognitionSupported = $state(false);
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let showDefinition = $state(false);
  let speaking = $state(false);
  let listening = $state(false);
  // `liveHeard` follows interim results while the learner is talking; `heard`, `heardIpa` and
  // `correction` only change on a final result, so the verdict on screen stays consistent.
  let liveHeard = $state('');
  let heard = $state('');
  let heardIpa = $state('');
  let matchState = $state<'idle' | 'correct' | 'incorrect'>('idle');
  let correction = $state<CorrectionSegment[] | null>(null);
  let recognitionStalled = $state(false);
  // The browser refused to start the recogniser without a tap (iOS Safari outside a user gesture).
  let recognitionNeedsTap = $state(false);
  // Mobile browsers (Android Chrome, iOS Safari) can't share the microphone between getUserMedia and
  // SpeechRecognition: while the waveform stream holds it, the recogniser hears nothing. There the
  // recogniser gets the mic to itself and the waveform animates from its sound events instead.
  let exclusiveMic = $state(false);
  let hearingSound = $state(false);
  let waveform = $state<number[]>(Array(BAR_COUNT).fill(IDLE_LEVEL));
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animationFrame: number | null = null;
  let recognition: SpeechRecognitionLike | null = null;
  let restartTimer: number | null = null;
  // Bumped on every start/stop so an in-flight getUserMedia from a previous word can tell it's stale.
  let listenSession = 0;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;
  let startedByTap = false;
  // Invalidates an in-flight natural clip when the word changes or another sample starts.
  let speechToken = 0;
  let stopNatural: () => void = () => {};

  const canPlay = $derived(speechSupported || (settings.voiceQuality === 'natural' && naturalAvailable));
  const candidates = $derived([...new Set(words.map((word) => word.toLocaleUpperCase()).filter((word) => Boolean(wordMetadata[settings.lang][word]))) ]);
  const spelling = $derived(currentWord ? wordMetadata[settings.lang][currentWord]?.spelling ?? currentWord : '');
  const definition = $derived(currentWord ? wordDefinitions[settings.lang][currentWord] ?? null : null);
  const ipa = $derived(spelling ? transcribeToIpa(spelling, settings.lang) : '');
  const waveState = $derived(matchState === 'correct' ? 'correct' : matchState === 'incorrect' ? 'incorrect' : speaking ? 'speaking' : listening ? 'listening' : 'idle');

  function speechLocale() {
    return ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[settings.lang] ?? settings.lang;
  }
  function getRecognitionCtor(): SpeechRecognitionCtor | null {
    const globalWindow = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    return globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition ?? null;
  }
  function stopAudio() {
    speechToken += 1;
    stopNatural();
    stopNatural = () => {};
    speaking = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }
  async function speak() {
    if (!canPlay || !currentWord) return;
    stopAudio();
    const token = speechToken;
    speaking = true;
    // The recogniser would otherwise transcribe the sample itself and grade it as the learner's
    // attempt, so pause it while the sample plays and resume once it's finished.
    stopRecognition();
    const resume = () => {
      if (token !== speechToken) return;
      speaking = false;
      if (listening && matchState !== 'correct' && !recognition) startRecognition();
    };
    if (settings.voiceQuality === 'natural' && naturalAvailable) {
      await prepareNatural(settings.lang);
      if (token !== speechToken) return;
      if (naturalReady(settings.lang)) {
        const clip = await synthesizeNatural(pronounceable(spelling, settings.lang).text, 'narrator', 'neutral', [], settings.lang, .9).catch(() => null);
        if (token !== speechToken) return;
        if (clip) {
          const playing = playNatural(clip);
          stopNatural = playing.stop;
          // `done` stays pending when a clip is stopped, so a timer also releases the microphone.
          await Promise.race([playing.done, new Promise<void>((resolve) => window.setTimeout(resolve, playing.seconds * 1000 + 1200))]);
          if (token !== speechToken) return;
          stopNatural = () => {};
          resume();
          return;
        }
      }
    }
    if (!speechSupported) { resume(); return; }
    const utterance = new SpeechSynthesisUtterance(spelling);
    utterance.lang = speechLocale();
    utterance.rate = .72;
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(settings.lang)) ?? voices.find((voice) => voice.default) ?? null;
    utterance.onstart = () => (speaking = true);
    utterance.onend = resume;
    utterance.onerror = resume;
    window.speechSynthesis.speak(utterance);
  }
  function nextWord() {
    showDefinition = false;
    matchState = 'idle';
    liveHeard = '';
    heard = '';
    heardIpa = '';
    correction = null;
    recognitionStalled = false;
    consecutiveErrors = 0;
    currentWord = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
  }
  function clearRestartTimer() {
    if (restartTimer !== null) window.clearTimeout(restartTimer);
    restartTimer = null;
  }
  function stopRecognition() {
    clearRestartTimer();
    const instance = recognition;
    recognition = null;
    // abort() rather than stop(): stop() still delivers a final result for the audio captured so
    // far, which would then be graded against whatever word is current by the time it arrives.
    try { instance?.abort(); } catch { /* already stopped */ }
  }
  function releaseMicStream() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    analyser?.disconnect();
    audioContext?.close();
    audioContext = null;
    analyser = null;
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    waveform = Array(BAR_COUNT).fill(IDLE_LEVEL);
  }
  function stopListening() {
    listenSession += 1;
    listening = false;
    hearingSound = false;
    stopRecognition();
    releaseMicStream();
  }
  function handleResult(event: SpeechRecognitionEventLike) {
    consecutiveErrors = 0;
    recognitionStalled = false;
    const result = event.results[event.results.length - 1];
    if (!result) return;
    const transcripts = Array.from(result, (alternative) => alternative.transcript).filter((transcript) => transcript.trim());
    if (transcripts.length === 0) return;
    const attempt = evaluateAttempt(transcripts, spelling, settings.lang);
    liveHeard = attempt.heard;
    if (!result.isFinal) return;
    heard = attempt.heard;
    heardIpa = heard ? transcribeToIpa(heard, settings.lang) : '';
    matchState = attempt.matched ? 'correct' : 'incorrect';
    correction = attempt.matched || !heardIpa ? null : ipaDiff(heardIpa, ipa);
    if (heard) void settings.recordStreak('pronunciation_practised');
    // A heard attempt lands in the shared ledger; a miss also joins the hard-words list that
    // stories and the Repeat hub draw from.
    if (heard && currentWord) {
      recordReview(settings.lang, currentWord, attempt.matched, 'pronunciation');
      if (!attempt.matched) recordMissedWord(settings.lang, currentWord);
    }
    if (attempt.matched) {
      playSuccessSound(settings.sound, 'pronunciation');
      stopListening();
    } else {
      // Say the word back the right way; speak() pauses the recogniser so it won't grade the sample.
      speak();
    }
  }
  function startRecognition() {
    const RecognitionCtor = recognitionSupported ? getRecognitionCtor() : null;
    if (!RecognitionCtor) return;
    const instance = new RecognitionCtor();
    recognition = instance;
    instance.lang = speechLocale();
    instance.continuous = false;
    instance.interimResults = true;
    instance.maxAlternatives = 5;
    // Every handler checks it still belongs to the active recogniser: events from one that was
    // aborted (next word, sample playback) must not leak into the current attempt.
    instance.onresult = (event) => {
      if (recognition === instance && !speaking) handleResult(event);
    };
    instance.onerror = (event) => {
      if (recognition !== instance) return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        // Without a tap this may just be iOS insisting on a user gesture; after one it's a real block.
        if (startedByTap) {
          recognitionSupported = false;
          stopRecognition();
        } else {
          stopListening();
          recognitionNeedsTap = true;
        }
        return;
      }
      // The waveform stream is holding the mic, so the recogniser can't get at it: hand it over.
      if (event.error === 'audio-capture' && mediaStream) {
        exclusiveMic = true;
        releaseMicStream();
        return;
      }
      // "no-speech" just means the mic heard silence — that's normal while waiting for the learner to talk, not a failure.
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      consecutiveErrors += 1;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) recognitionStalled = true;
    };
    instance.onsoundstart = () => {
      if (recognition === instance) hearingSound = true;
    };
    instance.onsoundend = () => {
      if (recognition === instance) hearingSound = false;
    };
    instance.onend = () => {
      if (recognition === instance) hearingSound = false;
      if (recognition !== instance || !listening || matchState === 'correct') return;
      clearRestartTimer();
      liveHeard = '';
      // Keep retrying even once "stalled" (transient network/service errors happen on their own and
      // shouldn't require the learner to notice and tap "Try again"), just back off so a persistently
      // failing recognizer doesn't hammer in a tight loop.
      const delay = Math.min(350 * 2 ** consecutiveErrors, 5000);
      restartTimer = window.setTimeout(() => {
        if (recognition !== instance) return;
        try { instance.start(); } catch { /* a start() call may already be pending */ }
      }, delay);
    };
    try { instance.start(); } catch { /* ignore duplicate start */ }
  }
  function retryAfterStall() {
    recognitionStalled = false;
    consecutiveErrors = 0;
    stopListening();
    void startListening(true);
  }
  async function startListening(fromTap = false) {
    if (!micSupported || !currentWord) return;
    const session = ++listenSession;
    startedByTap = fromTap;
    recognitionNeedsTap = false;
    if (exclusiveMic && recognitionSupported) {
      listening = true;
      // Started synchronously (no await before it) so a tap still counts as the gesture iOS requires.
      if (!speaking) startRecognition();
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      if (session === listenSession) listening = false;
      return;
    }
    // The word changed (or listening was paused) while the permission prompt was open.
    if (session !== listenSession) { stream.getTracks().forEach((track) => track.stop()); return; }
    mediaStream = stream;
    listening = true;
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    audioContext.createMediaStreamSource(stream).connect(analyser);
    const samples = new Uint8Array(analyser.fftSize);
    const updateWaveform = () => {
      if (!analyser || !listening) return;
      analyser.getByteTimeDomainData(samples);
      waveform = Array.from({ length: BAR_COUNT }, (_, index) => {
        const start = Math.floor(index * samples.length / BAR_COUNT);
        const end = Math.max(start + 1, Math.floor((index + 1) * samples.length / BAR_COUNT));
        const level = samples.slice(start, end).reduce((sum, value) => sum + Math.abs(value - 128), 0) / (end - start);
        const target = Math.max(IDLE_LEVEL, Math.min(1.4, IDLE_LEVEL + level / 42));
        return waveform[index] + (target - waveform[index]) * 0.45;
      });
      animationFrame = requestAnimationFrame(updateWaveform);
    };
    updateWaveform();
    if (!speaking) startRecognition();
  }
  function toggleListening() {
    if (listening) stopListening();
    else void startListening(true);
  }
  onMount(() => {
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    naturalAvailable = naturalSupported();
    micSupported = Boolean(navigator.mediaDevices?.getUserMedia);
    recognitionSupported = Boolean(getRecognitionCtor());
    exclusiveMic = recognitionSupported && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    // The recogniser asks for the mic itself, so getUserMedia isn't required when it owns the mic.
    micSupported = micSupported || exclusiveMic;
    const refreshVoices = () => (voices = window.speechSynthesis.getVoices());
    if (speechSupported) { refreshVoices(); window.speechSynthesis.addEventListener('voiceschanged', refreshVoices); }
    nextWord();
    return () => { stopAudio(); stopListening(); window.speechSynthesis?.removeEventListener('voiceschanged', refreshVoices); };
  });
  $effect(() => {
    // A new language needs its natural voice model, if that quality is selected.
    if (settings.voiceQuality === 'natural') void prepareNatural(settings.lang);
  });
  $effect(() => {
    // Restart listening for every new word so the learner never has to press a button.
    currentWord;
    untrack(() => { stopAudio(); stopListening(); if (currentWord) void startListening(); });
  });
</script>

<section class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-y-auto bg-[color:#ede4d5] dark:bg-[color:#213a5d]" aria-label="Pronunciation practice">
  {#if currentWord}
    <h1 class="m-0 text-center text-base-content font-['DM_Serif_Display'] text-[clamp(1.4rem,6vw,2rem)] font-normal leading-none">Listen & repeat</h1>
    <article class="w-[min(100%,26rem)] grid justify-items-center gap-5 p-[clamp(1.4rem,7vw,2.2rem)] rounded-2xl border border-neutral bg-neutral-content shadow-[0_12px_30px_rgba(23,42,69,.12)]">
      <div class="grid justify-items-center gap-1 text-center">
        <div class="flex items-center gap-[.5rem]">
          <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2rem,10vw,3.3rem)] tracking-[.05em] leading-tight">{spelling}</p>
          <button type="button" class="btn-play btn-play-soft btn-play-round btn-play-sm flex-none" onclick={() => (showDefinition = !showDefinition)} aria-expanded={showDefinition} aria-label={showDefinition ? 'Hide meaning' : 'Show meaning'}><IconHelp aria-hidden="true" /></button>
        </div>
        {#if matchState === 'incorrect' && correction}
          <p class="m-0 text-[.95rem] font-mono tracking-[.03em]" lang={settings.lang} title="Underlined = wrong sound · struck through = missing · + = extra" aria-label={`Correct pronunciation: ${ipa}`}>/{#each correction as segment, index (index)}<span class={segment.status === 'match' ? 'text-accent/80' : segment.status === 'sub' ? 'px-[.05em] rounded-sm bg-error/15 text-error font-bold underline decoration-2 underline-offset-[3px]' : segment.status === 'extra' ? 'text-error/60 text-[.6em] align-super' : 'px-[.05em] rounded-sm bg-error/15 text-error/60 line-through'}>{segment.status === 'extra' ? `+${segment.char}` : segment.char}</span>{/each}/</p>
        {:else if ipa}<p class="m-0 text-accent/80 text-[.85rem] font-mono tracking-[.02em]" lang={settings.lang} aria-label={`International Phonetic Alphabet: ${ipa}`}>/{ipa}/</p>{/if}
        {#if showDefinition}<p class="m-0 mt-[.4rem] max-w-[22rem] text-base-content/70 text-[.72rem] font-bold leading-[1.4]">{definition ?? 'No definition is available for this word yet.'} <a class="text-accent font-extrabold underline underline-offset-2" href={wiktionaryUrl(settings.lang, spelling)} target="_blank" rel="noreferrer">Wiktionary</a></p>{/if}
      </div>

      <div class="flex items-center gap-[.6rem]">
        <button type="button" class="btn-play btn-play-ink btn-play-round flex-none" onclick={speak} disabled={!canPlay} aria-label={speaking ? 'Playing sample' : 'Play audio sample'}><IconVolume aria-hidden="true" /></button>
        <div class={`wave-panel wave-state-${waveState}`} aria-hidden="true">
          {#each waveform as level, index (index)}
            <span class="wave-bar" class:wave-active={speaking || (exclusiveMic && listening && hearingSound)} style={`--wave-delay:${index * 40}ms;--wave-height:${level}rem;`}></span>
          {/each}
        </div>
        {#if micSupported}
          <button type="button" class="wave-toggle" onclick={toggleListening} aria-label={listening ? 'Pause listening' : 'Resume listening'}>
            {#if listening}<IconMic class="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />{:else}<IconMicOff class="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />{/if}
          </button>
        {/if}
      </div>

      <div class="min-h-[2.6rem] grid justify-items-center content-start gap-[.35rem] text-center text-[.7rem] font-extrabold" role="status" aria-live="polite">
        {#if recognitionNeedsTap}
          <button type="button" class="btn-play btn-play-sm" onclick={() => startListening(true)}><IconMic aria-hidden="true" />Tap to start listening</button>
        {:else if recognitionStalled}
          <p class="flex items-center gap-[.35rem] m-0 text-error"><IconMicOff class="w-[1rem] h-[1rem]" aria-hidden="true" />Speech recognition isn't responding.</p>
          <button type="button" class="btn-play btn-play-sm" onclick={retryAfterStall}>Try again</button>
        {:else if matchState === 'correct'}
          <p class="flex items-center gap-[.35rem] m-0 text-success"><IconCheck class="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />Great pronunciation!</p>
        {:else if matchState === 'incorrect'}
          <p class="flex items-center gap-[.35rem] m-0 text-error"><IconClose class="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />Not quite{#if heard} — heard "{heard}"{/if}.</p>
          <p class="m-0 text-base-content/55 font-bold">{speaking ? 'Listen to the correct way…' : correction ? 'The marked sounds were off. Try again.' : 'Try again.'}</p>
        {:else if listening && !recognitionSupported}
          <p class="m-0 text-base-content/50 font-bold">Your speech can't be checked in this browser — use the sample to practise.</p>
        {:else if listening}
          <p class="flex items-center gap-[.35rem] m-0 text-accent"><span class="listening-dot" aria-hidden="true"></span>{liveHeard ? `"${liveHeard}"` : 'Say the word…'}</p>
        {:else if !micSupported}
          <p class="m-0 text-base-content/50 font-bold">Microphone input isn't available in this browser.</p>
        {:else}
          <p class="m-0 text-base-content/50 font-bold">Tap the mic to start listening.</p>
        {/if}
      </div>
    </article>
    <button type="button" class={`btn-play ${matchState === 'correct' ? 'btn-play-go' : 'btn-play-ink'}`} onclick={nextWord}>Next word</button>
  {:else}<p class="text-accent font-bold">No pronunciation words are available.</p>{/if}
</section>

<style>
  .wave-panel { display:flex;align-items:center;justify-content:center;gap:.16rem;width:min(100%,16.5rem);height:2.3rem;padding:0 .8rem;border-radius:999px;border:1px solid rgba(23,42,69,.16);background:rgba(23,42,69,.04);transition:background .25s ease,border-color .25s ease,box-shadow .25s ease; }
  .wave-panel.wave-state-listening { border-color:rgba(23,42,69,.24);background:rgba(94,151,255,.08);box-shadow:0 0 0 3px rgba(94,151,255,.09); }
  .wave-panel.wave-state-speaking { border-color:rgba(230,165,39,.45);background:rgba(230,165,39,.1); }
  .wave-panel.wave-state-correct { border-color:rgba(52,130,77,.5);background:rgba(52,130,77,.12); }
  .wave-panel.wave-state-incorrect { border-color:rgba(181,68,66,.45);background:rgba(181,68,66,.1); }
  .wave-bar { width:.16rem;height:var(--wave-height);min-height:.14rem;border-radius:999px;background:linear-gradient(180deg,#e6a527,#a45e38);transform-origin:center;transition:height .06s linear; }
  .wave-state-listening .wave-bar { background:linear-gradient(180deg,#7fb0ff,#4a72c9); }
  .wave-state-correct .wave-bar { background:linear-gradient(180deg,#6fcf8e,#34824d); }
  .wave-state-incorrect .wave-bar { background:linear-gradient(180deg,#e08a87,#b54442); }
  .wave-bar.wave-active { animation: pronunciation-wave .62s ease-in-out var(--wave-delay) infinite alternate; transition:none; }
  @keyframes pronunciation-wave { from { transform:scaleY(.4); } to { transform:scaleY(1.6); } }
  .wave-toggle { display:grid;place-items:center;width:2.05rem;height:2.05rem;flex:none;border:1px solid rgba(23,42,69,.24);border-radius:50%;background:transparent;color:#a45e38; }
  .wave-toggle:active { transform:scale(.94); }
  .listening-dot { width:.4rem;height:.4rem;border-radius:50%;background:currentColor;animation:listening-pulse 1.1s ease-in-out infinite; }
  @keyframes listening-pulse { 0%,100% { opacity:.35;transform:scale(.85); } 50% { opacity:1;transform:scale(1.15); } }
  @media (prefers-reduced-motion: reduce) { .wave-bar.wave-active { animation:none;transform:scaleY(.8); } .listening-dot { animation:none; } }
  :global(html.dark) .wave-panel { border-color:rgba(255,253,247,.2);background:rgba(255,253,247,.06); }
  :global(html.dark) .wave-toggle { border-color:rgba(255,253,247,.32);color:#e6a527; }
</style>
