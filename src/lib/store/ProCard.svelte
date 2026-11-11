<!--
  WordCircle Pro for the daily streak: what it does, its price or how long it still runs, and the
  Telegram Stars button. Shown with the streak on the progress page and in the sheet on the start
  page after a missed day; both only for learners signed in with Telegram.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatDate } from '#lib/format/format.js';
  import { num } from '#lib/format/num.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { network } from '#lib/offline/network.svelte.js';
  import { PRODUCTS } from './catalog.js';
  import { buy, proActive, storeState } from './storeClient.svelte.js';
  import IconPro from '~icons/material-symbols/workspace-premium-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const pro = PRODUCTS.find((product) => product.kind === 'pro')!;
  const active = $derived(proActive());
  let notice = $state('');

  async function purchase() {
    notice = m.store_waiting({}, locale);
    const done = await buy(pro.id);
    notice = done ? m.store_thanks({}, locale) : storeState.failed ? m.store_failed({}, locale) : '';
    if (done) haptic('win');
  }
</script>

<section class="pro-card" class:active aria-label={m.store_pro_title({}, locale)}>
  <span class="pro-badge" aria-hidden="true"><IconPro /></span>
  <div class="pro-text">
    <strong>{m.store_pro_title({}, locale)}</strong>
    <p>{m.store_pro_benefit({}, locale)}</p>
    <small>{active ? m.store_pro_active({ date: formatDate(settings.formatContext, storeState.proUntil!, 'dayMonth') }, locale) : m.store_pro_terms({ stars: num(pro.stars) }, locale)}</small>
  </div>
  {#if !active}
    <button type="button" class="btn-play btn-play-ink btn-play-sm pro-buy" disabled={storeState.buying !== null || !network.online} onclick={purchase}><IconStar aria-hidden="true" />{m.store_buy({ stars: num(pro.stars) }, locale)}</button>
  {/if}
  {#if notice}<p class="pro-notice" role="status">{notice}</p>{/if}
</section>

<style>
  .pro-card { display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.4rem .7rem;padding:.7rem .75rem;border:1.5px solid #e6a527;border-radius:.8rem;background:linear-gradient(135deg,#fff4d9,#fffdf7 65%);color:#172a45;text-align:start; }
  :global(html.dark) .pro-card { background:linear-gradient(135deg,#4a3a1a,#213a5d 65%);color:#fffdf7; }
  .pro-badge { display:grid;place-items:center;width:2.3rem;height:2.3rem;border-radius:50%;background:#e6a527;color:#172a45;animation:pro-badge 3s ease-in-out infinite; }
  .pro-badge :global(svg) { width:1.3rem;height:1.3rem; }
  @keyframes pro-badge { 0%,100% { rotate:0deg; } 50% { rotate:-8deg;scale:1.06; } }
  .pro-text { display:grid;gap:.1rem;min-width:0; }
  .pro-text strong { font-size:.78rem;font-weight:900; }
  .pro-text p { margin:0;font-size:.62rem;font-weight:700;line-height:1.4; }
  .pro-text small { font-size:.56rem;font-weight:800;opacity:.65; }
  .pro-card.active small { color:#34824d;opacity:1; }
  .pro-buy { grid-column:1 / -1;justify-self:start;gap:.3rem; }
  .pro-buy :global(svg) { width:.85rem;height:.85rem; }
  .pro-notice { grid-column:1 / -1;margin:0;font-size:.6rem;font-weight:800;color:#1d4f7a; }
  :global(html.dark) .pro-notice { color:#cfe4f5; }
  @media (prefers-reduced-motion:reduce) { .pro-badge { animation:none; } }
</style>
