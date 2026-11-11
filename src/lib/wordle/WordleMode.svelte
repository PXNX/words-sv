<script lang="ts">
  import { logAnswer } from '#lib/progress/eventLog.js';
  import { num } from '#lib/format/num.svelte.js';
  import { evaluateWordleGuess, fiveLetterWords, isValidWordleGuess, normalizePlayableWord } from './wordleWords';
  import { readWordleState, WORDLE_STATE_KEY, writeWordleState } from './wordleState';
  import { keyboardLayoutFor, keyboardMarksFrom, layoutLetters, physicalKeyAction, typeableWords, type WordleMark } from './keyboardLayouts';
  import WordleGrid from './WordleGrid.svelte';
  import WordleKeyboard from './WordleKeyboard.svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordDefinitions, wordMetadata } from '#lib/data/vocabulary.js';
  import { wiktionaryUrl } from '#lib/vocab/wiktionary.js';
  import IconHelp from '~icons/material-symbols/question-mark-rounded';
  import IconProgressActivity from '~icons/material-symbols/progress-activity';
  import { tick, untrack } from 'svelte';
  import { recordMissedWord } from '#lib/story/missedWords.js';
  import Companion from '#lib/story/Companion.svelte';
  import type { Mood } from '#lib/story/stories.js';

  type Entry = { word: string; marks: WordleMark[] };
  type Labels = { title: string; empty: string; input: string; win: string; invalid: string; again: string };
  type TutorialRound = { target: string; warmup: string };

  const WORDLE_TUTORIAL_KEY = 'wordcircle-wordle-tutorial-v1';
  const tutorialRounds: Record<'de' | 'en', TutorialRound> = {
    de: { target: 'TASSE', warmup: 'TASES' },
    en: { target: 'TASTE', warmup: 'TATES' }
  };
  function isTutorialLanguage(value: string): value is 'de' | 'en' {
    return value === 'de' || value === 'en';
  }

  let { words, level, language, wordLength = 5, labels, practice = false, onGreen = () => {}, onWin = () => {} }: { words: string[]; level: string; language: string; wordLength?: number; labels: Labels; practice?: boolean; onGreen?: () => void; onWin?: (attempts: number) => void } = $props();

  let target = $state('');
  let guess = $state('');
  let entries = $state<Entry[]>([]);
  let notice = $state('');
  let practiceActive = $state(untrack(() => practice));
  let practiceStep = $state(0);
  let loadingNextRound = $state(false);
  let explanationWord = $state<string | null>(null);
  // Briefly true after a rejected guess, so the current row shakes.
  let invalid = $state(false);
  let invalidTimer: ReturnType<typeof setTimeout> | undefined;
  // The row that was just checked flips tile by tile; restored rows show at once.
  let revealRow = $state(-1);
  // Read out by screen readers after each checked row; the tiles alone would be five bare letters.
  let announcement = $state('');

  const keyLetters = $derived(layoutLetters(keyboardLayoutFor(language)));
  const candidates = $derived(typeableWords(fiveLetterWords(words, wordLength), keyLetters));
  const won = $derived(entries.some((entry) => entry.word === target));
  const maxAttempts = $derived(wordLength + 1);
  const exhausted = $derived(entries.length >= maxAttempts && !won);
  const keyboardMarks = $derived(keyboardMarksFrom(entries));
  // Lilith cheers along with the latest guess: the more green letters, the bigger her reaction.
  const lastGreens = $derived(entries.at(-1)?.marks.filter((mark) => mark === 'correct').length ?? 0);
  const lilithMood = $derived<Mood>(won ? 'happy' : exhausted ? 'sad' : lastGreens >= 3 ? 'surprised' : lastGreens >= 1 ? 'happy' : 'curious');
  const tutorialRound = $derived(isTutorialLanguage(language) ? tutorialRounds[language] : null);
  const practiceExpectedWord = $derived(tutorialRound ? (practiceStep === 0 ? tutorialRound.warmup : tutorialRound.target) : '');
  const practiceFinished = $derived(practiceStep >= 2);
  const practicePromptLabel = $derived(m.wordle_tutorial_prompt({}, { locale: settings.interfaceLocale }));
  const practiceCompleteLabel = $derived(m.wordle_tutorial_complete({}, { locale: settings.interfaceLocale }));
  const practiceContinueLabel = $derived(m.tutorial_start({}, { locale: settings.interfaceLocale }));
  const alreadyTriedLabel = $derived(m.wordle_already_tried({}, { locale: settings.interfaceLocale }));
  const tooShortLabel = $derived(m.wordle_too_short({}, { locale: settings.interfaceLocale }));
  const markLabels = $derived<Record<WordleMark, string>>({
    correct: m.wordle_mark_correct({}, { locale: settings.interfaceLocale }),
    present: m.wordle_mark_present({}, { locale: settings.interfaceLocale }),
    absent: m.wordle_mark_absent({}, { locale: settings.interfaceLocale })
  });
  const noDefinitionLabel = $derived(m.wordle_no_definition({}, { locale: settings.interfaceLocale }));
  const deleteLabel = $derived(m.wordle_delete({}, { locale: settings.interfaceLocale }));
  const revealLabel = $derived(m.wordle_reveal({}, { locale: settings.interfaceLocale }));
  const solvedLabel = $derived(m.wordle_solved_in({ attempts: num(entries.length), max: num(maxAttempts) }, { locale: settings.interfaceLocale }));
  const explanation = $derived(explanationWord ? wordInfo(explanationWord) : null);
  // Once a round is over, the answer is shown with its article and meaning, won or lost.
  const roundOver = $derived(won || exhausted);
  const answer = $derived(roundOver && target ? wordInfo(target) : null);
  // The result waits until the last row has finished turning over.
  const revealDelay = $derived(`${(wordLength - 1) * 110 + 460}ms`);

  function wordInfo(word: string) {
    const key = language as keyof typeof wordDefinitions;
    const metadata = wordMetadata[key]?.[word];
    const spelling = metadata?.spelling ?? word;
    return { spelling, article: metadata?.article ?? '', definition: wordDefinitions[key]?.[word] ?? null, href: wiktionaryUrl(key, spelling) };
  }

  function describeRow(entry: Entry): string {
    return `${entry.word}: ${Array.from(entry.word).map((letter, index) => `${letter} ${markLabels[entry.marks[index]!]}`).join(', ')}`;
  }

  function start() {
    // `candidates` always has at least one word.
target = candidates.length > 0 ? (candidates[Math.floor(Math.random() * candidates.length)]!) : '';
    guess = '';
    entries = [];
    notice = '';
    explanationWord = null;
    invalid = false;
    revealRow = -1;
    announcement = '';
    if (typeof localStorage !== 'undefined') localStorage.removeItem(WORDLE_STATE_KEY);
  }

  async function continueRound() {
    if (loadingNextRound) return;
    loadingNextRound = true;
    // Yield once so the busy indicator is painted before the next round starts.
    await tick();
    start();
    loadingNextRound = false;
  }

  function restoreOrStart() {
    if (typeof localStorage === 'undefined' || candidates.length === 0) {
      start();
      return;
    }
    const saved = readWordleState(localStorage.getItem(WORDLE_STATE_KEY), { language, level, wordLength, candidates });
    if (!saved) {
      start();
      return;
    }
    target = saved.target;
    entries = saved.entries;
    guess = saved.guess;
    notice = '';
    invalid = false;
    revealRow = -1;
  }

  /** Rejects the current row: a shake, a short buzz and a reason. The letters stay so one can be fixed. */
  function reject(message: string) {
    notice = message;
    haptic('error');
    clearTimeout(invalidTimer);
    invalid = false;
    // Re-adding the class on the next frame restarts the shake for a repeated rejection.
    requestAnimationFrame(() => {
      invalid = true;
      invalidTimer = setTimeout(() => (invalid = false), 450);
    });
  }

  function submit() {
    const normalized = normalizePlayableWord(guess);
    if (won || exhausted) return;
    if (Array.from(normalized).length < wordLength) {
      reject(tooShortLabel);
      return;
    }
    if (entries.some((entry) => entry.word === normalized)) {
      reject(alreadyTriedLabel);
      return;
    }
    if (!isValidWordleGuess(candidates, normalized, wordLength)) {
      reject(labels.invalid);
      return;
    }
    const marks = evaluateWordleGuess(target, normalized) as WordleMark[];
    entries = [...entries, { word: normalized, marks }];
    revealRow = entries.length - 1;
    guess = '';
    if (marks.some((mark) => mark === 'correct')) onGreen();
    notice = '';
    const row = describeRow(entries[entries.length - 1]!);
    // A finished round goes into the learning log: solved or not, scored by the tries it took.
    const finished = normalized === target || entries.length >= maxAttempts;
    if (finished && !practiceActive) logAnswer(language, 'wordle', `WORDLE:${target}`, normalized === target, { level, score: normalized === target ? (maxAttempts + 1 - entries.length) / maxAttempts : 0 });
    if (normalized === target) {
      announcement = `${row}. ${labels.win} ${solvedLabel}`;
      onWin(entries.length);
    } else if (entries.length >= maxAttempts) announcement = `${row}. ${revealLabel} ${target}`;
    else announcement = row;
  }

  function press(letter: string) {
    if (won || exhausted) return;
    const nextGuess = Array.from(normalizePlayableWord(`${guess}${letter}`)).slice(0, wordLength).join('');
    guess = nextGuess;
    if (Array.from(nextGuess).length === wordLength) submit();
    else notice = '';
  }

  function removeLetter() {
    guess = Array.from(guess).slice(0, -1).join('');
    notice = '';
  }

  // Typing on a physical keyboard: letters the layout has keys for, Backspace, and Enter to check a
  // full row again or move on to the next word once the round is over.
  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    const action = physicalKeyAction(event.key, keyLetters);
    if (!action) return;
    // A focused button handles its own Enter, except the on-screen keys, which would retype their letter.
    if (action.kind === 'enter' && target?.closest('button, a') && !target.closest('.wordle-key')) return;
    event.preventDefault();
    if (practiceActive) {
      if (action.kind === 'letters') for (const letter of Array.from(action.value)) practicePress(letter);
      else if (action.kind === 'remove') practiceRemoveLetter();
      else if (practiceFinished) finishPractice();
      return;
    }
    if (candidates.length === 0) return;
    if (action.kind === 'letters') for (const letter of Array.from(action.value)) press(letter);
    else if (action.kind === 'remove') removeLetter();
    else if (won || exhausted) void continueRound();
    else submit();
  }

  function practicePress(letter: string) {
    if (!tutorialRound || practiceFinished) return;
    const expectedLetter = practiceExpectedWord[guess.length];
    if (letter !== expectedLetter) return;
    const nextGuess = `${guess}${letter}`;
    guess = nextGuess;
    if (nextGuess.length === 5) {
      const marks = evaluateWordleGuess(tutorialRound.target, nextGuess) as WordleMark[];
      entries = [...entries, { word: nextGuess, marks }];
      revealRow = entries.length - 1;
      guess = '';
      practiceStep = practiceStep === 0 ? 1 : 2;
    }
  }

  function practiceRemoveLetter() {
    guess = Array.from(guess).slice(0, -1).join('');
  }

  function finishPractice() {
    if (typeof localStorage !== 'undefined') localStorage.setItem(WORDLE_TUTORIAL_KEY, 'complete');
    practiceActive = false;
  }

  $effect(() => {
    if (practiceActive && !tutorialRound) practiceActive = false;
  });

  $effect(() => {
    words;
    level;
    language;
    wordLength;
    candidates;
    if (practiceActive) return;
    restoreOrStart();
  });

  // A lost round's word goes on the story mode's practice list.
  let recordedLoss = '';
  $effect(() => {
    if (!exhausted || practiceActive || !target || recordedLoss === target) return;
    recordedLoss = target;
    recordMissedWord(language, target);
  });

  $effect(() => {
    if (typeof localStorage === 'undefined' || !target) return;
    if (won || exhausted) {
      localStorage.removeItem(WORDLE_STATE_KEY);
      return;
    }
    localStorage.setItem(WORDLE_STATE_KEY, writeWordleState({ language, level, target, entries, guess }));
  });
</script>

<svelte:window onkeydown={onKeydown} />

<section
  class="flex-1 min-h-0 grid grid-rows-[auto_1fr_auto] content-stretch gap-[clamp(.75rem,2.8vw,1.2rem)] pt-[clamp(1.25rem,7svh,4rem)] px-[clamp(.8rem,3vw,1.25rem)] pb-[clamp(1rem,3vw,1.5rem)] overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,rgba(237,228,213,.8),rgba(255,253,247,.65))] dark:bg-[linear-gradient(180deg,#213a5d,#172a45)]"
  aria-label={labels.title}
>
  <header class="flex items-end justify-center">
    <h1 class="sr-only">{labels.title}</h1>
    <Companion id="lilith" mood={practiceActive ? 'happy' : lilithMood} size="sm" />
  </header>

  {#if practiceActive && tutorialRound}
    <div class="grid content-center justify-items-center gap-[.65rem]">
      <WordleGrid rows={2} wordLength={5} {entries} currentGuess={practiceFinished ? '' : guess} {revealRow} ariaLabel={labels.title} compact />
      {#if practiceFinished}
        <p class="min-h-[1rem] m-0 text-success text-[.875rem] font-extrabold text-center">{practiceCompleteLabel}</p>
        <button class="btn-play btn-play-go" onclick={finishPractice}>{practiceContinueLabel}</button>
      {:else}
        <p class="m-0 text-accent text-[.875rem] font-extrabold text-center">{practicePromptLabel} {practiceExpectedWord}</p>
      {/if}
    </div>
    {#if !practiceFinished}
      <WordleKeyboard {language} expectedLetter={practiceExpectedWord[guess.length]} ariaLabel={labels.input} onPress={practicePress} onRemove={practiceRemoveLetter} />
    {/if}
  {:else if candidates.length === 0}
    <div class="p-[1.25rem] border border-accent/42 bg-accent/8 text-accent text-[.9rem] font-extrabold text-center">{labels.empty}</div>
  {:else}
    <div class="grid content-center justify-items-center gap-[.65rem]">
      <WordleGrid rows={maxAttempts} {wordLength} {entries} currentGuess={guess} {invalid} {revealRow} {markLabels} explainLabel={(word) => m.wordle_explain({ word }, { locale: settings.interfaceLocale })} ariaLabel={labels.title} onExplain={(word) => (explanationWord = explanationWord === word ? null : word)} />
      {#if explanation}<div class="note-play pop-in flex items-start gap-[.45rem] max-w-[min(100%,28rem)] p-[.55rem_.7rem] text-accent text-[.84rem] font-bold leading-[1.35]"><IconHelp class="w-[.9rem] h-[.9rem] flex-none mt-[.05rem]" aria-hidden="true" /><span>{explanation.definition ?? noDefinitionLabel}<a class="ms-1 font-extrabold underline underline-offset-2" href={explanation.href} target="_blank" rel="noreferrer">Wiktionary</a></span></div>{/if}
      <p class="min-h-[1rem] m-0 text-accent text-[.875rem] font-extrabold text-center" role="status" aria-live="polite">{notice}</p>
      <p class="sr-only" aria-live="polite">{announcement}</p>
      {#if answer}
        <div class="wordle-result note-play grid justify-items-center gap-[.2rem] max-w-[min(100%,28rem)] p-[.6rem_.85rem] text-center" style:--reveal-delay={revealDelay}>
          <p class="m-0 text-[.875rem] font-extrabold" class:text-success={won} class:text-accent={!won}>{won ? `${labels.win} ${solvedLabel}` : revealLabel}</p>
          <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[1.35rem] leading-tight" lang={language}>{#if answer.article}<span class="text-base-content/60 text-[1rem]">{answer.article}</span>{' '}{/if}{answer.spelling}</p>
          <p class="m-0 text-base-content/75 text-[.84rem] font-bold leading-[1.35]">{answer.definition ?? noDefinitionLabel}<a class="ms-1 font-extrabold text-accent underline underline-offset-2" href={answer.href} target="_blank" rel="noreferrer">Wiktionary</a></p>
        </div>
        <button class="wordle-result btn-play btn-play-go disabled:cursor-wait disabled:opacity-80" style:--reveal-delay={revealDelay} onclick={continueRound} disabled={loadingNextRound} aria-busy={loadingNextRound}>
          {#if loadingNextRound}<IconProgressActivity class="w-[1rem] h-[1rem] animate-[startup-spin_1s_linear_infinite] motion-reduce:animate-none" aria-hidden="true" />{/if}
          <span>{labels.again}</span>
        </button>
      {/if}
    </div>

    <WordleKeyboard {language} marks={keyboardMarks} disabled={roundOver} ariaLabel={labels.input} {markLabels} removeLabel={deleteLabel} onPress={press} onRemove={removeLetter} />
  {/if}
</section>

<style>
  /* The answer and the next-word button arrive once the last row has turned over. */
  .wordle-result { animation:wordle-result .32s cubic-bezier(.34,1.3,.64,1) backwards;animation-delay:var(--reveal-delay,0ms); }
  @keyframes wordle-result { from { opacity:0;translate:0 .4rem; } }
  @media (prefers-reduced-motion:reduce) { .wordle-result { animation:none; } }
</style>
