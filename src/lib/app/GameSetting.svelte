<!--
  One row in a game's settings sheet: a label, the control on the right, and an optional
  explanation underneath.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { label, hint = '', children }: { label: string; hint?: string; children: Snippet } = $props();
</script>

<div class="game-setting">
  <div class="game-setting-row"><span>{label}</span>{@render children()}</div>
  {#if hint}<p>{hint}</p>{/if}
</div>

<style>
  .game-setting { display:grid;gap:.35rem;padding-top:.7rem;border-top:1px solid rgba(23,42,69,.14); }
  .game-setting:first-child { padding-top:0;border-top:0; }
  .game-setting-row { display:flex;align-items:center;justify-content:space-between;gap:1rem;font-size:.7rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase; }
  .game-setting p { margin:0;font-size:.64rem;font-weight:700;line-height:1.45;opacity:.65; }
  :global(html.dark) .game-setting { border-top-color:rgba(255,253,247,.2); }
</style>
