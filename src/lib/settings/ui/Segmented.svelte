<!--
  A segmented choice (level, theme, voice model) with a pill that slides to the chosen option.
  Radio semantics for screen readers; arrow keys move the choice.
-->
<script lang="ts" generics="T extends string">
  import type { Snippet } from 'svelte';
  import { haptic } from '#lib/feedback/haptics.js';

  let { value, options, label, onchange, optionIcon }: {
    value: T;
    options: ReadonlyArray<{ value: T; label: string }>;
    label: string;
    onchange: (value: T) => void;
    optionIcon?: Snippet<[T]>;
  } = $props();

  const index = $derived(Math.max(0, options.findIndex((option) => option.value === value)));
  function choose(next: T) {
    if (next === value) return;
    haptic('tap');
    onchange(next);
  }
  function onkeydown(event: KeyboardEvent) {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const rtl = getComputedStyle(event.currentTarget as Element).direction === 'rtl' && (event.key === 'ArrowRight' || event.key === 'ArrowLeft');
    const next = options[(index + (rtl ? -step : step) + options.length) % options.length];
    if (next) choose(next.value);
  }
</script>

<div class="segmented" role="radiogroup" aria-label={label} style:--count={options.length} style:--index={index} tabindex="-1" {onkeydown}>
  <span class="segmented-pill" aria-hidden="true"></span>
  {#each options as option (option.value)}
    <button type="button" role="radio" aria-checked={option.value === value} tabindex={option.value === value ? 0 : -1} class:chosen={option.value === value} onclick={() => choose(option.value)}>
      {#if optionIcon}{@render optionIcon(option.value)}{/if}{option.label}
    </button>
  {/each}
</div>

<style>
  .segmented { position:relative;display:grid;grid-template-columns:repeat(var(--count),minmax(0,1fr));padding:2px;border:2px solid var(--play-line,#172a45);border-radius:999px;background:#fffdf7;box-shadow:2px 2px 0 var(--play-line,#172a45);isolation:isolate; }
  :global(html.dark) .segmented { border-color:rgba(255,253,247,.45);background:#213a5d; }
  .segmented-pill { position:absolute;z-index:-1;inset-block:2px;inset-inline-start:2px;width:calc((100% - 4px) / var(--count));border-radius:999px;background:#172a45;translate:calc(var(--index) * 100%) 0;transition:translate .32s cubic-bezier(.34,1.4,.64,1); }
  :global([dir='rtl']) .segmented-pill { translate:calc(var(--index) * -100%) 0; }
  :global(html.dark) .segmented-pill { background:#e6a527; }
  .segmented button { display:inline-flex;align-items:center;justify-content:center;gap:.25rem;min-height:1.75rem;padding:0 .5rem;border:0;border-radius:999px;background:none;color:color-mix(in srgb,currentColor 65%,transparent);font:inherit;font-size:.64rem;font-weight:900;white-space:nowrap;cursor:pointer;transition:color .25s,scale .15s; }
  .segmented button:active { scale:.94; }
  .segmented button.chosen { color:#fffdf7; }
  :global(html.dark) .segmented button.chosen { color:#172a45; }
  .segmented button:focus-visible { outline:2px dashed #e6a527;outline-offset:2px; }
  .segmented button :global(svg) { width:.8rem;height:.8rem; }
  @media (prefers-reduced-motion:reduce) { .segmented-pill { transition:none; } }
</style>
