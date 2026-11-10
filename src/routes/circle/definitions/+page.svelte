<script lang="ts">
  import CircleGame from '#lib/circle/CircleGame.svelte';
  import CircleTutorial from '#lib/circle/CircleTutorial.svelte';
  import CircleSettings from '#lib/circle/CircleSettings.svelte';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import { hasPracticeRound } from '#lib/app/tutorials.js';
  import { settings } from '#lib/state/settings.svelte.js';

  let practiceLanguage = $state<'de' | 'en' | null>(null);
  let round = $state(0);
  function startPractice() {
    if (!hasPracticeRound(settings.lang)) return;
    practiceLanguage = settings.lang;
    round += 1;
  }
</script>

<GameToolbar game="circle" onfirststart={startPractice}>
  {#snippet tutorial({ start, skip })}<CircleTutorial definitions onstart={start} onskip={skip} />{/snippet}
  {#snippet gameSettings()}<CircleSettings />{/snippet}
</GameToolbar>
{#key round}<CircleGame {practiceLanguage} showDefinitions />{/key}
