<!--
  A small "do something else meanwhile" button for long preparations (story audio, a listening
  story): it opens a sheet saying the work carries on in the background, with the corner badge
  showing its progress and a note when it is ready, and offers to go play something else.
-->
<script lang="ts">
  import { goto } from '$app/navigation';
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import { num } from '#lib/format/num.svelte.js';
  import BottomSheet from '#lib/app/BottomSheet.svelte';
  import StoryCharacter from '#lib/story/StoryCharacter.svelte';
  import { backgroundJobs, jobFraction } from './backgroundJobs.svelte.js';
  import IconSchedule from '~icons/material-symbols/hourglass-top-rounded';

  let { jobKey, label }: { jobKey: string; label: string } = $props();

  let open = $state(false);
  const locale = $derived({ locale: settings.interfaceLocale });
  const job = $derived(backgroundJobs.jobs.find((entry) => entry.key === jobKey));
  const percent = $derived(job ? Math.round(jobFraction(job.progress) * 100) : 0);
</script>

<button type="button" class="background-offer" onclick={() => (open = true)} aria-haspopup="dialog"><IconSchedule aria-hidden="true" />{m.background_offer({}, locale)}</button>

<BottomSheet bind:open title={m.background_offer_title({}, locale)}>
  <div class="background-offer-body">
    <span class="background-offer-lilith" aria-hidden="true"><StoryCharacter id="lilith" mood="happy" walking /></span>
    <div>
      <p><strong>{label}</strong>{#if job} · {num(percent)} %{/if}</p>
      <p>{m.background_offer_text({}, locale)}</p>
    </div>
  </div>
  <div class="background-offer-actions">
    <button type="button" class="btn-play btn-play-ink" onclick={() => { open = false; void goto('/'); }}>{m.background_offer_go({}, locale)}</button>
    <button type="button" class="btn-play btn-play-soft" onclick={() => (open = false)}>{m.background_offer_stay({}, locale)}</button>
  </div>
</BottomSheet>

<style>
  .background-offer { display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .6rem;border:0;border-radius:999px;background:rgba(23,42,69,.08);color:inherit;font:inherit;font-size:.62rem;font-weight:900;cursor:pointer;transition:background-color .2s; }
  .background-offer:hover { background:rgba(23,42,69,.14); }
  :global(html.dark) .background-offer { background:rgba(255,253,247,.12); }
  .background-offer :global(svg) { width:.9rem;height:.9rem; }
  .background-offer-body { display:flex;align-items:center;gap:.8rem; }
  .background-offer-body p { margin:0 0 .25rem;font-size:.7rem;font-weight:700;line-height:1.45; }
  .background-offer-lilith { display:block;flex:none;width:3.4rem;height:4.2rem; }
  .background-offer-actions { display:flex;flex-wrap:wrap;gap:.5rem; }
</style>
