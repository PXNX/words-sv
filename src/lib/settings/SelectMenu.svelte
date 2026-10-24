<script lang="ts">
  import { tick } from 'svelte';
  import IconChevronDown from '~icons/material-symbols/keyboard-arrow-down-rounded';

  type Option = { value: string; label: string };

  let {
    value,
    options,
    label,
    onchange,
    align = 'end',
    class: className = ''
  }: {
    value: string;
    options: Option[];
    label: string;
    onchange?: (value: string) => void;
    align?: 'start' | 'end';
    class?: string;
  } = $props();

  let open = $state(false);
  let root = $state<HTMLDivElement | null>(null);
  let trigger = $state<HTMLButtonElement | null>(null);
  const selected = $derived(options.find((option) => option.value === value) ?? options[0]);

  function choose(next: string) {
    open = false;
    if (next !== value) onchange?.(next);
    trigger?.focus();
  }

  function onWindowClick(event: MouseEvent) {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      open = false;
      trigger?.focus();
    }
  }

  $effect(() => {
    if (!open) return;
    void tick().then(() => {
      const index = Math.max(0, options.findIndex((option) => option.value === value));
      root?.querySelectorAll<HTMLButtonElement>('.select-option')[index]?.focus();
    });
  });
</script>

<svelte:window onclick={onWindowClick} onkeydown={onWindowKeydown} />

<div class={`relative ${className}`} bind:this={root}>
  <button
    bind:this={trigger}
    type="button"
    class="field-play select-trigger"
    aria-label={label}
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <span class="truncate">{selected?.label ?? ''}</span>
    <IconChevronDown aria-hidden="true" />
  </button>
  {#if open}
    <ul class={`dropdown-content menu menu-sm select-menu absolute z-50 mt-[.25rem] ${align === 'end' ? 'right-0' : 'left-0'}`} role="listbox" aria-label={label}>
      {#each options as option (option.value)}
        <li role="none">
          <button
            type="button"
            role="option"
            aria-selected={option.value === value}
            class="select-option"
            onclick={() => choose(option.value)}
          >
            {option.label}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .select-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.35rem;
    width: 100%;
    min-height: 2rem;
    padding: 0.15rem 0.4rem;
    border: 2px solid rgba(23, 42, 69, 0.5);
    border-radius: 9px 6px 9px 7px;
    background: #fffdf7;
    color: #172a45;
    font-size: 0.68rem;
    font-weight: 800;
    text-align: start;
    cursor: pointer;
  }
  .select-trigger:focus-visible {
    outline: 3px dashed #e6a527;
    outline-offset: 2px;
  }
  .select-trigger :global(svg) {
    width: 0.95rem;
    height: 0.95rem;
    flex: none;
    transition: transform 0.18s ease;
  }
  .select-trigger[aria-expanded='true'] :global(svg) {
    transform: rotate(180deg);
  }
  .select-menu {
    min-width: 100%;
    max-height: min(16rem, 50vh);
    overflow-y: auto;
    padding: 0.3rem;
    border: 2px solid var(--play-line);
    border-radius: 12px 8px 12px 9px;
    background: #fffdf7;
    box-shadow: 3px 3px 0 var(--play-line);
  }
  .select-menu :global(li) {
    margin: 0;
  }
  .select-option {
    width: 100%;
    border: 0;
    border-radius: 7px;
    background: transparent;
    padding: 0.42rem 0.5rem;
    color: #172a45;
    font-size: 0.68rem;
    font-weight: 800;
    text-align: start;
    cursor: pointer;
  }
  .select-option:hover,
  .select-option:focus-visible {
    background: #e6a527;
    color: #172a45;
    outline: 0;
  }
  .select-option[aria-selected='true'] {
    background: rgba(230, 165, 39, 0.22);
  }
  :global(html.dark) .select-trigger {
    border-color: rgba(255, 253, 247, 0.45);
    background: #213a5d;
    color: #fffdf7;
  }
  :global(html.dark) .select-menu {
    border-color: rgba(255, 253, 247, 0.45);
    background: #213a5d;
    box-shadow: 3px 3px 0 #0b1626;
  }
  :global(html.dark) .select-option {
    color: #fffdf7;
  }
  :global(html.dark) .select-option:hover,
  :global(html.dark) .select-option:focus-visible {
    background: #e6a527;
    color: #172a45;
  }
</style>
