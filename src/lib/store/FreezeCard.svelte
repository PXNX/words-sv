<!--
  A single-use streak shield for Telegram Stars. Unlike Pro it does not renew: one bought freeze
  bridges exactly one missed day, after the weekly Pro shield and any earned freezes are used.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { num } from '#lib/format/num.svelte.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { network } from '#lib/offline/network.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { cloudSync } from '#lib/sync/cloudSync.svelte.js';
  import { PRODUCTS } from './catalog.js';
  import { buy, storeState } from './storeClient.svelte.js';
  import StoreSignIn from './StoreSignIn.svelte';
  import IconShield from '~icons/material-symbols/shield-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const freeze = PRODUCTS.find((entry) => entry.kind === 'freeze')!;
  const linked = $derived(cloudSync.linked === true || storeState.linked === true);
  let notice = $state('');

  async function purchase() {
    notice = m.store_waiting({}, locale);
    const done = await buy(freeze.id);
    notice = done ? m.store_thanks({}, locale) : storeState.failed ? m.store_failed({}, locale) : '';
    if (done) {
      haptic('win');
      await settings.refreshStreak();
    }
  }
</script>

<section class="freeze-card" aria-label={m.store_freeze_title({}, locale)}>
  <span class="freeze-badge" aria-hidden="true"><IconShield /></span>
  <div class="freeze-text">
    <strong>{m.store_freeze_title({}, locale)}</strong>
    <p>{m.store_freeze_benefit({}, locale)}</p>
    <small>{m.store_freeze_owned({ count: settings.streak.freezes + settings.streak.paidFreezes }, locale)}</small>
  </div>
  {#if linked}
    <button type="button" class="btn-play btn-play-ink btn-play-sm freeze-buy" disabled={storeState.buying !== null || !network.online} onclick={purchase}><IconStar aria-hidden="true" />{m.store_buy({ stars: num(freeze.stars) }, locale)}</button>
  {:else}
    <div class="freeze-signin"><StoreSignIn /></div>
  {/if}
  {#if notice}<p class="freeze-notice" role="status">{notice}</p>{/if}
</section>

<style>
  .freeze-card { display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.4rem .7rem;padding:.7rem .75rem;border:1.5px solid #34824d;border-radius:.8rem;background:linear-gradient(135deg,#e7f5e9,#fffdf7 65%);color:#172a45;text-align:start; }
  :global(html.dark) .freeze-card { background:linear-gradient(135deg,#1e3d2c,#213a5d 65%);color:#fffdf7; }
  .freeze-badge { display:grid;place-items:center;width:2.3rem;height:2.3rem;border-radius:50%;background:#34824d;color:#fffdf7; }
  .freeze-badge :global(svg) { width:1.3rem;height:1.3rem; }
  .freeze-text { display:grid;gap:.1rem;min-width:0; }
  .freeze-text strong { font-size:.95rem;font-weight:900; }
  .freeze-text p { margin:0;font-size:.84rem;font-weight:700;line-height:1.4; }
  .freeze-text small { font-size:.8125rem;font-weight:800;opacity:.7; }
  .freeze-buy,.freeze-signin { grid-column:1 / -1;justify-self:start;gap:.3rem; }
  .freeze-notice { grid-column:1 / -1;margin:0;color:#1d4f7a;font-size:.8125rem;font-weight:800; }
  :global(html.dark) .freeze-notice { color:#cfe4f5; }
</style>
