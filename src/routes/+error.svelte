<script lang="ts">
  let { status = 404 } = $props<{ status?: number }>();
</script>

<svelte:head><title>{status} · WordCircle</title></svelte:head>

<main class="not-found-shell">
  <section class="not-found-card" aria-labelledby="not-found-title">
    <span class="brand-mark" aria-hidden="true"><i></i><b></b></span>
    <p class="not-found-code">{status}</p>
    <h1 id="not-found-title">This trail has no word.</h1>
    <p>The page you requested is not in today’s WordCircle folio. Return to the puzzle and draw a new path.</p>
    <a href="/circle">Return to WordCircle</a>
  </section>
</main>

<style>
  .not-found-shell { min-height:100svh;display:grid;place-items:center;padding:1.25rem;background:radial-gradient(circle at 50% 20%,rgba(230,165,39,.14),transparent 32%),#ede4d5; }
  .not-found-card { width:min(100%,28rem);padding:clamp(1.6rem,7vw,2.75rem);border:1px solid #172a45;border-top:4px double #172a45;background:#fffdf7;box-shadow:10px 10px 0 rgba(164,94,56,.16);color:#172a45;text-align:center; }
  .brand-mark { position:relative;width:48px;height:48px;display:block;margin:0 auto 1rem; }.brand-mark i,.brand-mark b { position:absolute;display:block;width:28px;height:28px;border:3px solid #172a45;border-radius:50%; }.brand-mark i { top:1px;left:1px; }.brand-mark b { right:1px;bottom:1px;border-color:#e6a527; }
  .not-found-code { margin:0;color:#a45e38;font-family:'DM Sans',sans-serif;font-size:.65rem;font-weight:900;letter-spacing:.18em; }.not-found-card h1 { margin:.35rem 0 .75rem;font-family:'DM Serif Display',serif;font-size:clamp(2rem,9vw,3rem);font-weight:400;letter-spacing:-.045em;line-height:.95; }.not-found-card p:not(.not-found-code) { max-width:23rem;margin:0 auto 1.35rem;color:#596477;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:700;line-height:1.5; }.not-found-card a { display:inline-flex;align-items:center;justify-content:center;min-height:2.7rem;padding:0 1rem;border:1px solid #172a45;background:#172a45;color:#fffdf7;font-family:'DM Sans',sans-serif;font-size:.64rem;font-weight:900;letter-spacing:.09em;text-decoration:none;text-transform:uppercase;transition:transform .16s cubic-bezier(.23,1,.32,1),background .16s ease; }.not-found-card a:active { transform:scale(.97); }.not-found-card a:focus-visible { outline:3px solid #e6a527;outline-offset:3px; }
  :global(html.dark) .not-found-shell { background:radial-gradient(circle at 50% 20%,rgba(230,165,39,.18),transparent 32%),#172a45; }.not-found-card { border-color:#fffdf7;background:#213a5d;color:#fffdf7; }.not-found-card p:not(.not-found-code) { color:rgba(255,253,247,.72); }.brand-mark i { border-color:#172a45; }:global(html.dark) .brand-mark i { border-color:#fffdf7; }
</style>
