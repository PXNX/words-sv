<!--
  A gentle invitation to save the progress by connecting Telegram, shown only to learners whose
  device is not linked yet (and never under `vite dev`, where the check cannot run). "Not now" hides
  it for two weeks. Once linked, the sync carries the progress so far over to the account.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { signInWithTelegram } from '#lib/settings/telegramClient.js';
  import { cloudSync } from './cloudSync.svelte.js';
  import IconTelegram from '~icons/fa6-brands/telegram';
  import IconCloud from '~icons/material-symbols/cloud-done-rounded';

  const DISMISS_KEY = 'wordcircle-sync-hint-dismissed-v1';
  const HIDE_MS = 14 * 24 * 60 * 60 * 1000;
  const locale = $derived({ locale: settings.interfaceLocale });

  let dismissed = $state(readDismissed());
  let waiting = $state(false);
  let busy = $state(false);

  function readDismissed(): boolean {
    try {
      return Date.now() - (Number(localStorage.getItem(DISMISS_KEY)) || 0) < HIDE_MS;
    } catch {
      return false;
    }
  }
  function later() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* shown again next time */ }
    dismissed = true;
  }
  // Signing in only links the account (no reminders); the sync then moves the progress over.
  async function connect() {
    busy = true;
    waiting = true;
    try {
      await signInWithTelegram();
    } catch {
      /* offline or no server: the hint stays for another try */
    } finally {
      waiting = false;
      busy = false;
    }
  }
</script>

{#if cloudSync.linked === false && !dismissed}
  <aside class="sync-hint" aria-labelledby="sync-hint-title">
    <span class="sync-hint-icon" aria-hidden="true"><IconCloud /></span>
    <div class="sync-hint-text">
      <strong id="sync-hint-title">{m.sync_title({}, locale)}</strong>
      <p aria-live="polite">{waiting ? m.sync_waiting({}, locale) : m.sync_hint({}, locale)}</p>
      <div class="sync-hint-actions">
        <button type="button" class="btn-play btn-play-sm sync-hint-connect" disabled={busy} onclick={connect}><IconTelegram aria-hidden="true" />{m.sync_connect({}, locale)}</button>
        <button type="button" class="sync-hint-later" onclick={later}>{m.sync_later({}, locale)}</button>
      </div>
    </div>
  </aside>
{/if}

<style>
  .sync-hint { display:flex;gap:.7rem;align-items:flex-start;padding:.7rem .8rem;border:2px dashed rgba(23,42,69,.28);border-radius:16px 12px 15px 13px / 13px 15px 12px 16px;font-family:'DM Sans',sans-serif; }
  .sync-hint-icon { display:grid;place-items:center;flex:none;width:2rem;height:2rem;border-radius:50%;background:#dcebf7;color:#2a6fa8; }
  .sync-hint-icon :global(svg) { width:1.15rem;height:1.15rem; }
  .sync-hint-text { display:grid;gap:.3rem;min-width:0; }
  .sync-hint-text strong { color:#172a45;font-size:.72rem;font-weight:900; }
  .sync-hint-text p { margin:0;color:#596477;font-size:.62rem;font-weight:700;line-height:1.4; }
  .sync-hint-actions { display:flex;flex-wrap:wrap;align-items:center;gap:.5rem .8rem;margin-top:.15rem; }
  .sync-hint-connect { gap:.35rem;text-transform:none;letter-spacing:0;color:#2a6fa8; }
  .sync-hint-connect :global(svg) { width:.85rem;height:.85rem; }
  .sync-hint-later { padding:0;border:0;background:none;color:#596477;font:inherit;font-size:.6rem;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer; }
  :global(html.dark) .sync-hint { border-color:rgba(255,253,247,.25); }
  :global(html.dark) .sync-hint-icon { background:#213a5d;color:#9cc8ec; }
  :global(html.dark) .sync-hint-text strong { color:#fffdf7; }
  :global(html.dark) .sync-hint-text p,:global(html.dark) .sync-hint-later { color:rgba(255,253,247,.7); }
  :global(html.dark) .sync-hint-connect { color:#9cc8ec; }
</style>
