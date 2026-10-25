<script lang="ts">
  import IconCheck from '~icons/material-symbols/check-rounded';

  let { done, pendingLabel, doneLabel }: { done: boolean; pendingLabel: string; doneLabel: string } = $props();
</script>

<span class="today-badge" class:done>
  {#if done}<IconCheck aria-hidden="true" />{/if}{done ? doneLabel : pendingLabel}
</span>

<style>
  .today-badge { display: inline-flex;align-items:center;gap:.2rem;margin-top:.15rem;padding:.12rem .4rem;border:1.5px solid rgba(23,42,69,.22);border-radius:999px;color:#596477;font-family:'DM Sans',sans-serif;font-size:.5rem;font-weight:900;letter-spacing:.04em;line-height:1.2;white-space:nowrap; }
  .today-badge :global(svg) { width:.7rem;height:.7rem; }
  .today-badge.done { border-color:#34824d;background:#cfe6d4;color:#256b3a; }
  :global(html.dark) .today-badge { border-color:rgba(255,253,247,.28);color:rgba(255,253,247,.72); }
  :global(html.dark) .today-badge.done { border-color:#8ed8a2;background:rgba(142,216,162,.18);color:#8ed8a2; }
</style>
