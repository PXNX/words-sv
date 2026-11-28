<!--
  The store runs on Telegram Stars, so a web visitor needs a Telegram account before an invoice can
  be made out to them. This turns the old dead-end "sign in to buy" text into a single action; the
  account keeps the purchases and the character they already earned on this device.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { network } from '#lib/offline/network.svelte.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import { signInWithTelegram } from '#lib/settings/telegramClient.js';
  import { refreshStore } from './storeClient.svelte.js';

  const locale = $derived({ locale: settings.interfaceLocale });
  let busy = $state(false);
  let failed = $state(false);

  async function connect() {
    busy = true;
    failed = false;
    try {
      const linked = await signInWithTelegram();
      if (linked) {
        await refreshStore();
        haptic('win');
      } else failed = true;
    } catch {
      failed = true;
    } finally {
      busy = false;
    }
  }
</script>

<div class="store-signin">
  <p>{m.store_web_hint({}, locale)}</p>
  <button type="button" class="btn-play btn-play-ink btn-play-sm" disabled={busy || !network.online} onclick={connect}>{m.store_sign_in_button({}, locale)}</button>
  {#if failed}<small role="status">{m.store_sign_in_failed({}, locale)}</small>{/if}
</div>

<style>
  .store-signin { display:grid;justify-items:start;gap:.35rem;min-width:0; }
  .store-signin p { margin:0;color:inherit;font-size:.84rem;font-weight:700;line-height:1.4;opacity:.85; }
  .store-signin small { color:#c4522e;font-size:.8rem;font-weight:800; }
</style>
