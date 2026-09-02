<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { wordMetadata } from '$lib/data/vocabulary';
  import { transcribeToIpa } from '$lib/vocab/ipa';
  import { wordsMatch } from '$lib/vocab/speechMatch';
  import { playSuccessSound } from '$lib/sounds';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import IconMic from '~icons/material-symbols/mic-rounded';
  import IconMicOff from '~icons/material-symbols/mic-off-rounded';

  type SpeechRecognitionResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
  type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResult> };
  type SpeechRecognitionLike = {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start: () => void;
    stop: () => void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
  };
  type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

  const BAR_COUNT = 20;
  const IDLE_LEVEL = 0.14;

  let { words }: { words: string[] } = $props();
  let currentWord = $state('');
  let speechSupported = $state(false);
  let micSupported = $state(false);
  let recognitionSupported = $state(false);
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let practiced = $state(false);
  let speaking = $state(false);
  let listening = $state(false);
  let heard = $state('');
  let matchState = $state<'idle' | 'correct' | 'incorrect'>('idle');
  let waveform = $state<number[]>(Array(BAR_COUNT).fill(IDLE_LEVEL));
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animationFrame: number | null = null;
  let recognition: SpeechRecognitionLike | null = null;
  let stoppedIntentionally = true;

  const candidates = $derived([...new Set(words.map((word) => word.toLocaleUpperCase()).filter((word) => Boolean(wordMetadata[settings.lang][word]))) ]);
  const spelling = $derived(currentWord ? wordMetadata[settings.lang][currentWord]?.spelling ?? currentWord : '');
  const ipa = $derived(spelling ? transcribeToIpa(spelling, settings.lang) : '');
  const waveState = $derived(matchState === 'correct' ? 'correct' : matchState === 'incorrect' ? 'incorrect' : speaking ? 'speaking' : listening ? 'listening' : 'idle');

  function speechLocale() {
    return ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[settings.lang] ?? settings.lang;
  }
  function getRecognitionCtor(): SpeechRecognitionCtor | null {
    const globalWindow = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    return globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition ?? null;
  }
  function speak() {
    if (!speechSupported || !currentWord) return;
    window.speechSynthesis.cancel();
    speaking = true;
    const utterance = new SpeechSynthesisUtterance(spelling);
    utterance.lang = speechLocale();
    utterance.rate = .72;
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(settings.lang)) ?? voices.find((voice) => voice.default) ?? null;
    utterance.onstart = () => (speaking = true);
    utterance.onend = () => (speaking = false);
    utterance.onerror = () => (speaking = false);
    window.speechSynthesis.speak(utterance);
    practiced = true;
  }
  function nextWord() {
    practiced = false;
    matchState = 'idle';
    heard = '';
    currentWord = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
  }
  function stopListening() {
    stoppedIntentionally = true;
    listening = false;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    analyser?.disconnect();
    audioContext?.close();
    audioContext = null;
    analyser = null;
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    try { recognition?.stop(); } catch { /* already stopped */ }
    recognition = null;
    waveform = Array(BAR_COUNT).fill(IDLE_LEVEL);
  }
  function startRecognition() {
    const RecognitionCtor = recognitionSupported ? getRecognitionCtor() : null;
    if (!RecognitionCtor) return;
    recognition = new RecognitionCtor();
    recognition.lang = speechLocale();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = [...result].map((alternative) => alternative.transcript).join(' ');
      if (speaking) return;
      heard = transcript;
      if (!result.isFinal) return;
      const isMatch = [...result].some((alternative) => wordsMatch(alternative.transcript, spelling));
      matchState = isMatch ? 'correct' : 'incorrect';
      practiced = true;
      if (isMatch) {
        playSuccessSound(settings.sound, 'vocab');
        stopListening();
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') { recognitionSupported = false; }
    };
    recognition.onend = () => {
      if (stoppedIntentionally || matchState === 'correct') return;
      try { recognition?.start(); } catch { /* a start() call may already be pending */ }
    };
    try { recognition.start(); } catch { /* ignore duplicate start */ }
  }
  async function startListening() {
    if (!micSupported || !currentWord) return;
    stoppedIntentionally = false;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      listening = false;
      return;
    }
    listening = true;
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    audioContext.createMediaStreamSource(mediaStream).connect(analyser);
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
    startRecognition();
  }
  function toggleListening() {
    if (listening) stopListening();
    else void startListening();
  }
  onMount(() => {
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    micSupported = Boolean(navigator.mediaDevices?.getUserMedia);
    recognitionSupported = Boolean(getRecognitionCtor());
    const refreshVoices = () => (voices = window.speechSynthesis.getVoices());
    if (speechSupported) { refreshVoices(); window.speechSynthesis.addEventListener('voiceschanged', refreshVoices); }
    nextWord();
    return () => { window.speechSynthesis?.cancel(); speaking = false; stopListening(); window.speechSynthesis?.removeEventListener('voiceschanged', refreshVoices); };
  });
  $effect(() => {
    // Restart listening for every new word so the learner never has to press a button.
    currentWord;
    untrack(() => { stopListening(); if (currentWord) void startListening(); });
  });
</script>

<section class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-y-auto bg-[color:#ede4d5] dark:bg-[color:#213a5d] border-t-[3px] border-t-double border-t-[#172a45]" aria-label="Pronunciation practice">
  {#if currentWord}
    <header class="text-center"><span class="text-accent text-[.58rem] font-extrabold tracking-[.14em] uppercase">Pronunciation</span><h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">Listen & repeat</h1><p class="m-0 text-base-content/60 text-[.65rem] font-extrabold">Listen to the sample, then say the word — we're already listening.</p></header>
    <article class="w-[min(100%,28rem)] grid justify-items-center gap-4 p-[clamp(1.4rem,7vw,2.2rem)] border border-neutral border-t-[4px] border-t-double border-t-neutral bg-neutral-content shadow-[8px_8px_0_rgba(164,94,56,.16)]">
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2rem,10vw,3.3rem)] tracking-[.05em]">{spelling}</p>
      {#if ipa}<p class="m-0 -mt-2 text-accent/80 text-[.85rem] font-mono tracking-[.02em]" lang={settings.lang} aria-label={`International Phonetic Alphabet: ${ipa}`}>/{ipa}/</p>{/if}

      <div class="flex items-center gap-[.5rem]">
        <div class={`wave-panel wave-state-${waveState}`} aria-label={listening ? 'Live microphone waveform' : speaking ? 'Audio waveform playing' : 'Audio waveform idle'} aria-live="polite">
          {#each waveform as level, index (index)}
            <span class="wave-bar" class:wave-active={speaking} style={`--wave-delay:${index * 40}ms;--wave-height:${level}rem;`}></span>
          {/each}
        </div>
        {#if micSupported}
          <button type="button" class="wave-toggle" onclick={toggleListening} aria-label={listening ? 'Pause listening' : 'Resume listening'}>
            {#if listening}<IconMic class="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />{:else}<IconMicOff class="w-[1.05rem] h-[1.05rem]" aria-hidden="true" />{/if}
          </button>
        {/if}
      </div>

      <button class="inline-flex items-center justify-center gap-[.45rem] min-h-[2.5rem] px-[1rem] border border-[#172a45] rounded-full bg-[#172a45] text-[#fffdf7] text-[.68rem] font-black tracking-[.08em] uppercase disabled:opacity-50" onclick={speak} disabled={!speechSupported}><IconVolume class="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />{speaking ? 'Playing sample' : 'Play audio sample'}</button>

      {#if matchState === 'correct'}
        <p class="flex items-center gap-[.3rem] m-0 text-success text-[.68rem] font-extrabold"><IconCheck class="w-[1rem] h-[1rem]" aria-hidden="true" />Great pronunciation!{#if heard}<span class="text-base-content/50 font-bold">(heard "{heard}")</span>{/if}</p>
      {:else if matchState === 'incorrect'}
        <p class="flex items-center gap-[.3rem] m-0 text-error text-[.68rem] font-extrabold"><IconClose class="w-[1rem] h-[1rem]" aria-hidden="true" />Not quite{#if heard} — heard "{heard}"{/if}. Keep trying, we're still listening.</p>
      {:else if listening}
        <p class="flex items-center gap-[.3rem] m-0 text-accent text-[.68rem] font-extrabold"><span class="listening-dot" aria-hidden="true"></span>Listening for your voice…</p>
      {:else if !micSupported}
        <p class="m-0 text-base-content/50 text-[.62rem] font-bold">Microphone input isn't available in this browser.</p>
      {:else if practiced}
        <p class="flex items-center gap-[.3rem] m-0 text-success text-[.68rem] font-extrabold"><IconCheck class="w-[1rem] h-[1rem]" aria-hidden="true" />Now repeat it aloud.</p>
      {/if}
    </article>
    <button class="min-h-[2.45rem] px-[1rem] border border-success bg-success text-[#fffdf7] text-[.64rem] font-black tracking-[.08em] uppercase" onclick={nextWord}>Next word</button>
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
