<!--
  A small pill at the top while the device is offline: learning goes on and is saved, and what needs
  the network catches up later. Fixed, so nothing on the page moves when it comes and goes.
-->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { network } from './network.svelte.js';
  import IconOffline from '~icons/material-symbols/cloud-off-rounded';
</script>

{#if !network.online}
  <div class="offline-pill" role="status" lang={settings.interfaceLocale} transition:fly={{ y: -24, duration: prefersReducedMotion.current ? 0 : 260 }}>
    <IconOffline aria-hidden="true" /><span>{m.offline_pill({}, { locale: settings.interfaceLocale })}</span>
  </div>
{/if}

<style>
  .offline-pill { position:fixed;z-index:95;top:calc(var(--tg-inset-top,0px) + .5rem);left:50%;translate:-50% 0;display:inline-flex;align-items:center;gap:.35rem;max-width:calc(100% - 2rem);padding:.3rem .7rem;border-radius:999px;background:#172a45;color:#fffdf7;box-shadow:0 6px 18px rgba(23,42,69,.25);font-family:'DM Sans',sans-serif;font-size:.62rem;font-weight:800;pointer-events:none; }
  .offline-pill :global(svg) { flex:none;width:.95rem;height:.95rem; }
  :global(html.dark) .offline-pill { background:#fffdf7;color:#172a45; }
</style>
