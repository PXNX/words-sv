<script lang="ts">
  type WordleMark = 'correct' | 'present' | 'absent';
  type Entry = { word: string; marks: WordleMark[] };

  let { rows, wordLength = 5, entries, currentGuess = '', ariaLabel, compact = false }: { rows: number; wordLength?: number; entries: Entry[]; currentGuess?: string; ariaLabel: string; compact?: boolean } = $props();
</script>

<div
  class="grid justify-center gap-[clamp(.25rem,1.2vw,.42rem)]"
  class:mx-auto={compact}
  class:my-[.1rem]={compact}
  aria-label={ariaLabel}
>
  {#each Array(rows) as _, row}
    {@const entry = entries[row]}
    <div class="grid gap-[clamp(.25rem,1.2vw,.42rem)]" style={`grid-template-columns:repeat(${wordLength},minmax(0,clamp(2.05rem,${Math.min(12, 60 / wordLength)}vw,3.35rem)));`}>
      {#each Array(wordLength) as _, column}
        {@const letter = entry?.word[column] ?? (row === entries.length ? currentGuess[column] : '')}
        {@const mark = entry?.marks[column] ?? ''}
        <span
          class="grid aspect-square place-items-center border border-[rgba(23,42,69,.34)] bg-[#fffdf7] text-[clamp(1rem,5vw,1.35rem)] font-black text-base-content dark:border-[rgba(255,253,247,.38)] dark:bg-[#172a45]"
          class:border-success={mark === 'correct'}
          class:bg-success={mark === 'correct'}
          class:text-[#fffdf7]={mark === 'correct' || mark === 'absent'}
          class:border-[#d39723]={mark === 'present'}
          class:bg-primary={mark === 'present'}
          class:text-primary-content={mark === 'present'}
          class:border-[#69727a]={mark === 'absent'}
          class:bg-[#69727a]={mark === 'absent'}
        >{letter}</span>
      {/each}
    </div>
  {/each}
</div>
