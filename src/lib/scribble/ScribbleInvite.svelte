<!--
  The small "Invite" button at the top of Scribble: a share menu to play with others.
  - Telegram group: Telegram's group picker adds @word_circle_bot to the chosen group and starts it
    with `scribble`, so the bot posts the Scribble game there (bot/bot/handlers.py).
  - Send on Telegram: Telegram's share sheet with a link to Scribble, for any chat.
  - Elsewhere: the device's own share sheet, or copying the link where there is none.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { openTelegramLink } from '#lib/settings/telegramClient.js';
  import { haptic } from '#lib/feedback/haptics.js';
  import IconPersonAdd from '~icons/material-symbols/person-add-rounded';
  import IconGroupAdd from '~icons/material-symbols/group-add-rounded';
  import IconTelegram from '~icons/fa6-brands/telegram';
  import IconShare from '~icons/material-symbols/share-rounded';
  import IconCopy from '~icons/material-symbols/content-copy-rounded';
  import IconClose from '~icons/material-symbols/close-rounded';

  const BOT = 'word_circle_bot';
  const locale = $derived({ locale: settings.interfaceLocale });
  let dialog = $state<HTMLDialogElement>();
  let copied = $state(false);

  const pageUrl = () => `${location.origin}/scribble`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  function close() {
    dialog?.close();
  }
  function playInGroup() {
    haptic('tap');
    openTelegramLink(`https://t.me/${BOT}?startgroup=scribble`);
    close();
  }
  function sendOnTelegram() {
    haptic('tap');
    const text = m.scribble_invite_text({}, locale);
    openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(pageUrl())}&text=${encodeURIComponent(text)}`);
    close();
  }
  async function shareElsewhere() {
    const text = m.scribble_invite_text({}, locale);
    try {
      if (canShare) {
        await navigator.share({ title: 'Scribble – WordCircle', text, url: pageUrl() });
        close();
      } else {
        await navigator.clipboard.writeText(`${text} ${pageUrl()}`);
        copied = true;
        setTimeout(() => (copied = false), 2000);
      }
    } catch {
      /* the learner closed the share sheet */
    }
  }
</script>

<button type="button" class="invite-button" onclick={() => dialog?.showModal()} aria-haspopup="dialog"><IconPersonAdd aria-hidden="true" />{m.scribble_invite({}, locale)}</button>

<dialog bind:this={dialog} class="invite-sheet" aria-labelledby="scribble-invite-title" onclick={(event) => { if (event.target === dialog) close(); }}>
  <div class="invite-body panel-play">
    <header>
      <h2 id="scribble-invite-title">{m.scribble_invite_title({}, locale)}</h2>
      <button type="button" class="invite-close" onclick={close} aria-label={m.cosmetic_close({}, locale)}><IconClose aria-hidden="true" /></button>
    </header>
    <button type="button" class="invite-option main" onclick={playInGroup}>
      <span class="invite-icon tg" aria-hidden="true"><IconGroupAdd /></span>
      <span><strong>{m.scribble_invite_group({}, locale)}</strong><small>{m.scribble_invite_group_text({}, locale)}</small></span>
    </button>
    <button type="button" class="invite-option" onclick={sendOnTelegram}>
      <span class="invite-icon tg" aria-hidden="true"><IconTelegram /></span>
      <span><strong>{m.scribble_invite_telegram({}, locale)}</strong><small>{m.scribble_invite_telegram_text({}, locale)}</small></span>
    </button>
    <button type="button" class="invite-option" onclick={shareElsewhere}>
      <span class="invite-icon" aria-hidden="true">{#if canShare}<IconShare />{:else}<IconCopy />{/if}</span>
      <span><strong>{canShare ? m.scribble_invite_more({}, locale) : copied ? m.scribble_invite_copied({}, locale) : m.scribble_invite_copy({}, locale)}</strong></span>
    </button>
  </div>
</dialog>

<style>
  .invite-button { display:inline-flex;align-items:center;gap:.3rem;padding:.35rem .7rem;border:2px solid currentColor;border-radius:999px;background:none;color:inherit;font:inherit;font-size:.84rem;font-weight:800;cursor:pointer; }
  .invite-button :global(svg) { width:1rem;height:1rem; }
  .invite-sheet { width:min(100% - 2rem, 26rem);margin:auto auto max(1rem, env(safe-area-inset-bottom));padding:0;border:0;background:none;color:inherit; }
  .invite-sheet::backdrop { background:rgb(10 22 38 / .45); }
  .invite-body { display:grid;gap:.55rem;padding:1rem; }
  .invite-body header { display:flex;align-items:center;justify-content:space-between;gap:.5rem; }
  .invite-body h2 { margin:0;font-size:1.1rem;font-weight:900; }
  .invite-close { display:grid;place-items:center;width:2rem;height:2rem;border:0;border-radius:50%;background:none;color:inherit;cursor:pointer; }
  .invite-close :global(svg) { width:1.2rem;height:1.2rem; }
  .invite-option { display:flex;align-items:center;gap:.75rem;padding:.65rem .75rem;border:2px solid color-mix(in srgb, currentColor 25%, transparent);border-radius:.9rem;background:none;color:inherit;font:inherit;text-align:start;cursor:pointer; }
  .invite-option.main { border-color:#2a6fa8; }
  .invite-option:hover { border-color:currentColor; }
  .invite-option span:last-child { display:grid;gap:.1rem; }
  .invite-option strong { font-weight:900; }
  .invite-option small { font-size:.82rem;font-weight:700;opacity:.7; }
  .invite-icon { display:grid;place-items:center;flex:none;width:2.3rem;height:2.3rem;border-radius:50%;background:#e8e2d4;color:#172a45; }
  .invite-icon.tg { background:#dcebf7;color:#2a6fa8; }
  .invite-icon :global(svg) { width:1.2rem;height:1.2rem; }
  :global(html.dark) .invite-icon { background:#213a5d;color:#9cc8ec; }
</style>
