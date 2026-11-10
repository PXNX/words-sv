<!--
  One progress display for everything that takes a while: model downloads, loading a model into
  memory, word and voice packs, and a new app version. Shows what is happening, the share done,
  and the speed while downloading; without a known share the bar slides (indeterminate).
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { formatPercent } from '#lib/format/format.js';
  import { formatSpeed } from './downloadSpeed.js';
  import { clampProgress, type ProgressPhase } from './progressPhase.js';

  let { progress, phase = 'download', bytesPerSecond = 0, detail = '', label = '', compact = false }: {
    progress: number | null;
    phase?: ProgressPhase;
    bytesPerSecond?: number;
    /** Extra text after the speed, e.g. the model name. */
    detail?: string;
    /** Replaces the phase label. */
    label?: string;
    compact?: boolean;
  } = $props();

  const locale = $derived({ locale: settings.interfaceLocale });
  const share = $derived(clampProgress(progress));
  const title = $derived(label || (phase === 'load' ? m.progress_load({}, locale) : phase === 'update' ? m.progress_update({}, locale) : m.progress_download({}, locale)));
  const speed = $derived(phase === 'download' && bytesPerSecond ? formatSpeed(bytesPerSecond, settings.formatContext) : '');
  const facts = $derived([speed, detail].filter(Boolean).join(' · '));
</script>

<div class="download-progress" class:compact data-phase={phase}>
  <div class="download-progress-head">
    <span>{title}</span>
    {#if share !== null}<strong>{formatPercent(settings.formatContext, share)}</strong>{/if}
  </div>
  <div class="download-progress-bar" class:indeterminate={share === null} role="progressbar" aria-label={title} aria-valuemin="0" aria-valuemax="100" aria-valuenow={share === null ? undefined : Math.round(share * 100)}>
    <span style={share === null ? '' : `width:${Math.max(2, share * 100)}%`}></span>
  </div>
  {#if facts && !compact}<p>{facts}</p>{/if}
</div>

<style>
  .download-progress { display:grid;gap:.3rem;width:100%;text-align:start; }
  .download-progress-head { display:flex;justify-content:space-between;gap:.6rem;font-size:.66rem;font-weight:800;color:inherit; }
  .download-progress-head strong { font-variant-numeric:tabular-nums; }
  .download-progress-bar { position:relative;height:.5rem;border-radius:999px;background:color-mix(in oklch, currentColor 12%, transparent);overflow:hidden; }
  .download-progress-bar span { position:absolute;inset-block:0;inset-inline-start:0;border-radius:inherit;background:linear-gradient(90deg,#e6a527,#e86a9a);background-size:1.2rem 100%;transition:width .3s cubic-bezier(.23,1,.32,1); }
  [data-phase='load'] .download-progress-bar span { background:linear-gradient(90deg,#4b78c2,#3f9a9c); }
  [data-phase='update'] .download-progress-bar span { background:linear-gradient(90deg,#e6a527,#34824d); }
  /* moving stripes while active, so a slow step still looks alive */
  .download-progress-bar span::after { content:'';position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.28) 0 .35rem,transparent .35rem .7rem);animation:download-stripes .8s linear infinite; }
  .download-progress-bar.indeterminate span { width:35%;animation:download-slide 1.2s ease-in-out infinite; }
  .download-progress p { margin:0;font-size:.6rem;font-weight:700;opacity:.65; }
  .compact .download-progress-bar { height:.38rem; }
  @keyframes download-stripes { to { background-position:.81rem 0; } }
  @keyframes download-slide { 0% { inset-inline-start:-35%; } 100% { inset-inline-start:100%; } }
  @media (prefers-reduced-motion:reduce) { .download-progress-bar span::after { animation:none; } .download-progress-bar.indeterminate span { animation:none;inset-inline-start:0;width:100%;opacity:.5; } .download-progress-bar span { transition:none; } }
</style>
