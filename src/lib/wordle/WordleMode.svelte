<script lang="ts">
  import { evaluateWordleGuess, fiveLetterWords, isValidWordleGuess, normalizePlayableWord } from './wordleWords';
  import { readWordleState, WORDLE_STATE_KEY, writeWordleState } from './wordleState';
  import { keyboardMarksFrom, type WordleMark } from './keyboardLayouts';
  import WordleGrid from './WordleGrid.svelte';
  import WordleKeyboard from './WordleKeyboard.svelte';

  type Entry = { word: string; marks: WordleMark[] };
  type Labels = { title: string; subtitle: string; empty: string; input: string; win: string; invalid: string; again: string };

  let { words, level, language, labels, onGreen = () => {}, onWin = () => {} }: { words: string[]; level: string; language: string; labels: Labels; onGreen?: () => void; onWin?: () => void } = $props();

  let target = $state('');
  let guess = $state('');
  let entries = $state<Entry[]>([]);
  let notice = $state('');

  const candidates = $derived(fiveLetterWords(words));
  const won = $derived(entries.some((entry) => entry.word === target));
  const exhausted = $derived(entries.length >= 6 && !won);
  const keyboardMarks = $derived(keyboardMarksFrom(entries));

  function start() {
    target = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
    guess = '';
    entries = [];
    notice = '';
    if (typeof localStorage !== 'undefined') localStorage.removeItem(WORDLE_STATE_KEY);
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

  $effect(() => {
    words;
    level;
    language;
    candidates;
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

<section class="mode-view wordle-view" aria-label={labels.title}>
  <header class="mode-header">
    <span>{level.toUpperCase()}</span>
    <h1>{labels.title}</h1>
    <p>{labels.subtitle}</p>
  </header>

  {#if candidates.length === 0}
    <div class="mode-empty">{labels.empty}</div>
  {:else}
    <div class="wordle-board">
      <WordleGrid rows={6} {entries} currentGuess={guess} ariaLabel={labels.title} />
      {#if notice}<p class:success={won} class="mode-notice">{notice}</p>{/if}
      {#if exhausted && !won}<p class="mode-notice">{target}</p>{/if}
      {#if won || exhausted}<button class="mode-reset" onclick={start}>{labels.again}</button>{/if}
    </div>

    <WordleKeyboard {language} marks={keyboardMarks} disabled={won || exhausted} ariaLabel={labels.input} onPress={press} onRemove={removeLetter} />
  {/if}
</section>

<style>
  .mode-view { flex:1 1 auto;min-height:0;display:grid;grid-template-rows:auto 1fr auto;align-content:stretch;gap:clamp(.75rem,2.8vw,1.2rem);padding:clamp(1.25rem,7svh,4rem) clamp(.8rem,3vw,1.25rem) clamp(1rem,3vw,1.5rem);overflow-x:hidden;overflow-y:auto;background:linear-gradient(180deg,rgba(237,228,213,.8),rgba(255,253,247,.65));border-top:3px double #172a45; }
  .mode-header { text-align:center; }.mode-header span { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;letter-spacing:.14em; }.mode-header h1 { margin:.15rem 0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.65rem,6vw,2.4rem);font-weight:400;line-height:1; }.mode-header p { margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.67rem;font-weight:700;line-height:1.35; }
  .wordle-board { display:grid;align-content:center;justify-items:center;gap:.65rem; }
  .mode-reset { min-height:2.45rem;padding:0 .9rem;border:1px solid #34824d;background:#34824d;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase; }
  .mode-notice { min-height:1rem;margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:800;text-align:center; }.mode-notice.success { color:#34824d; }
  .mode-empty { padding:1.25rem;border:1px solid rgba(164,94,56,.42);background:rgba(164,94,56,.08);color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:800;text-align:center; }
  :global(html.dark) .mode-view { background:linear-gradient(180deg,#213a5d,#172a45); }.mode-header h1 { color:#172a45; }:global(html.dark) .mode-header h1 { color:#fffdf7; }:global(html.dark) .mode-header p { color:rgba(255,253,247,.7); }
</style>
