<!--
  Updates are not optional: as soon as a new deployment is found, this sheet shows a happy Lilith
  fetching it and reloads into the new version, where WhatsNewSheet shows what changed. Startup
  installs a waiting build before play begins; this covers updates that arrive while the app is
  open. It only runs on the home screen, so no round is lost, and it waits while the first run's
  introduction is on screen; elsewhere SvelteKit turns the next navigation into a full reload, which
  picks the new version up the same way.
-->
<script lang="ts">
  import { updated } from '$app/state';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { takeOverUpdate } from '#lib/pwa/pwaUpdate.js';
  import { introFlow } from '#lib/app/intro.svelte.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import DownloadProgress from '#lib/offline/DownloadProgress.svelte';

  // At least long enough to see Lilith's hop, however fast the new files arrive.
  const CELEBRATE_MS = 1400;
  let started = false;
  // Unknown until the service worker reports its first batch, then 0..1.
  let progress = $state<number | null>(null);

  // The first run's introduction is left alone: the sheet waits until the learner is through it.
  $effect(() => {
    if (!updated.current || introFlow.active || started) return;
    started = true;
    void takeOverUpdate({ minDurationMs: CELEBRATE_MS, onProgress: (share) => (progress = Math.max(progress ?? 0, share)) });
  });
</script>

{#if updated.current && !introFlow.active}
  <div class="update-layer" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
    <div class="update-backdrop"></div>
    <div class="update-sheet" role="alertdialog" aria-modal="true" aria-live="assertive" aria-labelledby="update-text">
      <!-- Lilith walks while she fetches the files and hops for joy once they are all there -->
      <span class="update-lilith" class:done={progress === 1} aria-hidden="true"><StoryCharacter id="lilith" mood="happy" walking={progress !== 1} /></span>
      <p id="update-text">{m.update_app_hint({}, { locale: settings.interfaceLocale })}</p>
      <div class="update-progress"><DownloadProgress {progress} phase="update" compact /></div>
    </div>
  </div>
{/if}

<style>
  .update-layer { position:fixed;inset:0;z-index:140;display:flex;align-items:flex-end;justify-content:center; }
  .update-backdrop { position:absolute;inset:0;background:rgba(12,24,40,.5);animation:update-fade .25s ease-out; }
  .update-sheet { position:relative;display:grid;justify-items:center;gap:.6rem;width:min(100%,30rem);padding:1rem 1.2rem calc(1.3rem + env(safe-area-inset-bottom));border-radius:1.3rem 1.3rem 0 0;background:#fffdf7;box-shadow:0 -12px 34px rgba(23,42,69,.22);animation:update-rise .5s linear(0, .45 18%, .9 34%, 1.06 48%, 1.02 62%, 1); }
  .update-lilith { display:block;width:5rem;height:6rem;transform-origin:50% 100%; }
  .update-lilith.done { animation:update-hop .7s ease-in-out infinite; }
  .update-sheet p { margin:0;color:#172a45;font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:900;text-align:center; }
  .update-progress { width:min(100%,16rem);color:#172a45; }
  @keyframes update-fade { from { opacity:0; } }
  @keyframes update-rise { from { transform:translateY(100%); } }
  @keyframes update-hop { 0%,100% { transform:translateY(0) scale(1,1); } 15% { transform:translateY(0) scale(1.08,.9); } 45% { transform:translateY(-.9rem) scale(.95,1.06) rotate(-4deg); } 70% { transform:translateY(0) scale(1.05,.94); } }
  @media (prefers-reduced-motion:reduce) { .update-sheet,.update-backdrop,.update-lilith { animation:none; } }
  :global(html.dark) .update-sheet { background:#152b47; }
  :global(html.dark) .update-sheet p { color:#fffdf7; }
  :global(html.dark) .update-progress { color:#fffdf7; }
</style>
