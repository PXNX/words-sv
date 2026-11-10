<!-- The question asked by downloadConsent.svelte.ts before a large download on mobile data. -->
<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatBytes } from './storage.js';
  import { answerDownload, downloadConsent } from './downloadConsent.svelte.js';
  import IconSignal from '~icons/material-symbols/signal-cellular-alt-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const pending = $derived(downloadConsent.pending);
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);
</script>

<svelte:window onkeydown={(event) => { if (pending && event.key === 'Escape') answerDownload(false); }} />

{#if pending}
  <div class="data-layer" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
    <button type="button" class="data-backdrop" aria-label={m.mobile_data_wait({}, locale)} onclick={() => answerDownload(false)} transition:fade={{ duration: ms(160) }}></button>
    <div class="data-sheet" role="alertdialog" aria-modal="true" aria-labelledby="data-title" aria-describedby="data-body" transition:fly={{ y: 220, duration: ms(240), easing: cubicOut }}>
      <span class="data-icon" aria-hidden="true"><IconSignal /></span>
      <h2 id="data-title">{pending.reason === 'save-data' ? m.mobile_data_title_saver({}, locale) : m.mobile_data_title({}, locale)}</h2>
      <p id="data-body">{m.mobile_data_body({ name: pending.name, size: formatBytes(pending.megabytes * 1_000_000, settings.formatContext) }, locale)}</p>
      <div class="data-actions">
        <button type="button" class="btn-play btn-play-soft" onclick={() => answerDownload(false)}>{m.mobile_data_wait({}, locale)}</button>
        <button type="button" class="btn-play btn-play-ink" onclick={() => answerDownload(true)}>{m.mobile_data_go({}, locale)}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .data-layer { position:fixed;inset:0;z-index:130;display:flex;align-items:flex-end;justify-content:center; }
  .data-backdrop { position:absolute;inset:0;border:0;background:rgba(12,24,40,.5);cursor:pointer; }
  .data-sheet { position:relative;display:grid;justify-items:center;gap:.6rem;width:min(100%,30rem);padding:1.1rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom));border-radius:1.2rem 1.2rem 0 0;background:#fffdf7;color:#172a45;box-shadow:0 -12px 34px rgba(23,42,69,.22);text-align:center; }
  .data-icon { display:grid;place-items:center;width:2.8rem;height:2.8rem;border-radius:50%;background:rgba(230,165,39,.2);color:#a45e38; }
  .data-icon :global(svg) { width:1.5rem;height:1.5rem; }
  .data-sheet h2 { margin:0;font-family:'DM Serif Display',serif;font-size:1.35rem;font-weight:400; }
  .data-sheet p { margin:0;color:#596477;font-size:.78rem;font-weight:700;line-height:1.45; }
  .data-actions { display:grid;grid-template-columns:1fr 1fr;gap:.5rem;width:100%;margin-top:.3rem; }
  .data-actions button { justify-content:center;min-height:2.7rem; }
  :global(html.dark) .data-sheet { background:#152b47;color:#fffdf7; }
  :global(html.dark) .data-sheet p { color:rgba(255,253,247,.72); }
</style>
