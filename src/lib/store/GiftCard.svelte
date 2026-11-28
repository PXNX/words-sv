<!--
  Buy 30 days of WordCircle Pro for a friend. Payment creates a one-use code on the server; the app
  shows a t.me link to share. The recipient's bot /start redeems it and extends their Pro there.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { num } from '#lib/format/num.svelte.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { network } from '#lib/offline/network.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { cloudSync } from '#lib/sync/cloudSync.svelte.js';
  import { openTelegramLink } from '#lib/settings/telegramClient.js';
  import { PRODUCTS } from './catalog.js';
  import { buy, storeState } from './storeClient.svelte.js';
  import StoreSignIn from './StoreSignIn.svelte';
  import IconGift from '~icons/material-symbols/redeem-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';
  import IconSend from '~icons/material-symbols/send-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const gift = PRODUCTS.find((entry) => entry.kind === 'gift')!;
  const linked = $derived(cloudSync.linked === true || storeState.linked === true);
  const latest = $derived(storeState.gifts[0] ?? null);
  let notice = $state('');
  let copied = $state(false);

  async function purchase() {
    notice = m.store_waiting({}, locale);
    const done = await buy(gift.id);
    notice = done ? m.store_thanks({}, locale) : storeState.failed ? m.store_failed({}, locale) : '';
    if (done) { haptic('win'); copied = false; }
  }

  function share() {
    if (!latest) return;
    haptic('select');
    openTelegramLink(latest.url);
  }

  async function copy() {
    if (!latest || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(latest.url);
      copied = true;
      haptic('win');
    } catch { copied = false; }
  }
</script>

<section class="gift-card" aria-label={m.gift_title({}, locale)}>
  <span class="gift-badge" aria-hidden="true"><IconGift /></span>
  <div class="gift-text">
    <strong>{m.gift_title({}, locale)}</strong>
    <p>{m.gift_benefit({ days: num(30) }, locale)}</p>
  </div>
  {#if latest}
    <div class="gift-link">
      <span>{m.gift_ready({ days: num(latest.days) }, locale)}</span>
      <div class="gift-actions">
        <button type="button" class="btn-play btn-play-ink btn-play-sm" onclick={share}><IconSend aria-hidden="true" />{m.gift_share({}, locale)}</button>
        <button type="button" class="btn-play btn-play-soft btn-play-sm" onclick={() => void copy()}>{copied ? m.gift_copied({}, locale) : m.gift_copy({}, locale)}</button>
      </div>
      {#each storeState.gifts.slice(1) as older (older.code)}<a class="gift-older" href={older.url}>{m.gift_older({}, locale)}</a>{/each}
    </div>
  {:else if linked}
    <button type="button" class="btn-play btn-play-ink btn-play-sm gift-buy" disabled={storeState.buying !== null || !network.online} onclick={purchase}><IconStar aria-hidden="true" />{m.store_buy({ stars: num(gift.stars) }, locale)}</button>
  {:else}
    <div class="gift-signin"><StoreSignIn /></div>
  {/if}
  {#if notice}<p class="gift-notice" role="status">{notice}</p>{/if}
</section>

<style>
  .gift-card { display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.4rem .7rem;padding:.7rem .75rem;border:1.5px solid #a45e38;border-radius:.8rem;background:linear-gradient(135deg,#fff0e4,#fffdf7 65%);color:#172a45;text-align:start; }
  :global(html.dark) .gift-card { background:linear-gradient(135deg,#523421,#213a5d 65%);color:#fffdf7; }
  .gift-badge { display:grid;place-items:center;width:2.3rem;height:2.3rem;border-radius:50%;background:#a45e38;color:#fffdf7; }
  .gift-badge :global(svg) { width:1.3rem;height:1.3rem; }
  .gift-text { display:grid;gap:.1rem;min-width:0; }
  .gift-text strong { font-size:.95rem;font-weight:900; }
  .gift-text p { margin:0;font-size:.84rem;font-weight:700;line-height:1.4; }
  .gift-buy,.gift-signin,.gift-link { grid-column:1 / -1;justify-self:start;gap:.3rem; }
  .gift-link { display:grid;gap:.4rem;width:100%;padding:.5rem .6rem;border:1.5px dashed #a45e38;border-radius:.7rem; }
  .gift-link > span { font-size:.84rem;font-weight:800; }
  .gift-actions { display:flex;flex-wrap:wrap;gap:.4rem; }
  .gift-actions :global(svg) { width:1rem;height:1rem; }
  .gift-older { color:#8e4322;font-size:.8rem;font-weight:800; }
  .gift-notice { grid-column:1 / -1;margin:0;color:#1d4f7a;font-size:.8125rem;font-weight:800; }
  :global(html.dark) .gift-notice,:global(html.dark) .gift-older { color:#f0c06a; }
</style>
