<!--
  After a round of a Telegram group game: the score, whether it is a new personal best on the group's
  board, and the board around the player, rising in from below. Telegram itself posts a message in
  the group for a new best; this shows the standing right here.
-->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#lib/paraglide/messages.js';
  import { getTextDirection } from '#lib/paraglide/runtime.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { num } from '#lib/format/num.svelte.js';
  import { groupGame } from './groupGame.svelte.js';
  import IconTrophy from '~icons/material-symbols/trophy-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const result = $derived(groupGame.last);
  const ms = (duration: number) => (prefersReducedMotion.current ? 0 : duration);
</script>

{#if result}
  <div class="group-score" role="status" dir={getTextDirection(settings.interfaceLocale)} lang={settings.interfaceLocale} transition:fly={{ y: 160, duration: ms(420), easing: backOut }}>
    <button type="button" class="group-score-close" aria-label={m.cosmetic_close({}, locale)} onclick={() => (groupGame.last = null)}><IconClose aria-hidden="true" /></button>
    <p class="group-score-head">{#if result.newBest}<span class="group-score-trophy" aria-hidden="true"><IconTrophy /></span>{/if}<strong>{result.newBest ? m.group_game_best({ score: num(result.score) }, locale) : m.group_game_score({ score: num(result.score) }, locale)}</strong></p>
    {#if result.leaderboard.length}
      <ol class="group-score-board">
        {#each result.leaderboard as row, index (row.position)}
          <li class:me={row.me} style:--i={index}><span>{num(row.position)}.</span><span class="name">{row.name || '–'}</span><b>{num(row.score)}</b></li>
        {/each}
      </ol>
    {/if}
    <small>{m.group_game_hint({}, locale)}</small>
  </div>
{/if}

<style>
  .group-score { position:fixed;z-index:90;inset-inline:max(.75rem,calc(50% - 15rem));bottom:calc(.9rem + env(safe-area-inset-bottom));display:grid;gap:.45rem;padding:.8rem .9rem .7rem;border:2px solid #172a45;border-radius:1.1rem;background:#fffdf7;color:#172a45;box-shadow:4px 4px 0 #172a45;font-family:'DM Sans',sans-serif; }
  :global(html.dark) .group-score { border-color:#fffdf7;background:#152b47;color:#fffdf7;box-shadow:4px 4px 0 #0a1626; }
  .group-score-close { position:absolute;top:.4rem;inset-inline-end:.4rem;display:grid;place-items:center;width:1.8rem;height:1.8rem;padding:0;border:0;border-radius:50%;background:none;color:inherit;cursor:pointer; }
  .group-score-close :global(svg) { width:1rem;height:1rem; }
  .group-score-head { display:flex;align-items:center;gap:.4rem;margin:0;font-size:.85rem;font-weight:900; }
  .group-score-trophy { display:grid;place-items:center;color:#c9832f;animation:group-score-pop .6s cubic-bezier(.34,1.56,.64,1) both; }
  .group-score-trophy :global(svg) { width:1.3rem;height:1.3rem; }
  .group-score-board { display:grid;gap:.15rem;margin:0;padding:0;list-style:none;font-size:.7rem;font-variant-numeric:tabular-nums; }
  .group-score-board li { display:grid;grid-template-columns:2rem 1fr auto;padding:.2rem .45rem;border-radius:.6rem;animation:group-score-row .35s ease-out both;animation-delay:calc(var(--i) * 60ms + 150ms); }
  .group-score-board li.me { background:rgba(230,165,39,.2);font-weight:900; }
  .group-score-board .name { overflow:hidden;white-space:nowrap;text-overflow:ellipsis; }
  .group-score small { font-size:.6rem;font-weight:700;opacity:.65; }
  @keyframes group-score-pop { from { scale:.2;rotate:-40deg; } }
  @keyframes group-score-row { from { opacity:0;translate:0 .4rem; } }
  @media (prefers-reduced-motion:reduce) { .group-score-trophy,.group-score-board li { animation:none; } }
</style>
