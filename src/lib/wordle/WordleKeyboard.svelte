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

<div class="@container grid justify-center gap-[clamp(.24rem,1.1cqw,.4rem)] pt-[.1rem]" aria-label={ariaLabel}>
  {#each layout.rows as row}
    <div class="flex justify-center gap-[clamp(.18rem,.9cqw,.34rem)]">
      {#each row.split('') as letter}
        {@const expected = guided && expectedLetter === letter}
        <button
          type="button"
          onclick={() => onPress(letter)}
          disabled={disabled && !guided}
          class="min-w-[clamp(1.35rem,7.7cqw,2.55rem)] h-[clamp(2rem,10cqw,3.05rem)] border border-[rgba(23,42,69,.28)] bg-[#fffdf7] text-[clamp(.6rem,2.7cqw,.82rem)] font-black text-base-content [touch-action:manipulation] [transition:transform_.1s_cubic-bezier(.23,1,.32,1),background_.1s_ease] dark:border-[rgba(255,253,247,.38)] dark:bg-[#172a45] min-[580px]:min-w-[2.6rem] min-[580px]:h-[3rem] active:scale-90 active:bg-primary disabled:opacity-45"
          class:border-success={marks[letter] === 'correct' && !expected}
          class:bg-success={marks[letter] === 'correct'}
          class:text-[#fffdf7]={marks[letter] === 'correct' || marks[letter] === 'absent'}
          class:border-[#d39723]={marks[letter] === 'present' && !expected}
          class:bg-primary={marks[letter] === 'present'}
          class:text-primary-content={marks[letter] === 'present'}
          class:border-[#69727a]={marks[letter] === 'absent' && !expected}
          class:bg-[#69727a]={marks[letter] === 'absent'}
          class:opacity-60={marks[letter] === 'absent' && !(guided && !expected)}
          class:border-[#e6a527]={expected}
          class:shadow-[inset_0_0_0_1px_#e6a527]={expected}
          class:opacity-[.42]={guided && !expected}
        >{letter}</button>
      {/each}
    </div>
  {/each}
  <div class="flex justify-center gap-[clamp(.18rem,.9cqw,.34rem)]">
    {#each layout.extras as letter}
      {@const expected = guided && expectedLetter === letter}
      <button
        type="button"
        onclick={() => onPress(letter)}
        disabled={disabled && !guided}
        class="min-w-[clamp(1.6rem,8.6cqw,2.8rem)] h-[clamp(2rem,10cqw,3.05rem)] border border-[rgba(23,42,69,.28)] bg-[#fffdf7] text-[clamp(.6rem,2.7cqw,.82rem)] font-black text-base-content [touch-action:manipulation] [transition:transform_.1s_cubic-bezier(.23,1,.32,1),background_.1s_ease] dark:border-[rgba(255,253,247,.38)] dark:bg-[#172a45] min-[580px]:min-w-[2.6rem] min-[580px]:h-[3rem] active:scale-90 active:bg-primary disabled:opacity-45"
        class:border-success={marks[letter] === 'correct' && !expected}
        class:bg-success={marks[letter] === 'correct'}
        class:text-[#fffdf7]={marks[letter] === 'correct' || marks[letter] === 'absent'}
        class:border-[#d39723]={marks[letter] === 'present' && !expected}
        class:bg-primary={marks[letter] === 'present'}
        class:text-primary-content={marks[letter] === 'present'}
        class:border-[#69727a]={marks[letter] === 'absent' && !expected}
        class:bg-[#69727a]={marks[letter] === 'absent'}
        class:opacity-60={marks[letter] === 'absent' && !(guided && !expected)}
        class:border-[#e6a527]={expected}
        class:shadow-[inset_0_0_0_1px_#e6a527]={expected}
        class:opacity-[.42]={guided && !expected}
      >{letter}</button>
    {/each}
    <button
      type="button"
      onclick={onRemove}
      disabled={disabled && !guided}
      class="min-w-[clamp(1.9rem,10cqw,3.2rem)] h-[clamp(2rem,10cqw,3.05rem)] border border-[rgba(23,42,69,.28)] bg-[#fffdf7] text-[clamp(.6rem,2.7cqw,.82rem)] font-black text-base-content [touch-action:manipulation] [transition:transform_.1s_cubic-bezier(.23,1,.32,1),background_.1s_ease] dark:border-[rgba(255,253,247,.38)] dark:bg-[#172a45] min-[580px]:h-[3rem] active:scale-90 active:bg-primary disabled:opacity-45"
      class:opacity-[.42]={guided}
    >⌫</button>
  </div>
</div>
