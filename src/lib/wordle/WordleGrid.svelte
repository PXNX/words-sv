<script lang="ts">
  type WordleMark = 'correct' | 'present' | 'absent';
  type Entry = { word: string; marks: WordleMark[] };

  let { rows, entries, currentGuess = '', ariaLabel, compact = false }: { rows: number; entries: Entry[]; currentGuess?: string; ariaLabel: string; compact?: boolean } = $props();
</script>

<div class="wordle-grid" class:compact aria-label={ariaLabel}>
  {#each Array(rows) as _, row}
    {@const entry = entries[row]}
    <div class="wordle-row">
      {#each Array(5) as _, column}
        {@const letter = entry?.word[column] ?? (row === entries.length ? currentGuess[column] : '')}
        {@const mark = entry?.marks[column] ?? ''}
        <span class:correct={mark === 'correct'} class:present={mark === 'present'} class:absent={mark === 'absent'}>{letter}</span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .wordle-grid { display:grid;justify-content:center;gap:clamp(.25rem,1.2vw,.42rem); }
  .wordle-row { display:grid;grid-template-columns:repeat(5,clamp(2.35rem,12vw,3.35rem));gap:clamp(.25rem,1.2vw,.42rem); }
  .wordle-row span { display:grid;place-items:center;aspect-ratio:1;border:1px solid rgba(23,42,69,.34);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:clamp(1rem,5vw,1.35rem);font-weight:900; }
  .wordle-row span.correct { border-color:#34824d;background:#34824d;color:#fffdf7; }
  .wordle-row span.present { border-color:#d39723;background:#e6a527;color:#172a45; }
  .wordle-row span.absent { border-color:#69727a;background:#69727a;color:#fffdf7; }
  .compact { margin:.1rem auto; }
  :global(html.dark) .wordle-row span { background:#172a45;border-color:rgba(255,253,247,.38);color:#fffdf7; }
  @media (min-width:580px) { .wordle-row { grid-template-columns:repeat(5,clamp(2.8rem,8vw,3.6rem)); } }
</style>
