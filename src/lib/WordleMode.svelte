<script lang="ts">
  import { evaluateWordleGuess, fiveLetterWords, isValidWordleGuess, normalizePlayableWord } from '$lib/modes.js';

  type WordleMark = 'correct' | 'present' | 'absent';
  type Entry = { word: string; marks: WordleMark[] };
  type Labels = {
    title: string;
    subtitle: string;
    empty: string;
    input: string;
    submit: string;
    invalid: string;
    win: string;
    again: string;
  };

  let { words, level, labels }: { words: string[]; level: string; labels: Labels } = $props();
  let target = $state('');
  let guess = $state('');
  let entries = $state<Entry[]>([]);
  let notice = $state('');

  const candidates = $derived(fiveLetterWords(words));
  const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
  const won = $derived(entries.some((entry) => entry.word === target));
  const exhausted = $derived(entries.length >= 6 && !won);

  function start() {
    target = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : '';
    guess = '';
    entries = [];
    notice = '';
  }

  function submit() {
    const normalized = normalizePlayableWord(guess);
    if (won || exhausted) return;
    if (!isValidWordleGuess(candidates, normalized)) {
      notice = labels.invalid;
      return;
    }
    entries = [...entries, { word: normalized, marks: evaluateWordleGuess(target, normalized) }];
    guess = '';
    notice = normalized === target ? labels.win : '';
  }

  function press(letter: string) {
    if (won || exhausted) return;
    const nextGuess = normalizePlayableWord(`${guess}${letter}`).slice(0, 5);
    guess = nextGuess;
    notice = nextGuess.length === 5 && !isValidWordleGuess(candidates, nextGuess) ? labels.invalid : '';
  }

  function removeLetter() {
    guess = guess.slice(0, -1);
    notice = '';
  }

  $effect(() => {
    words;
    level;
    start();
  });

  $effect(() => {
    guess;
    candidates;
    won;
    exhausted;
    if (!won && !exhausted && isValidWordleGuess(candidates, guess)) submit();
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
    <div class="wordle-grid" aria-label={labels.title}>
      {#each Array(6) as _, row}
        {@const entry = entries[row]}
        <div class="wordle-row">
          {#each Array(5) as _, column}
            {@const letter = entry?.word[column] ?? (row === entries.length ? guess[column] : '')}
            {@const mark = entry?.marks[column] ?? ''}
            <span class:correct={mark === 'correct'} class:present={mark === 'present'} class:absent={mark === 'absent'}>{letter}</span>
          {/each}
        </div>
      {/each}
    </div>

    {#if notice}<p class:success={won} class="mode-notice">{notice}</p>{/if}
    {#if exhausted && !won}<p class="mode-notice">{target}</p>{/if}
    {#if won || exhausted}<button class="mode-reset" onclick={start}>{labels.again}</button>{/if}

    <div class="wordle-keyboard" aria-label={labels.input}>
      {#each keyboardRows as row}
        <div>{#each row.split('') as letter}<button onclick={() => press(letter)} disabled={won || exhausted}>{letter}</button>{/each}</div>
      {/each}
      <div class="wordle-utility"><button onclick={() => press('Ä')} disabled={won || exhausted}>Ä</button><button onclick={() => press('Ö')} disabled={won || exhausted}>Ö</button><button onclick={() => press('Ü')} disabled={won || exhausted}>Ü</button><button onclick={() => removeLetter()} disabled={won || exhausted}>⌫</button></div>
    </div>
  {/if}
</section>

<style>
  .mode-view { flex:1 1 auto;min-height:0;display:grid;align-content:start;gap:.8rem;padding:clamp(.8rem,3vw,1.25rem);overflow:auto;background:linear-gradient(180deg,rgba(237,228,213,.8),rgba(255,253,247,.65));border-top:3px double #172a45; }
  .mode-header { text-align:center; }.mode-header span { color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:800;letter-spacing:.14em; }.mode-header h1 { margin:.15rem 0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.65rem,6vw,2.4rem);font-weight:400;line-height:1; }.mode-header p { margin:0;color:#596477;font-family:'DM Sans',sans-serif;font-size:.67rem;font-weight:700;line-height:1.35; }
  .wordle-grid { display:grid;justify-content:center;gap:.3rem; }.wordle-row { display:grid;grid-template-columns:repeat(5,clamp(2rem,9vw,2.7rem));gap:.3rem; }.wordle-row span { display:grid;place-items:center;aspect-ratio:1;border:1px solid rgba(23,42,69,.34);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:clamp(.9rem,4vw,1.2rem);font-weight:900; }.wordle-row span.correct { border-color:#34824d;background:#34824d;color:#fffdf7; }.wordle-row span.present { border-color:#d39723;background:#e6a527;color:#172a45; }.wordle-row span.absent { border-color:#69727a;background:#69727a;color:#fffdf7; }
  .mode-reset { min-height:2.35rem;padding:0 .85rem;border:1px solid #172a45;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase; }.wordle-keyboard button:disabled { opacity:.45; }
  .mode-notice { min-height:1rem;margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.68rem;font-weight:800;text-align:center; }.mode-notice.success { color:#34824d; }.mode-reset { justify-self:center;background:#34824d;border-color:#34824d; }
  .wordle-keyboard { display:grid;gap:.23rem;justify-content:center; }.wordle-keyboard>div { display:flex;justify-content:center;gap:.2rem; }.wordle-keyboard button { min-width:clamp(1.25rem,6vw,1.8rem);height:1.8rem;border:1px solid rgba(23,42,69,.28);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:900; }.wordle-utility button { min-width:2rem; }
  .mode-empty { padding:1.25rem;border:1px solid rgba(164,94,56,.42);background:rgba(164,94,56,.08);color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.75rem;font-weight:800;text-align:center; }
  :global(html.dark) .mode-view { background:linear-gradient(180deg,#213a5d,#172a45); }.mode-header h1 { color:#172a45; }:global(html.dark) .mode-header h1 { color:#fffdf7; }:global(html.dark) .mode-header p { color:rgba(255,253,247,.7); }:global(html.dark) .wordle-row span,:global(html.dark) .wordle-keyboard button { background:#172a45;border-color:rgba(255,253,247,.38);color:#fffdf7; }
</style>
