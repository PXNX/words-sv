<!--
  "Without AI / with AI" for a mode that can run with the on-device model or without it. Only
  shown once the model is available; the choice is kept per mode (aiChoice.svelte.ts).
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { prefersWithoutAi, setWithoutAi, type AiMode } from './aiChoice.svelte.js';

  let { mode }: { mode: AiMode } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const without = $derived(prefersWithoutAi(mode));
</script>

<div class="ai-switch" role="group" aria-label={m.engine_switch({}, locale)}>
  <button type="button" class:on={without} aria-pressed={without} onclick={() => setWithoutAi(mode, true)}>{m.engine_without_ai({}, locale)}</button>
  <button type="button" class:on={!without} aria-pressed={!without} onclick={() => setWithoutAi(mode, false)}>{m.engine_with_ai({}, locale)}</button>
</div>

<style>
  .ai-switch { display:inline-flex;justify-self:center;padding:.15rem;border:2px solid #172a45;border-radius:999px;background:#fffdf7; }
  .ai-switch button { padding:.3rem .8rem;border:0;border-radius:999px;background:transparent;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.9rem;font-weight:900;letter-spacing:.03em;cursor:pointer;opacity:.6;transition:background .2s ease,opacity .2s ease; }
  .ai-switch button.on { background:#172a45;color:#fffdf7;opacity:1; }
  :global(html.dark) .ai-switch { border-color:#0b1626;background:#2b4a70; }
  :global(html.dark) .ai-switch button { color:#fffdf7; }
  :global(html.dark) .ai-switch button.on { background:#e6a527;color:#172a45; }
</style>
