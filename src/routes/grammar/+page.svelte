<script lang="ts">
  import { untrack } from 'svelte';
  import { playSuccessSound, playErrorSound } from '$lib/sounds';
  import { settings } from '$lib/state/settings.svelte';
  import { wordPools, wordMetadata } from '$lib/data/vocabulary';
  import { m } from '$lib/paraglide/messages';
  import { pickLearningSection, insertLearningRepeat } from '$lib/vocab/learning';
  import { prioritizeLearningWords, updateReviewProgress } from '$lib/vocab/spacedRepetition';
  import { articleChoiceOptions, gapSentenceSuffixes, grammarArticles, GRAMMAR_REVIEW_STORAGE_PREFIX } from '$lib/grammar/learning';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';

  type AnswerStatus = 'correct' | 'wrong' | null;

  const labels = $derived({
    title: m.grammar_title({}, { locale: settings.interfaceLocale }),
    section: m.learning_section({}, { locale: settings.interfaceLocale }),
    unavailable: m.grammar_unavailable({}, { locale: settings.interfaceLocale }),
    unsupported: m.grammar_unsupported({}, { locale: settings.interfaceLocale }),
    chooseArticle: m.grammar_choose_article({}, { locale: settings.interfaceLocale }),
    continue: m.continue({}, { locale: settings.interfaceLocale }),
    correct: m.learning_correct({}, { locale: settings.interfaceLocale }),
    tryAgain: m.learning_try_again({}, { locale: settings.interfaceLocale })
  });

  const metadata = $derived(wordMetadata[settings.lang]);
  const articleUniverse = $derived(grammarArticles[settings.lang] ?? []);
  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
  const gapWords = $derived(words.filter((word) => Boolean(metadata[word]?.article)));

  let section = $state<string[]>([]);
  let queue = $state<string[]>([]);
  let position = $state(0);
  let answerStatus = $state<AnswerStatus>(null);
  let selectedChoice = $state<string | null>(null);
  let choiceArticles = $state<string[]>([]);
  let sourceKey = $state('');
  let choiceKey = $state('');
  let reviewProgress = $state<Record<string, { repetitions: number; dueAt: number }>>({});

  const currentWord = $derived(queue[position] ?? '');
  const currentArticle = $derived(metadata[currentWord]?.article ?? '');
  const currentSpelling = $derived(metadata[currentWord]?.spelling ?? currentWord);
  const currentSentenceSuffix = $derived(gapSentenceSuffixes[settings.lang]?.(currentSpelling) ?? currentSpelling);

  function random() { return Math.random(); }
  function persistProgress() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${GRAMMAR_REVIEW_STORAGE_PREFIX}:${settings.lang}:${settings.vocabularyLevel}`, JSON.stringify(reviewProgress));
  }
  function loadProgress() {
    if (typeof localStorage === 'undefined') return {};
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(`${GRAMMAR_REVIEW_STORAGE_PREFIX}:${settings.lang}:${settings.vocabularyLevel}`) ?? '{}');
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, { repetitions: number; dueAt: number }>) : {};
    } catch { return {}; }
  }
  function startSection() {
    reviewProgress = loadProgress();
    const prioritized = prioritizeLearningWords(gapWords, reviewProgress);
    section = pickLearningSection(prioritized, random, 6);
    queue = [...section];
    position = 0;
  }
  function resetPrompt() {
    answerStatus = null;
    selectedChoice = null;
    if (!currentWord || !currentArticle) { choiceArticles = []; return; }
    choiceArticles = articleChoiceOptions(currentArticle, articleUniverse, random);
  }
  function chooseAnswer(event: MouseEvent) {
    if (answerStatus || !currentWord) return;
    const chosenArticle = (event.currentTarget as HTMLButtonElement).value;
    if (!chosenArticle) return;
    const correct = chosenArticle === currentArticle;
    selectedChoice = chosenArticle;
    answerStatus = correct ? 'correct' : 'wrong';
    reviewProgress = updateReviewProgress(reviewProgress, currentWord, correct);
    persistProgress();
    if (correct) playSuccessSound(settings.sound, 'grammar');
    else { playErrorSound(settings.sound, 'grammar'); queue = insertLearningRepeat(queue, position, currentWord); }
  }
  function continueLearning() {
    position = position >= queue.length - 1 ? 0 : position + 1;
  }
  function optionStateClasses(article: string) {
    if (answerStatus !== null && article === currentArticle) return 'border-success bg-success text-[#fffdf7]';
    if (answerStatus === 'wrong' && article === selectedChoice) return 'border-accent bg-[#fff2e8] text-[#8e4322] dark:bg-[#69332f] dark:text-[#fff7ed]';
    return 'border-neutral/55 dark:border-neutral/60 bg-neutral-content text-base-content';
  }

  $effect(() => {
    const nextSourceKey = `${settings.lang}|${settings.vocabularyLevel}|${gapWords.join('|')}`;
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
  class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-x-hidden overflow-y-auto bg-[color:#ede4d5] dark:bg-[color:#213a5d] bg-[image:radial-gradient(circle_at_50%_15%,rgba(230,165,39,.18),transparent_34%),linear-gradient(rgba(23,42,69,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(23,42,69,.018)_1px,transparent_1px)] bg-[length:auto,24px_24px,24px_24px] border-t-[3px] border-t-double border-t-[#172a45]"
  aria-label={labels.title}
>
  <header class="text-center">
    <span class="text-accent text-[.58rem] font-extrabold tracking-[.14em] uppercase">{labels.section} · {settings.vocabularyLevel.toUpperCase()}</span>
    <h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">{labels.title}</h1>
    <p class="m-0 text-base-content/60 text-[.65rem] font-extrabold">{Math.min(position + 1, queue.length)} / {queue.length || 6}</p>
  </header>
  {#if articleUniverse.length === 0}
    <div class="max-w-[24rem] m-0 p-[1.2rem] border border-accent/42 bg-[rgba(255,253,247,.8)] text-accent text-[.75rem] font-bold leading-[1.45] text-center">{labels.unsupported}</div>
  {:else if !currentWord}
    <div class="max-w-[24rem] m-0 p-[1.2rem] border border-accent/42 bg-[rgba(255,253,247,.8)] text-accent text-[.75rem] font-bold leading-[1.45] text-center">{labels.unavailable}</div>
  {:else}
    <article class="w-[min(100%,28rem)] min-h-[8.2rem] grid content-center justify-items-center gap-4 p-[clamp(1.2rem,6vw,2rem)] border border-neutral border-t-[4px] border-t-double border-t-neutral shadow-[8px_8px_0_rgba(164,94,56,.16)] text-center bg-neutral-content">
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(1.75rem,8vw,3rem)] font-normal tracking-[.04em] leading-[1.3]" lang={settings.lang}><span class="inline-block border-b-4 border-dotted border-accent text-accent px-[.3rem]">___</span> {currentSentenceSuffix}</p>
    </article>
    {#if choiceArticles.length >= 2}
      <section class="w-[min(100%,28rem)] grid gap-[.55rem]" aria-label={labels.chooseArticle}>
        <p class="m-0 text-accent text-[.6rem] font-black tracking-[.1em] text-center uppercase">{labels.chooseArticle}</p>
        <div class="grid gap-[.45rem]" style={`grid-template-columns:repeat(${choiceArticles.length},minmax(0,1fr));`}>
          {#each choiceArticles as article}
            <button
              type="button"
              value={article}
              onclick={chooseAnswer}
              disabled={answerStatus !== null}
              class="min-h-[2.8rem] px-[.75rem] py-[.55rem] flex items-center justify-center gap-[.4rem] border text-[.85rem] font-extrabold uppercase touch-manipulation active:scale-[.985] disabled:opacity-100 {optionStateClasses(article)}"
            >{article}{#if answerStatus !== null && article === currentArticle}<IconCheck class="w-[1.15rem] h-[1.15rem] flex-none text-[#fffdf7]" aria-label={labels.correct} />{:else if answerStatus === 'wrong' && article === selectedChoice}<IconClose class="w-[1.15rem] h-[1.15rem] flex-none text-accent" aria-label={labels.tryAgain} />{/if}</button>
          {/each}
        </div>
        {#if answerStatus}<button class="justify-self-center min-h-[2.45rem] px-[1rem] border border-[#172a45] bg-[#172a45] text-[#fffdf7] text-[.64rem] font-black tracking-[.08em] uppercase shadow-[3px_3px_0_#e6a527]" onclick={continueLearning}>{labels.continue}</button>{/if}
      </section>
    {/if}
  {/if}
</section>
