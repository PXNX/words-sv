<!--
  The dock at the bottom of the hub pages (home, repeat, dictionary, progress, settings): the five
  places a learner returns to, one thumb away. Game modes do not show it, so nothing competes with
  the exercise. The repeat tab carries the number of reviews that are due.
-->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { dueReviewEntries } from '#lib/review/ledger.js';
  import IconHome from '~icons/material-symbols/home-rounded';
  import IconRepeat from '~icons/material-symbols/replay-rounded';
  import IconDictionary from '~icons/material-symbols/menu-book-rounded';
  import IconProgress from '~icons/material-symbols/leaderboard-rounded';
  import IconSettings from '~icons/material-symbols/settings-rounded';

  let { path }: { path: string } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const tabs = $derived([
    { href: '/', label: m.dock_home({}, locale), icon: IconHome },
    { href: '/repeat', label: m.dock_repeat({}, locale), icon: IconRepeat },
    { href: '/dictionary', label: m.dock_words({}, locale), icon: IconDictionary },
    { href: '/progress', label: m.dock_progress({}, locale), icon: IconProgress },
    { href: '/settings', label: m.dock_settings({}, locale), icon: IconSettings }
  ]);
  // Read again on every page change: a finished round elsewhere may have cleared or added reviews.
  const due = $derived.by(() => {
    void path;
    return typeof localStorage === 'undefined' ? 0 : dueReviewEntries(settings.lang).length;
  });
</script>

<nav class="app-dock" aria-label={m.dock_nav({}, locale)}>
  {#each tabs as tab (tab.href)}
    {@const Icon = tab.icon}
    <a href={tab.href} class:current={path === tab.href} aria-current={path === tab.href ? 'page' : undefined}>
      <span class="dock-icon"><Icon aria-hidden="true" />{#if tab.href === '/repeat' && due > 0}<b class="dock-badge">{due > 99 ? '99+' : num(due)}</b>{/if}</span>
      <span class="dock-label">{tab.label}</span>
    </a>
  {/each}
</nav>

<style>
  .app-dock { position:relative;z-index:20;flex:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.1rem;padding:.3rem .4rem calc(.3rem + env(safe-area-inset-bottom));border-top:2px solid var(--ink);background:var(--paper);box-shadow:0 -6px 18px color-mix(in oklch,var(--ink) 10%,transparent); }
  .app-dock a { display:grid;justify-items:center;gap:.1rem;min-width:0;padding:.3rem .1rem .2rem;border-radius:14px;color:var(--ink-soft);font-family:var(--font-body);text-decoration:none;-webkit-tap-highlight-color:transparent;transition:color var(--dur-quick) ease; }
  .app-dock a:focus-visible { outline:3px dashed var(--sun);outline-offset:-2px; }
  .dock-icon { position:relative;display:grid;place-items:center;width:3rem;height:1.75rem;border-radius:999px;transition:background-color var(--dur-move) ease,scale var(--dur-move) var(--ease-spring); }
  .dock-icon :global(svg) { width:1.4rem;height:1.4rem; }
  .dock-label { max-width:100%;overflow:hidden;font-size:.6875rem;font-weight:800;line-height:1.2;text-overflow:ellipsis;white-space:nowrap; }
  .app-dock a.current { color:var(--ink); }
  .app-dock a.current .dock-icon { background:var(--sun); }
  .app-dock a:active .dock-icon { scale:.9; }
  .dock-badge { position:absolute;top:-.25rem;inset-inline-end:.2rem;min-width:1.1rem;padding:0 .25rem;border:1.5px solid var(--paper);border-radius:999px;background:var(--no);color:var(--paper);font-size:.6875rem;font-weight:900;line-height:1.05rem;text-align:center;font-variant-numeric:tabular-nums; }
  :global(html.dark) .app-dock { border-top-color:var(--ink-deep);background:var(--surface-2); }
  :global(html.dark) .app-dock a { color:color-mix(in oklch,var(--paper) 62%,transparent); }
  :global(html.dark) .app-dock a.current { color:var(--paper); }
  :global(html.dark) .app-dock a.current .dock-icon { color:var(--ink); }
  :global(html.dark) .dock-badge { border-color:var(--surface-2); }
  /* A wide window has the room to keep the dock a compact pill instead of a full-width bar. */
  @media (min-width:700px) and (min-height:560px) {
    .app-dock { align-self:center;width:min(100% - 2rem,30rem);margin-bottom:.8rem;padding:.3rem .5rem;border:2px solid var(--ink);border-radius:999px;box-shadow:3px 3px 0 var(--ink); }
    :global(html.dark) .app-dock { border-color:var(--ink-deep);box-shadow:3px 3px 0 var(--ink-deep); }
  }
</style>
