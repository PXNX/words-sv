<script lang="ts">
  import { onMount } from 'svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { wordMetadata } from '$lib/data/vocabulary';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconMic from '~icons/material-symbols/mic-rounded';

  let { words }: { words: string[] } = $props();
  let currentWord = $state('');
  let speechSupported = $state(false);
  let micSupported = $state(false);
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let practiced = $state(false);
  let speaking = $state(false);
  let recording = $state(false);
  let waveform = $state<number[]>(Array(15).fill(.35));
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animationFrame: number | null = null;

  const candidates = $derived([...new Set(words.map((word) => word.toLocaleUpperCase()).filter((word) => Boolean(wordMetadata[settings.lang][word]))) ]);
  const spelling = $derived(currentWord ? wordMetadata[settings.lang][currentWord]?.spelling ?? currentWord : '');

  function speechLocale() {
    return ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[settings.lang] ?? settings.lang;
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
    currentWord = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
  }
  function stopRecording() {
    recording = false;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    analyser?.disconnect();
    audioContext?.close();
    audioContext = null;
    analyser = null;
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    waveform = Array(15).fill(.35);
  }
  async function toggleRecording() {
    if (recording) { stopRecording(); return; }
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      audioContext.createMediaStreamSource(mediaStream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      recording = true;
      const updateWaveform = () => {
        if (!analyser || !recording) return;
        analyser.getByteTimeDomainData(samples);
        waveform = Array.from({ length: 15 }, (_, index) => {
          const start = Math.floor(index * samples.length / 15);
          const end = Math.max(start + 1, Math.floor((index + 1) * samples.length / 15));
          const level = samples.slice(start, end).reduce((sum, value) => sum + Math.abs(value - 128), 0) / (end - start);
          return Math.max(.25, Math.min(1.4, .25 + level / 42));
        });
        animationFrame = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } catch {
      stopRecording();
    }
  }
  onMount(() => {
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    micSupported = Boolean(navigator.mediaDevices?.getUserMedia);
    const refreshVoices = () => (voices = window.speechSynthesis.getVoices());
    if (speechSupported) { refreshVoices(); window.speechSynthesis.addEventListener('voiceschanged', refreshVoices); }
    nextWord();
    return () => { window.speechSynthesis?.cancel(); speaking = false; stopRecording(); window.speechSynthesis?.removeEventListener('voiceschanged', refreshVoices); };
  });
</script>

<section class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-y-auto bg-[color:#ede4d5] dark:bg-[color:#213a5d] border-t-[3px] border-t-double border-t-[#172a45]" aria-label="Pronunciation practice">
  {#if currentWord}
    <header class="text-center"><span class="text-accent text-[.58rem] font-extrabold tracking-[.14em] uppercase">Pronunciation</span><h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">Listen & repeat</h1><p class="m-0 text-base-content/60 text-[.65rem] font-extrabold">Listen to the sample, then practise the word aloud.</p></header>
    <article class="w-[min(100%,28rem)] grid justify-items-center gap-4 p-[clamp(1.4rem,7vw,2.2rem)] border border-neutral border-t-[4px] border-t-double border-t-neutral bg-neutral-content shadow-[8px_8px_0_rgba(164,94,56,.16)]">
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2rem,10vw,3.3rem)] tracking-[.05em]">{spelling}</p>
      <div class="flex items-center justify-center gap-[.16rem] w-[min(100%,15rem)] h-[2.2rem] px-[.7rem] border border-primary/45 bg-primary/8" class:opacity-45={!speaking && !recording} aria-label={recording ? 'Live microphone waveform' : speaking ? 'Audio waveform playing' : 'Audio waveform idle'} aria-live="polite">
        {#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as bar}
          <span class="wave-bar" class:wave-active={speaking && !recording} class:wave-recording={recording} style={`--wave-delay:${bar * 45}ms;--wave-height:${waveform[bar]}rem;`}></span>
        {/each}
      </div>
      <button class="inline-flex items-center justify-center gap-[.45rem] min-h-[2.5rem] px-[1rem] border border-[#172a45] rounded-full bg-[#172a45] text-[#fffdf7] text-[.68rem] font-black tracking-[.08em] uppercase disabled:opacity-50" onclick={speak} disabled={!speechSupported}><IconVolume class="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />{speaking ? 'Playing sample' : 'Play audio sample'}</button>
      <button class="inline-flex items-center justify-center gap-[.45rem] min-h-[2.5rem] px-[1rem] border border-accent bg-transparent text-accent text-[.68rem] font-black tracking-[.08em] uppercase disabled:opacity-50" onclick={toggleRecording} disabled={!micSupported}>{#if recording}<IconMic class="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />Stop recording{:else}<IconMic class="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />Record pronunciation{/if}</button>
      {#if practiced}<p class="flex items-center gap-[.3rem] m-0 text-success text-[.68rem] font-extrabold"><IconCheck class="w-[1rem] h-[1rem]" aria-hidden="true" />Now repeat it aloud.</p>{/if}
    </article>
    <button class="min-h-[2.45rem] px-[1rem] border border-success bg-success text-[#fffdf7] text-[.64rem] font-black tracking-[.08em] uppercase" onclick={nextWord}>Next word</button>
  {:else}<p class="text-accent font-bold">No pronunciation words are available.</p>{/if}
</section>

<style>
  .wave-bar { width:.18rem;height:var(--wave-height);border-radius:999px;background:#a45e38;opacity:.65;transform-origin:center; }
  .wave-bar.wave-active { animation: pronunciation-wave .62s ease-in-out var(--wave-delay) infinite alternate; }
  .wave-bar.wave-recording { background:#b54442;transition:height .08s ease-out; }
  @keyframes pronunciation-wave { from { transform:scaleY(.35); } to { transform:scaleY(1.55); } }
  @media (prefers-reduced-motion: reduce) { .wave-bar.wave-active { animation:none;transform:scaleY(.8); } }
</style>
