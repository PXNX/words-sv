<script lang="ts">
  import type { Snippet } from 'svelte';

  let { kicker, title, cornerMark, children }: { kicker: string; title: string; cornerMark?: string; children: Snippet } = $props();
</script>

<div
  class="relative grid w-[min(100%,28rem)] gap-[.7rem] border-b border-l border-r border-b-[rgba(23,42,69,.3)] border-l-[rgba(23,42,69,.3)] border-r-[rgba(23,42,69,.3)] border-t-[3px] border-t-[#172a45] bg-[#fffdf7] p-[clamp(.9rem,4vw,1.35rem)] shadow-[7px_7px_0_rgba(230,165,39,.2)] [border-top-style:double] dark:border-b-[rgba(255,253,247,.38)] dark:border-l-[rgba(255,253,247,.38)] dark:border-r-[rgba(255,253,247,.38)] dark:border-t-[rgba(255,253,247,.38)] dark:bg-[#172a45]"
>
  <p class="m-0 text-[.58rem] font-black uppercase tracking-[.12em] text-accent">{kicker}</p>
  <h1 class="m-0 font-['DM_Serif_Display',serif] text-[clamp(1.75rem,8vw,2.5rem)] font-normal leading-[.9] text-base-content">{title}</h1>
  {@render children()}
  {#if cornerMark}<span class="absolute bottom-[.55rem] right-[.7rem] text-[.48rem] font-extrabold tracking-[.12em] text-[rgba(23,42,69,.48)] dark:text-[rgba(255,253,247,.56)]">{cornerMark}</span>{/if}
</div>
