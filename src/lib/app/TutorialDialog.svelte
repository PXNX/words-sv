<script lang="ts">
  import type { Snippet } from 'svelte';

  let { kicker, title, cornerMark, children }: { kicker: string; title: string; cornerMark?: string; children: Snippet } = $props();
</script>

<div
  class="panel-play pop-in relative grid w-[min(100%,28rem)] gap-[.7rem] p-[clamp(.9rem,4vw,1.35rem)]"
>
  <p class="m-0 text-[.58rem] font-black uppercase tracking-[.12em] text-accent">{kicker}</p>
  <h1 class="m-0 font-['DM_Serif_Display',serif] text-[clamp(1.75rem,8vw,2.5rem)] font-normal leading-[.9] text-base-content">{title}</h1>
  {@render children()}
  {#if cornerMark}<span class="absolute bottom-[.55rem] right-[.7rem] text-[.48rem] font-extrabold tracking-[.12em] text-[rgba(23,42,69,.48)] dark:text-[rgba(255,253,247,.56)]">{cornerMark}</span>{/if}
</div>
