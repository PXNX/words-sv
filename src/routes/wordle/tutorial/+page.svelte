<script lang="ts">
  import { goto } from '$app/navigation';
  import { evaluateWordleGuess } from '$lib/wordle/wordleWords';
  import { settings } from '$lib/state/settings.svelte';
  import { m } from '$lib/paraglide/messages';
  import TutorialDialog from '$lib/TutorialDialog.svelte';
  import WordleGrid from '$lib/wordle/WordleGrid.svelte';
  import WordleKeyboard from '$lib/wordle/WordleKeyboard.svelte';

  type WordleMark = 'correct' | 'present' | 'absent';
  type Entry = { word: string; marks: WordleMark[] };
  type WordleTutorialRound = { target: string; warmup: string };

  const WORDLE_TUTORIAL_KEY = 'wordcircle-wordle-tutorial-v1';
  const wordleTutorialRounds: Record<'de' | 'en', WordleTutorialRound> = {
    de: { target: 'TASSE', warmup: 'TASES' },
    en: { target: 'TASTE', warmup: 'TATES' }
  };
  function isWordleTutorialLanguage(value: string): value is 'de' | 'en' {
    return value === 'de' || value === 'en';
  }

  const labels = $derived({
    title: m.wordle_title({}, { locale: settings.interfaceLocale }),
    input: m.wordle_input({}, { locale: settings.interfaceLocale }),
    again: m.wordle_again({}, { locale: settings.interfaceLocale }),
    tutorialTitle: m.wordle_tutorial_title({}, { locale: settings.interfaceLocale }),
    tutorialExplain: m.wordle_tutorial_explain({}, { locale: settings.interfaceLocale }),
    tutorialPrompt: m.wordle_tutorial_prompt({}, { locale: settings.interfaceLocale }),
    tutorialComplete: m.wordle_tutorial_complete({}, { locale: settings.interfaceLocale }),
    tutorialRepeat: m.wordle_tutorial_repeat({}, { locale: settings.interfaceLocale })
  });

  const tutorialRound = $derived<WordleTutorialRound | null>(isWordleTutorialLanguage(settings.lang) ? wordleTutorialRounds[settings.lang] : null);

  let step = $state(0);
  let guess = $state('');
  let entries = $state<Entry[]>([]);

  const expected = $derived(tutorialRound ? (step === 0 ? tutorialRound.warmup : tutorialRound.target) : '');
  const finished = $derived(step >= 2);
  const prompt = $derived(finished ? labels.tutorialComplete : `${labels.tutorialPrompt} ${expected}`);

  function press(letter: string) {
    if (finished || !tutorialRound) return;
    const expectedLetter = expected[guess.length];
    if (letter !== expectedLetter) return;
    const nextGuess = `${guess}${letter}`;
    guess = nextGuess;
    if (nextGuess.length === 5) {
      const marks = evaluateWordleGuess(tutorialRound.target, nextGuess) as WordleMark[];
      entries = [...entries, { word: nextGuess, marks }];
      guess = '';
      if (step === 0) step = 1;
      else {
        step = 2;
        if (typeof localStorage !== 'undefined') localStorage.setItem(WORDLE_TUTORIAL_KEY, 'complete');
      }
    }
  }

  function removeLetter() {
    guess = guess.slice(0, -1);
  }

  function finish() {
    void goto('/wordle');
  }
</script>

<section class="wordle-tutorial-view" aria-label={labels.tutorialTitle}>
  <TutorialDialog kicker={labels.tutorialTitle} title={labels.title}>
    {#if tutorialRound}
      <p class="tutorial-explanation">{labels.tutorialExplain}</p>
      <p class="tutorial-repeats">{labels.tutorialRepeat}</p>
      <WordleGrid rows={2} {entries} currentGuess={finished ? '' : guess} ariaLabel={labels.tutorialTitle} compact />
      <p class="tutorial-prompt">{prompt}</p>
      {#if finished}
        <button class="tutorial-finish" type="button" onclick={finish}>{labels.again}</button>
      {:else}
        <WordleKeyboard language={settings.lang} expectedLetter={expected[guess.length]} ariaLabel={labels.input} onPress={press} onRemove={removeLetter} />
      {/if}
    {:else}
      <button class="tutorial-finish" type="button" onclick={finish}>{labels.again}</button>
    {/if}
  </TutorialDialog>
</section>

<style>
  .wordle-tutorial-view { flex:1 1 auto;min-height:0;display:grid;place-items:stretch;padding:0;overflow-x:hidden;overflow-y:auto;background:linear-gradient(180deg,rgba(237,228,213,.8),rgba(255,253,247,.65));border-top:3px double #172a45; }
  .wordle-tutorial-view :global(.tutorial-dialog) { width:100%;height:100%;max-width:none;align-content:center;border-left:0;border-right:0;box-shadow:none; }
  .tutorial-explanation,.tutorial-repeats,.tutorial-prompt { margin:0;font-family:'DM Sans',sans-serif;font-size:.69rem;font-weight:700;line-height:1.4; }
  .tutorial-explanation { color:#172a45; }
  .tutorial-repeats { padding:.45rem .55rem;border-left:3px solid #e6a527;background:rgba(230,165,39,.1);color:#76541b; }
  .tutorial-prompt { color:#a45e38;text-align:center; }
  .tutorial-finish { min-height:2.45rem;border:1px solid #172a45;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase; }
  :global(html.dark) .wordle-tutorial-view { background:linear-gradient(180deg,#213a5d,#172a45); }
  :global(html.dark) .tutorial-explanation { color:#fffdf7; }
  :global(html.dark) .tutorial-repeats { color:#ffe3a5; }
</style>
