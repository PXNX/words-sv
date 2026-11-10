<!--
  A bottom sheet offering to reload when a new version has been deployed. Startup checks for and
  installs a waiting build before play begins; this sheet covers updates that arrive while the app is
  already open. SvelteKit flags a new deployment when the app regains focus and on a poll interval
  (see vite.config.ts). Only shown on the home screen, because reloading mid-game would lose the round.
-->
<script lang="ts">
  import { updated } from '$app/state';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { takeOverUpdate } from '#lib/pwa/pwaUpdate.js';
  import IconRefresh from '~icons/material-symbols/refresh-rounded';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';

  let dismissed = $state(false);
  let updating = $state(false);
  let updateButton = $state<HTMLButtonElement | null>(null);
  const open = $derived(updated.current && !dismissed);

  const locale = $derived({ locale: settings.interfaceLocale });
  const labels = $derived({
    hint: m.update_app_hint({}, locale),
    update: m.update_app_button({}, locale),
    later: m.update_app_dismiss({}, locale),
    whatsNew: m.changelog_title({}, locale)
  });

  async function update() {
    updating = true;
    await takeOverUpdate();
  }

  $effect(() => {
    if (open) updateButton?.focus();
  });
</script>

<svelte:window onkeydown={(event) => { if (open && event.key === 'Escape') dismissed = true; }} />

{#if open}
  <div class="update-sheet-layer" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
    <button type="button" class="update-sheet-backdrop" aria-label={labels.later} onclick={() => (dismissed = true)}></button>
    <div class="update-sheet" role="dialog" aria-modal="true" aria-labelledby="update-sheet-text">
      <span class="update-sheet-grip" aria-hidden="true"></span>
      <div class="update-sheet-body">
        <span class="update-sheet-lilith" aria-hidden="true"><StoryCharacter id="lilith" mood="happy" /></span>
        <p id="update-sheet-text">{labels.hint}</p>
      </div>
      <div class="update-sheet-actions">
        <button type="button" class="btn-play btn-play-ink" bind:this={updateButton} onclick={update} disabled={updating} aria-busy={updating}><IconRefresh aria-hidden="true" />{labels.update}</button>
        <button type="button" class="btn-play btn-play-soft" onclick={() => (dismissed = true)}>{labels.later}</button>
      </div>
      <a class="update-sheet-link" href="/changelog" onclick={() => (dismissed = true)}>{labels.whatsNew}</a>
    </div>
  </div>
{/if}

<style>
  .update-sheet-layer { position:fixed;inset:0;z-index:70;display:flex;align-items:flex-end;justify-content:center; }
  .update-sheet-backdrop { position:absolute;inset:0;border:0;background:rgba(12,24,40,.52);cursor:pointer; }
  .update-sheet { position:relative;z-index:1;display:grid;gap:.8rem;width:min(100%,34rem);padding:.6rem 1rem calc(1rem + env(safe-area-inset-bottom));border:1px solid rgba(23,42,69,.2);border-bottom:0;border-radius:1.1rem 1.1rem 0 0;background:#fffdf7;box-shadow:0 -12px 34px rgba(23,42,69,.22);animation:update-sheet-in .2s cubic-bezier(.23,1,.32,1); }
  .update-sheet-grip { justify-self:center;width:2.4rem;height:.25rem;border-radius:999px;background:rgba(23,42,69,.2); }
  .update-sheet-body { display:flex;align-items:center;gap:.8rem; }
  .update-sheet-lilith { flex:none;display:block;width:3.2rem;height:4rem; }
  .update-sheet p { margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.85rem;font-weight:800;line-height:1.4; }
  .update-sheet-actions { display:grid;grid-template-columns:1fr 1fr;gap:.5rem; }
  .update-sheet-actions button { justify-content:center; }
  .update-sheet-actions :global(svg) { width:1rem;height:1rem; }
  .update-sheet-link { justify-self:center;color:#a45e38;font-size:.7rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase; }
  @keyframes update-sheet-in { from { opacity:0;transform:translateY(1.1rem); } to { opacity:1;transform:none; } }
  @media (prefers-reduced-motion:reduce) { .update-sheet { animation:none; } }
  :global(html.dark) .update-sheet { border-color:rgba(255,253,247,.24);background:#152b47;box-shadow:0 -12px 34px rgba(0,0,0,.45); }
  :global(html.dark) .update-sheet-grip { background:rgba(255,253,247,.3); }
  :global(html.dark) .update-sheet p { color:#fffdf7; }
  :global(html.dark) .update-sheet-link { color:#e6a527; }
</style>
