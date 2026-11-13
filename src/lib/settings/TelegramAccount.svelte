<!--
  The learner's account: signed in with Telegram (progress, streak and character are saved there and
  follow them to any device) or not yet. Signing in opens a one-time link to the bot; the card notices
  by itself once Start was pressed. In the Mini App the device is linked on launch, so there is
  nothing to do. Signing out only unlinks this device.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatMoment } from '#lib/format/format.js';
  import { cloudSync } from '#lib/sync/cloudSync.svelte.js';
  import { miniAppLaunch } from './telegramMiniApp.js';
  import { signInWithTelegram, signOutOfTelegram } from './telegramClient.js';
  import { network } from '#lib/offline/network.svelte.js';
  import IconTelegram from '~icons/fa6-brands/telegram';
  import IconCloud from '~icons/material-symbols/cloud-done-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const inMiniApp = typeof location !== 'undefined' && Boolean(miniAppLaunch());
  let phase = $state<'idle' | 'waiting' | 'timeout' | 'failed'>('idle');
  let controller: AbortController | null = null;

  async function signIn() {
    controller?.abort();
    controller = new AbortController();
    phase = 'waiting';
    try {
      phase = (await signInWithTelegram(controller.signal)) ? 'idle' : 'timeout';
    } catch {
      phase = 'failed';
    }
  }
  async function signOut() {
    if (!confirm(m.account_sign_out_confirm({}, locale))) return;
    try {
      await signOutOfTelegram();
    } catch {
      phase = 'failed';
    }
  }
  $effect(() => () => controller?.abort());
</script>

<div class="account" aria-live="polite">
  <span class="account-icon" class:linked={cloudSync.linked} aria-hidden="true">{#if cloudSync.linked}<IconCloud />{:else}<IconTelegram />{/if}</span>
  <div class="account-text">
    {#if cloudSync.linked}
      <strong>{m.account_signed_in({}, locale)}</strong>
      <small>{inMiniApp ? m.account_miniapp({}, locale) : cloudSync.savedAt ? m.sync_saved_at({ time: formatMoment(settings.formatContext, cloudSync.savedAt) }, locale) : m.sync_saved({}, locale)}</small>
    {:else}
      <strong>{m.sync_title({}, locale)}</strong>
      <small>{phase === 'waiting' ? m.sync_waiting({}, locale) : phase === 'timeout' ? m.account_timeout({}, locale) : phase === 'failed' ? m.account_unavailable({}, locale) : m.sync_hint({}, locale)}</small>
    {/if}
  </div>
  {#if cloudSync.linked}
    {#if !inMiniApp}<button type="button" class="account-action quiet" onclick={signOut}>{m.account_sign_out({}, locale)}</button>{/if}
  {:else}
    <!-- Shown (disabled) only while the status check is running, so the card keeps its height. A check
         that failed must not lock the button: signing in asks the server again and reports what went wrong. -->
    <button type="button" class="btn-play btn-play-sm account-action" disabled={phase === 'waiting' || (cloudSync.linked === null && cloudSync.busy) || !network.online} onclick={signIn}><IconTelegram aria-hidden="true" />{m.sync_connect({}, locale)}</button>
  {/if}
</div>

<style>
  .account { display:grid;grid-template-columns:auto 1fr;align-items:center;gap:.55rem .7rem; }
  .account-icon { display:grid;place-items:center;width:2.2rem;height:2.2rem;border-radius:50%;background:#dcebf7;color:#2a6fa8;transition:background-color .3s, color .3s; }
  .account-icon.linked { background:#d9efdd;color:#34824d; }
  .account-icon :global(svg) { width:1.15rem;height:1.15rem; }
  .account-text { display:grid;gap:.15rem;min-width:0; }
  .account-text strong { font-size:.9rem;font-weight:900; }
  .account-text small { color:color-mix(in srgb, currentColor 62%, transparent);font-size:.84rem;font-weight:700;line-height:1.4; }
  .account-action { grid-column:1 / -1;justify-self:start;gap:.35rem;text-transform:none;letter-spacing:0; }
  .account-action :global(svg) { width:.85rem;height:.85rem; }
  .account-action.quiet { padding:0;border:0;background:none;color:inherit;font:inherit;font-size:.84rem;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer;opacity:.75; }
  :global(html.dark) .account-icon { background:#213a5d;color:#9cc8ec; }
  :global(html.dark) .account-icon.linked { background:#1f4a32;color:#8fd6a2; }
</style>
