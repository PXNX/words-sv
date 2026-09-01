<script lang="ts">
  import IconHelp from '~icons/material-symbols/help-rounded';

  type WordleMark = 'correct' | 'present' | 'absent';
  type Entry = { word: string; marks: WordleMark[] };

  let { rows, wordLength = 5, entries, currentGuess = '', ariaLabel, compact = false, onExplain }: { rows: number; wordLength?: number; entries: Entry[]; currentGuess?: string; ariaLabel: string; compact?: boolean; onExplain?: (word: string) => void } = $props();
</script>

<div
  class="grid justify-center gap-[clamp(.25rem,1.2vw,.42rem)]"
  class:mx-auto={compact}
  class:my-[.1rem]={compact}
  aria-label={ariaLabel}
>
  {#each Array(rows) as _, row}
    {@const entry = entries[row]}
    <div class="flex items-center gap-[.35rem]">
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
      {#if entry && onExplain}<button type="button" class="grid place-items-center w-[1.55rem] h-[1.55rem] flex-none border border-[#8b949c] rounded-full bg-[#edf0ef] text-[#69727a] [transition:transform_.16s_cubic-bezier(.23,1,.32,1),background_.16s_ease,color_.16s_ease] hover:bg-[#c9d0cf] hover:text-[#3f484e] active:scale-[.94] dark:border-[#84909b] dark:bg-[#2b3d57] dark:text-[#d8dde1]" onclick={() => onExplain(entry.word)} aria-label={`Explain ${entry.word}`}><IconHelp class="w-[.95rem] h-[.95rem]" aria-hidden="true" /></button>{/if}
    </div>
  {/each}
</div>
