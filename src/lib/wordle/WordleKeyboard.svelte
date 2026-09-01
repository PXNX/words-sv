<script lang="ts">
  import { keyboardLayoutFor, type WordleMark } from './keyboardLayouts';

  let {
    language,
    marks = {},
    expectedLetter,
    disabled = false,
    ariaLabel,
    onPress,
    onRemove
  }: {
    language: string;
    marks?: Record<string, WordleMark>;
    expectedLetter?: string;
    disabled?: boolean;
    ariaLabel: string;
    onPress: (letter: string) => void;
    onRemove: () => void;
  } = $props();

  const layout = $derived(keyboardLayoutFor(language));
  const guided = $derived(typeof expectedLetter === 'string');
</script>

<div class="@container grid justify-center gap-[clamp(.2rem,1cqw,.36rem)] pt-[.1rem]" aria-label={ariaLabel}>
  {#each layout.rows as row}
    <div class="flex justify-center gap-[clamp(.15rem,.8cqw,.3rem)]">
      {#each row.split('') as letter}
        {@const expected = guided && expectedLetter === letter}
        {@const usedWithoutMatch = Boolean(marks[letter]) && marks[letter] !== 'correct' && marks[letter] !== 'present'}
        <button
          type="button"
          onclick={() => onPress(letter)}
          disabled={disabled && !guided}
          class="min-w-[clamp(1.5rem,8.5cqw,2.8rem)] h-[clamp(2.2rem,11cqw,3.35rem)] border border-[rgba(23,42,69,.28)] bg-[#fffdf7] text-[clamp(.65rem,3cqw,.9rem)] font-black text-base-content [touch-action:manipulation] [transition:transform_.1s_cubic-bezier(.23,1,.32,1),background_.1s_ease] dark:border-[rgba(255,253,247,.38)] dark:bg-[#172a45] min-[580px]:min-w-[2.85rem] min-[580px]:h-[3.3rem] active:scale-90 active:bg-primary disabled:opacity-45"
          class:border-success={marks[letter] === 'correct' && !expected}
          class:bg-success={marks[letter] === 'correct'}
          class:text-[#fffdf7]={marks[letter] === 'correct' || marks[letter] === 'absent'}
          class:border-[#d39723]={marks[letter] === 'present' && !expected}
          class:bg-primary={marks[letter] === 'present'}
          class:text-primary-content={marks[letter] === 'present'}
          class:border-[#69727a]={usedWithoutMatch && !expected}
          class:bg-[#69727a]={usedWithoutMatch}
          class:border-[#e6a527]={expected}
          class:shadow-[inset_0_0_0_1px_#e6a527]={expected}
          class:opacity-[.42]={guided && !expected}
        >{letter}</button>
      {/each}
    </div>
  {/each}
  <div class="flex justify-center gap-[clamp(.15rem,.8cqw,.3rem)]">
    {#each layout.extras as letter}
      {@const expected = guided && expectedLetter === letter}
      {@const usedWithoutMatch = Boolean(marks[letter]) && marks[letter] !== 'correct' && marks[letter] !== 'present'}
      <button
        type="button"
        onclick={() => onPress(letter)}
        disabled={disabled && !guided}
        class="min-w-[clamp(1.8rem,9.5cqw,3.1rem)] h-[clamp(2.2rem,11cqw,3.35rem)] border border-[rgba(23,42,69,.28)] bg-[#fffdf7] text-[clamp(.65rem,3cqw,.9rem)] font-black text-base-content [touch-action:manipulation] [transition:transform_.1s_cubic-bezier(.23,1,.32,1),background_.1s_ease] dark:border-[rgba(255,253,247,.38)] dark:bg-[#172a45] min-[580px]:min-w-[2.85rem] min-[580px]:h-[3.3rem] active:scale-90 active:bg-primary disabled:opacity-45"
        class:border-success={marks[letter] === 'correct' && !expected}
        class:bg-success={marks[letter] === 'correct'}
        class:text-[#fffdf7]={marks[letter] === 'correct' || marks[letter] === 'absent'}
        class:border-[#d39723]={marks[letter] === 'present' && !expected}
        class:bg-primary={marks[letter] === 'present'}
        class:text-primary-content={marks[letter] === 'present'}
        class:border-[#69727a]={usedWithoutMatch && !expected}
        class:bg-[#69727a]={usedWithoutMatch}
        class:border-[#e6a527]={expected}
        class:shadow-[inset_0_0_0_1px_#e6a527]={expected}
        class:opacity-[.42]={guided && !expected}
      >{letter}</button>
    {/each}
    <button
      type="button"
      onclick={onRemove}
      disabled={disabled && !guided}
      class="min-w-[clamp(2.1rem,11cqw,3.5rem)] h-[clamp(2.2rem,11cqw,3.35rem)] border border-[rgba(23,42,69,.28)] bg-[#fffdf7] text-[clamp(.65rem,3cqw,.9rem)] font-black text-base-content [touch-action:manipulation] [transition:transform_.1s_cubic-bezier(.23,1,.32,1),background_.1s_ease] dark:border-[rgba(255,253,247,.38)] dark:bg-[#172a45] min-[580px]:h-[3.3rem] active:scale-90 active:bg-primary disabled:opacity-45"
      class:opacity-[.42]={guided}
    >⌫</button>
  </div>
</div>
