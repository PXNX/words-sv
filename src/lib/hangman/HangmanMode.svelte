<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import { settings } from '$lib/state/settings.svelte';
  import { normalizePlayableWord, isLetterWord } from '$lib/wordle/wordleWords';
  import { keyboardLayoutFor, type WordleMark } from '$lib/wordle/keyboardLayouts';
  import WordleKeyboard from '$lib/wordle/WordleKeyboard.svelte';

  let { words, language }: { words: string[]; language: string } = $props();
  let target = $state('');
  let guessed = $state<string[]>([]);
  let started = $state(false);

  const candidates = $derived([...new Set(words.map(normalizePlayableWord).filter((word) => isLetterWord(word, 4, 8))) ]);
  const guessedSet = $derived(new Set(guessed));
  const wrongGuesses = $derived(guessed.filter((letter) => !target.includes(letter)).length);
  const won = $derived(Boolean(target) && [...new Set(target)].every((letter) => guessedSet.has(letter)));
  const lost = $derived(wrongGuesses >= 6 && !won);
  const finished = $derived(won || lost);
  const keyboardMarks = $derived.by(() => {
    const marks: Record<string, WordleMark> = {};
    for (const letter of guessed) marks[letter] = target.includes(letter) ? 'correct' : 'absent';
    return marks;
  });
  const maskedWord = $derived(target.split('').map((letter) => guessedSet.has(letter) ? letter : '•').join(' '));
  const layout = $derived(keyboardLayoutFor(language));

  function start() {
    target = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
    guessed = [];
    started = true;
  }
  function press(letter: string) {
    if (!started || finished || guessedSet.has(letter)) return;
    guessed = [...guessed, letter];
  }
  function removeLetter() {}

  $effect(() => {
    words;
    language;
    candidates;
    if (!started) start();
  });
</script>

<section class="flex-1 min-h-0 grid grid-rows-[auto_1fr_auto] content-stretch gap-[clamp(.75rem,2.8vw,1.2rem)] pt-[clamp(1.25rem,7svh,4rem)] px-[clamp(.8rem,3vw,1.25rem)] pb-[clamp(1rem,3vw,1.5rem)] overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,rgba(237,228,213,.8),rgba(255,253,247,.65))] dark:bg-[linear-gradient(180deg,#213a5d,#172a45)] border-t-[3px] border-t-double border-t-[#172a45]" aria-label="Hangman">
  <header class="text-center">
    <span class="text-accent text-[.58rem] font-extrabold tracking-[.14em]">{settings.vocabularyLevel.toUpperCase()}</span>
    <h1 class="my-[.15rem] text-base-content font-['DM_Serif_Display'] text-[clamp(1.65rem,6vw,2.4rem)] font-normal leading-none">Hangman</h1>
    <p class="m-0 text-base-content/60 text-[.67rem] font-bold leading-[1.35]">Guess the word one letter at a time.</p>
  </header>

  {#if candidates.length === 0}
    <div class="p-[1.25rem] border border-accent/42 bg-accent/8 text-accent text-[.75rem] font-extrabold text-center">No Hangman words are available for this level yet.</div>
  {:else}
    <div class="grid content-center justify-items-center gap-[.9rem]">
      <div class="flex items-end justify-center gap-[.7rem]" aria-label={`Wrong guesses: ${wrongGuesses} of 6`}>
        <div class="relative w-[7rem] h-[7rem] border-b-4 border-base-content/70" aria-hidden="true">
          <span class="absolute left-[1.1rem] bottom-0 w-1 h-[6.3rem] bg-base-content/70"></span>
          <span class="absolute left-[1.1rem] top-[.35rem] w-[4.5rem] h-1 bg-base-content/70"></span>
          <span class="absolute right-[1.4rem] top-[.35rem] w-1 h-[1.15rem] bg-base-content/70"></span>
          {#if wrongGuesses >= 1}<span class="absolute right-[.72rem] top-[1.2rem] w-[1.45rem] h-[1.45rem] border-4 border-error rounded-full"></span>{/if}
          {#if wrongGuesses >= 2}<span class="absolute right-[1.36rem] top-[2.55rem] w-1 h-[2.4rem] bg-error"></span>{/if}
          {#if wrongGuesses >= 3}<span class="absolute right-[1.36rem] top-[2.9rem] w-[2rem] h-1 origin-left rotate-[-30deg] bg-error"></span>{/if}
          {#if wrongGuesses >= 4}<span class="absolute right-[1.36rem] top-[2.9rem] w-[2rem] h-1 origin-left rotate-[30deg] bg-error"></span>{/if}
          {#if wrongGuesses >= 5}<span class="absolute right-[1.36rem] top-[4.65rem] w-[2rem] h-1 origin-left rotate-[-45deg] bg-error"></span>{/if}
          {#if wrongGuesses >= 6}<span class="absolute right-[1.36rem] top-[4.65rem] w-[2rem] h-1 origin-left rotate-[45deg] bg-error"></span>{/if}
        </div>
        <span class="text-accent text-[.65rem] font-extrabold">{wrongGuesses} / 6</span>
      </div>
      <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[clamp(1.7rem,8vw,2.7rem)] tracking-[.16em] leading-none" aria-label="Hidden word">{maskedWord}</p>
      {#if finished}
        <p class={won ? 'm-0 text-success text-[.7rem] font-extrabold' : 'm-0 text-error text-[.7rem] font-extrabold'}>{won ? 'Well done!' : `The word was ${target}.`}</p>
        <button class="min-h-[2.45rem] px-[.9rem] border border-success bg-success text-[#fffdf7] text-[.64rem] font-extrabold tracking-[.08em] uppercase" onclick={start}>New word</button>
      {/if}
    </div>

    <WordleKeyboard {language} marks={keyboardMarks} disabled={finished} ariaLabel="Choose a letter" onPress={press} onRemove={removeLetter} />
  {/if}
</section>
