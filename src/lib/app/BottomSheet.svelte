<!--
  A sheet that slides up from the bottom over a dimmed page: a grip, a title, a close button and any
  content, scrolling on its own when long. Escape, the backdrop and the close button close it; focus
  moves into it when it opens.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import IconClose from '~icons/material-symbols/close-rounded';

  let { open = $bindable(false), title, children }: { open?: boolean; title: string; children: Snippet } = $props();

  const id = $props.id();
  const locale = $derived({ locale: settings.interfaceLocale });
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);
  let sheet = $state<HTMLDivElement | null>(null);
  $effect(() => {
    if (open) sheet?.focus();
  });
</script>

<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape') open = false; }} />

{#if open}
  <div class="sheet-layer" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
    <button type="button" class="sheet-backdrop" aria-label={m.cosmetic_close({}, locale)} onclick={() => (open = false)} transition:fade={{ duration: ms(160) }}></button>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabindex="-1" bind:this={sheet} transition:fly={{ y: 320, duration: ms(300), easing: cubicOut }}>
      <span class="sheet-grip" aria-hidden="true"></span>
      <header>
        <h2 id={`${id}-title`}>{title}</h2>
        <button type="button" class="sheet-close" onclick={() => (open = false)} aria-label={m.cosmetic_close({}, locale)}><IconClose aria-hidden="true" /></button>
      </header>
      <div class="sheet-body">{@render children()}</div>
    </div>
  </div>
{/if}

<style>
  .sheet-layer { position:fixed;inset:0;z-index:120;display:flex;align-items:flex-end;justify-content:center; }
  .sheet-backdrop { position:absolute;inset:0;border:0;background:rgba(12,24,40,.5);cursor:pointer; }
  .sheet { position:relative;display:grid;align-content:start;gap:.55rem;width:min(100%,34rem);max-height:calc(100dvh - 3rem);overflow-y:auto;padding:.55rem 1.05rem calc(1.2rem + env(safe-area-inset-bottom));border:1px solid rgba(23,42,69,.2);border-bottom:0;border-radius:1.2rem 1.2rem 0 0;background:#fffdf7;color:#172a45;box-shadow:0 -12px 34px rgba(23,42,69,.22);font-family:'DM Sans',sans-serif;outline:none; }
  .sheet-grip { justify-self:center;width:2.4rem;height:.25rem;border-radius:999px;background:rgba(23,42,69,.2); }
  .sheet header { display:flex;align-items:center;justify-content:space-between;gap:.6rem; }
  .sheet h2 { margin:0;font-family:'DM Serif Display',serif;font-size:1.2rem;font-weight:400; }
  .sheet-close { display:grid;place-items:center;width:2rem;height:2rem;padding:0;border:0;border-radius:50%;background:transparent;color:inherit;cursor:pointer; }
  .sheet-close :global(svg) { width:1.1rem;height:1.1rem; }
  .sheet-body { display:grid;gap:.7rem; }
  :global(html.dark) .sheet { border-color:rgba(255,253,247,.24);background:#152b47;color:#fffdf7; }
  :global(html.dark) .sheet-grip { background:rgba(255,253,247,.3); }
</style>
