<script lang="ts">
  import { untrack } from 'svelte';
  import { haptic } from '#lib/feedback/haptics.js';
  import { playErrorSound, playSuccessSound } from '#lib/feedback/sounds.js';
  import { recordHangmanResult, unlockCosmetic } from '#lib/profile/cosmetics.svelte.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { spokenWord, wordDefinitions, wordMetadata, type Language } from '#lib/data/vocabulary.js';
  import { wiktionaryUrl } from '#lib/vocab/wiktionary.js';
  import { keyboardLayoutFor, type WordleMark } from '#lib/wordle/keyboardLayouts.js';
  import WordleKeyboard from '#lib/wordle/WordleKeyboard.svelte';
  import { recordMissedWord } from '#lib/story/missedWords.js';
  import Companion from '#lib/story/Companion.svelte';
  import type { Mood } from '#lib/story/stories.js';
  import { HANGMAN_LIVES, HANGMAN_STATE_KEY, hangmanCandidates, isHangmanLost, isHangmanWon, letterFromKey, readHangmanState, writeHangmanState, wrongLetters } from './hangman';

  let { words, language, level }: { words: string[]; language: string; level: string } = $props();
  let target = $state('');
  let guessed = $state<string[]>([]);
  // The last guess's outcome, shown under the word and announced to screen readers.
  let notice = $state<{ text: string; tone: 'hit' | 'miss' | 'info' } | null>(null);
  let figure = $state<SVGSVGElement>();

  const locale = $derived(settings.interfaceLocale);
  const layout = $derived(keyboardLayoutFor(language));
  const candidates = $derived(hangmanCandidates(words, layout));
  const letters = $derived(Array.from(target));
  const guessedSet = $derived(new Set(guessed));
  const wrongGuesses = $derived(wrongLetters(target, guessed).length);
  const triesLeft = $derived(Math.max(0, HANGMAN_LIVES - wrongGuesses));
  const won = $derived(isHangmanWon(target, guessed));
  const lost = $derived(isHangmanLost(target, guessed));
  const finished = $derived(won || lost);
  const keyboardMarks = $derived.by(() => {
    const marks: Record<string, WordleMark> = {};
    for (const letter of guessed) marks[letter] = target.includes(letter) ? 'correct' : 'absent';
    return marks;
  });
  const wordLabel = $derived(m.hangman_word_label({ count: letters.length, pattern: letters.map((letter) => (guessedSet.has(letter) || finished ? letter : m.hangman_blank({}, { locale }))).join(', ') }, { locale }));
  // The reveal: the word as it is written (with its article) and what it means.
  const revealSpelling = $derived(finished ? spokenWord(language as Language, target) : '');
  const revealDefinition = $derived(finished ? wordDefinitions[language as Language]?.[target] ?? null : null);
  const revealHref = $derived(finished ? wiktionaryUrl(language as Language, wordMetadata[language as Language]?.[target]?.spelling ?? target) : '#');
  const resultText = $derived(won ? (wrongGuesses === 0 ? m.hangman_win_perfect({}, { locale }) : m.hangman_win({}, { locale })) : lost ? m.hangman_lost({}, { locale }) : '');
  // Lilith watches the letters: pleased by a hit, startled by a miss, worried when the figure is nearly done.
  const lastGuess = $derived(guessed.at(-1));
  const lilithMood = $derived<Mood>(won ? 'happy' : lost ? 'sad' : !lastGuess ? 'curious' : !target.includes(lastGuess) ? (wrongGuesses >= 4 ? 'sad' : 'surprised') : 'happy');
  const lilithLine = $derived(won ? m.hangman_lilith_win({}, { locale }) : lost ? m.hangman_lilith_lost({}, { locale }) : '');

  let recordedCompletion = '';
  function start() {
    target = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
    guessed = [];
    notice = null;
    recordedCompletion = '';
  }

  // A reload or a trip to another mode picks the unfinished word back up instead of drawing a new one.
  function restoreOrStart() {
    const saved = typeof localStorage === 'undefined' ? null : readHangmanState(localStorage.getItem(HANGMAN_STATE_KEY), { language, level, candidates, layout });
    if (!saved) return start();
    target = saved.target;
    guessed = saved.guessed;
    notice = null;
    recordedCompletion = '';
  }

  function shakeFigure() {
    if (!figure || typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    figure.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px) rotate(-2deg)' }, { transform: 'translateX(4px) rotate(1.5deg)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }], { duration: 340, easing: 'ease-out' });
  }

  function press(letter: string) {
    if (!target || finished) return;
    if (guessedSet.has(letter)) {
      notice = { text: m.hangman_repeat({ letter }, { locale }), tone: 'info' };
      haptic('tap');
      return;
    }
    guessed = [...guessed, letter];
    const count = letters.filter((candidate) => candidate === letter).length;
    if (count > 0) {
      notice = { text: m.hangman_hit({ letter, count }, { locale }), tone: 'hit' };
      if (!won) playSuccessSound(settings.sound, 'wordle');
    } else {
      notice = { text: m.hangman_miss({ letter }, { locale }), tone: 'miss' };
      if (!lost) playErrorSound(settings.sound, 'vocab');
      shakeFigure();
    }
  }
  // The shared keyboard always shows a delete key; a guessed letter cannot be taken back.
  function removeLetter() {}

  function onKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    const element = event.target as HTMLElement | null;
    if (element?.closest('input, textarea, select, [contenteditable="true"]')) return;
    // Enter on a focused button or link is its own click; elsewhere it draws the next word.
    if (finished && event.key === 'Enter' && !element?.closest('button, a')) {
      event.preventDefault();
      start();
      return;
    }
    const letter = letterFromKey(event.key, layout);
    if (!letter) return;
    event.preventDefault();
    press(letter);
  }

  // A lost round's word goes on the story mode's practice list.
  let recordedLoss = '';
  $effect(() => {
    if (!lost || recordedLoss === target) return;
    recordedLoss = target;
    recordMissedWord(language, target);
  });

  // Every finished word - won or lost - is a completed hangman round for today's streak.
  $effect(() => {
    if (!finished || !target || recordedCompletion === target) return;
    recordedCompletion = target;
    void settings.recordStreak('hangman_completed');
    if (won) playSuccessSound(settings.sound, 'pronunciation');
    haptic(won ? 'win' : 'error');
    if (won && wrongGuesses === 0) unlockCosmetic('hangman');
    recordHangmanResult(won);
  });

  // Keep the unfinished round on the device; a finished one is cleared so the next visit draws a new word.
  $effect(() => {
    if (typeof localStorage === 'undefined' || !target) return;
    if (finished) localStorage.removeItem(HANGMAN_STATE_KEY);
    else localStorage.setItem(HANGMAN_STATE_KEY, writeHangmanState({ language, level, target, guessed }));
  });

  // A new language or level (or word list) starts over with a word from it.
  $effect(() => {
    language;
    level;
    candidates;
    untrack(restoreOrStart);
  });
</script>

<svelte:window onkeydown={onKeydown} />

<section class="flex-1 min-h-0 grid grid-rows-[1fr_auto] content-stretch gap-[clamp(.75rem,2.8vw,1.2rem)] pt-[clamp(1.25rem,7svh,4rem)] px-[clamp(.8rem,3vw,1.25rem)] pb-[clamp(1rem,3vw,1.5rem)] overflow-x-hidden overflow-y-auto bg-[linear-gradient(180deg,rgba(237,228,213,.8),rgba(255,253,247,.65))] dark:bg-[linear-gradient(180deg,#213a5d,#172a45)]" aria-label={m.mode_hangman({}, { locale })}>
  <h1 class="sr-only">{m.mode_hangman({}, { locale })}</h1>

  {#if candidates.length === 0}
    <div class="note-play p-[1.25rem] text-accent text-[.75rem] font-extrabold text-center">{m.hangman_empty({}, { locale })}</div>
  {:else}
    <div class="panel-play w-[min(100%,26rem)] justify-self-center grid content-center justify-items-center gap-[.9rem] px-[clamp(1rem,5vw,1.6rem)] py-[clamp(1rem,4vw,1.4rem)]">
      <div class="flex items-end justify-center gap-[.7rem]">
        <svg bind:this={figure} viewBox="0 0 120 140" class="w-[7.5rem] h-[8.75rem]" aria-hidden="true" fill="none">
          <!-- gallows -->
          <line x1="8" y1="132" x2="72" y2="132" class="stroke-base-content/70" stroke-width="5" stroke-linecap="round" />
          <line x1="28" y1="132" x2="28" y2="10" class="stroke-base-content/70" stroke-width="5" stroke-linecap="round" />
          <line x1="26" y1="10" x2="86" y2="10" class="stroke-base-content/70" stroke-width="5" stroke-linecap="round" />
          <line x1="86" y1="10" x2="86" y2="24" class="stroke-base-content/70" stroke-width="5" stroke-linecap="round" />
          <!-- figure: each wrong letter draws one more stroke -->
          {#if wrongGuesses >= 1}<circle class="hm-part stroke-error" cx="86" cy="38" r="13" stroke-width="5" pathLength="1" />{/if}
          {#if wrongGuesses >= 2}<line class="hm-part stroke-error" x1="86" y1="51" x2="86" y2="90" stroke-width="5" stroke-linecap="round" pathLength="1" />{/if}
          {#if wrongGuesses >= 3}<line class="hm-part stroke-error" x1="86" y1="62" x2="66" y2="78" stroke-width="5" stroke-linecap="round" pathLength="1" />{/if}
          {#if wrongGuesses >= 4}<line class="hm-part stroke-error" x1="86" y1="62" x2="106" y2="78" stroke-width="5" stroke-linecap="round" pathLength="1" />{/if}
          {#if wrongGuesses >= 5}<line class="hm-part stroke-error" x1="86" y1="90" x2="68" y2="118" stroke-width="5" stroke-linecap="round" pathLength="1" />{/if}
          {#if wrongGuesses >= 6}<line class="hm-part stroke-error" x1="86" y1="90" x2="104" y2="118" stroke-width="5" stroke-linecap="round" pathLength="1" />{/if}
        </svg>
        <span class="grid justify-items-start gap-[.3rem]">
          <Companion id="lilith" mood={lilithMood} line={lilithLine} />
          <!-- The dots are the tries left; the count is only spoken. -->
          <span class="flex gap-[.22rem]" role="img" aria-label={m.hangman_tries_left({ count: triesLeft }, { locale })}>
            {#each Array(HANGMAN_LIVES) as _, index}<span class="hm-life" class:hm-life-spent={index >= triesLeft}></span>{/each}
          </span>
        </span>
      </div>

      <div class="flex flex-wrap justify-center gap-[clamp(.2rem,1.2vw,.35rem)] text-[clamp(1.35rem,7vw,2.2rem)]" role="img" aria-label={wordLabel}>
        {#each letters as letter, index (index)}
          {@const shown = guessedSet.has(letter)}
          <span class="hm-slot" class:hm-slot-missed={lost && !shown} class:hm-slot-won={won}>
            {#if shown || lost}<span class="hm-letter">{letter}</span>{/if}
          </span>
        {/each}
      </div>

      <p class="min-h-[1rem] m-0 text-[.68rem] font-extrabold text-center" class:text-success={!finished && notice?.tone === 'hit'} class:text-error={!finished && notice?.tone === 'miss'} class:text-base-content={!finished && notice?.tone === 'info'} aria-live="polite">{finished ? '' : notice?.text ?? ''}</p>

      {#if finished}
        <div class="hm-reveal grid justify-items-center gap-[.4rem] text-center" role="status">
          <p class={won ? 'm-0 text-success text-[.72rem] font-extrabold' : 'm-0 text-error text-[.72rem] font-extrabold'}>{resultText}</p>
          <p class="m-0 text-base-content font-['DM_Serif_Display'] text-[1.35rem] leading-tight">{revealSpelling}</p>
          {#if revealDefinition}<p class="m-0 max-w-[22rem] text-base-content/70 text-[.68rem] font-bold leading-[1.4]">{revealDefinition}</p>{/if}
          <a class="text-accent text-[.62rem] font-extrabold underline underline-offset-2" href={revealHref} target="_blank" rel="noreferrer">Wiktionary</a>
          <button class="btn-play btn-play-go mt-[.2rem]" onclick={start}>{m.hangman_new_word({}, { locale })}</button>
        </div>
      {/if}
    </div>

    <WordleKeyboard {language} marks={keyboardMarks} disabled={finished} ariaLabel={m.hangman_keyboard({}, { locale })} onPress={press} onRemove={removeLetter} showRemove={false} />
  {/if}
</section>

<style>
  /* Each new stroke of the figure is drawn in, rather than popping up. */
  .hm-part { stroke-dasharray: 1; stroke-dashoffset: 0; animation: hm-draw .38s cubic-bezier(.4, 0, .2, 1) both; }
  @keyframes hm-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }

  .hm-life { width: .5rem; height: .5rem; border: 1.5px solid var(--color-error); border-radius: 50%; background: var(--color-error); transition: background .25s ease, transform .25s ease; }
  .hm-life-spent { background: transparent; transform: scale(.82); opacity: .55; }

  .hm-slot { display: grid; place-items: end center; width: 1.05em; height: 1.3em; border-bottom: .12em solid rgba(23, 42, 69, .55); color: #172a45; font-family: 'DM Serif Display', serif; line-height: 1; }
  .hm-letter { display: block; animation: hm-pop .26s cubic-bezier(.34, 1.4, .64, 1) both; }
  .hm-slot-won { border-bottom-color: var(--color-success); }
  .hm-slot-missed { color: var(--color-error); border-bottom-color: var(--color-error); }
  @keyframes hm-pop { from { transform: translateY(.25em) scale(.6); opacity: 0; } to { transform: none; opacity: 1; } }

  .hm-reveal { animation: hm-rise .3s ease-out both; }
  @keyframes hm-rise { from { transform: translateY(.4rem); opacity: 0; } to { transform: none; opacity: 1; } }

  :global(html.dark) .hm-slot { color: #fffdf7; border-bottom-color: rgba(255, 253, 247, .5); }
  :global(html.dark) .hm-slot-won { border-bottom-color: #7fc08f; }
  :global(html.dark) .hm-slot-missed { color: #f08a80; border-bottom-color: #f08a80; }

  @media (prefers-reduced-motion: reduce) {
    .hm-part, .hm-letter, .hm-reveal { animation: none; }
    .hm-life { transition: none; }
  }
</style>
