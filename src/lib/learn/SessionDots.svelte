<!--
  A row of dots for the cards of a practice round: filled green when right on the first try, amber
  when it took another go, the current one a little bigger. Seeing the round fill up is a quiet
  reason to finish it.
-->
<script lang="ts" module>
  export type DotState = 'right' | 'missed' | 'current' | 'pending';
</script>

<script lang="ts">
  let { dots, label }: { dots: DotState[]; label: string } = $props();
</script>

<ol class="session-dots" aria-label={label}>
  {#each dots as state, index (index)}
    <li class="dot {state}"></li>
  {/each}
</ol>

<style>
  .session-dots { display:flex;justify-content:center;gap:.3rem;margin:0;padding:0;list-style:none; }
  .dot { width:.5rem;height:.5rem;border-radius:50%;background:color-mix(in srgb,currentColor 18%,transparent);transition:background .3s ease,scale .3s cubic-bezier(.34,1.56,.64,1); }
  .dot.right { background:#34824d;scale:1.1; }
  .dot.missed { background:#e6a527; }
  .dot.current { background:currentColor;scale:1.35; }
  @media (prefers-reduced-motion:reduce) { .dot { transition:none; } }
</style>
