<script lang="ts">
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';

  let { status = 404 }: { status?: number } = $props();
</script>

<svelte:head><title>{status} · WordCircle</title></svelte:head>

<main class="not-found-shell">
  <section class="not-found-card" aria-labelledby="not-found-title">
    <span class="not-found-lilith" aria-hidden="true"><StoryCharacter id="lilith" mood="sad" /></span>
    <p class="not-found-code">{status}</p>
    <h1 id="not-found-title">This trail has no word.</h1>
    <p>Lilith searched everywhere, but the page you requested is not in today’s WordCircle folio. Return to the puzzle and draw a new path.</p>
    <a class="btn-play btn-play-ink" href="/circle">Return to WordCircle</a>
  </section>
</main>

<style>
  .not-found-shell { min-height:100svh;display:grid;place-items:center;padding:1.25rem;background:radial-gradient(circle at 50% 20%,rgba(230,165,39,.14),transparent 32%),#ede4d5; }
  .not-found-card { width:min(100%,28rem);padding:clamp(1.6rem,7vw,2.75rem);border:2px solid #172a45;border-radius:22px 14px 20px 15px / 15px 20px 14px 22px;background:#fffdf7;box-shadow:4px 4px 0 #172a45;color:#172a45;text-align:center; }
  .not-found-lilith { display:block;width:6rem;height:7.5rem;margin:0 auto .6rem; }.not-found-lilith :global(.story-character) { width:100%;height:100%; }
  .not-found-code { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.65rem;font-weight:900;letter-spacing:.18em; }.not-found-card h1 { margin:.35rem 0 .75rem;font-family:'DM Serif Display',serif;font-size:clamp(2rem,9vw,3rem);font-weight:400;letter-spacing:-.045em;line-height:.95; }.not-found-card p:not(.not-found-code) { max-width:23rem;margin:0 auto 1.35rem;color:#596477;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;line-height:1.5; }.not-found-card a { text-decoration:none; }
  :global(html.dark) .not-found-shell { background:radial-gradient(circle at 50% 20%,rgba(230,165,39,.18),transparent 32%),#172a45; }:global(html.dark) .not-found-card { border-color:#0b1626;background:#213a5d;box-shadow:4px 4px 0 #0b1626;color:#fffdf7; }:global(html.dark) .not-found-card p:not(.not-found-code) { color:rgba(255,253,247,.72); }</style>
