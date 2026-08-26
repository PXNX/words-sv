<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { definitionAnswerResult, definitionChoiceWords, insertLearningRepeat, pickLearningSection } from '$lib/modes.js';

  type Labels = { title: string; listen: string; again: string; known: string; section: string; unavailable: string; speechUnavailable: string; chooseDefinition: string; correct: string; tryAgain: string };
  let { words, definitions, language, level, labels, onCorrect = () => {} }: { words: string[]; definitions: Record<string, string>; language: 'de' | 'en'; level: string; labels: Labels; onCorrect?: () => void } = $props();
  let section = $state<string[]>([]);
  let queue = $state<string[]>([]);
  let position = $state(0);
  let repeats = $state(0);
  let speechSupported = $state(false);
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let speechStatus = $state('');
  let pendingInitialSpeech = $state(false);
  let choiceWords = $state<string[]>([]);
  let answerStatus = $state<'correct' | 'wrong' | null>(null);
  let selectedChoice = $state<string | null>(null);
  let requeuedCurrent = $state(false);
  let choiceWordKey = $state('');
  let choiceSectionKey = $state('');
  let sourceKey = $state('');
  let advanceTimer: number | null = null;

  const currentWord = $derived(queue[position] ?? '');
  const currentDefinition = $derived(definitions[currentWord] ?? '');
  const speechAvailable = $derived(speechSupported && voices.length > 0);
  const definitionWords = $derived(words.filter((word) => Boolean(definitions[word.trim().toUpperCase()])));

  function random() { return Math.random(); }
  function startSection() {
    cancelSpeech();
    section = pickLearningSection(definitionWords, random, 6);
    queue = [...section, ...section].sort(() => random() - .5);
    position = 0;
    repeats = 0;
    requestInitialSpeech();
  }

  function repeatSection() {
    queue = [...section, ...section].sort(() => random() - .5);
    position = 0;
    repeats = 0;
  }

  function cancelSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }

  function requestInitialSpeech() {
    pendingInitialSpeech = true;
    if (speechAvailable) scheduleInitialSpeech();
  }

  function scheduleInitialSpeech() {
    if (!pendingInitialSpeech || !speechAvailable) return;
    pendingInitialSpeech = false;
    window.setTimeout(speak, 180);
  }

  function speak() {
    if (!speechAvailable || !currentWord) {
      speechStatus = labels.speechUnavailable;
      return;
    }
    speechStatus = '';
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentWord);
    utterance.lang = language === 'de' ? 'de-DE' : 'en-US';
    utterance.rate = .84;
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(language)) ?? voices.find((voice) => voice.default) ?? voices[0] ?? null;
    utterance.onerror = () => { speechStatus = labels.speechUnavailable; };
    window.speechSynthesis.speak(utterance);
  }

  function advance() {
    if (advanceTimer !== null) { window.clearTimeout(advanceTimer); advanceTimer = null; }
    cancelSpeech();
    if (position >= queue.length - 1) {
      repeatSection();
    } else {
      position += 1;
    }
    if (speechAvailable) window.setTimeout(speak, 120);
  }

  function repeatLater() {
    if (!currentWord) return;
    queue = insertLearningRepeat(queue, position, currentWord);
    repeats += 1;
    advance();
  }

  function resetDefinitionChoices() {
    answerStatus = null;
    selectedChoice = null;
    requeuedCurrent = false;
    if (!currentWord || !currentDefinition) {
      choiceWords = [];
      return;
    }
    choiceWords = definitionChoiceWords(currentWord, [...section, ...definitionWords], definitions, random);
  }

  function selectDefinition(event: MouseEvent) {
    const word = (event.currentTarget as HTMLButtonElement).value;
    if (!word) return;
    if (answerStatus === 'correct') return;
    selectedChoice = word;
    const result = definitionAnswerResult(word, currentWord, queue, position, requeuedCurrent);
    if (result.isCorrect) {
      answerStatus = 'correct';
      onCorrect();
      if (advanceTimer !== null) window.clearTimeout(advanceTimer);
      advanceTimer = window.setTimeout(() => advance(), 520);
      return;
    }
    answerStatus = 'wrong';
    if (!requeuedCurrent && result.requeued) {
      queue = result.queue;
      repeats += 1;
    }
    requeuedCurrent = result.requeued;
  }

  onMount(() => {
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    if (!speechSupported) {
      speechStatus = labels.speechUnavailable;
      return;
    }
    const refreshVoices = () => {
      voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        speechStatus = labels.speechUnavailable;
        return;
      }
      speechStatus = '';
      scheduleInitialSpeech();
    };
    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
      if (advanceTimer !== null) window.clearTimeout(advanceTimer);
      cancelSpeech();
    };
  });

  $effect(() => {
    const nextSourceKey = `${language}|${level}|${words.join('|')}`;
    if (nextSourceKey === sourceKey) return;
    sourceKey = nextSourceKey;
    untrack(() => startSection());
  });

  $effect(() => {
    const nextWordKey = currentWord;
    const nextSectionKey = section.join('|');
    if (nextWordKey === choiceWordKey && nextSectionKey === choiceSectionKey) return;
    choiceWordKey = nextWordKey;
    choiceSectionKey = nextSectionKey;
    untrack(() => resetDefinitionChoices());
  });
</script>

<section class="learning-view" aria-label={labels.title}>
  <header class="learning-header">
    <span>{labels.section} · {level.toUpperCase()}</span>
    <h1>{labels.title}</h1>
    <p>{Math.min(position + 1, queue.length)} / {queue.length || 6} · {section.length || 6} words</p>
  </header>

  {#if !currentWord}
    <div class="learning-empty">{labels.unavailable}</div>
  {:else}
    <article class="learning-card">
      <p class="learning-word" lang={language}>{currentWord}</p>
      <button class="listen-button" onclick={speak} disabled={!speechSupported}>{labels.listen}</button>
      {#if speechStatus}<p class="speech-fallback">{speechStatus}</p>{/if}
    </article>

    {#if choiceWords.length >= 3}
      <section class="definition-choice" aria-label={labels.chooseDefinition}>
        <p>{labels.chooseDefinition}</p>
        <div class="definition-options">
          {#each choiceWords as word}
            <button type="button" value={word} onclick={selectDefinition} class:correct-option={answerStatus === 'correct' && word === currentWord} class:wrong-option={answerStatus === 'wrong' && word === selectedChoice} disabled={answerStatus === 'correct'}>{definitions[word]}</button>
          {/each}
        </div>
        {#if answerStatus}<p class:correct-feedback={answerStatus === 'correct'} class:wrong-feedback={answerStatus === 'wrong'} class="definition-feedback">{answerStatus === 'correct' ? labels.correct : labels.tryAgain}</p>{/if}
      </section>
    {:else}
      <p class="learning-definition">{currentDefinition || labels.unavailable}</p>
    {/if}

    <div class="learning-actions"><button class="again-button" onclick={repeatLater} disabled={answerStatus === 'correct'}>{labels.again}</button></div>
    <p class="learning-repeat">{repeats > 0 ? `${repeats}×` : ''}</p>
  {/if}
</section>

<style>
  .learning-view { flex:1 1 auto;min-height:0;display:grid;align-content:center;justify-items:center;gap:1rem;padding:clamp(1rem,4vw,2rem);overflow:auto;background:radial-gradient(circle at 50% 15%,rgba(230,165,39,.18),transparent 34%),#ede4d5;border-top:3px double #172a45; }
  .learning-header { text-align:center; }.learning-header span { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase; }.learning-header h1 { margin:.16rem 0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.7rem,7vw,2.65rem);font-weight:400;line-height:1; }.learning-header p { margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.65rem;font-weight:800; }
  .learning-card { width:min(100%,28rem);min-height:8.2rem;display:grid;align-content:center;justify-items:center;gap:1rem;padding:clamp(1.2rem,6vw,2rem);border:1px solid #172a45;border-top:4px double #172a45;background:#fffdf7;box-shadow:8px 8px 0 rgba(164,94,56,.16);text-align:center; }.learning-word { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(2.35rem,11vw,4rem);font-weight:400;letter-spacing:.06em;line-height:1; }.learning-definition { max-width:24rem;margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:700;line-height:1.45;text-align:center; }.listen-button { min-height:2.2rem;padding:0 .85rem;border:1px solid #172a45;border-radius:999px;background:transparent;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase; }.listen-button:disabled { opacity:.5; }.speech-fallback { max-width:22rem;margin:-.45rem 0 0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:700;line-height:1.35; }
  .definition-choice { width:min(100%,28rem);display:grid;gap:.5rem; }.definition-choice>p:first-child { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.1em;text-align:center;text-transform:uppercase; }.definition-options { display:grid;gap:.45rem; }.definition-options button { min-height:2.65rem;padding:.5rem .7rem;border:1px solid rgba(23,42,69,.55);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.7rem;font-weight:700;line-height:1.3;text-align:left;touch-action:manipulation;transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease,color .16s ease; }.definition-options button:active { transform:scale(.985); }.definition-options button.correct-option { border-color:#34824d;background:#34824d;color:#fffdf7; }.definition-options button.wrong-option:not(.correct-option) { border-color:#a45e38;background:#fff2e8;color:#8e4322; }.definition-feedback { min-height:.9rem;margin:0;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;text-align:center; }.correct-feedback { color:#34824d; }.wrong-feedback { color:#a45e38; }.learning-actions { display:flex;gap:.55rem; }.learning-actions button { min-width:7rem;min-height:2.5rem;padding:0 .8rem;border:1px solid #172a45;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }.learning-actions button:disabled { opacity:.48; }.again-button { background:#fffdf7;color:#a45e38; }.learning-repeat { min-height:1rem;margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:900; }
  .learning-empty { padding:1.2rem;border:1px solid rgba(164,94,56,.42);background:rgba(255,253,247,.8);color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:800;text-align:center; }
  :global(html.dark) .learning-view { background:radial-gradient(circle at 50% 15%,rgba(230,165,39,.18),transparent 34%),#213a5d; }.learning-header h1 { color:#172a45; }:global(html.dark) .learning-header h1 { color:#fffdf7; }:global(html.dark) .learning-header p { color:rgba(255,253,247,.68); }:global(html.dark) .learning-card { border-color:#fffdf7;background:#172a45; }:global(html.dark) .learning-word { color:#fffdf7; }:global(html.dark) .learning-definition { color:rgba(255,253,247,.74); }:global(html.dark) .listen-button { border-color:#fffdf7;color:#fffdf7; }:global(html.dark) .definition-options button { border-color:rgba(255,253,247,.6);background:#172a45;color:#fffdf7; }.again-button { background:#fffdf7; }
</style>
