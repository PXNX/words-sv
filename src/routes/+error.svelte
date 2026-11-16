<script lang="ts">
  import { page } from '$app/state';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';

  const status = $derived(page.status ?? 404);
  const kind = $derived(status === 404 ? '404' : status >= 500 ? '500' : 'generic');
  const locale = $derived({ locale: settings.interfaceLocale });
  const title = $derived(
    kind === '404' ? m.error_404_title({}, locale) : kind === '500' ? m.error_500_title({}, locale) : m.error_generic_title({}, locale)
  );
  const body = $derived(
    kind === '404'
      ? m.error_404_body({}, locale)
      : kind === '500'
        ? m.error_500_body({}, locale)
        : m.error_generic_body({ status: String(status) }, locale)
  );
</script>

<svelte:head><title>{status} · WordCircle</title></svelte:head>

<main class="error-shell">
  <section class="error-card panel-play" aria-labelledby="error-title">
    <span class="error-character" aria-hidden="true"><StoryCharacter id="lilith" mood={kind === '404' ? 'sad' : 'surprised'} /></span>
    <p class="error-code">{status}</p>
    <h1 id="error-title">{title}</h1>
    <p class="error-body">{body}</p>
    <div class="error-actions">
      <a class="btn-play btn-play-ink" href="/">{m.error_home({}, locale)}</a>
      {#if kind !== '404'}
        <button type="button" class="btn-play btn-play-soft" onclick={() => location.reload()}>{m.error_try_again({}, locale)}</button>
      {/if}
    </div>
  </section>
</main>

<style>
  .error-shell { min-height:100svh;display:grid;place-items:center;padding:1.25rem;background:radial-gradient(circle at 50% 20%,rgba(230,165,39,.14),transparent 32%),var(--color-base-200); }
  .error-card { width:min(100%,28rem);padding:clamp(1.6rem,7vw,2.75rem);color:var(--color-base-content);text-align:center; }
  .error-character { display:block;width:6rem;height:7.5rem;margin:0 auto .6rem; }
  .error-character :global(.story-character) { width:100%;height:100%; }
  .error-code { margin:0;color:var(--color-accent);font-family:'DM Sans',sans-serif;font-size:.84rem;font-weight:900;letter-spacing:.18em; }
  .error-card h1 { margin:.35rem 0 .75rem;font-family:'DM Serif Display',serif;font-size:clamp(2rem,9vw,3rem);font-weight:400;letter-spacing:-.045em;line-height:.95; }
  .error-body { max-width:23rem;margin:0 auto 1.35rem;font-family:'DM Sans',sans-serif;font-size:.95rem;font-weight:700;line-height:1.5;opacity:.78; }
  .error-actions { display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem; }
  .error-actions :global(a) { text-decoration:none; }
</style>
