<!--
  A small "Donate" link: opens a field for the amount of Telegram Stars (at least DONATE_MIN) and
  then the Stars invoice, in the Mini App right there, elsewhere in Telegram. A donation unlocks
  nothing; the bot thanks the donor and records it (bot/bot/donations.py).
-->
<script lang="ts">
  import * as v from 'valibot';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { num } from '#lib/format/num.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { network } from '#lib/offline/network.svelte.js';
  import { callApi } from '#lib/api/client.js';
  import { deviceId } from '#lib/streak/clientStreak.js';
  import { openTelegramLink } from '#lib/settings/telegramClient.js';
  import IconHeart from '~icons/material-symbols/favorite-rounded';
  import IconStar from '~icons/material-symbols/star-rounded';

  const DONATE_MIN = 500;
  const DONATE_MAX = 10_000;
  const InvoiceSchema = v.object({ ok: v.literal(true), url: v.string() });
  type WebAppInvoice = { openInvoice?: (url: string, callback: (status: string) => void) => void };

  const locale = $derived({ locale: settings.interfaceLocale });
  let open = $state(false);
  let amount = $state(DONATE_MIN);
  let busy = $state(false);
  let notice = $state('');
  const valid = $derived(Number.isInteger(amount) && amount >= DONATE_MIN && amount <= DONATE_MAX);

  async function donate() {
    if (!valid || busy) return;
    busy = true;
    notice = '';
    try {
      const invoice = await callApi('/api/donate', InvoiceSchema, { body: { deviceId: deviceId(), amount, locale: settings.interfaceLocale } });
      const webApp = (window as { Telegram?: { WebApp?: WebAppInvoice } }).Telegram?.WebApp;
      if (webApp?.openInvoice) {
        const status = await new Promise<string>((resolve) => webApp.openInvoice!(invoice.url, resolve));
        if (status === 'paid') {
          notice = m.donate_thanks({}, locale);
          haptic('win');
          open = false;
        }
      } else {
        openTelegramLink(invoice.url);
        notice = m.store_waiting({}, locale);
      }
    } catch {
      notice = m.donate_failed({}, locale);
    } finally {
      busy = false;
    }
  }
</script>

<div class="donate">
  {#if !open}
    <button type="button" class="donate-toggle" onclick={() => (open = true)}><IconHeart aria-hidden="true" />{m.donate_button({}, locale)}</button>
  {:else}
    <form class="donate-form" onsubmit={(event) => { event.preventDefault(); void donate(); }}>
      <label for="donate-amount">{m.donate_amount_label({ min: num(DONATE_MIN) }, locale)}</label>
      <div class="donate-row">
        <span class="donate-field"><IconStar aria-hidden="true" /><input id="donate-amount" type="number" inputmode="numeric" min={DONATE_MIN} max={DONATE_MAX} step="1" bind:value={amount} aria-invalid={!valid} /></span>
        <button type="submit" class="btn-play btn-play-sm" disabled={!valid || busy || !network.online}>{m.donate_submit({ stars: num(valid ? amount : DONATE_MIN) }, locale)}</button>
      </div>
      {#if !valid}<small class="donate-error">{m.donate_range({ min: num(DONATE_MIN), max: num(DONATE_MAX) }, locale)}</small>{/if}
      <small>{m.donate_hint({}, locale)}</small>
    </form>
  {/if}
  {#if notice}<small class="donate-notice" role="status">{notice}</small>{/if}
</div>

<style>
  .donate { display:grid;gap:.35rem; }
  .donate-toggle { display:inline-flex;align-items:center;gap:.3rem;justify-self:start;padding:0;border:0;background:none;color:inherit;font:inherit;font-size:.84rem;font-weight:800;cursor:pointer;opacity:.75; }
  .donate-toggle:hover { opacity:1; }
  .donate-toggle :global(svg) { width:.95rem;height:.95rem;color:#c4522e; }
  .donate-form { display:grid;gap:.35rem; }
  .donate-form label { font-size:.84rem;font-weight:800; }
  .donate-row { display:flex;flex-wrap:wrap;align-items:center;gap:.45rem; }
  .donate-field { display:inline-flex;align-items:center;gap:.25rem;padding:.25rem .5rem;border:2px solid currentColor;border-radius:.7rem; }
  .donate-field :global(svg) { width:1rem;height:1rem;color:#e6a527; }
  .donate-field input { width:5.5rem;border:0;background:none;color:inherit;font:inherit;font-weight:800; }
  .donate-field input:focus { outline:none; }
  .donate-field:focus-within { outline:2px solid #e6a527;outline-offset:2px; }
  .donate small { color:color-mix(in srgb, currentColor 62%, transparent);font-size:.8rem;font-weight:700;line-height:1.4; }
  .donate .donate-error { color:#c4522e; }
</style>
