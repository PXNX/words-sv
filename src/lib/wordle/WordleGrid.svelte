<script lang="ts">
  import IconHelp from '~icons/material-symbols/question-mark-rounded';
  import type { WordleMark } from './keyboardLayouts';

  type Entry = { word: string; marks: WordleMark[] };

  let { rows, wordLength = 5, entries, currentGuess = '', ariaLabel, compact = false, invalid = false, revealRow = -1, onExplain }: { rows: number; wordLength?: number; entries: Entry[]; currentGuess?: string; ariaLabel: string; compact?: boolean; invalid?: boolean; revealRow?: number; onExplain?: (word: string) => void } = $props();

  const guessLetters = $derived(Array.from(currentGuess));
</script>

<div
  class="grid justify-center gap-[clamp(.25rem,1.2vw,.42rem)]"
  class:mx-auto={compact}
  class:my-[.1rem]={compact}
  aria-label={ariaLabel}
>
  {#each Array(rows) as _, row}
    {@const entry = entries[row]}
    {@const entryLetters = entry ? Array.from(entry.word) : []}
    <div class="flex items-center gap-[.35rem]">
      <div class="grid gap-[clamp(.2rem,1vw,.34rem)]" class:wordle-shake={invalid && row === entries.length} style={`grid-template-columns:repeat(${wordLength},minmax(0,clamp(1.6rem,${Math.min(10, 48 / wordLength)}vw,2.55rem)));`}>
      {#each Array(wordLength) as _, column}
        {@const letter = entry ? entryLetters[column] ?? '' : row === entries.length ? guessLetters[column] ?? '' : ''}
        <span class="wordle-tile" class:filled={!entry && letter !== ''} class:reveal={row === revealRow} style:--i={column} data-mark={entry?.marks[column] || undefined}>{letter}</span>
      {/each}
      </div>
      {#if entry && onExplain}<button type="button" class="btn-play btn-play-soft btn-play-round btn-play-sm flex-none" onclick={() => onExplain(entry.word)} aria-label={`Explain ${entry.word}`}><IconHelp class="w-[.95rem] h-[.95rem]" aria-hidden="true" /></button>{/if}
    </div>
  {/each}
</div>

<style>
  /* Scoped instead of utilities: Tailwind's dark: variants sort after plain utilities, so the
     neutral dark background used to win over the green/orange/grey marks in dark mode. */
  .wordle-tile { display:grid;aspect-ratio:1;place-items:center;border:2px solid;border-radius:10px 7px 10px 8px;box-shadow:0 2px 0 rgba(23,42,69,.22);font-size:clamp(.75rem,3.8vw,1.05rem);font-weight:900; }
  .wordle-tile:not([data-mark]) { border-color:rgba(23,42,69,.4);background:#fffdf7;color:var(--color-base-content); }
  :global(html.dark) .wordle-tile:not([data-mark]) { border-color:rgba(255,253,247,.38);background:#172a45; }
  .wordle-tile[data-mark='correct'] { border-color:var(--color-success);background:var(--color-success);color:#fffdf7; }
  .wordle-tile[data-mark='present'] { border-color:#d39723;background:var(--color-primary);color:var(--color-primary-content); }
  .wordle-tile[data-mark='absent'] { border-color:#69727a;background:#69727a;color:#fffdf7; }
  .wordle-tile.filled:not([data-mark]) { border-color:rgba(23,42,69,.78);animation:wordle-pop .13s ease-out; }
  :global(html.dark) .wordle-tile.filled:not([data-mark]) { border-color:rgba(255,253,247,.78); }
  /* A checked row turns tile by tile; the colour switches while the tile is edge-on. */
  .wordle-tile.reveal { animation:wordle-flip .46s ease-in-out both;animation-delay:calc(var(--i) * 110ms);transition:background-color 0s,border-color 0s,color 0s;transition-delay:calc(var(--i) * 110ms + 230ms); }
  @keyframes wordle-pop { 50% { scale:1.1; } }
  @keyframes wordle-flip { 0%,100% { transform:rotateX(0); } 50% { transform:rotateX(90deg); } }
  .wordle-shake { animation:wordle-shake .42s cubic-bezier(.36,.07,.19,.97); }
  .wordle-shake .wordle-tile:not([data-mark]) { border-color:var(--color-accent); }
  @keyframes wordle-shake { 15%,55% { translate:-5px 0; } 35%,75% { translate:5px 0; } 0%,100% { translate:0 0; } }
  @media (prefers-reduced-motion:reduce) { .wordle-shake,.wordle-tile.filled,.wordle-tile.reveal { animation:none; } .wordle-tile.reveal { transition:none; } }
</style>
