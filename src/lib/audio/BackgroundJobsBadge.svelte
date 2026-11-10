<!--
  A small pill in the corner of every page while background work runs (a listening story being
  rendered, …), so the learner can play another mode and still see it progress. When a job finishes
  away from its own page, the pill turns into a link back to it.
-->
<script lang="ts">
  import { num } from '#lib/format/num.svelte.js';
  import { page } from '$app/state';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { backgroundJobs, dismissFinishedJobs, jobFraction } from './backgroundJobs.svelte.js';
  import IconClose from '~icons/material-symbols/close-rounded';

  const locale = $derived({ locale: settings.interfaceLocale });
  const here = $derived(page.url.pathname.replace(/\/+$/, '') || '/');
  // Only what matters away from the job's own page, where its loader already shows progress.
  const running = $derived(backgroundJobs.jobs.filter((job) => job.status === 'running' && job.route !== here));
  const ready = $derived(backgroundJobs.jobs.filter((job) => job.status === 'done' && job.route !== here));
  const percent = $derived(running.length ? Math.round(running.reduce((sum, job) => sum + jobFraction(job.progress), 0) / running.length * 100) : 0);

  // Arriving at a finished job's page is as good as tapping the link.
  $effect(() => {
    if (backgroundJobs.jobs.some((job) => job.status === 'done' && job.route === here)) dismissFinishedJobs();
  });
</script>

{#if running.length}
  <a class="background-jobs" href={running[0]!.route} aria-live="polite">
    <span class="background-jobs-ring" style:--fill={`${percent}%`} aria-hidden="true"></span>
    <span>{m.background_working({ label: running[0]!.label, percent: num(percent) }, locale)}</span>
  </a>
{:else if ready.length}
  <div class="background-jobs ready" role="status">
    <a href={ready[0]!.route} onclick={dismissFinishedJobs}>{m.background_ready({ label: ready[0]!.label }, locale)}</a>
    <button type="button" onclick={dismissFinishedJobs} aria-label={m.cosmetic_close({}, locale)}><IconClose aria-hidden="true" /></button>
  </div>
{/if}

<style>
  .background-jobs { position:fixed;z-index:55;left:max(.75rem,env(safe-area-inset-left));bottom:max(.75rem,env(safe-area-inset-bottom));display:flex;align-items:center;gap:.45rem;max-width:min(70vw,18rem);padding:.35rem .7rem .35rem .4rem;border:2px solid #172a45;border-radius:999px;background:#fffdf7;color:#172a45;box-shadow:2px 2px 0 #172a45;font-size:.66rem;font-weight:900;text-decoration:none; }
  .background-jobs span:last-child,.background-jobs a { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:inherit; }
  .background-jobs-ring { flex:none;width:1.1rem;height:1.1rem;border-radius:50%;background:conic-gradient(#34824d var(--fill),rgba(23,42,69,.15) 0); }
  .background-jobs.ready { background:#e8f4ea; }
  .background-jobs button { display:grid;place-items:center;width:1.3rem;height:1.3rem;padding:0;border:0;background:transparent;color:inherit;cursor:pointer; }
  :global(html.dark) .background-jobs { background:#2b4a70;color:#fffdf7;border-color:#0b1626;box-shadow:2px 2px 0 #0b1626; }
  :global(html.dark) .background-jobs.ready { background:#23553a; }
</style>
