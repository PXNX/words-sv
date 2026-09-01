<script lang="ts">
  import { onMount } from 'svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { wordMetadata } from '$lib/data/vocabulary';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import IconCheck from '~icons/material-symbols/check-rounded';

  let { words }: { words: string[] } = $props();
  let currentWord = $state('');
  let speechSupported = $state(false);
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let practiced = $state(false);

  const candidates = $derived([...new Set(words.map((word) => word.toLocaleUpperCase()).filter((word) => Boolean(wordMetadata[settings.lang][word]))) ]);
  const spelling = $derived(currentWord ? wordMetadata[settings.lang][currentWord]?.spelling ?? currentWord : '');

  function speechLocale() {
    return ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[settings.lang] ?? settings.lang;
  }
  function speak() {
    if (!speechSupported || !currentWord) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spelling);
    utterance.lang = speechLocale();
    utterance.rate = .72;
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(settings.lang)) ?? voices.find((voice) => voice.default) ?? null;
    window.speechSynthesis.speak(utterance);
    practiced = true;
  }
  function nextWord() {
    practiced = false;
    currentWord = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
  }
  onMount(() => {
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    const refreshVoices = () => (voices = window.speechSynthesis.getVoices());
    if (speechSupported) { refreshVoices(); window.speechSynthesis.addEventListener('voiceschanged', refreshVoices); }
    nextWord();
    return () => { window.speechSynthesis?.cancel(); window.speechSynthesis?.removeEventListener('voiceschanged', refreshVoices); };
  });
</script>

<section class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-y-auto bg-[color:#ede4d5] dark:bg-[color:#213a5d] border-t-[3px] border-t-double border-t-[#172a45]" aria-label="Pronunciation practice">
  {#if currentWord}
    <header class="text-center"><span class="text-accent text-[.58rem] font-extrabold tracking-[.14em] uppercase">Pronunciation</span><h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">Listen & repeat</h1><p class="m-0 text-base-content/60 text-[.65rem] font-extrabold">Listen to the sample, then practise the word aloud.</p></header>
    <article class="w-[min(100%,28rem)] grid justify-items-center gap-4 p-[clamp(1.4rem,7vw,2.2rem)] border border-neutral border-t-[4px] border-t-double border-t-neutral bg-neutral-content shadow-[8px_8px_0_rgba(164,94,56,.16)]">
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2rem,10vw,3.3rem)] tracking-[.05em]">{spelling}</p>
      <button class="inline-flex items-center justify-center gap-[.45rem] min-h-[2.5rem] px-[1rem] border border-[#172a45] rounded-full bg-[#172a45] text-[#fffdf7] text-[.68rem] font-black tracking-[.08em] uppercase disabled:opacity-50" onclick={speak} disabled={!speechSupported}><IconVolume class="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />Play audio sample</button>
      {#if practiced}<p class="flex items-center gap-[.3rem] m-0 text-success text-[.68rem] font-extrabold"><IconCheck class="w-[1rem] h-[1rem]" aria-hidden="true" />Now repeat it aloud.</p>{/if}
    </article>
    <button class="min-h-[2.45rem] px-[1rem] border border-success bg-success text-[#fffdf7] text-[.64rem] font-black tracking-[.08em] uppercase" onclick={nextWord}>Next word</button>
  {:else}<p class="text-accent font-bold">No pronunciation words are available.</p>{/if}
</section>
