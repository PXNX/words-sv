<script lang="ts">
  import ScribbleMode from '#lib/scribble/ScribbleMode.svelte';
  import { settings } from '#lib/state/settings.svelte.js';
  import { wordPools, vocabularyLevels } from '#lib/data/vocabulary.js';

  // The learner's level first, then every other level as a fallback for picture words.
  const pools = $derived([wordPools[settings.lang][settings.vocabularyLevel], ...vocabularyLevels.filter((level) => level !== settings.vocabularyLevel).map((level) => wordPools[settings.lang][level])]);
</script>

<ScribbleMode {pools} language={settings.lang} />
