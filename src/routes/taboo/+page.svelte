<script lang="ts">
  import TabooMode from '#lib/taboo/TabooMode.svelte';
  import TabooTutorial from '#lib/taboo/TabooTutorial.svelte';
  import GameToolbar from '#lib/app/GameToolbar.svelte';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools } from '#lib/data/vocabulary.js';

  const words = $derived(wordPools[settings.lang][settings.vocabularyLevel]);
</script>

<GameToolbar game="taboo">
  {#snippet tutorial({ start, skip })}<TabooTutorial onstart={start} onskip={skip} />{/snippet}
</GameToolbar>
<TabooMode {words} language={settings.lang} level={settings.vocabularyLevel} />
