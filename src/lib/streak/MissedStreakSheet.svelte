<!--
  After a missed day: a sheet on the start page that offers to repair the streak and WordCircle Pro,
  which keeps it through one missed day a week from then on. Web visitors can sign in right here.
  It opens once per missed day and not while Pro already runs.
-->
<script lang="ts">
  import { m } from '#lib/paraglide/messages.js';
  import { settings } from '#lib/state/settings.svelte.js';
  import BottomSheet from '#lib/app/BottomSheet.svelte';
  import ProCard from '#lib/store/ProCard.svelte';
  import FreezeCard from '#lib/store/FreezeCard.svelte';
  import { proActive } from '#lib/store/storeClient.svelte.js';
  import { REPAIR_WORDS, type StreakRepair } from './clientStreak.js';

  let { repair }: { repair: StreakRepair | null } = $props();

  const SEEN_KEY = 'streak-missed-sheet';
  const locale = $derived({ locale: settings.interfaceLocale });
  let open = $state(false);

  function seen(dateKey: string): boolean {
    try { return localStorage.getItem(SEEN_KEY) === dateKey; } catch { return true; }
  }
  $effect(() => {
    if (!repair || proActive() || seen(repair.dateKey)) return;
    open = true;
    try { localStorage.setItem(SEEN_KEY, repair.dateKey); } catch { /* shown again next time */ }
  });
</script>

{#if repair}
  <BottomSheet bind:open title={m.streak_missed_title({}, locale)}>
    <p class="missed-text">{m.streak_repair_hint({ count: repair.streakCount, need: REPAIR_WORDS }, locale)}</p>
    <a class="btn-play btn-play-ink missed-repair" href="/vocab?repair=1" onclick={() => (open = false)}>{m.streak_repair_cta({}, locale)}</a>
    <div class="missed-offers">
      <FreezeCard />
      <ProCard />
    </div>
  </BottomSheet>
{/if}

<style>
  .missed-text { margin:0;font-size:.9rem;font-weight:700;line-height:1.45; }
  .missed-repair { justify-self:start; }
  .missed-offers { display:grid;gap:.6rem;width:100%; }
</style>
