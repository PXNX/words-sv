<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { playSuccessSound } from '$lib/sounds';
  import { settings } from '$lib/state/settings.svelte';
  import { wordPools, wordDefinitions, wordMetadata } from '$lib/data/vocabulary';
  import { m } from '$lib/paraglide/messages';
  import { definitionChoiceWords, insertLearningRepeat, pickLearningSection } from '$lib/vocab/learning';
  import { prioritizeLearningWords, updateReviewProgress } from '$lib/vocab/spacedRepetition';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';

  type PromptKind = 'word' | 'audio';
  type AnswerStatus = 'correct' | 'wrong' | null;

  const REVIEW_STORAGE_KEY = 'wordcircle-vocabulary-review-v2';

  const labels = $derived({
    title: m.learning_title({}, { locale: settings.interfaceLocale }),
    listen: m.learning_listen({}, { locale: settings.interfaceLocale }),
    section: m.learning_section({}, { locale: settings.interfaceLocale }),
    unavailable: m.learning_unavailable({}, { locale: settings.interfaceLocale }),
    speechUnavailable: m.learning_speech_unavailable({}, { locale: settings.interfaceLocale }),
    chooseDefinition: m.learning_choose_definition({}, { locale: settings.interfaceLocale }),
    chooseWord: m.learning_choose_word({}, { locale: settings.interfaceLocale }),
    audioPrompt: m.learning_audio_prompt({}, { locale: settings.interfaceLocale }),
    continue: m.continue({}, { locale: settings.interfaceLocale }),
    correct: m.learning_correct({}, { locale: settings.interfaceLocale }),
    tryAgain: m.learning_try_again({}, { locale: settings.interfaceLocale })
  });
  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
  const definitions = $derived(wordDefinitions[settings.lang]);
  const metadata = $derived(wordMetadata[settings.lang]);

  let section = $state<string[]>([]);
  let queue = $state<string[]>([]);
  let position = $state(0);
  let speechSupported = $state(false);
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let speechStatus = $state('');
  let choiceWords = $state<string[]>([]);
  let promptKind = $state<PromptKind>('word');
  let answerStatus = $state<AnswerStatus>(null);
  let selectedChoice = $state<string | null>(null);
  let sourceKey = $state('');
  let choiceKey = $state('');
  let reviewProgress = $state<Record<string, { repetitions: number; dueAt: number }>>({});

  const currentWord = $derived(queue[position] ?? '');
  const currentDefinition = $derived(definitions[currentWord] ?? '');
  const currentArticle = $derived(articleFor(currentWord));
  const currentDisplayWord = $derived(currentArticle ? `${currentArticle} ${currentWord}` : currentWord);
  const definitionWords = $derived(words.map((word) => word.trim().toUpperCase()).filter((word) => Boolean(definitions[word])));
  const isDefinitionPrompt = $derived(promptKind === 'word');

  function random() { return Math.random(); }
  function speechLocale() { return ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[settings.lang] ?? settings.lang; }
  function articleFor(word: string) { const entry = metadata[word]; if (!entry || entry.type !== 'Substantiv') return ''; if (entry.article) return entry.article; const articlesByGender: Record<string, Record<string, string>> = { de: { masculine: 'der', feminine: 'die', neuter: 'das' } }; return entry.gender ? articlesByGender[settings.lang]?.[entry.gender] ?? '' : ''; }
  function displayWord(word: string) { const article = articleFor(word); return article ? `${article} ${word}` : word; }
  function cancelSpeech() { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); }
  function speak() {
    if (!speechSupported || !currentWord) { speechStatus = labels.speechUnavailable; return; }
    speechStatus = '';
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentWord);
    utterance.lang = speechLocale();
    utterance.rate = .84;
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith(settings.lang)) ?? voices.find((voice) => voice.default) ?? null;
    utterance.onerror = () => { speechStatus = labels.speechUnavailable; };
    window.speechSynthesis.speak(utterance);
  }
  function persistProgress() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${REVIEW_STORAGE_KEY}:${settings.lang}:${settings.vocabularyLevel}`, JSON.stringify(reviewProgress));
  }
  function loadProgress() {
    if (typeof localStorage === 'undefined') return {};
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(`${REVIEW_STORAGE_KEY}:${settings.lang}:${settings.vocabularyLevel}`) ?? '{}');
      return parsed && typeof parsed === 'object' ? parsed as Record<string, { repetitions: number; dueAt: number }> : {};
    } catch { return {}; }
  }
  function startSection() {
    cancelSpeech();
    reviewProgress = loadProgress();
    const prioritized = prioritizeLearningWords(definitionWords, reviewProgress);
    section = pickLearningSection(prioritized, random, 6);
    queue = [...section, ...section].sort(() => random() - .5);
    position = 0;
  }
  function resetPrompt() {
    answerStatus = null;
    selectedChoice = null;
    if (!currentWord || !currentDefinition) { choiceWords = []; return; }
    promptKind = position % 2 === 0 ? 'word' : 'audio';
    choiceWords = definitionChoiceWords(currentWord, [...section, ...definitionWords], definitions, random);
  }
  function chooseAnswer(event: MouseEvent) {
    if (answerStatus || !currentWord) return;
    const chosenWord = (event.currentTarget as HTMLButtonElement).value;
    if (!chosenWord) return;
    const correct = chosenWord === currentWord;
    selectedChoice = chosenWord;
    answerStatus = correct ? 'correct' : 'wrong';
    reviewProgress = updateReviewProgress(reviewProgress, currentWord, correct);
    persistProgress();
    if (correct) { playSuccessSound(settings.sound, 'vocab'); void settings.recordStreak('vocab_correct'); }
    if (!correct) queue = insertLearningRepeat(queue, position, currentWord);
  }
  function continueLearning() {
    cancelSpeech();
    position = position >= queue.length - 1 ? 0 : position + 1;
  }
  function optionText(word: string) { return isDefinitionPrompt ? definitions[word] : displayWord(word); }

  onMount(() => {
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    if (!speechSupported) { speechStatus = labels.speechUnavailable; return; }
    const refreshVoices = () => {
      voices = window.speechSynthesis.getVoices();
      speechStatus = '';
    };
    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    return () => { window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices); cancelSpeech(); };
  });

  $effect(() => {
    const nextSourceKey = `${settings.lang}|${settings.vocabularyLevel}|${words.join('|')}`;
    if (nextSourceKey === sourceKey) return;
    sourceKey = nextSourceKey;
    untrack(() => startSection());
  });
  $effect(() => {
    const nextChoiceKey = `${currentWord}|${section.join('|')}|${position}`;
    if (nextChoiceKey === choiceKey) return;
    choiceKey = nextChoiceKey;
    untrack(() => resetPrompt());
  });
</script>

<section
  class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_50%_15%,rgba(230,165,39,.18),transparent_34%),#ede4d5] dark:bg-[radial-gradient(circle_at_50%_15%,rgba(230,165,39,.18),transparent_34%),#213a5d] border-t-[3px] border-t-double border-t-[#172a45]"
  aria-label={labels.title}
>
  <header class="text-center">
    <span class="text-accent text-[.58rem] font-extrabold tracking-[.14em] uppercase">{labels.section} · {settings.vocabularyLevel.toUpperCase()}</span>
    <h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">{labels.title}</h1>
    <p class="m-0 text-base-content/60 text-[.65rem] font-extrabold">{Math.min(position + 1, queue.length)} / {queue.length || 6}</p>
  </header>
  {#if !currentWord}
    <div class="max-w-[24rem] m-0 p-[1.2rem] border border-accent/42 bg-[rgba(255,253,247,.8)] text-accent text-[.75rem] font-bold leading-[1.45] text-center">{labels.unavailable}</div>
  {:else}
    <article
      class="w-[min(100%,28rem)] min-h-[8.2rem] grid content-center justify-items-center gap-4 p-[clamp(1.2rem,6vw,2rem)] border border-neutral border-t-[4px] border-t-double border-t-neutral shadow-[8px_8px_0_rgba(164,94,56,.16)] text-center"
      class:bg-neutral-content={promptKind !== 'audio'}
      class:bg-[linear-gradient(145deg,#fffdf7,#fff4d9)]={promptKind === 'audio'}
      class:dark:bg-[linear-gradient(145deg,#172a45,#294666)]={promptKind === 'audio'}
    >
      {#if promptKind === 'word'}
        <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(2.35rem,11vw,4rem)] font-normal tracking-[.06em] leading-none" lang={settings.lang}>{currentDisplayWord}</p>
      {:else}
        <button class="inline-flex items-center justify-center gap-[.45rem] min-h-[2.4rem] px-[.95rem] border border-[#172a45] rounded-full bg-[#172a45] text-[#fffdf7] text-[.68rem] font-black tracking-[.08em] uppercase disabled:opacity-50" onclick={speak} disabled={!speechSupported}><IconVolume class="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />{labels.listen}</button>
        <p class="m-0 text-accent text-[.62rem] font-extrabold leading-[1.35]">{labels.audioPrompt}</p>
      {/if}
      {#if speechStatus && promptKind === 'audio'}<p class="m-0 text-accent text-[.62rem] font-extrabold leading-[1.35]">{speechStatus}</p>{/if}
    </article>
    {#if choiceWords.length >= 3}
      <section class="w-[min(100%,28rem)] grid gap-[.55rem]" aria-label={isDefinitionPrompt ? labels.chooseDefinition : labels.chooseWord}>
        <p class="m-0 text-accent text-[.6rem] font-black tracking-[.1em] text-center uppercase">{isDefinitionPrompt ? labels.chooseDefinition : labels.chooseWord}</p>
        <div class="grid gap-[.45rem]">
          {#each choiceWords as word}
            <button
              type="button"
              value={word}
              onclick={chooseAnswer}
              disabled={answerStatus !== null}
              class="min-h-[2.8rem] px-[.75rem] py-[.55rem] flex items-center justify-between gap-[.65rem] text-[.72rem] font-bold leading-[1.3] text-left touch-manipulation active:scale-[.985] disabled:opacity-100"
              class:border-neutral/55={!(answerStatus !== null && word === currentWord) && !(answerStatus === 'wrong' && word === selectedChoice)}
              class:dark:border-neutral/60={!(answerStatus !== null && word === currentWord) && !(answerStatus === 'wrong' && word === selectedChoice)}
              class:bg-neutral-content={!(answerStatus !== null && word === currentWord) && !(answerStatus === 'wrong' && word === selectedChoice)}
              class:text-base-content={!(answerStatus !== null && word === currentWord) && !(answerStatus === 'wrong' && word === selectedChoice)}
              class:border-success={answerStatus !== null && word === currentWord}
              class:bg-success={answerStatus !== null && word === currentWord}
              class:text-[#fffdf7]={answerStatus !== null && word === currentWord}
              class:border-accent={answerStatus === 'wrong' && word === selectedChoice}
              class:bg-[#fff2e8]={answerStatus === 'wrong' && word === selectedChoice}
              class:text-[#8e4322]={answerStatus === 'wrong' && word === selectedChoice}
              class:dark:bg-[#69332f]={answerStatus === 'wrong' && word === selectedChoice}
              class:dark:text-[#fff7ed]={answerStatus === 'wrong' && word === selectedChoice}
            ><span class="flex-1">{optionText(word)}</span>{#if answerStatus !== null && word === currentWord}<IconCheck class="w-[1.25rem] h-[1.25rem] flex-none text-[#fffdf7]" aria-label={labels.correct} />{:else if answerStatus === 'wrong' && word === selectedChoice}<IconClose class="w-[1.25rem] h-[1.25rem] flex-none text-accent" aria-label={labels.tryAgain} />{/if}</button>
          {/each}
        </div>
        {#if answerStatus}<button class="justify-self-center min-h-[2.45rem] px-[1rem] border border-[#172a45] bg-[#172a45] text-[#fffdf7] text-[.64rem] font-black tracking-[.08em] uppercase shadow-[3px_3px_0_#e6a527]" onclick={continueLearning}>{labels.continue}</button>{/if}
      </section>
    {:else}<p class="max-w-[24rem] m-0 text-base-content/60 text-[.75rem] font-bold leading-[1.45] text-center">{currentDefinition || labels.unavailable}</p>{/if}
  {/if}
</section>
