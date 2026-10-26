<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { playSuccessSound, playErrorSound } from '#lib/sounds.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { spokenWord, wordPools, wordDefinitions } from '#lib/data/vocabulary.js';
  import { m } from '#lib/paraglide/messages.js';
  import { definitionChoiceWords, insertLearningRepeat, pickReviewSection } from '#lib/vocab/learning.js';
  import { recordMissedWord } from '#lib/story/missedWords.js';
  import Companion from '#lib/story/Companion.svelte';
  import { naturalNarratorVoice, naturalState, naturalSupported } from '#lib/story/naturalVoices.svelte.js';
  import WordBankLoader from '#lib/audio/WordBankLoader.svelte';
  import { cancelWordBank, hasWordAudio, playWordClip, prepareWordBank, wordBankState, wordBankStateKey } from '#lib/audio/wordBank.svelte.js';
  import { VOCABULARY_REVIEW_STORAGE_PREFIX, markWordForRepeat, updateReviewProgress } from '#lib/vocab/spacedRepetition.js';
  import { REPAIR_WORDS } from '#lib/clientStreak.js';
  import { dueReviewEntries, recordReview } from '#lib/review/ledger.js';
  import { page } from '$app/state';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';

  type PromptKind = 'word' | 'audio';
  type AnswerStatus = 'correct' | 'wrong' | null;

  const REVIEW_STORAGE_KEY = VOCABULARY_REVIEW_STORAGE_PREFIX;

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
    tryAgain: m.learning_try_again({}, { locale: settings.interfaceLocale }),
    rateHint: m.learning_rate_hint({}, { locale: settings.interfaceLocale }),
    again: m.learning_again({}, { locale: settings.interfaceLocale }),
    hard: m.learning_hard({}, { locale: settings.interfaceLocale }),
    known: m.learning_known({}, { locale: settings.interfaceLocale }),
    recapTitle: m.vocab_recap_title({}, { locale: settings.interfaceLocale }),
    recapScore: (correct: number, total: number) => m.vocab_recap_score({ correct, total }, { locale: settings.interfaceLocale }),
    recapTricky: m.vocab_recap_tricky({}, { locale: settings.interfaceLocale }),
    recapPractise: (count: number) => m.vocab_recap_practise({ count }, { locale: settings.interfaceLocale }),
    recapNew: m.vocab_recap_new({}, { locale: settings.interfaceLocale }),
    recapNone: m.vocab_recap_none({}, { locale: settings.interfaceLocale }),
    repairTitle: m.streak_repair_title({}, { locale: settings.interfaceLocale }),
    repairHint: (count: number, need: number) => m.streak_repair_hint({ count, need }, { locale: settings.interfaceLocale }),
    repairProgress: (done: number, need: number) => m.streak_repair_progress({ done, need }, { locale: settings.interfaceLocale }),
    repairDone: (count: number) => m.streak_repair_done({ count }, { locale: settings.interfaceLocale }),
    repairNone: m.streak_repair_none({}, { locale: settings.interfaceLocale }),
    home: m.home_button({}, { locale: settings.interfaceLocale }),
    progress: m.stats_title({}, { locale: settings.interfaceLocale }),
    bankLoading: m.word_bank_loading({}, { locale: settings.interfaceLocale })
  });
  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
  const definitions = $derived(wordDefinitions[settings.lang]);
  // Natural word audio only plays when the learner chose the neural voices; every other setup keeps
  // the browser voice and sees no loading screen.
  const naturalMode = $derived(settings.voiceQuality === 'natural' && naturalSupported());
  const bankKey = $derived(wordBankStateKey(settings.lang, settings.vocabularyLevel));
  const bankDone = $derived(wordBankState.done[bankKey] ?? 0);
  const bankTotal = $derived(wordBankState.total[bankKey] ?? words.length);
  const bankProgress = $derived(
    naturalState.status[settings.lang] === 'loading'
      ? naturalState.progress[settings.lang] ?? 0
      : bankTotal ? bankDone / bankTotal : 0
  );
  const bankVoice = $derived(naturalNarratorVoice(settings.lang));

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
  // A session now has an ending: after the second pass it stops and shows what to repeat,
  // instead of circling the same queue forever.
  let sessionDone = $state(false);
  let sessionId = $state(0);
  let attempted = $state<string[]>([]);
  let tricky = $state<string[]>([]);
  let firstTry = $state<string[]>([]);
  // The first round waits for its own six words; the rest of the level keeps rendering behind the
  // scenes, so the loading screen is never in the way for long.
  let audioReady = $state(true);
  let audioRun = 0;
  let naturalPlayback: { stop: () => void } | null = null;
  const canHear = $derived(speechSupported || naturalMode);

  // `/vocab?due=1` is the Repeat hub's mixed session: only words that the shared ledger says are
  // due, drawn from reading marks, grammar answers, pronunciation and earlier vocabulary rounds.
  // `/vocab?repair=1` is the short session that restores a streak broken by exactly one missed day.
  const repairMode = $derived(page.url.searchParams.get('repair') === '1');
  let repairCount = $state(0);
  let repairDone = $state(false);
  let repairAvailable = $state(false);
  const dueMode = $derived(page.url.searchParams.get('due') === '1');
  const currentWord = $derived(queue[position] ?? '');
  const currentDefinition = $derived(definitions[currentWord] ?? '');
  const currentDisplayWord = $derived(displayWord(currentWord));
  const definitionWords = $derived(words.map((word) => word.trim().toUpperCase()).filter((word) => Boolean(definitions[word])));
  const isDefinitionPrompt = $derived(promptKind === 'word');

  function random() { return Math.random(); }
  function speechLocale() { return ({ de: 'de-DE', en: 'en-US', fr: 'fr-FR', it: 'it-IT', es: 'es-ES', pt: 'pt-PT', uk: 'uk-UA' } as Record<string, string>)[settings.lang] ?? settings.lang; }
  // Pools are uppercased for matching; the shared helper restores the dictionary spelling and the
  // article, so German nouns read "Abfahrt" rather than "ABFAHRT".
  function displayWord(word: string) { return spokenWord(settings.lang, word); }
  function cancelSpeech() {
    naturalPlayback?.stop();
    naturalPlayback = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }
  function sleep(ms: number) { return new Promise<void>((resolve) => setTimeout(resolve, ms)); }
  // Renders the level's word bank and leaves the loading screen as soon as this round can be heard.
  async function prepareAudio(priority: string[]) {
    const run = ++audioRun;
    if (!naturalMode) { audioReady = true; return; }
    const lang = settings.lang;
    const level = settings.vocabularyLevel;
    audioReady = !priority.length;
    void prepareWordBank(lang, level, priority).catch(() => undefined);
    while (run === audioRun) {
      if (priority.every((word) => hasWordAudio(lang, word))) break;
      if (wordBankState.status[wordBankStateKey(lang, level)] !== 'loading') break;
      await sleep(110);
    }
    if (run === audioRun) audioReady = true;
  }
  // The loader's escape hatch: the round falls back to the browser voice for anything not ready yet.
  function skipAudioPrep() {
    audioRun += 1;
    cancelWordBank();
    audioReady = true;
  }
  async function speak() {
    if (!currentWord) { speechStatus = labels.speechUnavailable; return; }
    speechStatus = '';
    cancelSpeech();
    if (naturalMode) {
      try {
        const playback = await playWordClip(settings.lang, currentWord);
        if (playback) { naturalPlayback = playback; return; }
      } catch { /* fall back to the browser voice */ }
    }
    if (!speechSupported) { speechStatus = labels.speechUnavailable; return; }
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
  function resetSessionState() {
    sessionDone = false;
    attempted = [];
    tricky = [];
    firstTry = [];
    repairCount = 0;
    repairDone = false;
    sessionId += 1;
  }
  function startSection() {
    cancelSpeech();
    reviewProgress = loadProgress();
    const due = dueMode
      ? dueReviewEntries(settings.lang).map(({ item }) => item).filter((item) => definitionWords.includes(item)).slice(0, 4)
      : [];
    const remaining = definitionWords.filter((word) => !due.includes(word));
    section = due.length
      ? [...due, ...pickReviewSection(remaining, reviewProgress, random, 6 - due.length)]
      : pickReviewSection(definitionWords, reviewProgress, random, 6);
    queue = [...section, ...section].sort(() => random() - .5);
    position = 0;
    resetSessionState();
    void prepareAudio(section);
  }
  // The recap's primary action: the same words that were still wrong at the end come back,
  // twice, so a second ending is earned rather than skipped.
  function startTricky() {
    cancelSpeech();
    reviewProgress = loadProgress();
    section = [...tricky];
    queue = [...section, ...section].sort(() => random() - .5);
    position = 0;
    resetSessionState();
    void prepareAudio(section);
  }
  function resetPrompt() {
    answerStatus = null;
    selectedChoice = null;
    if (!currentWord || !currentDefinition) { choiceWords = []; return; }
    promptKind = position % 2 === 0 ? 'word' : 'audio';
    choiceWords = definitionChoiceWords(currentWord, [...section, ...definitionWords], definitions, random);
  }
  function chooseAnswer(event: MouseEvent) {
    if (answerStatus || !currentWord || sessionDone) return;
    const chosenWord = (event.currentTarget as HTMLButtonElement).value;
    if (!chosenWord) return;
    const word = currentWord;
    const correct = chosenWord === word;
    const firstAttempt = !attempted.includes(word);
    selectedChoice = chosenWord;
    answerStatus = correct ? 'correct' : 'wrong';
    if (firstAttempt) attempted = [...attempted, word];
    if (correct) {
      if (firstAttempt) {
        firstTry = [...firstTry, word];
        if (repairMode && repairAvailable && repairCount < REPAIR_WORDS) {
          repairCount += 1;
          if (repairCount >= REPAIR_WORDS) finishRepair();
        }
      }
      tricky = tricky.filter((item) => item !== word);
    } else if (!tricky.includes(word)) {
      tricky = [...tricky, word];
    }
    reviewProgress = updateReviewProgress(reviewProgress, word, correct);
    persistProgress();
    recordReview(settings.lang, word, correct, 'vocab');
    if (correct) {
      playSuccessSound(settings.sound, 'vocab');
      // The repair reward qualifies the day itself; a normal event would race its sync.
      if (!(repairMode && repairAvailable)) void settings.recordStreak('vocab_correct');
    }
    else { playErrorSound(settings.sound, 'vocab'); recordMissedWord(settings.lang, word); queue = insertLearningRepeat(queue, position, word); }
  }
  function finishRepair() {
    repairDone = true;
    sessionDone = true;
    void settings.repairStreak().then(() => {
      repairAvailable = false;
    });
  }
  // A correct answer can still feel shaky. The three buttons steer the next review without
  // punishing a learner who simply wants to move on.
  function rateAnswer(kind: 'again' | 'hard' | 'good') {
    const word = currentWord;
    if (!word || answerStatus !== 'correct') return;
    if (kind === 'again') {
      reviewProgress = updateReviewProgress(reviewProgress, word, false);
      persistProgress();
      recordReview(settings.lang, word, false, 'vocab');
      recordMissedWord(settings.lang, word);
      firstTry = firstTry.filter((item) => item !== word);
      if (!tricky.includes(word)) tricky = [...tricky, word];
      queue = insertLearningRepeat(queue, position, word);
      playErrorSound(settings.sound, 'vocab');
    } else if (kind === 'hard') {
      // A lapse moves the word ahead of unseen material in the next session and in the Repeat hub.
      markWordForRepeat(settings.lang, word, Date.now(), 'vocab');
      reviewProgress = loadProgress();
      if (!tricky.includes(word)) tricky = [...tricky, word];
    }
    continueLearning();
  }
  function finishSession() {
    cancelSpeech();
    sessionDone = true;
  }
  function continueLearning() {
    cancelSpeech();
    if (position >= queue.length - 1) { finishSession(); return; }
    position += 1;
  }
  function optionText(word: string) { return isDefinitionPrompt ? definitions[word] : displayWord(word); }
  function optionStateClasses(word: string) {
    if (answerStatus !== null && word === currentWord) return 'bg-success text-[#fffdf7]';
    if (answerStatus === 'wrong' && word === selectedChoice) return 'border-accent bg-[#fff2e8] text-[#8e4322] shadow-none dark:bg-[#69332f] dark:text-[#fff7ed]';
    return '';
  }

  onMount(() => {
    repairAvailable = repairMode && Boolean(settings.repairCandidate());
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    if (!speechSupported) {
      if (!naturalMode) speechStatus = labels.speechUnavailable;
      return () => { cancelSpeech(); cancelWordBank(); };
    }
    const refreshVoices = () => {
      voices = window.speechSynthesis.getVoices();
      speechStatus = '';
    };
    refreshVoices();
    window.speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refreshVoices);
      cancelSpeech();
      cancelWordBank();
    };
  });

  $effect(() => {
    const nextSourceKey = `${settings.lang}|${settings.vocabularyLevel}|${settings.voiceQuality}|${settings.naturalModel}|${words.join('|')}|${dueMode}`;
    if (nextSourceKey === sourceKey) return;
    sourceKey = nextSourceKey;
    untrack(() => startSection());
  });
  $effect(() => {
    const nextChoiceKey = `${currentWord}|${section.join('|')}|${position}|${sessionId}`;
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
      <span class="text-accent text-[.58rem] font-extrabold tracking-[.14em] uppercase">{labels.section} · {settings.vocabularyLevel.toUpperCase()}</span>
      <h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">{labels.title}</h1>
      {#if audioReady}<p class="m-0 text-base-content/60 text-[.65rem] font-extrabold">{sessionDone ? queue.length : Math.min(position + 1, queue.length)} / {queue.length || 6}</p>{/if}
    </div>
    <Companion id="mia" mood={answerStatus === 'correct' ? 'happy' : answerStatus === 'wrong' ? 'sad' : sessionDone ? 'happy' : 'curious'} size="sm" />
  </header>
  {#if audioReady && repairMode && !sessionDone}
    <div class="w-[min(100%,28rem)] grid gap-[.3rem] px-[.9rem] py-[.65rem] panel-play text-center" aria-live="polite">
      <p class="m-0 text-accent text-[.58rem] font-black tracking-[.12em] uppercase">{labels.repairTitle}</p>
      {#if repairAvailable}
        <p class="m-0 text-base-content/70 text-[.66rem] font-bold leading-[1.4]">{labels.repairHint(settings.streak.bestStreak, REPAIR_WORDS)}</p>
        <p class="m-0 text-base-content text-[.7rem] font-extrabold tabular-nums">{labels.repairProgress(repairCount, REPAIR_WORDS)}</p>
      {:else}
        <p class="m-0 text-base-content/60 text-[.66rem] font-bold">{labels.repairNone}</p>
      {/if}
    </div>
  {/if}
  {#if !audioReady}
    <WordBankLoader
      level={settings.vocabularyLevel}
      label={labels.bankLoading}
      progress={bankProgress}
      done={bankDone}
      total={bankTotal}
      voice={bankVoice}
      oncontinue={skipAudioPrep}
    />
  {:else if repairMode && repairDone}
    <div class="w-[min(100%,28rem)] grid justify-items-center gap-[.7rem] p-[clamp(1.2rem,6vw,2rem)] panel-play text-center">
      <p class="m-0 text-accent text-[.6rem] font-black tracking-[.12em] uppercase">{labels.repairTitle}</p>
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(1.3rem,6vw,1.9rem)] leading-[1.15]">{labels.repairDone(settings.streak.streakCount)}</p>
      <div class="flex flex-wrap justify-center gap-[.5rem]">
        <a class="btn-play btn-play-ink" href="/progress">{labels.progress}</a>
        <a class="btn-play btn-play-soft" href="/">{labels.home}</a>
      </div>
    </div>
  {:else if sessionDone}
    <div class="w-[min(100%,28rem)] grid justify-items-center gap-[.7rem] p-[clamp(1.2rem,6vw,2rem)] panel-play text-center">
      <p class="m-0 text-accent text-[.6rem] font-black tracking-[.12em] uppercase">{labels.recapTitle}</p>
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(1.3rem,6vw,1.9rem)] leading-[1.15]">{labels.recapScore(firstTry.length, attempted.length)}</p>
      {#if tricky.length}
        <p class="m-0 text-base-content/70 text-[.68rem] font-extrabold">{labels.recapTricky}</p>
        <ul class="flex flex-wrap justify-center gap-[.35rem] m-0 p-0 list-none">
          {#each tricky as word (word)}<li class="px-[.55rem] py-[.25rem] border border-accent/35 rounded-full bg-[#f7e2b0] text-[#172a45] text-[.66rem] font-extrabold">{displayWord(word)}</li>{/each}
        </ul>
        <button type="button" class="btn-play btn-play-ink" onclick={startTricky}>{labels.recapPractise(tricky.length)}</button>
      {:else}
        <p class="m-0 text-success text-[.75rem] font-extrabold">{labels.recapNone}</p>
      {/if}
      <button type="button" class="btn-play btn-play-soft" onclick={startSection}>{labels.recapNew}</button>
    </div>
  {:else if !currentWord}
    <div class="max-w-[24rem] m-0 p-[1.2rem] border border-accent/42 bg-[rgba(255,253,247,.8)] text-accent text-[.75rem] font-bold leading-[1.45] text-center">{labels.unavailable}</div>
  {:else}
    <article
      class="w-[min(100%,28rem)] min-h-[8.2rem] grid content-center justify-items-center gap-4 p-[clamp(1.2rem,6vw,2rem)] panel-play text-center {promptKind === 'audio' ? 'bg-[linear-gradient(145deg,#fffdf7,#fff4d9)] dark:bg-[linear-gradient(145deg,#172a45,#294666)]' : ''}"
    >
      {#if promptKind === 'word'}
        <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(1.9rem,9vw,3.2rem)] font-normal tracking-[.06em] leading-none" lang={settings.lang}>{currentDisplayWord}</p>
      {:else}
        <button class="btn-play btn-play-ink" onclick={speak} disabled={!canHear}><IconVolume class="w-[1.1rem] h-[1.1rem]" aria-hidden="true" />{labels.listen}</button>
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
              class="btn-play btn-play-choice justify-between gap-[.65rem] text-[.72rem] font-bold leading-[1.3] text-left touch-manipulation disabled:opacity-100 {optionStateClasses(word)}"
            ><span class="flex-1">{optionText(word)}</span>{#if answerStatus !== null && word === currentWord}<IconCheck class="w-[1.25rem] h-[1.25rem] flex-none text-[#fffdf7]" aria-label={labels.correct} />{:else if answerStatus === 'wrong' && word === selectedChoice}<IconClose class="w-[1.25rem] h-[1.25rem] flex-none text-accent" aria-label={labels.tryAgain} />{/if}</button>
          {/each}
        </div>
        {#if answerStatus === 'correct'}
          <div class="grid gap-[.35rem]">
            <p class="m-0 text-center text-base-content/60 text-[.58rem] font-extrabold">{labels.rateHint}</p>
            <div class="flex flex-wrap justify-center gap-[.45rem]">
              <button class="btn-play btn-play-soft" onclick={() => rateAnswer('again')}>{labels.again}</button>
              <button class="btn-play btn-play-soft" onclick={() => rateAnswer('hard')}>{labels.hard}</button>
              <button class="btn-play btn-play-ink" onclick={() => rateAnswer('good')}>{labels.known}</button>
            </div>
          </div>
        {:else if answerStatus === 'wrong'}
          <div class="flex justify-center">
            <button class="btn-play btn-play-ink" onclick={continueLearning}>{labels.continue}</button>
          </div>
        {/if}
      </section>
    {:else}<p class="max-w-[24rem] m-0 text-base-content/60 text-[.75rem] font-bold leading-[1.45] text-center">{currentDefinition || labels.unavailable}</p>{/if}
  {/if}
</section>
