<script lang="ts">
  import type { Snippet } from 'svelte';
  import { operator } from '#lib/legal/operator.js';

  let { title, kicker, children }: { title: string; kicker: string; children: Snippet } = $props();
</script>

<svelte:head>
  <title>{title} · WordCircle</title>
</svelte:head>

<!-- German law governs these pages, so they stay German whatever the interface language is. -->
<section class="legal-page flex-1 min-h-0 m-0 px-[clamp(1rem,5vw,2rem)] pb-[clamp(1rem,5vw,2rem)] pt-[clamp(2.9rem,10vw,3.6rem)] overflow-x-hidden overflow-y-auto bg-transparent" lang="de" dir="ltr" aria-label={title}>
  <p class="m-0 text-center text-accent text-[.58rem] font-black tracking-[.14em] uppercase">{kicker}</p>
  <h1 class="m-0 mt-[.2rem] text-center text-base-content font-['DM_Serif_Display',serif] text-[clamp(1.7rem,7vw,2.4rem)] font-normal tracking-[-.03em] leading-none">{title}</h1>
  <article class="panel-play mt-[1.2rem] mx-auto max-w-[40rem] px-[clamp(.9rem,4vw,1.4rem)] py-4">
    {@render children()}
    <p class="legal-updated">Stand: {operator.updated}</p>
  </article>
  <nav class="mt-4 flex justify-center gap-4 text-[.62rem] font-extrabold" aria-label="Rechtliches">
    <a href="/impressum">Impressum</a><a href="/datenschutz">Datenschutz</a><a href="/bedingungen">Bedingungen</a>
  </nav>
</section>

<style>
  .legal-page :global(h2) { margin:1.1rem 0 .35rem;color:var(--color-base-content);font-family:'DM Serif Display',serif;font-size:1.05rem;font-weight:400;line-height:1.2; }
  .legal-page :global(h2:first-child) { margin-top:0; }
  .legal-page :global(h3) { margin:.8rem 0 .25rem;font-size:.74rem;font-weight:900; }
  .legal-page :global(p),.legal-page :global(li),.legal-page :global(address) { margin:0 0 .45rem;color:color-mix(in srgb,var(--color-base-content) 80%,transparent);font-size:.7rem;font-style:normal;font-weight:600;line-height:1.55; }
  .legal-page :global(ul) { margin:0 0 .45rem;padding-inline-start:1.1rem; }
  .legal-page :global(a) { color:var(--color-accent);font-weight:800; }
  .legal-updated { margin-top:1rem !important;font-size:.6rem !important;opacity:.7; }
</style>
