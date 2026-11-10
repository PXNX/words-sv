<script lang="ts">
  import { keyboardLayoutFor, type WordleMark } from './keyboardLayouts';

  let {
    language,
    marks = {},
    expectedLetter,
    disabled = false,
    ariaLabel,
    markLabels,
    removeLabel,
    showRemove = true,
    onPress,
    onRemove
  }: {
    language: string;
    marks?: Record<string, WordleMark>;
    expectedLetter?: string | undefined;
    disabled?: boolean;
    ariaLabel: string;
    /** Spoken after a used key's letter, e.g. "A, not in the word". */
    markLabels?: Record<WordleMark, string>;
    removeLabel?: string;
    /** Hangman has nothing to take back, so it hides the ⌫ key. */
    showRemove?: boolean;
    onPress: (letter: string) => void;
    onRemove: () => void;
  } = $props();

  const layout = $derived(keyboardLayoutFor(language));
  const guided = $derived(typeof expectedLetter === 'string');
</script>

{#snippet key(letter: string, wide: boolean)}
  {@const expected = guided && expectedLetter === letter}
  <button
    type="button"
    class="wordle-key"
    class:wide
    class:expected
    class:dimmed={guided && !expected}
    data-mark={marks[letter]}
    aria-label={markLabels && marks[letter] ? `${letter}, ${markLabels[marks[letter]]}` : undefined}
    onclick={() => onPress(letter)}
    disabled={disabled && !guided}
  >{letter}</button>
{/snippet}

<div class="@container grid justify-center gap-[clamp(.2rem,1cqw,.36rem)] pt-[.1rem]" aria-label={ariaLabel}>
  {#each layout.rows as row}
    <div class="flex justify-center gap-[clamp(.15rem,.8cqw,.3rem)]">
      {#each Array.from(row) as letter}{@render key(letter, false)}{/each}
    </div>
  {/each}
  <div class="flex justify-center gap-[clamp(.15rem,.8cqw,.3rem)]">
    {#each layout.extras as letter}{@render key(letter, true)}{/each}
    {#if showRemove}<button type="button" class="wordle-key remove" class:dimmed={guided} aria-label={removeLabel} onclick={onRemove} disabled={disabled && !guided}>⌫</button>{/if}
  </div>
</div>

<style>
  /* Scoped instead of utilities: Tailwind's dark: variants sort after plain utilities, so the
     neutral dark background used to hide the green/orange key marks in dark mode. */
  .wordle-key { min-width:clamp(1.65rem,9.2cqw,3.05rem);height:clamp(2.4rem,11.8cqw,3.6rem);border:1.5px solid rgba(23,42,69,.5);border-radius:9px 6px 9px 7px;background:#fffdf7;box-shadow:0 2px 0 rgba(23,42,69,.32);color:var(--color-base-content);font-size:clamp(.7rem,3.2cqw,.95rem);font-weight:900;touch-action:manipulation;transition:translate .12s cubic-bezier(.34,1.4,.64,1),box-shadow .12s ease,background .1s ease; }
  .wordle-key.wide { min-width:clamp(1.95rem,10.2cqw,3.35rem); }
  .wordle-key.remove { min-width:clamp(2.25rem,11.8cqw,3.75rem); }
  :global(html.dark) .wordle-key { box-shadow:0 2px 0 #0b1626; }
  :global(html.dark) .wordle-key:not([data-mark]) { border-color:rgba(255,253,247,.38);background:#172a45; }
  .wordle-key[data-mark='correct'] { border-color:var(--color-success);background:var(--color-success);color:#fffdf7; }
  .wordle-key[data-mark='present'] { border-color:#d39723;background:var(--color-primary);color:var(--color-primary-content); }
  .wordle-key[data-mark='absent'] { border-color:#69727a;background:#69727a;color:#fffdf7; }
  .wordle-key:active, :global(html.dark) .wordle-key:active { translate:0 2px;box-shadow:none;background:var(--color-primary); }
  .wordle-key:disabled { opacity:.45; }
  .wordle-key.expected, :global(html.dark) .wordle-key.expected { border-color:#e6a527;box-shadow:inset 0 0 0 1px #e6a527; }
  .wordle-key.dimmed { opacity:.42; }
</style>
