<!--
  Shown once after an update: a joyful Lilith, the release's highlight and its new features, with
  one button to carry on, plus a link to the full version history in the settings. Opening it
  marks the release as seen.
-->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { onMount } from 'svelte';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import { haptic } from '#lib/feedback/haptics.js';
  import { lastSeenVersion, markVersionSeen } from './changelogSeen.js';
  import { changelogSheet } from './changelogSheet.svelte.js';
  import { releases } from './releases.js';
  import { whatsNew, type WhatsNew } from './whatsNew.js';

  let news = $state<WhatsNew | null>(null);
  let button = $state<HTMLButtonElement | null>(null);
  const locale = $derived({ locale: settings.interfaceLocale });
  // Confetti in the storybook palette; each piece gets its own lane, delay and spin.
  const CONFETTI = ['#e6a527', '#e86a9a', '#4b78c2', '#34824d', '#d64b45', '#8a62b6'];
  const pieces = Array.from({ length: 18 }, (_, index) => ({
    color: CONFETTI[index % CONFETTI.length],
    left: (index * 37) % 100,
    delay: (index % 6) * 0.07,
    spin: index % 2 ? 1 : -1
  }));

  onMount(() => {
    const newest = releases[0];
    if (!newest) return;
    let returning = false;
    try {
      returning = Boolean(localStorage.getItem('wordcircle-interface-locale-v1') || localStorage.getItem('wordcircle-activity-v1'));
    } catch {}
    news = whatsNew(releases, lastSeenVersion(), returning);
    // A fresh install starts with everything seen, so only later updates are celebrated.
    markVersionSeen(newest.version);
    if (news) haptic('success');
  });

  $effect(() => {
    if (news) button?.focus();
  });
  function close() {
    news = null;
  }
  // "Everything new" hands over to the version history sheet, which the settings share.
  function showChangelog() {
    close();
    changelogSheet.open = true;
  }
</script>

<svelte:window onkeydown={(event) => { if (news && event.key === 'Escape') close(); }} />

{#if news}
  {@const newest = news.releases[0]!}
  <div class="news-layer" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale}>
    <button type="button" class="news-backdrop" aria-label={m.whats_new_go({}, locale)} onclick={close}></button>
    <div class="news-sheet" role="dialog" aria-modal="true" aria-labelledby="news-title">
      <div class="news-confetti" aria-hidden="true">
        {#each pieces as piece}<i style={`--c:${piece.color};--x:${piece.left}%;--d:${piece.delay}s;--s:${piece.spin}`}></i>{/each}
      </div>
      <span class="news-lilith" aria-hidden="true"><StoryCharacter id="lilith" mood="happy" /><span class="news-hearts"><b>♥</b><b>♥</b><b>♥</b></span></span>
      <h2 id="news-title">{m.whats_new_title({ version: newest.version }, locale)}</h2>
      <p class="news-highlight" dir="ltr" lang="en">{newest.summary}</p>
      {#if news.features.length}
        <ul class="news-features" lang="en" dir="ltr">
          {#each news.features as feature, index}<li style={`--i:${index}`}>{feature}</li>{/each}
        </ul>
      {/if}
      {#if news.fixes || news.moreFeatures}
        <p class="news-extra">
          {#if news.fixes}{m.whats_new_fixes({ count: num(news.fixes) }, locale)}{/if}
          <button type="button" class="news-more" onclick={showChangelog}>{m.whats_new_more({}, locale)}</button>
        </p>
      {/if}
      <button type="button" class="btn-play btn-play-ink news-go" bind:this={button} onclick={close}>{m.whats_new_go({}, locale)}</button>
    </div>
  </div>
{/if}

<style>
  .news-layer { position:fixed;inset:0;z-index:80;display:flex;align-items:flex-end;justify-content:center; }
  .news-backdrop { position:absolute;inset:0;border:0;background:rgba(12,24,40,.5);cursor:pointer;animation:news-fade .25s ease-out; }
  .news-sheet { position:relative;display:grid;justify-items:center;gap:.55rem;width:min(100%,30rem);max-height:calc(100dvh - 2rem);overflow:hidden auto;padding:1.1rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom));border-radius:1.3rem 1.3rem 0 0;background:#fffdf7;box-shadow:0 -12px 34px rgba(23,42,69,.22);animation:news-rise .6s linear(0, .45 18%, .9 34%, 1.06 48%, 1.02 62%, 1); }
  .news-confetti { position:absolute;inset:0 0 auto;height:9rem;pointer-events:none;overflow:hidden; }
  .news-confetti i { position:absolute;top:-.8rem;left:var(--x);width:.45rem;height:.75rem;border-radius:.12rem;background:var(--c);opacity:0;animation:news-confetti 1.6s cubic-bezier(.2,.7,.4,1) var(--d) forwards; }
  .news-lilith { position:relative;display:block;width:6rem;height:7.2rem;transform-origin:50% 100%;animation:news-pop .55s cubic-bezier(.34,1.56,.64,1) .1s both, news-bounce 1.4s ease-in-out .7s 2; }
  .news-hearts { position:absolute;inset:0;pointer-events:none; }
  .news-hearts b { position:absolute;top:30%;left:50%;color:#e86a9a;font-size:1rem;opacity:0;animation:news-heart 1.5s ease-out forwards; }
  .news-hearts b:nth-child(1) { --hx:-2.6rem;animation-delay:.5s; }
  .news-hearts b:nth-child(2) { --hx:2.2rem;animation-delay:.75s; }
  .news-hearts b:nth-child(3) { --hx:-.3rem;animation-delay:1s; }
  .news-sheet h2 { margin:0;color:#172a45;font-family:'DM Serif Display',serif;font-size:1.45rem;font-weight:400;text-align:center;animation:news-in .4s ease-out .25s both; }
  .news-highlight { margin:0;color:#243449;font-size:.95rem;font-weight:800;line-height:1.4;text-align:center;animation:news-in .4s ease-out .35s both; }
  .news-features { display:grid;gap:.3rem;width:100%;margin:.2rem 0 0;padding-inline-start:1.2rem;list-style:disc;color:#243449;font-size:.95rem;line-height:1.4; }
  .news-features li { animation:news-in .35s ease-out calc(.45s + var(--i) * .07s) both; }
  .news-features li::marker { color:#e6a527; }
  .news-extra { display:flex;flex-wrap:wrap;justify-content:center;gap:.25rem .6rem;margin:0;font-size:.875rem;font-weight:800;opacity:.75; }
  .news-more { color:#a45e38;padding:0;border:0;background:none;font:inherit;font-weight:800;text-decoration:underline;cursor:pointer; }
  .news-go { width:100%;justify-content:center;margin-top:.35rem;animation:news-in .4s ease-out .8s both; }
  @keyframes news-fade { from { opacity:0; } }
  @keyframes news-rise { from { transform:translateY(100%); } }
  @keyframes news-pop { from { transform:scale(.3) rotate(-12deg);opacity:0; } }
  @keyframes news-bounce { 0%,100% { transform:translateY(0) rotate(0); } 20% { transform:translateY(0) scale(1.06,.92); } 45% { transform:translateY(-1rem) rotate(-5deg); } 65% { transform:translateY(0) scale(1.04,.95); } 80% { transform:translateY(-.3rem) rotate(3deg); } }
  @keyframes news-heart { 0% { opacity:0;transform:translate(-50%,0) scale(.4); } 25% { opacity:1; } 100% { opacity:0;transform:translate(calc(-50% + var(--hx)),-3.2rem) scale(1.25); } }
  @keyframes news-confetti { 0% { opacity:1;transform:translateY(0) rotate(0); } 100% { opacity:0;transform:translateY(8.5rem) rotate(calc(var(--s) * 540deg)); } }
  @keyframes news-in { from { opacity:0;transform:translateY(.5rem); } }
  @media (prefers-reduced-motion:reduce) {
    .news-sheet,.news-backdrop,.news-lilith,.news-sheet h2,.news-highlight,.news-features li,.news-go { animation:none; }
    .news-confetti,.news-hearts { display:none; }
  }
  :global(html.dark) .news-sheet { background:#152b47; }
  :global(html.dark) .news-sheet h2,:global(html.dark) .news-highlight,:global(html.dark) .news-features { color:#fffdf7; }
  :global(html.dark) .news-more { color:#e6a527; }
</style>
