<!--
  A small dismissible nudge to reload when a new version has been deployed. Startup checks for and
  installs a waiting build before play begins; this hint covers updates that arrive while the app is
  already open. SvelteKit flags a new deployment when the app regains focus and on a poll interval
  (see vite.config.ts). Only shown on the home screen, because reloading mid-game would lose the round.
-->
<script lang="ts">
  import { updated } from '$app/state';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { takeOverUpdate } from '#lib/pwaUpdate.js';
  import IconRefresh from '~icons/material-symbols/refresh-rounded';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';

  let dismissed = $state(false);
  let updating = $state(false);

  const labels = $derived({
    hint: m.update_app_hint({}, { locale: settings.interfaceLocale }),
    update: m.update_app_button({}, { locale: settings.interfaceLocale }),
    later: m.update_app_dismiss({}, { locale: settings.interfaceLocale })
  });

  async function update() {
    updating = true;
    await takeOverUpdate();
  }
</script>

{#if updated.current && !dismissed}
  <div class="card-play pop-in update-hint" role="status">
    <span class="update-hint-lilith" aria-hidden="true"><StoryCharacter id="lilith" mood="happy" /></span>
    <p>{labels.hint}</p>
    <div>
      <button type="button" class="btn-play btn-play-ink btn-play-sm" onclick={update} disabled={updating} aria-busy={updating}><IconRefresh aria-hidden="true" />{labels.update}</button>
      <button type="button" class="btn-play btn-play-soft btn-play-sm" onclick={() => (dismissed = true)}>{labels.later}</button>
    </div>
  </div>
{/if}

<style>
  .update-hint { --tilt:.6deg;justify-self:center;width:min(100%,27rem);display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.25rem .7rem;padding:.65rem .85rem; }
  .update-hint-lilith { grid-row:span 2;display:block;width:2.9rem;height:3.6rem; }
  .update-hint p { margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:.72rem;font-weight:800;line-height:1.35; }
  .update-hint div { display:flex;flex-wrap:wrap;gap:.45rem; }
  .update-hint button :global(svg) { width:.95rem;height:.95rem; }
  :global(html.dark) .update-hint p { color:#fffdf7; }
</style>
