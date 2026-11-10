<!--
  One settings group as a card that folds open: an icon, the title and, while folded, a one-line
  summary of what is set (so most settings can be read without opening anything). Whether it is open
  is remembered per section. Cards rise in one after another when the page opens.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { haptic } from '#lib/feedback/haptics.js';
  import IconExpand from '~icons/material-symbols/expand-more-rounded';

  let { id, title, summary = '', icon, children, index = 0, defaultOpen = false, accent = '#e6a527' }: {
    id: string;
    title: string;
    summary?: string;
    icon: Snippet;
    children: Snippet;
    /** Position on the page, for the staggered entrance. */
    index?: number;
    defaultOpen?: boolean;
    /** The colour of the icon badge. */
    accent?: string;
  } = $props();

  const key = $derived(`wordcircle-settings-open-${id}`);
  function readOpen(): boolean {
    try {
      const value = localStorage.getItem(`wordcircle-settings-open-${id}`);
      return value === null ? defaultOpen : value === '1';
    } catch {
      return defaultOpen;
    }
  }
  let open = $state(readOpen());
  function toggle() {
    open = !open;
    haptic('tap');
    try { localStorage.setItem(key, open ? '1' : '0'); } catch { /* stays open for this visit only */ }
  }
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);
</script>

<section class="settings-section panel-play" class:open style:--i={index} style:--accent={accent} aria-labelledby={`${id}-title`}>
  <h2 class="settings-section-head">
    <button type="button" id={`${id}-title`} aria-expanded={open} aria-controls={`${id}-body`} onclick={toggle}>
      <span class="settings-section-icon" aria-hidden="true">{@render icon()}</span>
      <span class="settings-section-text">
        <span class="settings-section-title">{title}</span>
        {#if summary && !open}<span class="settings-section-summary">{summary}</span>{/if}
      </span>
      <IconExpand class="settings-section-chevron" aria-hidden="true" />
    </button>
  </h2>
  {#if open}
    <div class="settings-section-body" id={`${id}-body`} transition:slide={{ duration: ms(260), easing: cubicOut }}>
      {@render children()}
    </div>
  {/if}
</section>

<style>
  .settings-section { padding:0;overflow:hidden;animation:settings-rise .45s cubic-bezier(.2,.9,.3,1.15) both;animation-delay:calc(var(--i) * 55ms); }
  .settings-section-head { margin:0; }
  .settings-section-head button { display:flex;align-items:center;gap:.7rem;width:100%;padding:.75rem .85rem;border:0;background:none;color:inherit;font:inherit;text-align:start;cursor:pointer; }
  .settings-section-head button:focus-visible { outline:3px dashed #e6a527;outline-offset:-4px;border-radius:16px; }
  .settings-section-icon { display:grid;place-items:center;flex:none;width:2.1rem;height:2.1rem;border-radius:.75rem;background:color-mix(in srgb,var(--accent) 20%,transparent);color:color-mix(in srgb,var(--accent) 70%,#172a45);transition:rotate .35s cubic-bezier(.34,1.56,.64,1),scale .35s cubic-bezier(.34,1.56,.64,1); }
  .open .settings-section-icon { rotate:-8deg;scale:1.06; }
  .settings-section-icon :global(svg) { width:1.15rem;height:1.15rem; }
  :global(html.dark) .settings-section-icon { color:color-mix(in srgb,var(--accent) 80%,#fffdf7); }
  .settings-section-text { display:grid;gap:.1rem;min-width:0;flex:1; }
  .settings-section-title { font-size:.8rem;font-weight:900;letter-spacing:.01em; }
  .settings-section-summary { overflow:hidden;font-size:.62rem;font-weight:700;white-space:nowrap;text-overflow:ellipsis;opacity:.6; }
  :global(.settings-section-chevron) { flex:none;width:1.3rem;height:1.3rem;opacity:.6;transition:rotate .3s cubic-bezier(.34,1.56,.64,1); }
  .open :global(.settings-section-chevron) { rotate:180deg; }
  .settings-section-body { display:grid;padding:0 .85rem .8rem; }
  @keyframes settings-rise { from { opacity:0;translate:0 14px;scale:.98; } }
  @media (prefers-reduced-motion:reduce) {
    .settings-section { animation:none; }
    .settings-section-icon,:global(.settings-section-chevron) { transition:none; }
  }
</style>
