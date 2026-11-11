<!--
  A small check in a game card's corner once that mode has counted toward today's streak. Modes not
  done yet show nothing, so the home page does not ask the learner to do everything.
-->
<script lang="ts">
  import IconCheck from '~icons/material-symbols/check-rounded';

  let { done, label }: { done: boolean; label: string } = $props();
</script>

{#if done}
  <span class="today-check" title={label} aria-label={label} role="img"><IconCheck aria-hidden="true" /></span>
{/if}

<style>
  .today-check { position:absolute;top:.45rem;inset-inline-start:.45rem;display:grid;place-items:center;width:1.15rem;height:1.15rem;border-radius:50%;background:#34824d;color:#fffdf7;animation:today-check-in .45s cubic-bezier(.34,1.56,.64,1); }
  .today-check :global(svg) { width:.8rem;height:.8rem; }
  :global(html.dark) .today-check { background:#8ed8a2;color:#172a45; }
  @keyframes today-check-in { from { scale:.3;opacity:0; } to { scale:1;opacity:1; } }
  @media (prefers-reduced-motion:reduce) { .today-check { animation:none; } }
</style>
