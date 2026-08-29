<script lang="ts">
  import type { Snippet } from 'svelte';

  let { kicker, title, cornerMark, children }: { kicker: string; title: string; cornerMark?: string; children: Snippet } = $props();
</script>

<div class="tutorial-dialog">
  <p class="tutorial-kicker">{kicker}</p>
  <h1>{title}</h1>
  {@render children()}
  {#if cornerMark}<span class="tutorial-dialog-corner">{cornerMark}</span>{/if}
</div>

<style>
  .tutorial-dialog { position:relative;width:min(100%,28rem);display:grid;gap:.7rem;padding:clamp(.9rem,4vw,1.35rem);border:1px solid rgba(23,42,69,.3);border-top:3px double #172a45;background:#fffdf7;box-shadow:7px 7px 0 rgba(230,165,39,.2); }
  .tutorial-kicker { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase; }
  .tutorial-dialog h1 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:clamp(1.75rem,8vw,2.5rem);font-weight:400;line-height:.9; }
  .tutorial-dialog-corner { position:absolute;right:.7rem;bottom:.55rem;color:rgba(23,42,69,.48);font-family:'DM Sans',sans-serif;font-size:.48rem;font-weight:800;letter-spacing:.12em; }
  :global(html.dark) .tutorial-dialog { background:#172a45;border-color:rgba(255,253,247,.38); }
  :global(html.dark) .tutorial-dialog h1 { color:#fffdf7; }
  :global(html.dark) .tutorial-dialog-corner { color:rgba(255,253,247,.56); }
</style>
