<script lang="ts">
  import { untrack } from 'svelte';
  import { playSuccessSound, playErrorSound } from '$lib/sounds';
  import { settings } from '$lib/state/settings.svelte';
  import { wordPools, wordMetadata } from '$lib/data/vocabulary';
  import { m } from '$lib/paraglide/messages';
  import { prioritizeLearningWords, updateReviewProgress } from '$lib/vocab/spacedRepetition';
  import { articleChoiceOptions, gapSentenceSuffixes, grammarArticles, pickRandomSection, shuffled, GRAMMAR_REVIEW_STORAGE_PREFIX } from '$lib/grammar/learning';
  import { buildNounCasePrompt, buildNounPropertyPrompt, type GrammarPrompt } from '$lib/grammar/cases';
  import { buildAdjectivePrompt, isEligibleAdjective } from '$lib/grammar/adjectives';
  import { buildVerbPrompt, buildVerbPropertyPrompt, verbConjugations } from '$lib/grammar/verbs';
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

  // German gets the full case/adjective/verb engine below (`cases.ts`, `adjectives.ts`,
  // `verbs.ts`); every other supported language falls back to the original single
  // nominative-article drill, since only German has case, adjective-ending and
  // hand-checked verb-conjugation data to draw on.
  const isGerman = $derived(settings.lang === 'de');
  const metadata = $derived(wordMetadata[settings.lang]);
  const articleUniverse = $derived(grammarArticles[settings.lang] ?? []);
  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);

  const nounPool = $derived(words.filter((word) => Boolean(metadata[word]?.article) && Boolean(metadata[word]?.gender)));
  const adjectivePool = $derived(words.filter((word) => metadata[word]?.type === 'adjective' && isEligibleAdjective(metadata[word]?.spelling ?? word)));
  const verbPool = $derived(words.filter((word) => Boolean(verbConjugations[word])));
  const legacyArticleWords = $derived(words.filter((word) => Boolean(metadata[word]?.article)));

  const eligibleKeys = $derived(
    isGerman
      ? [...nounPool.map((word) => `noun:${word}`), ...adjectivePool.map((word) => `adj:${word}`), ...verbPool.map((word) => `verb:${word}`)]
      : legacyArticleWords.map((word) => `article:${word}`)
  );
  const isSupported = $derived(isGerman ? nounPool.length + adjectivePool.length + verbPool.length > 0 : articleUniverse.length > 0);

  let section = $state<string[]>([]);
  let queue = $state<string[]>([]);
  let position = $state(0);
  let answerStatus = $state<AnswerStatus>(null);
  let selectedChoice = $state<string | null>(null);
  let prompt = $state<GrammarPrompt | null>(null);
  let sourceKey = $state('');
  let choiceKey = $state('');
  let reviewProgress = $state<Record<string, { repetitions: number; dueAt: number }>>({});

  const currentKey = $derived(queue[position] ?? '');

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
    const prioritized = prioritizeLearningWords(eligibleKeys, reviewProgress);
    section = pickRandomSection(prioritized, random, 6);
    queue = [...section];
    position = 0;
  }
  function buildPromptForKey(key: string): GrammarPrompt | null {
    const separator = key.indexOf(':');
    const kind = key.slice(0, separator);
    const word = key.slice(separator + 1);
    if (kind === 'article') {
      const article = metadata[word]?.article;
      if (!article) return null;
      const spelling = metadata[word]?.spelling ?? word;
      const after = gapSentenceSuffixes[settings.lang]?.(spelling) ?? spelling;
      const choices = articleChoiceOptions(article, articleUniverse, random);
      if (choices.length < 2) return null;
      return { before: '', after, correct: article, choices };
    }
    if (kind === 'noun') {
      const gender = metadata[word]?.gender;
      if (!gender) return null;
      return random() < 0.5
        ? buildNounCasePrompt(metadata[word]?.spelling ?? word, gender, random, shuffled)
        : buildNounPropertyPrompt(metadata[word]?.spelling ?? word, gender, random, shuffled);
    }
    if (kind === 'adj') {
      if (nounPool.length === 0) return null;
      const pairedNoun = nounPool[Math.floor(random() * nounPool.length)];
      const gender = metadata[pairedNoun]?.gender;
      if (!gender) return null;
      const adjectiveSpelling = metadata[word]?.spelling ?? word;
      const nounSpelling = metadata[pairedNoun]?.spelling ?? pairedNoun;
      return buildAdjectivePrompt(adjectiveSpelling, nounSpelling, gender, random, shuffled);
    }
    if (kind === 'verb') return random() < 0.5 ? buildVerbPrompt(word, random, shuffled) : buildVerbPropertyPrompt(word, random, shuffled);
    return null;
  }
  function resetPrompt() {
    answerStatus = null;
    selectedChoice = null;
    prompt = currentKey ? buildPromptForKey(currentKey) : null;
  }
  function chooseAnswer(event: MouseEvent) {
    if (answerStatus || !prompt) return;
    const chosen = (event.currentTarget as HTMLButtonElement).value;
    if (!chosen) return;
    const correct = chosen === prompt.correct;
    selectedChoice = chosen;
    answerStatus = correct ? 'correct' : 'wrong';
    reviewProgress = updateReviewProgress(reviewProgress, currentKey, correct);
    persistProgress();
    if (correct) playSuccessSound(settings.sound, 'grammar');
    else { playErrorSound(settings.sound, 'grammar'); queue = [...queue, currentKey]; }
  }
  function continueLearning() {
    position = position >= queue.length - 1 ? 0 : position + 1;
  }
  function optionStateClasses(choice: string) {
    if (!prompt) return '';
    if (answerStatus !== null && choice === prompt.correct) return 'border-success bg-success text-[#fffdf7]';
    if (answerStatus === 'wrong' && choice === selectedChoice) return 'border-accent bg-[#fff2e8] text-[#8e4322] dark:bg-[#69332f] dark:text-[#fff7ed]';
    return 'border-neutral/55 dark:border-neutral/60 bg-neutral-content text-base-content';
  }

  $effect(() => {
    const nextSourceKey = `${settings.lang}|${settings.vocabularyLevel}|${eligibleKeys.join('|')}`;
    if (nextSourceKey === sourceKey) return;
    sourceKey = nextSourceKey;
    untrack(() => startSection());
  });
  $effect(() => {
    // A wrong answer requeues the current prompt, changing queue.length without
    // changing the prompt being displayed. Keep the red cross and Continue button
    // visible until the learner explicitly advances.
    const nextChoiceKey = `${currentKey}|${position}`;
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
  {#if !isSupported}
    <div class="max-w-[24rem] m-0 p-[1.2rem] border border-accent/42 bg-[rgba(255,253,247,.8)] text-accent text-[.75rem] font-bold leading-[1.45] text-center">{labels.unsupported}</div>
  {:else if !prompt}
    <div class="max-w-[24rem] m-0 p-[1.2rem] border border-accent/42 bg-[rgba(255,253,247,.8)] text-accent text-[.75rem] font-bold leading-[1.45] text-center">{labels.unavailable}</div>
  {:else}
    <article class="w-[min(100%,28rem)] min-h-[8.2rem] grid content-center justify-items-center gap-4 p-[clamp(1.2rem,6vw,2rem)] border border-neutral border-t-[4px] border-t-double border-t-neutral shadow-[8px_8px_0_rgba(164,94,56,.16)] text-center bg-neutral-content">
            {#if prompt.question}<p class="m-0 text-accent text-[.62rem] font-black tracking-[.08em] uppercase">{prompt.question}</p>{/if}
            <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(1.55rem,7vw,2.6rem)] font-normal tracking-[.04em] leading-[1.3]" lang={settings.lang}>{#if prompt.before}{prompt.before}{/if}{#if prompt.question}{prompt.after}{:else}<span class="inline-block border-b-4 border-dotted border-accent text-accent px-[.3rem]">___</span> {prompt.after}{/if}</p>
    </article>
    {#if prompt.choices.length >= 2}
      <section class="w-[min(100%,28rem)] grid gap-[.55rem]" aria-label={labels.chooseArticle}>
        <p class="m-0 text-accent text-[.6rem] font-black tracking-[.1em] text-center uppercase">{labels.chooseArticle}</p>
        <div class="grid gap-[.45rem]" style={`grid-template-columns:repeat(${Math.min(prompt.choices.length, 3)},minmax(0,1fr));`}>
          {#each prompt.choices as choice}
            <button
              type="button"
              value={choice}
              onclick={chooseAnswer}
              disabled={answerStatus !== null}
              class="min-h-[2.8rem] px-[.75rem] py-[.55rem] flex items-center justify-center gap-[.4rem] border text-[.85rem] font-extrabold touch-manipulation active:scale-[.985] disabled:opacity-100 {optionStateClasses(choice)}"
            >{choice}{#if answerStatus !== null && choice === prompt.correct}<IconCheck class="w-[1.15rem] h-[1.15rem] flex-none text-[#fffdf7]" aria-label={labels.correct} />{:else if answerStatus === 'wrong' && choice === selectedChoice}<IconClose class="w-[1.15rem] h-[1.15rem] flex-none text-error" aria-label={labels.tryAgain} />{/if}</button>
          {/each}
        </div>
        {#if answerStatus}<button class="justify-self-center min-h-[2.45rem] px-[1rem] border border-[#172a45] bg-[#172a45] text-[#fffdf7] text-[.64rem] font-black tracking-[.08em] uppercase shadow-[3px_3px_0_#e6a527]" onclick={continueLearning}>{labels.continue}</button>{/if}
      </section>
    {/if}
  {/if}
</section>
