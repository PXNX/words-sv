<!--
  The result of the device's WebGPU check (app/webgpuCheck.ts): whether on-device AI can run, what
  graphics the browser offers, when it was checked, and a button to check again.
-->
<script lang="ts">
  import { fade } from 'svelte/transition';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatMoment } from '#lib/format/format.js';
  import { num } from '#lib/format/num.svelte.js';
  import { checkWebGpu, webgpu } from '#lib/app/webgpuCheck.svelte.js';
  import type { WebGpuStatus } from '#lib/app/webgpuCheck.js';
  import IconOk from '~icons/material-symbols/check-circle-rounded';
  import IconFailed from '~icons/material-symbols/error-rounded';
  import IconRefresh from '~icons/material-symbols/refresh-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const explain: Record<WebGpuStatus, () => string> = {
    ok: () => m.webgpu_ok({}, locale),
    'no-api': () => m.webgpu_no_api({}, locale),
    'no-adapter': () => m.webgpu_no_adapter({}, locale),
    'no-device': () => m.webgpu_no_device({}, locale),
    'compute-failed': () => m.webgpu_compute_failed({}, locale)
  };
  const result = $derived(webgpu.result);
</script>

<div class="webgpu" class:ok={result?.status === 'ok'} class:failed={result && result.status !== 'ok'} aria-live="polite">
  <p class="webgpu-status">
    <span class="webgpu-icon" aria-hidden="true">{#if result?.status === 'ok'}<IconOk />{:else if result}<IconFailed />{/if}</span>
    <span>{result ? explain[result.status]() : m.webgpu_not_run({}, locale)}</span>
  </p>
  {#if result && result.status !== 'no-api'}
    <dl class="webgpu-facts" transition:fade={{ duration: 150 }}>
      {#if result.gpu}<div><dt>{m.webgpu_gpu({}, locale)}</dt><dd dir="ltr">{result.gpu}</dd></div>{/if}
      <div><dt>{m.webgpu_f16({}, locale)}</dt><dd>{result.f16 ? m.webgpu_yes({}, locale) : m.webgpu_no({}, locale)}</dd></div>
      {#if result.maxBufferMB}<div><dt>{m.webgpu_buffer({}, locale)}</dt><dd>{num(result.maxBufferMB)} MB</dd></div>{/if}
    </dl>
  {/if}
  <div class="webgpu-foot">
    {#if result}<small>{m.webgpu_checked({ time: formatMoment(settings.formatContext, result.at) }, locale)}</small>{/if}
    <button type="button" class="btn-play btn-play-sm btn-play-soft" disabled={webgpu.running} onclick={() => void checkWebGpu(true)}>
      <IconRefresh aria-hidden="true" class={webgpu.running ? 'webgpu-spin' : ''} />{webgpu.running ? m.webgpu_running({}, locale) : m.webgpu_run({}, locale)}
    </button>
  </div>
</div>

<style>
  .webgpu { display:grid;gap:.55rem;padding:.65rem .7rem;border-radius:.9rem;background:color-mix(in srgb,currentColor 5%,transparent);transition:background-color .3s; }
  .webgpu.ok { background:rgba(52,130,77,.1); }
  .webgpu.failed { background:rgba(181,118,42,.12); }
  .webgpu-status { display:flex;gap:.45rem;margin:0;font-size:.68rem;font-weight:800;line-height:1.4; }
  .webgpu-icon { display:grid;flex:none;place-items:center; }
  .webgpu-icon :global(svg) { width:1.1rem;height:1.1rem; }
  .ok .webgpu-icon { color:#34824d;animation:webgpu-pop .45s cubic-bezier(.34,1.56,.64,1); }
  .failed .webgpu-icon { color:#b5762a; }
  .webgpu-facts { display:flex;flex-wrap:wrap;gap:.35rem .9rem;margin:0;font-size:.6rem; }
  .webgpu-facts div { display:grid;gap:.05rem; }
  .webgpu-facts dt { font-weight:900;letter-spacing:.06em;text-transform:uppercase;opacity:.55; }
  .webgpu-facts dd { margin:0;font-weight:800; }
  .webgpu-foot { display:flex;align-items:center;justify-content:space-between;gap:.6rem; }
  .webgpu-foot small { font-size:.58rem;font-weight:700;opacity:.6; }
  .webgpu-foot :global(svg) { width:.85rem;height:.85rem; }
  :global(.webgpu-spin) { animation:webgpu-spin .9s linear infinite; }
  @keyframes webgpu-pop { from { scale:.4;rotate:-30deg; } }
  @keyframes webgpu-spin { to { rotate:360deg; } }
  @media (prefers-reduced-motion:reduce) { .ok .webgpu-icon,:global(.webgpu-spin) { animation:none; } }
</style>
