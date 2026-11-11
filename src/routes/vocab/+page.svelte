<script lang="ts">
  import { reportGroupScore } from '#lib/games/groupGame.svelte.js';
  import { vocabScore } from '#lib/games/groupGameRules.js';
  import { recordAnswer } from '#lib/profile/cosmetics.svelte.js';
  import { onMount, untrack } from 'svelte';
  import { playSuccessSound, playErrorSound } from '#lib/feedback/sounds.js';
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
  import { REPAIR_WORDS } from '#lib/streak/clientStreak.js';
  import { dueReviewEntries, recordReview } from '#lib/review/ledger.js';
  import { page } from '$app/state';
  import IconCheck from '~icons/material-symbols/check-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';
  import IconVolume from '~icons/material-symbols/volume-up-rounded';
  import GenderedWord from '#lib/learn/GenderedWord.svelte';
  import SessionDots, { type DotState } from '#lib/learn/SessionDots.svelte';
  import { gradeFromAnswer, type Grade } from '#lib/review/scheduler.js';
  import type { ReviewProgress } from '#lib/vocab/spacedRepetition.js';
  import { checkTyped, isBuildable, isRecall, pickPromptKind, scrambleLetters, type PromptKind } from '#lib/learn/modality.js';
  import { pictureFor } from '#lib/learn/pictures.js';
  import { wordMetadata } from '#lib/data/vocabulary.js';
  import PhysicsTiles from '#lib/app/PhysicsTiles.svelte';
  import IconHint from '~icons/material-symbols/lightbulb-rounded';
  import IconBackspace from '~icons/material-symbols/backspace-rounded';

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
    picturePrompt: m.learning_picture_prompt({}, { locale: settings.interfaceLocale }),
    typePrompt: m.learning_type_prompt({}, { locale: settings.interfaceLocale }),
    dictationPrompt: m.learning_dictation_prompt({}, { locale: settings.interfaceLocale }),
    buildPrompt: m.learning_build_prompt({}, { locale: settings.interfaceLocale }),
    check: m.learning_check({}, { locale: settings.interfaceLocale }),
    hint: m.learning_hint({}, { locale: settings.interfaceLocale }),
    almost: m.learning_almost({}, { locale: settings.interfaceLocale }),
    answerWas: m.learning_answer_was({}, { locale: settings.interfaceLocale }),
    typePlaceholder: m.learning_type_placeholder({}, { locale: settings.interfaceLocale }),
    removeLetter: m.learning_remove_letter({}, { locale: settings.interfaceLocale }),
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
  const naturalMode = $derived(settings.clipVoices && naturalSupported());
  const bankKey = $derived(wordBankStateKey(settings.lang, settings.vocabularyLevel));
  const bankDone = $derived(wordBankState.done[bankKey] ?? 0);
  const bankTotal = $derived(wordBankState.total[bankKey] ?? words.length);
  const bankProgress = $derived(
    naturalState.status[settings.lang] === 'loading'
      ? naturalState.progress[settings.lang] ?? 0
      : bankTotal ? bankDone / bankTotal : 0
  );
  const bankVoice = $derived(naturalNarratorVoice(settings.lang));
  // While the voice model downloads, its own estimate says how much longer the wait is.
  const bankEta = $derived(naturalState.remaining[settings.lang] ?? 0);

  let section = $state<string[]>([]);
  let queue = $state<string[]>([]);
  let position = $state(0);
  let speechSupported = $state(false);
  let voices = $state<SpeechSynthesisVoice[]>([]);
  let speechStatus = $state('');
  let choiceWords = $state<string[]>([]);
  let promptKind = $state<PromptKind>('meaning');
  // Recall cards: what was typed, how many letters the hint gave away, and the tiles placed so far.
  let typed = $state('');
  let typedClose = $state(false);
  let hintLetters = $state(0);
  let tiles = $state<string[]>([]);
  let placed = $state<number[]>([]);
  let buildWrong = $state(false);
  // What each word's first card asked, so its second card uses another channel.
  let firstKinds: Record<string, PromptKind> = {};
  let answerStatus = $state<AnswerStatus>(null);
  let selectedChoice = $state<string | null>(null);
  let sourceKey = $state('');
  let choiceKey = $state('');
  let reviewProgress = $state<Record<string, ReviewProgress>>({});
  // When the current card appeared, so the answer can be graded by how long it took.
  let shownAt = 0;
  // The word's schedule before this answer, so a rating button re-grades it instead of stacking.
  let beforeAnswer: ReviewProgress | undefined;
  // A session now has an ending: after the second pass it stops and shows what to repeat,
  // instead of circling the same queue forever.
  let sessionDone = $state(false);
  let groupRun = 0;
  function endGroupRun() {
    if (groupRun > 0) void reportGroupScore('vocab', vocabScore(groupRun));
    groupRun = 0;
  }
  $effect(() => {
    if (sessionDone) endGroupRun();
  });
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
  const dots = $derived<DotState[]>(queue.map((word, index) => index === position && !sessionDone ? 'current'
    : index < position || sessionDone ? (firstTry.includes(word) ? 'right' : 'missed') : 'pending'));

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
  const isDefinitionPrompt = $derived(promptKind === 'meaning');
  // The word as it is written, without its article: what a recall card asks for.
  const currentSpelling = $derived(wordMetadata[settings.lang]?.[currentWord]?.spelling ?? currentWord);
  const currentPicture = $derived(currentWord ? pictureFor(settings.lang, currentWord) : null);
  const recall = $derived(isRecall(promptKind));
  const heardFirst = $derived(promptKind === 'listen' || promptKind === 'dictation');
  const builtWord = $derived(placed.map((index) => tiles[index]).join(''));
  const promptLabel = $derived(promptKind === 'meaning' ? labels.chooseDefinition : promptKind === 'picture' ? labels.picturePrompt : promptKind === 'listen' ? labels.chooseWord
    : promptKind === 'type' ? labels.typePrompt : promptKind === 'dictation' ? labels.dictationPrompt : labels.buildPrompt);

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
    firstKinds = {};
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
    typed = '';
    typedClose = false;
    hintLetters = 0;
    placed = [];
    buildWrong = false;
    shownAt = performance.now();
    if (!currentWord || !currentDefinition) { choiceWords = []; return; }
    const word = currentWord;
    const pass = firstKinds[word] ? 2 : 1;
    promptKind = pickPromptKind({
      style: settings.learningStyle,
      pass,
      index: position,
      repetitions: reviewProgress[word]?.repetitions ?? 0,
      hasPicture: Boolean(currentPicture),
      canHear,
      buildable: isBuildable(currentSpelling),
      firstKind: firstKinds[word]
    });
    if (pass === 1) firstKinds[word] = promptKind;
    tiles = promptKind === 'build' ? scrambleLetters(currentSpelling, random) : [];
    choiceWords = definitionChoiceWords(word, [...section, ...definitionWords], definitions, random);
    // A card that starts with the ear plays by itself; the button is there to hear it again.
    if (promptKind === 'listen' || promptKind === 'dictation') void speak();
  }
  function chooseAnswer(event: MouseEvent) {
    if (answerStatus || !currentWord || sessionDone) return;
    const chosenWord = (event.currentTarget as HTMLButtonElement).value;
    if (!chosenWord) return;
    selectedChoice = chosenWord;
    resolveAnswer(chosenWord === currentWord);
  }
  // Typed answers: capitals and the article do not matter, one slip in a longer word still counts.
  function checkTypedAnswer(event?: Event) {
    event?.preventDefault();
    if (answerStatus || !currentWord || sessionDone || !typed.trim()) return;
    const result = checkTyped(currentSpelling, typed, settings.lang);
    typedClose = result === 'close';
    resolveAnswer(result !== 'wrong', result === 'close' || hintLetters > 0);
  }
  function showHint() {
    if (answerStatus) return;
    hintLetters = Math.min(hintLetters + 1, Math.max(1, [...currentSpelling].length - 1));
    typed = [...currentSpelling].slice(0, hintLetters).join('');
  }
  function placeTile(index: number) {
    if (answerStatus || placed.includes(index)) return;
    buildWrong = false;
    placed = [...placed, index];
    if (placed.length < tiles.length) return;
    if (builtWord === currentSpelling) { resolveAnswer(true, hintLetters > 0); return; }
    // A full but wrong row shakes and clears once; the second wrong row counts as a miss.
    if (!buildWrong && hintLetters === 0) {
      buildWrong = true;
      hintLetters = 1;
      playErrorSound(settings.sound, 'vocab');
      setTimeout(() => { if (buildWrong) { placed = []; buildWrong = false; } }, 520);
      return;
    }
    resolveAnswer(false);
  }
  function removeTile() {
    if (answerStatus || buildWrong) return;
    placed = placed.slice(0, -1);
  }
  /** Books an answer; `shaky` marks a right answer that needed help, so it comes back sooner. */
  function resolveAnswer(correct: boolean, shaky = false) {
    const word = currentWord;
    const firstAttempt = !attempted.includes(word);
    answerStatus = correct ? 'correct' : 'wrong';
    if (firstAttempt) attempted = [...attempted, word];
    // Only first attempts count towards the reward's run; a repeated card is practice.
    if (firstAttempt && !repairMode) recordAnswer('vocab', correct);
    // A group game scores the run of first-try answers; it is reported when it breaks or the session ends.
    if (firstAttempt && !repairMode) {
      if (correct) groupRun += 1;
      else endGroupRun();
    }
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
    // Quick and sure spaces the word further out, a long hesitation keeps it close (review/scheduler.ts).
    const timed = gradeFromAnswer(correct, shownAt ? performance.now() - shownAt : null, firstAttempt);
    const grade: Grade = correct && shaky ? 'hard' : timed;
    beforeAnswer = reviewProgress[word];
    reviewProgress = updateReviewProgress(reviewProgress, word, correct, Date.now(), grade);
    persistProgress();
    recordReview(settings.lang, word, correct, 'vocab', Date.now(), grade);
    if (correct) {
      playSuccessSound(settings.sound, 'vocab');
      // The repair reward qualifies the day itself; a normal event would race its sync.
      if (!(repairMode && repairAvailable)) void settings.recordStreak('vocab_correct');
    }
    else { playErrorSound(settings.sound, 'vocab'); recordMissedWord(settings.lang, word); queue = insertLearningRepeat(queue, position, word); }
    // Hearing the word once more with its answer ties sound to spelling; skipped where it was just heard.
    if (settings.sound && canHear && !(heardFirst && correct)) setTimeout(() => { if (queue[position] === word && answerStatus) void speak(); }, correct ? 420 : 650);
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
  function regrade(word: string, grade: Grade) {
    const before = { ...reviewProgress };
    if (beforeAnswer) before[word] = beforeAnswer;
    else delete before[word];
    reviewProgress = updateReviewProgress(before, word, grade !== 'again', Date.now(), grade);
    persistProgress();
  }
  function rateAnswer(kind: 'again' | 'hard' | 'good') {
    const word = currentWord;
    if (!word || answerStatus !== 'correct') return;
    if (kind === 'again') {
      regrade(word, 'again');
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
      regrade(word, 'hard');
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
    if (answerStatus === 'wrong' && word === currentWord) return 'bg-success text-[#fffdf7] !opacity-100 learn-reveal';
    if (answerStatus !== null && word === currentWord) return 'bg-success text-[#fffdf7] !opacity-100';
    if (answerStatus === 'wrong' && word === selectedChoice) return 'border-[#c0392b] bg-[#fdecea] text-[#b03224] shadow-none !opacity-100 dark:border-[#f08a7e] dark:bg-[#5a2420] dark:text-[#ffc2b8]';
    return '';
  }

  onMount(() => {
    repairAvailable = repairMode && Boolean(settings.repairCandidate());
    speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    if (!speechSupported) {
      if (!naturalMode) speechStatus = labels.speechUnavailable;
      // The word bank keeps rendering in the background after leaving (see wordBank.svelte.ts).
      return () => { cancelSpeech(); };
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
    };
  });

  $effect(() => {
    const nextSourceKey = `${settings.lang}|${settings.vocabularyLevel}|${settings.voiceQuality}|${settings.naturalModel}|${words.join('|')}|${dueMode}`;
    if (nextSourceKey === sourceKey) return;
    sourceKey = nextSourceKey;
    untrack(() => startSection());
  });
  $effect(() => {
    const nextChoiceKey = `${currentWord}|${section.join('|')}|${position}|${sessionId}|${settings.learningStyle}`;
    if (nextChoiceKey === choiceKey) return;
    choiceKey = nextChoiceKey;
    untrack(() => resetPrompt());
  });
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import AiModeSettings from '#lib/app/AiModeSettings.svelte';
  import GameSetting from '#lib/app/GameSetting.svelte';
  import LearningStylePicker from '#lib/learn/LearningStylePicker.svelte';
</script>

<GameToolbar>
  {#snippet gameSettings()}<GameSetting label={m.style_title({}, { locale: settings.interfaceLocale })}><span></span></GameSetting><LearningStylePicker /><AiModeSettings voice />{/snippet}
</GameToolbar>

<section
  class="flex-1 min-h-0 grid content-center justify-items-center gap-4 p-[clamp(1rem,4vw,2rem)] overflow-x-hidden overflow-y-auto bg-[color:#ede4d5] dark:bg-[color:#213a5d] bg-[image:radial-gradient(circle_at_50%_15%,rgba(230,165,39,.18),transparent_34%),linear-gradient(rgba(23,42,69,.018)_1px,transparent_1px),linear-gradient(90deg,rgba(23,42,69,.018)_1px,transparent_1px)] bg-[length:auto,24px_24px,24px_24px]"
  aria-label={labels.title}
>
  <header class="flex items-end justify-center gap-[.6rem]">
    <div class="text-center">
      <span class="text-accent text-[.8125rem] font-extrabold tracking-[.14em] uppercase">{labels.section} · {settings.vocabularyLevel.toUpperCase()}</span>
      <h1 class="my-[.16rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,7vw,2.65rem)] font-normal leading-none">{labels.title}</h1>
      {#if audioReady}<div class="mt-[.35rem] text-base-content/70"><SessionDots {dots} label={`${sessionDone ? queue.length : Math.min(position + 1, queue.length)} / ${queue.length || 6}`} /></div>{/if}
    </div>
    <Companion id="mia" mood={answerStatus === 'correct' ? 'happy' : answerStatus === 'wrong' ? 'sad' : sessionDone ? 'happy' : 'curious'} size="sm" />
  </header>
  {#if audioReady && repairMode && !sessionDone}
    <div class="w-[min(100%,28rem)] grid gap-[.3rem] px-[.9rem] py-[.65rem] panel-play text-center" aria-live="polite">
      <p class="m-0 text-accent text-[.8125rem] font-black tracking-[.12em] uppercase">{labels.repairTitle}</p>
      {#if repairAvailable}
        <p class="m-0 text-base-content/70 text-[.875rem] font-bold leading-[1.4]">{labels.repairHint(settings.streak.bestStreak, REPAIR_WORDS)}</p>
        <p class="m-0 text-base-content text-[.9rem] font-extrabold tabular-nums">{labels.repairProgress(repairCount, REPAIR_WORDS)}</p>
      {:else}
        <p class="m-0 text-base-content/60 text-[.875rem] font-bold">{labels.repairNone}</p>
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
      eta={bankEta}
      oncontinue={skipAudioPrep}
    />
  {:else if repairMode && repairDone}
    <div class="w-[min(100%,28rem)] grid justify-items-center gap-[.7rem] p-[clamp(1.2rem,6vw,2rem)] panel-play text-center">
      <p class="m-0 text-accent text-[.8125rem] font-black tracking-[.12em] uppercase">{labels.repairTitle}</p>
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(1.3rem,6vw,1.9rem)] leading-[1.15]">{labels.repairDone(settings.streak.streakCount)}</p>
      <div class="flex flex-wrap justify-center gap-[.5rem]">
        <a class="btn-play btn-play-ink" href="/progress">{labels.progress}</a>
        <a class="btn-play btn-play-soft" href="/">{labels.home}</a>
      </div>
    </div>
  {:else if sessionDone}
    <div class="recap w-[min(100%,28rem)] grid justify-items-center gap-[.7rem] p-[clamp(1.2rem,6vw,2rem)] panel-play text-center">
      {#if firstTry.length}<PhysicsTiles mode="rain" letters={[...(firstTry[0] ?? '')].slice(0, 9)} size={30} />{/if}
      <p class="m-0 text-accent text-[.8125rem] font-black tracking-[.12em] uppercase">{labels.recapTitle}</p>
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(1.3rem,6vw,1.9rem)] leading-[1.15]">{labels.recapScore(firstTry.length, attempted.length)}</p>
      {#if tricky.length}
        <p class="m-0 text-base-content/70 text-[.875rem] font-extrabold">{labels.recapTricky}</p>
        <ul class="flex flex-wrap justify-center gap-[.35rem] m-0 p-0 list-none">
          {#each tricky as word (word)}<li class="px-[.55rem] py-[.25rem] border border-accent/35 rounded-full bg-[#f7e2b0] text-[#172a45] text-[.875rem] font-extrabold">{displayWord(word)}</li>{/each}
        </ul>
        <button type="button" class="btn-play btn-play-ink" onclick={startTricky}>{labels.recapPractise(tricky.length)}</button>
      {:else}
        <p class="m-0 text-success text-[.9rem] font-extrabold">{labels.recapNone}</p>
      {/if}
      <button type="button" class="btn-play btn-play-soft" onclick={startSection}>{labels.recapNew}</button>
    </div>
  {:else if !currentWord}
    <div class="max-w-[24rem] m-0 p-[1.2rem] border border-accent/42 bg-[rgba(255,253,247,.8)] text-accent text-[.9rem] font-bold leading-[1.45] text-center">{labels.unavailable}</div>
  {:else}
    {#key `${position}|${sessionId}`}
    <article
      class="quiz-card learn-card-in panel-play kind-{promptKind}"
      class:learn-correct={answerStatus === 'correct'}
      class:learn-wrong={answerStatus === 'wrong'}
    >
      {#if answerStatus !== null || promptKind === 'meaning'}
        <!-- The word itself: on a meaning card from the start, on every other card as the answer. -->
        {#if currentPicture && answerStatus !== null}<span class="quiz-picture small pop-in" aria-hidden="true">{currentPicture}</span>{/if}
        <p class="quiz-word" class:learn-fade-in={promptKind !== 'meaning'}><GenderedWord word={currentWord} language={settings.lang} /></p>
        {#if answerStatus !== null || heardFirst}<button class="btn-play btn-play-soft btn-play-sm" onclick={speak} disabled={!canHear}><IconVolume aria-hidden="true" />{labels.listen}</button>{/if}
        {#if !isDefinitionPrompt && currentDefinition}<p class="quiz-definition learn-fade-in">{currentDefinition}</p>{/if}
      {:else if promptKind === 'picture'}
        <span class="quiz-picture pop-in" role="img" aria-label={labels.picturePrompt}>{currentPicture}</span>
      {:else if heardFirst}
        <button class="quiz-listen" onclick={speak} disabled={!canHear} aria-label={labels.listen}><IconVolume aria-hidden="true" /><i></i><i></i><i></i></button>
        <p class="quiz-cue">{labels.audioPrompt}</p>
      {:else}
        <!-- Type or build: the meaning (and the picture, when there is one) is the cue. -->
        {#if currentPicture}<span class="quiz-picture small pop-in" aria-hidden="true">{currentPicture}</span>{/if}
        <p class="quiz-definition cue">{currentDefinition}</p>
      {/if}
      {#if speechStatus}<p class="quiz-cue" aria-live="polite">{speechStatus}</p>{/if}
    </article>
    {/key}
    <section class="quiz-answer" aria-label={promptLabel}>
      <p class="quiz-prompt">{answerStatus === 'correct' && typedClose ? labels.almost : promptLabel}</p>
      {#if promptKind === 'type' || promptKind === 'dictation'}
        <form class="quiz-type" onsubmit={checkTypedAnswer}>
          <!-- svelte-ignore a11y_autofocus -->
          <input
            class="field-play"
            class:right={answerStatus === 'correct'}
            class:wrong={answerStatus === 'wrong'}
            type="text"
            bind:value={typed}
            readonly={answerStatus !== null}
            placeholder={labels.typePlaceholder}
            aria-label={promptLabel}
            lang={settings.lang}
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false"
            enterkeyhint="done"
            autofocus
          />
          {#if answerStatus === null}
            <button type="button" class="btn-play btn-play-soft btn-play-round" onclick={showHint} aria-label={labels.hint} title={labels.hint}><IconHint aria-hidden="true" /></button>
            <button type="submit" class="btn-play btn-play-ink" disabled={!typed.trim()}>{labels.check}</button>
          {/if}
        </form>
        {#if answerStatus === 'wrong'}<p class="quiz-solution learn-fade-in">{labels.answerWas} <strong>{currentSpelling}</strong></p>{/if}
      {:else if promptKind === 'build'}
        <div class="quiz-slots" class:learn-wrong={buildWrong} class:right={answerStatus === 'correct'} class:wrong={answerStatus === 'wrong'} aria-live="polite" aria-label={builtWord}>
          {#each tiles as _, slot (slot)}
            <span class:filled={slot < placed.length}>{slot < placed.length ? tiles[placed[slot]!] : ''}</span>
          {/each}
        </div>
        {#if answerStatus === 'wrong'}<p class="quiz-solution learn-fade-in">{labels.answerWas} <strong>{currentSpelling}</strong></p>{/if}
        {#if answerStatus === null}
          <div class="quiz-tiles">
            {#each tiles as letter, index (index)}
              <button type="button" class="quiz-tile" class:used={placed.includes(index)} disabled={placed.includes(index)} onclick={() => placeTile(index)}>{letter}</button>
            {/each}
            <button type="button" class="quiz-tile back" onclick={removeTile} disabled={!placed.length} aria-label={labels.removeLetter}><IconBackspace aria-hidden="true" /></button>
          </div>
        {/if}
      {:else if choiceWords.length >= 3}
        <div class="grid gap-[.55rem]">
          {#each choiceWords as word}
            <button
              type="button"
              value={word}
              onclick={chooseAnswer}
              disabled={answerStatus !== null}
              class="btn-play btn-play-choice justify-between gap-[.65rem] text-left touch-manipulation disabled:opacity-100 {optionStateClasses(word)}"
            ><span class="flex-1">{#if isDefinitionPrompt}{definitions[word]}{:else}<GenderedWord {word} language={settings.lang} />{/if}</span>{#if answerStatus !== null && word === currentWord}<IconCheck class="w-[1.25rem] h-[1.25rem] flex-none text-[#fffdf7]" aria-label={labels.correct} />{:else if answerStatus === 'wrong' && word === selectedChoice}<IconClose class="w-[1.25rem] h-[1.25rem] flex-none text-[#c0392b] dark:text-[#ffc2b8]" aria-label={labels.tryAgain} />{/if}</button>
          {/each}
        </div>
      {:else}
        <p class="quiz-definition">{currentDefinition || labels.unavailable}</p>
      {/if}
      <!-- One fixed slot for the answer buttons, so nothing jumps when they appear. -->
      <div class="answer-slot">
      {#if answerStatus === 'correct'}
        <div class="grid gap-[.4rem]">
          <p class="m-0 text-center text-base-content/60 text-[.8125rem] font-extrabold">{labels.rateHint}</p>
          <div class="flex flex-wrap justify-center gap-[.5rem]">
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
      </div>
    </section>
  {/if}
</section>

<style>
  .answer-slot { min-height:5.2rem;display:grid;align-content:start; }
  .quiz-card { width:min(100%,28rem);min-height:10rem;display:grid;align-content:center;justify-items:center;gap:.8rem;padding:clamp(1.2rem,6vw,2rem);text-align:center; }
  .quiz-card.kind-listen,.quiz-card.kind-dictation { background-image:linear-gradient(145deg,transparent,color-mix(in oklch,var(--skill-hear) 16%,transparent)); }
  .quiz-card.kind-picture { background-image:linear-gradient(145deg,transparent,color-mix(in oklch,var(--skill-words) 20%,transparent)); }
  .quiz-word { margin:0;color:var(--text);font-family:var(--font-display);font-size:clamp(1.9rem,9vw,3rem);font-weight:400;letter-spacing:.03em;line-height:1.05;overflow-wrap:anywhere; }
  .quiz-picture { font-size:clamp(4.2rem,22vw,6rem);line-height:1.1;font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif; }
  .quiz-picture.small { font-size:clamp(2.4rem,12vw,3.2rem); }
  .quiz-definition { margin:0;max-width:22rem;color:var(--text-soft);font-size:var(--text-sm);font-weight:700;line-height:1.45; }
  .quiz-definition.cue { color:var(--text);font-size:1.05rem;font-weight:700; }
  .quiz-cue { margin:0;color:var(--clay);font-size:var(--text-xs);font-weight:800;line-height:1.35; }
  /* The big listen button: a speaker with three bars that move while the learner decides. */
  .quiz-listen { position:relative;display:flex;align-items:center;justify-content:center;gap:.28rem;width:6.2rem;height:6.2rem;border:2px solid var(--ink);border-radius:50% 46% 52% 48% / 48% 52% 46% 50%;background:var(--skill-hear);box-shadow:var(--play-shadow);color:var(--paper);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:translate var(--dur-move) var(--ease-spring),box-shadow var(--dur-move) var(--ease-spring); }
  .quiz-listen:active { translate:2px 2px;box-shadow:var(--play-shadow-press); }
  .quiz-listen:disabled { opacity:.5;cursor:not-allowed; }
  .quiz-listen:focus-visible { outline:3px dashed var(--sun);outline-offset:4px; }
  .quiz-listen :global(svg) { width:2.2rem;height:2.2rem; }
  .quiz-listen i { width:.26rem;height:.9rem;border-radius:99px;background:currentColor;animation:quiz-bar 1.1s ease-in-out infinite; }
  .quiz-listen i:nth-of-type(2) { height:1.5rem;animation-delay:.15s; }
  .quiz-listen i:nth-of-type(3) { animation-delay:.3s; }
  @keyframes quiz-bar { 0%,100% { scale:1 .45; } 50% { scale:1 1; } }
  .quiz-answer { width:min(100%,28rem);display:grid;gap:.65rem; }
  .quiz-answer :global(.btn-play-choice.bg-success .gender-article) { color:inherit; }
  .quiz-answer :global(.btn-play-choice.bg-success .gender-shape) { background:currentColor; }
  .quiz-prompt { margin:0;color:var(--clay);font-size:var(--text-xs);font-weight:900;letter-spacing:.08em;text-align:center;text-transform:uppercase; }
  .quiz-type { display:flex;align-items:center;gap:.5rem; }
  .quiz-type input { flex:1;min-width:0;height:3.1rem;padding:0 .9rem;border-width:2px;border-color:var(--ink);color:var(--ink);font-size:1.15rem;font-weight:700;box-shadow:var(--play-shadow); }
  .quiz-type input.right { border-color:var(--go);background:var(--go-soft); }
  .quiz-type input.wrong { border-color:var(--no);background:var(--no-soft);text-decoration:line-through;text-decoration-thickness:.08em; }
  .quiz-solution { margin:0;color:var(--text-soft);font-size:var(--text-sm);font-weight:700;text-align:center; }
  .quiz-solution strong { color:var(--go);font-size:1.15rem; }
  .quiz-slots { display:flex;flex-wrap:wrap;justify-content:center;gap:.3rem;min-height:2.9rem; }
  .quiz-slots span { display:grid;place-items:center;width:2.1rem;height:2.6rem;border-bottom:3px solid var(--ink);color:var(--text);font-family:var(--font-display);font-size:1.6rem;line-height:1; }
  .quiz-slots span.filled { animation:play-pop .28s var(--ease-spring) both; }
  .quiz-slots.right span { border-bottom-color:var(--go);color:var(--go); }
  .quiz-slots.wrong span { border-bottom-color:var(--no);color:var(--no); }
  .quiz-tiles { display:flex;flex-wrap:wrap;justify-content:center;gap:.45rem; }
  .quiz-tile { display:grid;place-items:center;width:2.9rem;height:2.9rem;border:2px solid var(--ink);border-radius:12px 8px 11px 9px / 9px 11px 8px 12px;background:var(--paper);box-shadow:var(--play-shadow);color:var(--ink);font-family:var(--font-display);font-size:1.5rem;line-height:1;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:translate var(--dur-move) var(--ease-spring),scale var(--dur-move) var(--ease-spring),opacity var(--dur-quick) ease,box-shadow var(--dur-move) var(--ease-spring); }
  .quiz-tile:nth-child(odd) { rotate:-2deg; } .quiz-tile:nth-child(3n) { rotate:2.5deg; }
  .quiz-tile:not(:disabled):active { translate:2px 2px;scale:.94;box-shadow:var(--play-shadow-press); }
  .quiz-tile.used { opacity:.18;box-shadow:none;scale:.9; }
  .quiz-tile.back { background:var(--paper-3);rotate:0deg; }
  .quiz-tile.back:disabled { opacity:.35; }
  .quiz-tile :global(svg) { width:1.3rem;height:1.3rem; }
  .quiz-tile:focus-visible { outline:3px dashed var(--sun);outline-offset:3px; }
  .recap { position:relative;overflow:hidden; }
  .recap > :global(:not(.physics-tiles)) { position:relative;z-index:1; }
  :global(html.dark) .quiz-type input { border-color:var(--ink-deep);background:var(--surface-2);color:var(--paper); }
  :global(html.dark) .quiz-type input.right { background:color-mix(in oklch,var(--go) 35%,var(--surface-2)); }
  :global(html.dark) .quiz-type input.wrong { background:color-mix(in oklch,var(--no) 35%,var(--surface-2)); }
  :global(html.dark) .quiz-slots span { border-bottom-color:var(--paper); }
  :global(html.dark) .quiz-solution strong,:global(html.dark) .quiz-slots.right span { color:#8ed8a2; }
  :global(html.dark) .quiz-listen { border-color:var(--ink-deep);color:var(--ink); }
  :global(html.dark) .quiz-tile { border-color:var(--ink-deep);background:var(--surface);color:var(--paper); }
  :global(html.dark) .quiz-tile.back { background:var(--surface-2); }
  @media (prefers-reduced-motion:reduce) { .quiz-listen i,.quiz-slots span.filled { animation:none; } .quiz-tile { rotate:0deg;transition:none; } }
</style>
