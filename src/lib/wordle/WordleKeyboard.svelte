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

<div class="wordle-keyboard" class:guided aria-label={ariaLabel}>
  {#each layout.rows as row}
    <div>
      {#each row.split('') as letter}
        <button type="button" onclick={() => onPress(letter)} disabled={disabled && !guided} class:correct={marks[letter] === 'correct'} class:present={marks[letter] === 'present'} class:absent={marks[letter] === 'absent'} class:expected={guided && expectedLetter === letter}>{letter}</button>
      {/each}
    </div>
  {/each}
  <div class="wordle-utility">
    {#each layout.extras as letter}
      <button type="button" onclick={() => onPress(letter)} disabled={disabled && !guided} class:correct={marks[letter] === 'correct'} class:present={marks[letter] === 'present'} class:absent={marks[letter] === 'absent'} class:expected={guided && expectedLetter === letter}>{letter}</button>
    {/each}
    <button class="delete-key" type="button" onclick={onRemove} disabled={disabled && !guided}>⌫</button>
  </div>
</div>

<style>
  .wordle-keyboard { container-type:inline-size;display:grid;gap:clamp(.24rem,1.1cqw,.4rem);justify-content:center;padding-top:.1rem; }
  .wordle-keyboard>div { display:flex;justify-content:center;gap:clamp(.18rem,.9cqw,.34rem); }
  .wordle-keyboard button { min-width:clamp(1.35rem,7.7cqw,2.55rem);height:clamp(2rem,10cqw,3.05rem);border:1px solid rgba(23,42,69,.28);background:#fffdf7;color:#172a45;font-family:'DM Sans',sans-serif;font-size:clamp(.6rem,2.7cqw,.82rem);font-weight:900;touch-action:manipulation; }
  .wordle-keyboard button.correct { border-color:#34824d;background:#34824d;color:#fffdf7; }
  .wordle-keyboard button.present { border-color:#d39723;background:#e6a527;color:#172a45; }
  .wordle-keyboard button.absent { border-color:#69727a;background:#69727a;color:#fffdf7;opacity:.6; }
  .wordle-keyboard button:disabled { opacity:.45; }
  .wordle-keyboard button:active { transform:scale(.96);background:#e6a527; }
  .wordle-utility button { min-width:clamp(1.6rem,8.6cqw,2.8rem); }
  .wordle-utility .delete-key { min-width:clamp(1.9rem,10cqw,3.2rem); }
  .guided button:not(.expected) { opacity:.42; }
  .guided button.expected { border-color:#e6a527;box-shadow:inset 0 0 0 1px #e6a527; }
  :global(html.dark) .wordle-keyboard button { background:#172a45;border-color:rgba(255,253,247,.38);color:#fffdf7; }
  @media (min-width:580px) { .wordle-keyboard button { min-width:2.6rem;height:3rem; } }
</style>
