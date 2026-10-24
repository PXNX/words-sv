<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';

  let { mode }: { mode: 'read' | 'listen' } = $props();
  const labels = $derived({
    read: m.story_title({}, { locale: settings.interfaceLocale }),
    listen: m.story_listen({}, { locale: settings.interfaceLocale })
  });
  const direction = $derived(getTextDirection(settings.interfaceLocale));
</script>

<nav class="story-modes" dir={direction} aria-label={labels.read}>
  <a href="/stories" class:active={mode === 'read'} aria-current={mode === 'read' ? 'page' : undefined}>{labels.read}</a>
  <a href="/listen" class:active={mode === 'listen'} aria-current={mode === 'listen' ? 'page' : undefined}>{labels.listen}</a>
</nav>

<style>
  .story-modes { align-self:center;display:inline-flex;gap:.15rem;padding:.18rem;border:1px solid rgba(23,42,69,.22);border-radius:999px;background:rgba(255,253,247,.78);box-shadow:2px 2px 0 rgba(23,42,69,.12); }
  .story-modes a { padding:.28rem .7rem;border-radius:999px;color:#596477;font-family:'DM Sans',sans-serif;font-size:.58rem;font-weight:900;letter-spacing:.08em;text-decoration:none;text-transform:uppercase; }
  .story-modes a.active { background:#172a45;color:#fffdf7; }
  .story-modes a:focus-visible { outline:2px solid #e6a527;outline-offset:2px; }
  :global(html.dark) .story-modes { border-color:rgba(255,253,247,.26);background:rgba(255,253,247,.08);box-shadow:2px 2px 0 #0b1626; }
  :global(html.dark) .story-modes a { color:rgba(255,253,247,.72); }
  :global(html.dark) .story-modes a.active { background:#e6a527;color:#172a45; }
</style>
