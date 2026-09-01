<script lang="ts">
  import { evaluateWordleGuess, fiveLetterWords, isValidWordleGuess, normalizePlayableWord } from './wordleWords';
  import { readWordleState, WORDLE_STATE_KEY, writeWordleState } from './wordleState';
  import { keyboardMarksFrom, type WordleMark } from './keyboardLayouts';
  import WordleGrid from './WordleGrid.svelte';
  import WordleKeyboard from './WordleKeyboard.svelte';
  import { m } from '$lib/paraglide/messages';
  import { settings } from '$lib/state/settings.svelte';
  import IconProgressActivity from '~icons/material-symbols/progress-activity';
  import { tick } from 'svelte';

  type Entry = { word: string; marks: WordleMark[] };
  type Labels = { title: string; subtitle: string; empty: string; input: string; win: string; invalid: string; again: string };
  type TutorialRound = { target: string; warmup: string };

  const WORDLE_TUTORIAL_KEY = 'wordcircle-wordle-tutorial-v1';
  const tutorialRounds: Record<'de' | 'en', TutorialRound> = {
    de: { target: 'TASSE', warmup: 'TASES' },
    en: { target: 'TASTE', warmup: 'TATES' }
  };
  function isTutorialLanguage(value: string): value is 'de' | 'en' {
    return value === 'de' || value === 'en';
  }

  let { words, level, language, labels, practice = false, onGreen = () => {}, onWin = () => {} }: { words: string[]; level: string; language: string; labels: Labels; practice?: boolean; onGreen?: () => void; onWin?: () => void } = $props();

  let target = $state('');
  let guess = $state('');
  let entries = $state<Entry[]>([]);
  let notice = $state('');
  let practiceActive = $state(practice);
  let practiceStep = $state(0);
  let loadingNextRound = $state(false);

  const candidates = $derived(fiveLetterWords(words));
  const won = $derived(entries.some((entry) => entry.word === target));
  const exhausted = $derived(entries.length >= 6 && !won);
  const keyboardMarks = $derived(keyboardMarksFrom(entries));
  const tutorialRound = $derived(isTutorialLanguage(language) ? tutorialRounds[language] : null);
  const practiceExpectedWord = $derived(tutorialRound ? (practiceStep === 0 ? tutorialRound.warmup : tutorialRound.target) : '');
  const practiceFinished = $derived(practiceStep >= 2);
  const practicePromptLabel = $derived(m.wordle_tutorial_prompt({}, { locale: settings.interfaceLocale }));
  const practiceCompleteLabel = $derived(m.wordle_tutorial_complete({}, { locale: settings.interfaceLocale }));
  const practiceContinueLabel = $derived(m.tutorial_start({}, { locale: settings.interfaceLocale }));

  function start() {
    target = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
    guess = '';
    entries = [];
    notice = '';
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
    const saved = readWordleState(localStorage.getItem(WORDLE_STATE_KEY), { language, level, candidates });
    if (!saved) {
      start();
      return;
    }
    target = saved.target;
    entries = saved.entries;
    guess = saved.guess;
    notice = '';
  }

  function submit() {
    const normalized = normalizePlayableWord(guess);
    if (won || exhausted) return;
    if (!isValidWordleGuess(candidates, normalized) || entries.some((entry) => entry.word === normalized)) {
      notice = labels.invalid;
      guess = '';
      return;
    }
    const marks = evaluateWordleGuess(target, normalized) as WordleMark[];
    entries = [...entries, { word: normalized, marks }];
    guess = '';
    if (marks.some((mark) => mark === 'correct')) onGreen();
    if (normalized === target) {
      notice = labels.win;
      onWin();
    } else notice = '';
  }

  function press(letter: string) {
    if (won || exhausted) return;
    const nextGuess = normalizePlayableWord(`${guess}${letter}`).slice(0, 5);
    guess = nextGuess;
    if (nextGuess.length === 5) submit();
    else notice = '';
  }

  function removeLetter() {
    guess = guess.slice(0, -1);
    notice = '';
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
      guess = '';
      practiceStep = practiceStep === 0 ? 1 : 2;
    }
  }

  function practiceRemoveLetter() {
    guess = guess.slice(0, -1);
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
    candidates;
    if (practiceActive) return;
    restoreOrStart();
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

<section
  class="flex-1 min-h-0 grid grid-rows-[auto_1fr_auto] content-stretch gap-[clamp(.75rem,2.8vw,1.2rem)] pt-[clamp(1.25rem,7svh,4rem)] px-[clamp(.8rem,3vw,1.25rem)] pb-[clamp(1rem,3vw,1.5rem)] overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,rgba(237,228,213,.8),rgba(255,253,247,.65))] dark:bg-[linear-gradient(180deg,#213a5d,#172a45)] border-t-[3px] border-t-double border-t-[#172a45]"
  aria-label={labels.title}
>
  <header class="text-center">
    <span class="text-accent text-[.58rem] font-extrabold tracking-[.14em]">{level.toUpperCase()}</span>
    <h1 class="my-[.15rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.65rem,6vw,2.4rem)] font-normal leading-none">{labels.title}</h1>
    <p class="m-0 text-base-content/60 text-[.67rem] font-bold leading-[1.35]">{labels.subtitle}</p>
  </header>

  {#if practiceActive && tutorialRound}
    <div class="grid content-center justify-items-center gap-[.65rem]">
      <WordleGrid rows={2} {entries} currentGuess={practiceFinished ? '' : guess} ariaLabel={labels.title} compact />
      {#if practiceFinished}
        <p class="min-h-[1rem] m-0 text-success text-[.68rem] font-extrabold text-center">{practiceCompleteLabel}</p>
        <button class="min-h-[2.45rem] px-[.9rem] border border-success bg-success text-[#fffdf7] text-[.64rem] font-extrabold tracking-[.08em] uppercase" onclick={finishPractice}>{practiceContinueLabel}</button>
      {:else}
        <p class="m-0 text-accent text-[.68rem] font-extrabold text-center">{practicePromptLabel} {practiceExpectedWord}</p>
      {/if}
    </div>
    {#if !practiceFinished}
      <WordleKeyboard {language} expectedLetter={practiceExpectedWord[guess.length]} ariaLabel={labels.input} onPress={practicePress} onRemove={practiceRemoveLetter} />
    {/if}
  {:else if candidates.length === 0}
    <div class="p-[1.25rem] border border-accent/42 bg-accent/8 text-accent text-[.75rem] font-extrabold text-center">{labels.empty}</div>
  {:else}
    <div class="grid content-center justify-items-center gap-[.65rem]">
      <WordleGrid rows={6} {entries} currentGuess={guess} ariaLabel={labels.title} />
      {#if notice}<p class:text-accent={!won} class:text-success={won} class="min-h-[1rem] m-0 text-[.68rem] font-extrabold text-center">{notice}</p>{/if}
      {#if exhausted && !won}<p class="min-h-[1rem] m-0 text-accent text-[.68rem] font-extrabold text-center">{target}</p>{/if}
      {#if won || exhausted}<button class="inline-flex items-center justify-center gap-[.4rem] min-h-[2.45rem] px-[.9rem] border border-success bg-success text-[#fffdf7] text-[.64rem] font-extrabold tracking-[.08em] uppercase disabled:cursor-wait disabled:opacity-80" onclick={continueRound} disabled={loadingNextRound} aria-busy={loadingNextRound}>
        {#if loadingNextRound}<IconProgressActivity class="w-[1rem] h-[1rem] animate-[startup-spin_1s_linear_infinite] motion-reduce:animate-none" aria-hidden="true" />{/if}
        <span>{labels.again}</span>
      </button>{/if}
    </div>

    <WordleKeyboard {language} marks={keyboardMarks} disabled={won || exhausted} ariaLabel={labels.input} onPress={press} onRemove={removeLetter} />
  {/if}
</section>
