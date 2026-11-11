<!--
  One line of a settings section: a label (with an optional icon and hint below it) and its control
  on the other side. Every setting uses this, so spacing, dividers and type stay the same everywhere.
  `stacked` puts the control under the label, for wide controls like the level picker.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { label, hint = '', icon, children, stacked = false, labelFor }: {
    label: string;
    hint?: string;
    icon?: Snippet;
    children?: Snippet;
    stacked?: boolean;
    /** The id of the control, so tapping the label works it (toggles). */
    labelFor?: string;
  } = $props();
</script>

<div class="setting-row" class:stacked>
  <div class="setting-row-label">
    {#if labelFor}<label for={labelFor}>{#if icon}<span class="setting-row-icon" aria-hidden="true">{@render icon()}</span>{/if}{label}</label>
    {:else}<span>{#if icon}<span class="setting-row-icon" aria-hidden="true">{@render icon()}</span>{/if}{label}</span>{/if}
    {#if hint}<small>{hint}</small>{/if}
  </div>
  {#if children}<div class="setting-row-control">{@render children()}</div>{/if}
</div>

<style>
  .setting-row { display:flex;align-items:center;justify-content:space-between;gap:.9rem;padding:.65rem 0; }
  .setting-row + :global(.setting-row) { border-top:1px solid color-mix(in srgb,currentColor 12%,transparent); }
  .setting-row.stacked { flex-direction:column;align-items:stretch;gap:.5rem; }
  .setting-row-label { display:grid;gap:.2rem;min-width:0; }
  .setting-row-label > label,.setting-row-label > span { display:inline-flex;align-items:center;gap:.4rem;font-size:.9rem;font-weight:800; }
  .setting-row-label label { cursor:pointer; }
  .setting-row-label small { font-size:.8125rem;font-weight:700;line-height:1.4;opacity:.62; }
  .setting-row-icon { display:inline-grid;place-items:center;opacity:.75; }
  .setting-row-icon :global(svg) { width:.95rem;height:.95rem; }
  .setting-row-control { display:flex;flex:none;align-items:center;justify-content:flex-end;max-width:58%; }
  .stacked .setting-row-control { max-width:none;justify-content:flex-start; }
</style>
