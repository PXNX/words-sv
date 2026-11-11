<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { recordAnswer } from '#lib/profile/cosmetics.svelte.js';
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import { playSuccessSound, playErrorSound } from '#lib/feedback/sounds.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools, wordMetadata } from '#lib/data/vocabulary.js';
  import { m } from '#lib/paraglide/messages.js';
  import { recordMissedWord } from '#lib/story/missedWords.js';
  import Companion from '#lib/story/Companion.svelte';
  import { prioritizeLearningWords, updateReviewProgress } from '#lib/vocab/spacedRepetition.js';
  import { dueReviewEntries, recordReview } from '#lib/review/ledger.js';
  import { articleChoiceOptions, gapSentenceSuffixes, grammarArticles, pickRandomSection, shuffled, GRAMMAR_REVIEW_STORAGE_PREFIX } from '#lib/grammar/learning.js';
  import { buildNounCasePrompt, buildNounPropertyPrompt, genderFeature, isDeclinableNoun, type GrammarPrompt } from '#lib/grammar/cases.js';
  import { adjectiveStem, buildAdjectivePrompt, isEligibleAdjective } from '#lib/grammar/adjectives.js';
  import { formCountsAsRight, scoreForm, type FormScore } from '#lib/grammar/formAnswer.js';
  import { buildVerbPrompt, buildVerbPropertyPrompt, verbConjugations } from '#lib/grammar/verbs.js';
  import { buildFalseFriendPrompt, falseFriendsFor } from '#lib/grammar/falseFriends.js';
  import { isSentenceLanguage, matchOrder, orderExercisePool, shuffleTiles } from '#lib/grammar/sentenceBuilder.js';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import { gradeFromAnswer } from '#lib/review/scheduler.js';
  import { insertLearningRepeat } from '#lib/vocab/learning.js';
  import IconClose from '~icons/material-symbols/close-rounded';

  type AnswerStatus = 'correct' | 'wrong' | null;

  const labels = $derived({
    title: m.grammar_title({}, { locale: settings.interfaceLocale }),
    unavailable: m.grammar_unavailable({}, { locale: settings.interfaceLocale }),
    unsupported: m.grammar_unsupported({}, { locale: settings.interfaceLocale }),
    chooseArticle: m.grammar_choose_article({}, { locale: settings.interfaceLocale }),
    continue: m.continue({}, { locale: settings.interfaceLocale }),
    correct: m.learning_correct({}, { locale: settings.interfaceLocale }),
    tryAgain: m.learning_try_again({}, { locale: settings.interfaceLocale }),
    orderTitle: m.grammar_order({}, { locale: settings.interfaceLocale }),
    orderPrompt: m.grammar_order_prompt({}, { locale: settings.interfaceLocale }),
    orderReset: m.grammar_order_reset({}, { locale: settings.interfaceLocale }),
    orderUnsupported: m.grammar_order_unsupported({}, { locale: settings.interfaceLocale }),
    formsTitle: m.grammar_forms({}, { locale: settings.interfaceLocale }),
    formsPrompt: m.grammar_forms_prompt({}, { locale: settings.interfaceLocale }),
    formsCheck: m.grammar_forms_check({}, { locale: settings.interfaceLocale }),
    formsUnsupported: m.grammar_forms_unsupported({}, { locale: settings.interfaceLocale }),
    formsVerdict: (verdict: FormScore['verdict'], correct: string) =>
      verdict === 'case' ? m.grammar_forms_case({ correct }, { locale: settings.interfaceLocale })
      : verdict === 'spelling' ? m.grammar_forms_spelling({ correct }, { locale: settings.interfaceLocale })
      : verdict === 'typo' ? m.grammar_forms_typo({ correct }, { locale: settings.interfaceLocale })
      : m.grammar_forms_wrong({ correct }, { locale: settings.interfaceLocale })
  });

  // German gets the full case/adjective/verb engine below (`cases.ts`, `adjectives.ts`,
  // `verbs.ts`); every other supported language falls back to the original single
  // nominative-article drill, since only German has case, adjective-ending and
  // hand-checked verb-conjugation data to draw on.
  const isGerman = $derived(settings.lang === 'de');
  // False friends exist for learning German and English, seen from the interface language.
  const falseFriends = $derived(falseFriendsFor(settings.lang, settings.interfaceLocale));
  const falseFriendPairs = $derived(falseFriends?.pairs ?? []);
  const grammarMode = $derived(
    page.url.searchParams.get('mode') === 'determine' ? 'determine'
    : page.url.searchParams.get('mode') === 'order' ? 'order'
    : page.url.searchParams.get('mode') === 'falsefriends' ? 'falsefriends'
    : page.url.searchParams.get('mode') === 'forms' ? 'forms'
    : 'fill'
  );
  const modeTitle = $derived(
    grammarMode === 'order' ? labels.orderTitle
    : grammarMode === 'determine' ? 'Bestimmung'
    : grammarMode === 'falsefriends' ? 'Falsche Freunde'
    : grammarMode === 'forms' ? labels.formsTitle
    : 'Lücken füllen'
  );
  const metadata = $derived(wordMetadata[settings.lang]);
  // Word order works for German and English: generated sentences plus hand-checked ones for the
  // level (`sentenceBuilder.ts`). The vocabulary's genders veto any lexicon noun they disagree with.
  const orderPool = $derived(grammarMode === 'order' && isSentenceLanguage(settings.lang) ? orderExercisePool(settings.lang, settings.vocabularyLevel, { metadata }) : []);
  const articleUniverse = $derived(grammarArticles[settings.lang] ?? []);
  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);

  const nounPool = $derived(words.filter((word) => Boolean(metadata[word]?.article) && Boolean(metadata[word]?.gender) && isDeclinableNoun(metadata[word]?.spelling ?? word)));
  const adjectivePool = $derived(words.filter((word) => metadata[word]?.type === 'adjective' && isEligibleAdjective(metadata[word]?.spelling ?? word)));
  const verbPool = $derived(words.filter((word) => Boolean(verbConjugations[word])));
  const legacyArticleWords = $derived(words.filter((word) => Boolean(metadata[word]?.article)));

  const eligibleKeys = $derived(
    grammarMode === 'falsefriends'
      ? falseFriendPairs.map((pair) => `ff:${pair.word}`)
      : grammarMode === 'order'
      ? orderPool.map((exercise) => `order:${exercise.id}`)
      : grammarMode === 'forms'
      ? isGerman ? [...verbPool.map((word) => `verb:${word}`), ...adjectivePool.map((word) => `adj:${word}`)] : []
      : isGerman
      ? grammarMode === 'determine'
        ? [...nounPool.map((word) => `noun:${word}`), ...verbPool.map((word) => `verb:${word}`)]
        : [...nounPool.map((word) => `noun:${word}`), ...adjectivePool.map((word) => `adj:${word}`), ...verbPool.map((word) => `verb:${word}`)]
      : legacyArticleWords.map((word) => `article:${word}`)
  );
  const isSupported = $derived(
    grammarMode === 'falsefriends'
      ? falseFriendPairs.length > 0
      : grammarMode === 'order'
      ? orderPool.length > 0
      : grammarMode === 'forms'
      ? isGerman && verbPool.length + adjectivePool.length > 0
      : isGerman
      ? nounPool.length + adjectivePool.length + verbPool.length > 0
      : articleUniverse.length > 0
  );

  let section = $state<string[]>([]);
  let queue = $state<string[]>([]);
  let position = $state(0);
  // When the current prompt appeared, so the answer can be graded by how long it took.
  let shownAt = 0;
  // A missed item comes back a few prompts later, not at the very end: spaced, but still fresh.
  function requeue(key: string) {
    queue = insertLearningRepeat(queue, position, key);
  }
  function gradeNow(correct: boolean) {
    return gradeFromAnswer(correct, shownAt ? performance.now() - shownAt : null, queue.indexOf(currentKey) === position && !queue.slice(0, position).includes(currentKey));
  }
  let answerStatus = $state<AnswerStatus>(null);
  let selectedChoice = $state<string | null>(null);
  let prompt = $state<GrammarPrompt | null>(null);
  let sourceKey = $state('');
  let choiceKey = $state('');
  let reviewProgress = $state<Record<string, { repetitions: number; dueAt: number }>>({});
  let orderWords = $state<string[]>([]);
  let selectedOrder = $state<number[]>([]);
  // The correct sentence the learner built, with its punctuation, once it matches.
  let orderSolution = $state<string | null>(null);
  // The typed form in the Formen mode and how much credit it earned.
  let typedForm = $state('');
  let formScore = $state<FormScore | null>(null);

  const currentKey = $derived(queue[position] ?? '');
  const currentOrderExercise = $derived(currentKey.startsWith('order:') ? orderPool.find((exercise) => exercise.id === currentKey.slice('order:'.length)) ?? null : null);

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
    // Words the learner marked in reading (or got wrong elsewhere) take up to three slots, so the
    // shared review ledger actually changes what grammar asks next.
    const dueKeys = new Set(dueReviewEntries(settings.lang).map(({ item }) => item));
    const dueFirst = prioritized.filter((key) => dueKeys.has(key.toLocaleUpperCase()));
    const focus = dueFirst.slice(0, 3);
    const rest = prioritized.filter((key) => !focus.includes(key));
    section = [...focus, ...pickRandomSection(rest, random, 6 - focus.length)];
    queue = [...section];
    position = 0;
  }
  function buildPromptForKey(key: string): GrammarPrompt | null {
    const separator = key.indexOf(':');
    const kind = key.slice(0, separator);
    const word = key.slice(separator + 1);
    if (kind === 'order') return currentOrderExercise ? { before: '', after: '', correct: currentOrderExercise.answers[0]!, choices: [], question: labels.orderPrompt } : null;
    if (kind === 'ff') {
      const pair = falseFriendPairs.find((candidate) => candidate.word === word);
      return pair ? buildFalseFriendPrompt(pair, falseFriendPairs, random, shuffled, m.false_friends_question({}, { locale: settings.interfaceLocale })) : null;
    }
    if (kind === 'article') {
      const article = metadata[word]?.article;
      if (!article) return null;
      const spelling = metadata[word]?.spelling ?? word;
      const after = gapSentenceSuffixes[settings.lang]?.(spelling) ?? spelling;
      const choices = articleChoiceOptions(article, articleUniverse, random);
      if (choices.length < 2) return null;
      const gender = metadata[word]?.gender;
      return { before: '', after, correct: article, choices, ...(settings.lang === 'de' && gender ? { features: [genderFeature(gender)] } : {}) };
    }
    if (kind === 'noun') {
      const gender = metadata[word]?.gender;
      if (!gender) return null;
      return grammarMode === 'determine'
        ? buildNounPropertyPrompt(metadata[word]?.spelling ?? word, gender, random, shuffled)
        : buildNounCasePrompt(metadata[word]?.spelling ?? word, gender, random, shuffled);
    }
    if (kind === 'adj') {
      if (nounPool.length === 0) return null;
      const pairedNoun = nounPool[Math.floor(random() * nounPool.length)]!;
      const gender = metadata[pairedNoun]?.gender;
      if (!gender) return null;
      const adjectiveSpelling = metadata[word!]?.spelling ?? word!;
      const nounSpelling = metadata[pairedNoun]?.spelling ?? pairedNoun;
      return buildAdjectivePrompt(adjectiveSpelling, nounSpelling, gender, random, shuffled);
    }
    if (kind === 'verb') return grammarMode === 'determine' ? buildVerbPropertyPrompt(word, random, shuffled) : buildVerbPrompt(word, random, shuffled);
    return null;
  }
  // The dictionary form shown under a Formen gap, and the word's other forms (never counted as typos).
  function formLemma(key: string): string {
    const [kind, word = ''] = key.split(':');
    return kind === 'verb' ? word.toLocaleLowerCase('de') : (metadata[word]?.spelling ?? word).toLocaleLowerCase('de');
  }
  function otherForms(key: string): string[] {
    const [kind, word = ''] = key.split(':');
    if (kind === 'verb') return [...(verbConjugations[word]?.forms ?? []), word.toLocaleLowerCase('de')];
    const stem = adjectiveStem(metadata[word]?.spelling ?? word);
    return ['e', 'en', 'er', 'es', 'em'].map((ending) => `${stem}${ending}`);
  }
  function checkForm(event: SubmitEvent) {
    event.preventDefault();
    if (answerStatus || !prompt || !typedForm.trim()) return;
    const score = scoreForm(typedForm, prompt.correct, otherForms(currentKey));
    formScore = score;
    const right = formCountsAsRight(score);
    answerStatus = right ? 'correct' : 'wrong';
    recordAnswer('grammar', score.verdict === 'exact');
    // A slip still counts as known, but as a hard answer, so it comes back sooner.
    const grade = score.verdict === 'exact' ? gradeNow(true) : right ? 'hard' : gradeNow(false);
    reviewProgress = updateReviewProgress(reviewProgress, currentKey, right, Date.now(), grade);
    persistProgress();
    recordReview(settings.lang, currentKey, right, 'grammar', Date.now(), grade, { score: score.credit, ...(prompt.features ? { features: prompt.features } : {}) });
    if (right) { playSuccessSound(settings.sound, 'grammar'); void settings.recordStreak('grammar_correct'); }
    else { playErrorSound(settings.sound, 'grammar'); recordMissedGrammarWord(currentKey); requeue(currentKey); }
  }
  function resetPrompt() {
    typedForm = '';
    formScore = null;
    answerStatus = null;
    selectedChoice = null;
    shownAt = performance.now();
    selectedOrder = [];
    orderSolution = null;
    orderWords = grammarMode === 'order' && currentOrderExercise ? shuffleTiles(currentOrderExercise, shuffled, random) : [];
    prompt = currentKey ? buildPromptForKey(currentKey) : null;
  }
  function chooseOrderWord(index: number) {
    if (answerStatus || selectedOrder.includes(index)) return;
    const next = [...selectedOrder, index];
    selectedOrder = next;
    if (next.length === orderWords.length && currentOrderExercise) {
      // Any correct order counts, e.g. "Heute kauft sie …" as well as "Sie kauft heute …".
      orderSolution = matchOrder(currentOrderExercise, next.map((item) => orderWords[item]!));
      answerStatus = orderSolution ? 'correct' : 'wrong';
      recordAnswer('grammar', answerStatus === 'correct');
      if (answerStatus === 'correct') { playSuccessSound(settings.sound, 'grammar'); void settings.recordStreak('grammar_correct'); }
      else { playErrorSound(settings.sound, 'grammar'); requeue(currentKey); }
      const grade = gradeNow(answerStatus === 'correct');
      reviewProgress = updateReviewProgress(reviewProgress, currentKey, answerStatus === 'correct', Date.now(), grade);
      persistProgress();
      recordReview(settings.lang, currentKey, answerStatus === 'correct', 'grammar', Date.now(), grade);
    }
  }
  function resetOrder() { selectedOrder = []; answerStatus = null; orderSolution = null; }
  // The words picked so far, read as the start of a sentence, with the target's closing mark so a question shows as one.
  function orderPreview() {
    if (orderSolution) return orderSolution;
    if (selectedOrder.length === 0) return '…';
    const text = selectedOrder.map((index) => orderWords[index]).join(' ');
    const mark = selectedOrder.length === orderWords.length ? (currentOrderExercise?.answers[0]?.slice(-1) ?? '') : ' …';
    return `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}${mark}`;
  }
  function chooseAnswer(event: MouseEvent) {
    if (answerStatus || !prompt) return;
    const chosen = (event.currentTarget as HTMLButtonElement).value;
    if (!chosen) return;
    const correct = chosen === prompt.correct;
    selectedChoice = chosen;
    answerStatus = correct ? 'correct' : 'wrong';
    recordAnswer('grammar', correct);
    const grade = gradeNow(correct);
    reviewProgress = updateReviewProgress(reviewProgress, currentKey, correct, Date.now(), grade);
    persistProgress();
    recordReview(settings.lang, currentKey, correct, 'grammar', Date.now(), grade, settings.lang === 'de' && prompt.features ? { features: prompt.features } : {});
    if (correct) { playSuccessSound(settings.sound, 'grammar'); void settings.recordStreak('grammar_correct'); }
    else { playErrorSound(settings.sound, 'grammar'); recordMissedGrammarWord(currentKey); requeue(currentKey); }
  }
  // Word-based grammar prompts (noun:…, adj:…, verb:…, article:…) feed the story mode's practice list.
  function recordMissedGrammarWord(key: string) {
    const [kind, word] = key.split(':');
    if (kind && word && ['noun', 'adj', 'verb', 'article'].includes(kind)) recordMissedWord(settings.lang, word);
  }
  function continueLearning() {
    position = position >= queue.length - 1 ? 0 : position + 1;
  }
  function optionStateClasses(choice: string) {
    if (!prompt) return '';
    if (answerStatus === 'wrong' && choice === prompt.correct) return 'bg-success text-[#fffdf7] !opacity-100 learn-reveal';
    if (answerStatus !== null && choice === prompt.correct) return 'bg-success text-[#fffdf7] !opacity-100';
    if (answerStatus === 'wrong' && choice === selectedChoice) return 'border-[#c0392b] bg-[#fdecea] text-[#b03224] shadow-none !opacity-100 dark:border-[#f08a7e] dark:bg-[#5a2420] dark:text-[#ffc2b8]';
    return '';
  }

  $effect(() => {
    const nextSourceKey = `${settings.lang}|${settings.vocabularyLevel}|${grammarMode}|${eligibleKeys.join('|')}`;
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
  class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-x-hidden overflow-y-auto bg-[color:#ede4d5] dark:bg-[color:#213a5d] bg-[image:radial-gradient(circle_at_50%_15%,rgba(230,165,39,.18),transparent_34%),linear-gradient(rgba(23,42,69,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(23,42,69,.018)_1px,transparent_1px)] bg-[length:auto,24px_24px,24px_24px]"
  aria-label={labels.title}
>
  <header class="flex items-end justify-center gap-[.6rem]">
    <div class="text-center">
      <span class="text-accent text-[.58rem] font-extrabold tracking-[.14em] uppercase">{labels.title} · {settings.vocabularyLevel.toUpperCase()}</span>
      <h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">{modeTitle}</h1>
      <p class="m-0 text-base-content/60 text-[.65rem] font-extrabold">{num(Math.min(position + 1, queue.length))} / {num(queue.length || 6)}</p>
    </div>
    <Companion id="tom" mood={answerStatus === 'correct' ? 'happy' : answerStatus === 'wrong' ? 'sad' : 'curious'} size="sm" />
  </header>
  {#if !isSupported}
    <div class="max-w-[24rem] m-0 p-[1.2rem] border border-accent/42 bg-[rgba(255,253,247,.8)] text-accent text-[.75rem] font-bold leading-[1.45] text-center">{grammarMode === 'falsefriends' ? 'Falsche Freunde sind aktuell nur für Deutsch verfügbar.' : grammarMode === 'order' ? labels.orderUnsupported : grammarMode === 'forms' ? labels.formsUnsupported : labels.unsupported}</div>
  {:else if !prompt}
    <div class="max-w-[24rem] m-0 p-[1.2rem] border border-accent/42 bg-[rgba(255,253,247,.8)] text-accent text-[.75rem] font-bold leading-[1.45] text-center">{labels.unavailable}</div>
  {:else}
    {#if grammarMode === 'order'}
      {#key position}<article class="learn-card-in w-[min(100%,28rem)] min-h-[8.2rem] grid content-center justify-items-center gap-4 p-[clamp(1.2rem,6vw,2rem)] panel-play text-center" class:learn-correct={answerStatus === 'correct'} class:learn-wrong={answerStatus === 'wrong'}>
        <p class="m-0 text-accent text-[.62rem] font-black tracking-[.08em] uppercase">{labels.orderPrompt}</p>
        <p class="m-0 min-h-[2.2rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.35rem,6vw,2.1rem)] leading-[1.3]" lang={settings.lang}>{orderPreview()}</p>
      </article>{/key}
      <div class="w-[min(100%,28rem)] flex flex-wrap justify-center gap-[.45rem]" lang={settings.lang}>{#each orderWords as word, index}<button type="button" class="btn-play btn-play-choice min-h-[2.55rem] px-[.75rem] text-[.75rem] {selectedOrder.includes(index) ? 'border-neutral/30 bg-neutral/20 text-base-content/35 shadow-none' : ''}" onclick={() => chooseOrderWord(index)} disabled={selectedOrder.includes(index) || answerStatus !== null}>{word}</button>{/each}</div>
      <!-- The feedback has its own slot, so the word tiles above stay where they are. -->
      <div class="grid justify-items-center content-start gap-[.45rem] min-h-[5.4rem]">
      {#if answerStatus === 'wrong'}
        <div class="flex items-center gap-[.35rem] text-error text-[.7rem] font-extrabold"><IconClose class="w-[1rem] h-[1rem]" aria-hidden="true" />{labels.tryAgain}</div>
        <div class="flex flex-wrap justify-center gap-[.45rem]">
          <button class="btn-play btn-play-sm text-accent" onclick={resetOrder}>{labels.orderReset}</button>
        </div>
      {:else if answerStatus === 'correct'}
        <div class="flex items-center gap-[.35rem] text-success text-[.7rem] font-extrabold"><IconCheck class="w-[1rem] h-[1rem]" aria-hidden="true" />{labels.correct}</div>
        <div class="flex flex-wrap justify-center gap-[.45rem]">
          <button class="btn-play btn-play-ink" onclick={continueLearning}>{labels.continue}</button>
        </div>
      {/if}
      </div>
    {:else}
    {#key position}<article class="learn-card-in w-[min(100%,28rem)] min-h-[8.2rem] grid content-center justify-items-center gap-4 p-[clamp(1.2rem,6vw,2rem)] panel-play text-center" class:learn-correct={answerStatus === 'correct'} class:learn-wrong={answerStatus === 'wrong'}>
            {#if prompt.question}<p class="m-0 text-accent text-[.62rem] font-black tracking-[.08em] uppercase">{prompt.question}</p>{/if}
            <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(1.55rem,7vw,2.6rem)] font-normal tracking-[.04em] leading-[1.3]" lang={settings.lang}>{#if prompt.before}{prompt.before}{/if}{#if prompt.question}{#if prompt.highlight && prompt.after.includes(prompt.highlight)}{@const highlightIndex = prompt.after.indexOf(prompt.highlight)}{prompt.after.slice(0, highlightIndex)}<mark class="bg-primary/25 text-accent px-[.15rem]">{prompt.highlight}</mark>{prompt.after.slice(highlightIndex + prompt.highlight.length)}{:else}{prompt.after}{/if}{:else}<span class="inline-block border-b-4 border-dotted border-accent text-accent px-[.3rem]">___</span> {prompt.after}{/if}</p>
    </article>{/key}
    {#if grammarMode === 'forms'}
      <form class="w-[min(100%,28rem)] grid gap-[.55rem]" onsubmit={checkForm} aria-label={labels.formsPrompt}>
        <p class="m-0 text-accent text-[.6rem] font-black tracking-[.1em] text-center uppercase">{labels.formsPrompt} · <span class="normal-case tracking-normal" lang={settings.lang}>{formLemma(currentKey)}</span></p>
        <div class="flex gap-[.45rem]">
          <!-- svelte-ignore a11y_autofocus -->
          <input class="input input-bordered flex-1 min-w-0 text-[1rem] font-bold" bind:value={typedForm} lang={settings.lang} autocomplete="off" autocapitalize="off" spellcheck="false" readonly={answerStatus !== null} aria-label={labels.formsPrompt} autofocus />
          <button type="submit" class="btn-play btn-play-ink" disabled={answerStatus !== null || !typedForm.trim()}>{labels.formsCheck}</button>
        </div>
        <!-- A fixed slot for the verdict and Continue, so nothing above moves when they appear. -->
        <div class="grid justify-items-center gap-[.45rem] min-h-[5.4rem] {answerStatus ? '' : 'invisible'}" aria-live="polite">
          {#if formScore && prompt}
            <p class="m-0 flex items-center gap-[.35rem] text-[.72rem] font-extrabold {formScore.verdict === 'exact' ? 'text-success' : formScore.credit >= 0.75 ? 'text-accent' : 'text-error'}">
              {#if formScore.verdict === 'exact'}<IconCheck class="w-[1rem] h-[1rem]" aria-hidden="true" />{labels.correct}{:else}{#if formScore.credit < 0.75}<IconClose class="w-[1rem] h-[1rem]" aria-hidden="true" />{/if}<span lang={settings.lang}>{labels.formsVerdict(formScore.verdict, prompt.correct)}</span>{/if}
            </p>
          {/if}
          <button type="button" class="btn-play btn-play-ink" onclick={continueLearning} tabindex={answerStatus ? 0 : -1}>{labels.continue}</button>
        </div>
      </form>
    {:else if prompt.choices.length >= 2}
      <section class="w-[min(100%,28rem)] grid gap-[.55rem]" aria-label={labels.chooseArticle}>
        <p class="m-0 text-accent text-[.6rem] font-black tracking-[.1em] text-center uppercase">{labels.chooseArticle}</p>
        <div class="grid gap-[.45rem]" style={`grid-template-columns:repeat(${grammarMode === 'determine' ? 2 : Math.min(prompt.choices.length, 3)},minmax(0,1fr));`}>
          {#each prompt.choices as choice}
            <button
              type="button"
              value={choice}
              lang={grammarMode === 'falsefriends' ? falseFriends?.source : undefined}
              onclick={chooseAnswer}
              disabled={answerStatus !== null}
              class="btn-play btn-play-choice gap-[.4rem] text-[.85rem] touch-manipulation disabled:opacity-100 {optionStateClasses(choice)}"
            >{choice}{#if answerStatus !== null && choice === prompt.correct}<IconCheck class="w-[1.15rem] h-[1.15rem] flex-none text-[#fffdf7]" aria-label={labels.correct} />{:else if answerStatus === 'wrong' && choice === selectedChoice}<IconClose class="w-[1.15rem] h-[1.15rem] flex-none text-[#c0392b] dark:text-[#ffc2b8]" aria-label={labels.tryAgain} />{/if}</button>
          {/each}
        </div>
        <!-- Kept in place (invisible until answered), so the choices above never move. -->
        <div class="flex flex-wrap justify-center gap-[.45rem] {answerStatus ? '' : 'invisible'}" aria-hidden={!answerStatus}>
          <button class="btn-play btn-play-ink" onclick={continueLearning} tabindex={answerStatus ? 0 : -1}>{labels.continue}</button>
        </div>
      </section>
    {/if}
    {/if}
  {/if}
</section>
