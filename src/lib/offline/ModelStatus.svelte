<!--
  Where a language model is: stored on the device (downloaded, needs a moment to load the first
  time it is used) or also in memory (loaded onto the GPU, answers right away). Two distinct
  badges, so "downloaded" and "loaded" are never confused.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatBytes } from './storage.js';
  import IconStored from '~icons/material-symbols/download-done-rounded';
  import IconMemory from '~icons/material-symbols/memory-rounded';

  let { downloaded, inMemory, downloadMB, memoryMB, hint = true }: {
    downloaded: boolean;
    inMemory: boolean;
    downloadMB: number;
    memoryMB: number;
    /** Explain that a downloaded model still loads into memory on first use. */
    hint?: boolean;
  } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const size = (megabytes: number) => formatBytes(megabytes * 1_000_000, settings.formatContext);
</script>

{#if downloaded || inMemory}
  <span class="model-status">
    <span class="model-chip stored"><IconStored aria-hidden="true" />{m.models_state_downloaded({ size: size(downloadMB) }, locale)}</span>
    {#if inMemory}<span class="model-chip memory"><i aria-hidden="true"></i><IconMemory aria-hidden="true" />{m.models_state_in_memory({ memory: size(memoryMB) }, locale)}</span>{/if}
  </span>
  {#if hint && !inMemory}<span class="model-status-hint">{m.models_state_downloaded_hint({}, locale)}</span>{/if}
{/if}

<style>
  .model-status { display:flex;flex-wrap:wrap;gap:.3rem; }
  .model-chip { display:inline-flex;align-items:center;gap:.25rem;padding:.12rem .5rem .12rem .4rem;border-radius:999px;font-size:.62rem;font-weight:800;line-height:1.4; }
  .model-chip :global(svg) { width:.85rem;height:.85rem;flex:none; }
  .model-chip.stored { background:rgba(75,120,194,.12);color:#2f5a9a; }
  .model-chip.memory { background:rgba(52,130,77,.14);color:#2b6d40; }
  .model-chip.memory i { width:.4rem;height:.4rem;border-radius:999px;background:#34824d;box-shadow:0 0 0 0 rgba(52,130,77,.5);animation:model-live 1.6s ease-out infinite; }
  .model-status-hint { display:block;margin-top:.15rem;font-size:.6rem;font-weight:700;opacity:.65; }
  @keyframes model-live { 70% { box-shadow:0 0 0 .35rem rgba(52,130,77,0); } 100% { box-shadow:0 0 0 0 rgba(52,130,77,0); } }
  @media (prefers-reduced-motion:reduce) { .model-chip.memory i { animation:none; } }
  :global(html.dark) .model-chip.stored { background:rgba(156,200,236,.16);color:#9cc8ec; }
  :global(html.dark) .model-chip.memory { background:rgba(127,200,169,.16);color:#9fe0b8; }
</style>
