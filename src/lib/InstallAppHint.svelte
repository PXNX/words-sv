<!--
  A small, dismissible install offer. It only appears after the browser has confirmed the app is
  installable (beforeinstallprompt), so it is absent in browsers that cannot install it and in copies
  that already run standalone.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { pwaInstall } from '#lib/pwaInstall.svelte.js';
  import IconDownload from '~icons/material-symbols/download-rounded';
  import IconClose from '~icons/material-symbols/cancel-rounded';

  const labels = $derived({
    install: m.install({}, { locale: settings.interfaceLocale }),
    hint: m.install_hint({}, { locale: settings.interfaceLocale }),
    later: m.update_app_dismiss({}, { locale: settings.interfaceLocale })
  });
</script>

{#if pwaInstall.canInstall}
  <div class="install-hint panel-play pop-in" role="status">
    <button type="button" class="install-hint-main" onclick={() => void pwaInstall.install()}>
      <span class="install-hint-icon" aria-hidden="true"><IconDownload /></span>
      <span class="install-hint-copy">
        <strong>{labels.install}</strong>
        <small>{labels.hint}</small>
      </span>
    </button>
    <button type="button" class="install-hint-close" onclick={() => pwaInstall.dismiss()} aria-label={labels.later} title={labels.later}>
      <IconClose aria-hidden="true" />
    </button>
  </div>
{/if}

<style>
  .install-hint { justify-self:center;width:min(100%,27rem);display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.15rem;padding:.35rem .45rem .35rem .55rem; }
  .install-hint-main { display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:.55rem;min-width:0;padding:.2rem;border:0;border-radius:.7rem;background:none;color:inherit;text-align:left;font:inherit;cursor:pointer; }
  .install-hint-main:focus-visible,.install-hint-close:focus-visible { outline:3px dashed #e6a527;outline-offset:2px; }
  .install-hint-icon { display:grid;place-items:center;width:2rem;height:2rem;flex:none;border:2px solid #172a45;border-radius:48% 52% 46% 54% / 54% 46% 52% 48%;background:#f7e2b0;color:#a45e38; }
  .install-hint-icon :global(svg) { width:1rem;height:1rem; }
  .install-hint-copy { display:grid;gap:.08rem;min-width:0; }
  .install-hint-copy strong { color:#172a45;font-family:'DM Sans',sans-serif;font-size:.6rem;font-weight:900;letter-spacing:.07em;line-height:1.15;text-transform:uppercase; }
  .install-hint-copy small { color:#596477;font-family:'DM Sans',sans-serif;font-size:.55rem;font-weight:700;line-height:1.3; }
  .install-hint-close { display:grid;place-items:center;width:1.75rem;height:1.75rem;border:0;border-radius:50%;background:none;color:rgba(23,42,69,.45);cursor:pointer; }
  .install-hint-close :global(svg) { width:1rem;height:1rem; }
  @media (hover:hover) { .install-hint-close:hover { background:rgba(23,42,69,.08);color:#172a45; } }
  :global(html.dark) .install-hint-copy strong { color:#fffdf7; }
  :global(html.dark) .install-hint-copy small { color:rgba(255,253,247,.72); }
  :global(html.dark) .install-hint-icon { border-color:#0b1626;background:#172a45;color:#e6a527; }
  :global(html.dark) .install-hint-close { color:rgba(255,253,247,.55); }
  @media (hover:hover) { :global(html.dark) .install-hint-close:hover { background:rgba(255,253,247,.1);color:#fffdf7; } }
</style>
